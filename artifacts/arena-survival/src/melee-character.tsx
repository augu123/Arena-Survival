import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import meleeModelUrl from '@assets/models/male_melee.glb?url';
import type { Enemy } from './game-simulation';

/**
 * Rigged model for the basic melee enemies (walkers and runners).
 * Clips baked into the GLB: idle, walk, run, box_01 (the punch), and the death.
 */
const CLIPS = {
  idle: 'idle',
  walk: 'walk',
  run: 'run',
  attack: 'box_01',
  death: 'make a funny death animation',
} as const;

/** Height of the procedural enemies at scale 1, so the model matches their hit size. */
const BODY_HEIGHT = 1.85;
const ATTACK_TIME_SCALE = 1.4;
const LOCOMOTION_FADE = 7;
const DEATH_PLAY_TIME = 1.5;

const withMeshopt = (loader: GLTFLoader) => { loader.setMeshoptDecoder(MeshoptDecoder); };
useLoader.preload(GLTFLoader, meleeModelUrl, withMeshopt);

type Prepared = {
  idle: THREE.AnimationClip;
  walk: THREE.AnimationClip;
  run: THREE.AnimationClip;
  attack: THREE.AnimationClip;
  death: THREE.AnimationClip;
  /** Ground speed (model units per second) the walk/run clips were authored at. */
  walkSpeed: number;
  runSpeed: number;
  height: number;
  offset: THREE.Vector3;
};

/** Strip root motion from a locomotion clip; the simulation already moves the enemy. */
function inPlace(scene: THREE.Object3D, clip: THREE.AnimationClip) {
  const probe = cloneSkinned(scene);
  const mixer = new THREE.AnimationMixer(probe);
  const action = mixer.clipAction(clip).play();
  const hips = probe.getObjectByName('mixamorigHips') ?? probe.getObjectByName('pelvis') ?? probe.getObjectByName('Hips') ?? probe;
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  action.time = 0;
  mixer.update(0);
  probe.updateMatrixWorld(true);
  hips.getWorldPosition(start);
  action.time = clip.duration - 1e-4;
  mixer.update(0);
  probe.updateMatrixWorld(true);
  hips.getWorldPosition(end);
  mixer.stopAllAction();
  mixer.uncacheRoot(probe);
  const travel = Math.hypot(end.x - start.x, end.z - start.z);

  const result = clip.clone();
  let drifting: THREE.KeyframeTrack | null = null;
  let largest = 0;
  for (const track of result.tracks) {
    if (!track.name.endsWith('.position')) continue;
    const v = track.values;
    const last = v.length - 3;
    const drift = Math.hypot(v[last] - v[0], v[last + 1] - v[1], v[last + 2] - v[2]);
    if (drift > largest) { largest = drift; drifting = track; }
  }
  if (drifting && largest > 1e-3) {
    const { times, values } = drifting;
    const last = values.length - 3;
    const delta = [values[last] - values[0], 0, values[last + 2] - values[2]]; // keep the vertical bob
    for (let key = 0; key < times.length; key += 1) {
      const progress = times[key] / clip.duration;
      values[key * 3] -= delta[0] * progress;
      values[key * 3 + 2] -= delta[2] * progress;
    }
  }
  return { clip: result, speed: travel / clip.duration };
}

