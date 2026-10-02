import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import bossModelUrl from '@assets/models/teowerine-rigged.glb?url';
import type { Enemy } from './game-simulation';
import {
  TEOWERINE_ATTACK_CLIP,
  TEOWERINE_CAST_CLIP,
  TEOWERINE_CAST_CLIP_DURATION,
  TEOWERINE_CAST_TIME_SCALE,
  TEOWERINE_DANCE_CLIP,
  TEOWERINE_DANCE_CLIP_DURATION,
  TEOWERINE_DANCE_TIME_SCALE,
  TEOWERINE_FALL_CLIP,
  TEOWERINE_IDLE_CLIP,
  TEOWERINE_WALK_CLIP,
  TEOWERINE_WALK_CLIP_DURATION,
} from './teowerine-animation';

// Start downloading as soon as the game boots, so the model is ready when it's first needed.
useLoader.preload(GLTFLoader, bossModelUrl);

const ATTACK_TIME_SCALE = 1.5;
const LOCOMOTION_FADE = 6;

/** Remove walk-cycle root motion because the simulation already moves Teowerine. */
function prepareWalk(model: THREE.Object3D, clip: THREE.AnimationClip) {
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip).play();
  const pelvis = model.getObjectByName('pelvis') ?? model.getObjectByName('root') ?? model;
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  action.time = 0;
  mixer.update(0);
  model.updateMatrixWorld(true);
  pelvis.getWorldPosition(start);
  action.time = clip.duration - 1e-4;
  mixer.update(0);
  model.updateMatrixWorld(true);
  pelvis.getWorldPosition(end);
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  const travel = Math.hypot(end.x - start.x, end.z - start.z);

  const inPlace = clip.clone();

  let drifting: THREE.KeyframeTrack | null = null;
  let largestDrift = 0;
  for (const track of inPlace.tracks) {
    if (!track.name.endsWith('.position')) continue;
    const values = track.values;
    const last = values.length - 3;
    const drift = Math.hypot(values[last] - values[0], values[last + 1] - values[1], values[last + 2] - values[2]);
    if (drift > largestDrift) {
      largestDrift = drift;
      drifting = track;
    }
  }
  if (drifting) {
    const { times, values } = drifting;
    const last = values.length - 3;
    const delta = [values[last] - values[0], values[last + 1] - values[1], values[last + 2] - values[2]];
    for (let key = 0; key < times.length; key += 1) {
      const progress = times[key] / clip.duration;
      for (let axis = 0; axis < 3; axis += 1) values[key * 3 + axis] -= delta[axis] * progress;
    }
  }
  return { clip: inPlace, speed: travel / clip.duration };
}