// Clip preparation is the same for every enemy, so it runs once per loaded GLB.
const prepared = new WeakMap<GLTF, Prepared>();
function prepare(gltf: GLTF): Prepared {
  const cached = prepared.get(gltf);
  if (cached) return cached;
  const find = (name: string) => {
    const clip = gltf.animations.find((entry) => entry.name === name);
    if (!clip) throw new Error(`male_melee.glb is missing its "${name}" animation`);
    return clip;
  };
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const center = bounds.getCenter(new THREE.Vector3());
  const height = Math.max(bounds.max.y - bounds.min.y, 1e-3);
  const walk = inPlace(gltf.scene, find(CLIPS.walk));
  const run = inPlace(gltf.scene, find(CLIPS.run));
  // These clips were exported "in place", so there's no travel to measure: assume a
  // normal human pace (1.4 m/s walking, 3.6 m/s running for a 1.8 m body).
  if (walk.speed < height * .05) walk.speed = 1.4 * height / 1.8;
  if (run.speed < height * .05) run.speed = 3.6 * height / 1.8;
  const result: Prepared = {
    idle: find(CLIPS.idle),
    walk: walk.clip,
    run: run.clip,
    attack: find(CLIPS.attack),
    death: find(CLIPS.death),
    walkSpeed: walk.speed,
    runSpeed: run.speed,
    height,
    offset: new THREE.Vector3(-center.x, -bounds.min.y, -center.z),
  };
  prepared.set(gltf, result);
  return result;
}

export function MeleeCharacter({ enemy }: { enemy: Enemy }) {
  const gltf = useLoader(GLTFLoader, meleeModelUrl, withMeshopt);
  const clips = prepare(gltf);
  const runner = enemy.kind === 'runner';

  const character = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = false;
        // Skinned bounds are computed from the bind pose; don't let a raised arm cull the body.
        object.frustumCulled = false;
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const idle = mixer.clipAction(clips.idle);
    const move = mixer.clipAction(runner ? clips.run : clips.walk);
    const attack = mixer.clipAction(clips.attack);
    const death = mixer.clipAction(clips.death);
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = true;
    death.setLoop(THREE.LoopOnce, 1);
    death.clampWhenFinished = true;
    for (const action of [idle, move]) {
      action.setEffectiveWeight(0);
      action.play();
    }
    // Start each enemy at a different point in its cycle so a wave doesn't march in lockstep.
    const offset = (enemy.id * .37) % 1;
    idle.time = offset * clips.idle.duration;
    move.time = offset * move.getClip().duration;
    return { model, mixer, idle, move, attack, death };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf.scene, clips, runner]);

  useEffect(() => () => {
    character.mixer.stopAllAction();
    character.mixer.uncacheRoot(character.model);
  }, [character]);

  const scale = (BODY_HEIGHT * enemy.scale) / clips.height;
  const authoredSpeed = Math.max(.1, (runner ? clips.runSpeed : clips.walkSpeed) * scale);

  const rootRef = useRef<THREE.Group>(null);
  const healthRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const portalMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef({
    phase: enemy.phase,
    x: enemy.x,
    z: enemy.z,
    heading: Math.atan2(enemy.facingX, enemy.facingZ),
    speed: 0,
    moveWeight: 0,
    attack: 0,
    lastPulse: enemy.attackPulse,
    dead: false,
  });

  useFrame((_frame, delta) => {
    const s = state.current;
    // Drive the mixer from simulation time (same scheme as Teowerine) so pausing freezes the animation.
    const simDt = Math.max(0, (enemy.phase - s.phase) / (2.6 + enemy.speed));
    s.phase = enemy.phase;
    const dt = Math.min(simDt, .1);
    const dying = enemy.death > 0;

    if (dying && !s.dead) {
      s.dead = true;
      character.mixer.stopAllAction();
      character.death.reset();
      character.death.setEffectiveWeight(1);
      character.death.play();
    }

    if (dying) {
      // Corpses are removed 2.2 s after death, so the clip is squeezed into the first 1.5 s
      // and the body sinks into the floor for the rest.
      const deathLength = character.death.getClip().duration;
      character.death.time = Math.min(enemy.death * (deathLength / DEATH_PLAY_TIME), deathLength);
      character.mixer.update(0);
    } else {
      if (dt > 0) {
        const measured = Math.hypot(enemy.x - s.x, enemy.z - s.z) / dt;
        s.speed += (Math.min(measured, enemy.speed * 1.6) - s.speed) * (1 - Math.exp(-dt * 8));
      }
      const moving = enemy.moveBlend > .05 && s.speed > .08 ? 1 : 0;
      s.moveWeight += (moving - s.moveWeight) * (1 - Math.exp(-dt * LOCOMOTION_FADE));

      // Punch whenever the simulation starts a new melee swing.
      if (enemy.attackPulse > s.lastPulse + .05) {
        character.attack.reset();
        character.attack.setEffectiveTimeScale(ATTACK_TIME_SCALE);
        character.attack.play();
      }
      s.lastPulse = enemy.attackPulse;
      const remaining = character.attack.isRunning()
        ? (character.attack.getClip().duration - character.attack.time) / ATTACK_TIME_SCALE
        : 0;
      const target = remaining > .15 ? 1 : 0;
      s.attack += (target - s.attack) * (1 - Math.exp(-dt * (target ? 16 : 7)));

      const locomotion = 1 - s.attack;
      character.attack.setEffectiveWeight(s.attack);
      character.move.setEffectiveWeight(s.moveWeight * locomotion);
      character.idle.setEffectiveWeight((1 - s.moveWeight) * locomotion);
      character.move.setEffectiveTimeScale(THREE.MathUtils.clamp(s.speed / authoredSpeed, .6, 1.7));
      character.mixer.update(dt);
    }

    s.x = enemy.x;
    s.z = enemy.z;
    if (!dying) {
      const target = Math.atan2(enemy.facingX, enemy.facingZ);
      const turn = Math.atan2(Math.sin(target - s.heading), Math.cos(target - s.heading));
      s.heading += turn * (1 - Math.exp(-Math.min(delta, .05) * 10));
    }

    const spawnT = enemy.spawn > 0 ? enemy.spawn / .9 : 0;
    if (rootRef.current) {
      const sink = dying ? Math.max(0, enemy.death - DEATH_PLAY_TIME) * 1.3 : 0;
      const spawnSink = Math.pow(spawnT, 1.4) * .65 * Math.min(enemy.scale, 1.4);
      const rootY = .02 - spawnSink - sink;
      rootRef.current.position.set(enemy.x, rootY, enemy.z);
      rootRef.current.rotation.y = s.heading;
      const pulse = 1 + enemy.hitFlash * .12;
      rootRef.current.scale.set(2 - pulse, pulse, 2 - pulse);
      if (portalRef.current) portalRef.current.position.y = .03 - rootY;
    }
    if (portalRef.current && portalMaterialRef.current) {
      portalRef.current.visible = spawnT > 0;
      portalRef.current.rotation.z += Math.min(delta, .05) * 3;
      portalMaterialRef.current.opacity = spawnT * .9;
    }
    if (healthRef.current) healthRef.current.visible = !dying && enemy.spawn <= 0 && (enemy.health < enemy.maxHealth || enemy.elite);
    if (healthFillRef.current) {
      const ratio = Math.max(0, enemy.health / enemy.maxHealth);
      healthFillRef.current.scale.x = Math.max(.001, ratio);
      healthFillRef.current.position.x = -.25 * (1 - ratio);
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh ref={portalRef} position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.75 * enemy.scale} visible={false}>
        <ringGeometry args={[.8, 1, 32]} />
        <meshBasicMaterial ref={portalMaterialRef} color="#8ef1ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {enemy.elite && (
        <mesh position={[0, .045, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.5 * enemy.scale}>
          <ringGeometry args={[.8, 1, 32]} />
          <meshBasicMaterial color="#ffcf4a" transparent opacity={.7} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <group scale={scale}>
        <primitive object={character.model} position={clips.offset} />
      </group>
      <group ref={healthRef} position={[0, 2.25 * enemy.scale, 0]} visible={false}>
        <mesh>
          <boxGeometry args={[.56, .07, .03]} />
          <meshBasicMaterial color="#10171b" />
        </mesh>
        <mesh ref={healthFillRef} position={[0, 0, .02]}>
          <boxGeometry args={[.5, .04, .02]} />
          <meshBasicMaterial color={enemy.elite ? '#ffcf4a' : '#ff5a4f'} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