export function MiniBossCharacter({ enemy }: { enemy: Enemy }) {
  const gltf = useLoader(GLTFLoader, bossModelUrl);
  const character = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const find = (name: string) => {
      const clip = gltf.animations.find((entry) => entry.name === name);
      if (!clip) throw new Error(`Teowerine GLB is missing its "${name}" animation`);
      return clip;
    };
    const idleClip = find(TEOWERINE_IDLE_CLIP);
    const walkClip = find(TEOWERINE_WALK_CLIP);
    const danceClip = find(TEOWERINE_DANCE_CLIP);
    const castClip = find(TEOWERINE_CAST_CLIP);
    const attackClip = find(TEOWERINE_ATTACK_CLIP);
    const fallClip = find(TEOWERINE_FALL_CLIP);
    if (
      Math.abs(walkClip.duration - TEOWERINE_WALK_CLIP_DURATION) > 0.05 ||
      Math.abs(danceClip.duration - TEOWERINE_DANCE_CLIP_DURATION) > 0.05 ||
      Math.abs(castClip.duration - TEOWERINE_CAST_CLIP_DURATION) > 0.05
    ) {
      throw new Error('A Teowerine animation duration changed; update its shared timing constant');
    }
    const walk = prepareWalk(model, walkClip);
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const scale = (enemy.scale * 1.45) / Math.max(size.y, 0.001);
    const mixer = new THREE.AnimationMixer(model);
    const idleAction = mixer.clipAction(idleClip);
    const walkAction = mixer.clipAction(walk.clip);
    const attackAction = mixer.clipAction(attackClip);
    const danceAction = mixer.clipAction(danceClip);
    const castAction = mixer.clipAction(castClip);
    const fallAction = mixer.clipAction(fallClip);

    attackAction.setLoop(THREE.LoopOnce, 1);
    attackAction.clampWhenFinished = true;

    return {
      model,
      scale,
      offset: new THREE.Vector3(-center.x, -bounds.min.y, -center.z),
      mixer,
      idleAction,
      walkAction,
      attackAction,
      danceAction,
      castAction,
      fallAction,
      walkSpeed: Math.max(0.1, walk.speed * scale),
      idleClip,
      walkClip,
      attackClip,
      danceClip,
      castClip,
      fallClip,
    };
  }, [enemy.scale, gltf.animations, gltf.scene]);

  useEffect(
    () => () => {
      character.mixer.stopAllAction();
      character.mixer.uncacheRoot(character.model);
    },
    [character],
  );

  const rootRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const healthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const animationState = useRef<{ kind: 'locomotion' | 'dance' | 'cast' | 'fall'; sequence: number }>({
    kind: 'locomotion',
    sequence: -1,
  });
  const motion = useRef({
    phase: enemy.phase,
    x: enemy.x,
    z: enemy.z,
    heading: Math.atan2(enemy.facingX, enemy.facingZ),
    speed: 0,
    walkWeight: 0,
    attack: 0,
    lastPulse: 0,
    started: false,
  });

  useFrame(() => {
    const state = motion.current;

    // Tie mixer time to simulation time so pause and frame-rate changes stay deterministic.
    const simDt = Math.max(0, (enemy.phase - state.phase) / (2.6 + enemy.speed));
    state.phase = enemy.phase;
    const dt = Math.min(simDt, 0.1);
    const dead = enemy.death > 0;
    const dancing = !dead && enemy.danceTimer > 0;
    const casting = !dead && !dancing && enemy.castTimer > 0;
    const kind = dead ? 'fall' : dancing ? 'dance' : casting ? 'cast' : 'locomotion';
    const sequence = kind === 'dance' ? enemy.danceSequence : kind === 'cast' ? enemy.castSequence : 0;

    if (
      animationState.current.kind !== kind ||
      animationState.current.sequence !== sequence ||
      (kind === 'locomotion' && !state.started)
    ) {
      character.mixer.stopAllAction();
      if (kind === 'locomotion') {
        for (const action of [character.idleAction, character.walkAction]) {
          action.reset();
          action.setEffectiveWeight(0);
          action.play();
        }
        state.walkWeight = 0;
        state.attack = 0;
        state.started = true;
      } else if (kind === 'dance') {
        character.danceAction.reset();
        character.danceAction.setLoop(THREE.LoopOnce, 1);
        character.danceAction.clampWhenFinished = true;
        character.danceAction.setEffectiveTimeScale(TEOWERINE_DANCE_TIME_SCALE);
        character.danceAction.setEffectiveWeight(1);
        character.danceAction.play();
      } else if (kind === 'cast') {
        character.castAction.reset();
        character.castAction.setLoop(THREE.LoopOnce, 1);
        character.castAction.clampWhenFinished = true;
        character.castAction.setEffectiveTimeScale(TEOWERINE_CAST_TIME_SCALE);
        character.castAction.setEffectiveWeight(1);
        character.castAction.play();
      } else if (kind === 'fall') {
        character.fallAction.reset();
        character.fallAction.setLoop(THREE.LoopOnce, 1);
        character.fallAction.clampWhenFinished = true;
        character.fallAction.setEffectiveWeight(1);
        character.fallAction.play();
      }
      animationState.current = { kind, sequence };
    }

    if (kind === 'locomotion') {
      // Measured ground speed, smoothed so flow-field corners don't stutter the gait.
      if (dt > 0) {
        const measured = Math.hypot(enemy.x - state.x, enemy.z - state.z) / dt;
        state.speed += (Math.min(measured, enemy.speed * 1.6) - state.speed) * (1 - Math.exp(-dt * 8));
      }
      const moving = enemy.moveBlend > 0.05 && state.speed > 0.08 ? 1 : 0;
      state.walkWeight += (moving - state.walkWeight) * (1 - Math.exp(-dt * LOCOMOTION_FADE));

      // A punch plays whenever the simulation starts a new melee swing.
      if (enemy.attackPulse > state.lastPulse + 0.05) {
        character.attackAction.reset();
        character.attackAction.setEffectiveTimeScale(ATTACK_TIME_SCALE);
        character.attackAction.play();
        state.attack = 1;
      }
      state.lastPulse = enemy.attackPulse;
      const attackRemaining = character.attackAction.isRunning()
        ? (character.attackAction.getClip().duration - character.attackAction.time) / ATTACK_TIME_SCALE
        : 0;
      const attackTarget = attackRemaining > 0.2 ? 1 : 0;
      state.attack += (attackTarget - state.attack) * (1 - Math.exp(-dt * (attackTarget ? 14 : 6)));

      const locomotion = 1 - state.attack;

      character.attackAction.setEffectiveWeight(state.attack);
      character.walkAction.setEffectiveWeight(state.walkWeight * locomotion);
      character.idleAction.setEffectiveWeight((1 - state.walkWeight) * locomotion);
      character.walkAction.setEffectiveTimeScale(THREE.MathUtils.clamp(state.speed / character.walkSpeed, 0.55, 1.6));
      character.mixer.update(dt);
    } else {
      if (kind === 'fall') {
        character.fallAction.time = Math.min(enemy.death, character.fallClip.duration);
      } else if (kind === 'dance') {
        character.danceAction.time = THREE.MathUtils.clamp(
          (TEOWERINE_DANCE_CLIP_DURATION / TEOWERINE_DANCE_TIME_SCALE - enemy.danceTimer) * TEOWERINE_DANCE_TIME_SCALE,
          0,
          character.danceClip.duration,
        );
      } else if (kind === 'cast') {
        character.castAction.time = THREE.MathUtils.clamp(
          (TEOWERINE_CAST_CLIP_DURATION / TEOWERINE_CAST_TIME_SCALE - enemy.castTimer) * TEOWERINE_CAST_TIME_SCALE,
          0,
          character.castClip.duration,
        );
      }
      state.lastPulse = enemy.attackPulse;
      character.mixer.update(0);
    }

    state.x = enemy.x;
    state.z = enemy.z;
    const target = Math.atan2(enemy.facingX, enemy.facingZ);
    const turn = Math.atan2(Math.sin(target - state.heading), Math.cos(target - state.heading));
    state.heading += turn * (1 - Math.exp(-dt * (dancing ? 4 : 7)));

    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, 0.02, enemy.z);
      rootRef.current.rotation.y = state.heading;
    }

    const ratio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
    if (healthFillRef.current) {
      healthFillRef.current.scale.x = ratio;
      healthFillRef.current.position.x = -0.62 * (1 - ratio);
    }
    if (healthMaterialRef.current) {
      healthMaterialRef.current.color.set(enemy.hitFlash > 0 ? '#f4e9c7' : '#e8a843');
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.86, 1, 48]} />
        <meshBasicMaterial color="#ffc15b" transparent opacity={0.95} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffbd54" intensity={1.4} distance={5} />
      <group scale={character.scale}>
        <primitive object={character.model} position={character.offset} />
      </group>
      {enemy.death <= 0 && (
        <group position={[0, 2.3, 0]}>
          <mesh>
            <boxGeometry args={[1.3, 0.105, 0.045]} />
            <meshBasicMaterial color="#10171b" />
          </mesh>
          <mesh ref={healthFillRef} position={[-0.62, 0, 0.03]}>
            <boxGeometry args={[1.2, 0.055, 0.025]} />
            <meshStandardMaterial
              ref={healthMaterialRef}
              color="#e8a843"
              emissive="#8d4c19"
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
