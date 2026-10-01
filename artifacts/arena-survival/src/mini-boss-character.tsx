import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import bossModelUrl from '@assets/models/teowerine-cosplay.glb?url';
import type { Enemy } from './game-simulation';
import {
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

export function MiniBossCharacter({ enemy }: { enemy: Enemy }) {
  const gltf = useLoader(GLTFLoader, bossModelUrl);
  const character = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const idleClip = gltf.animations.find((clip) => clip.name === TEOWERINE_IDLE_CLIP);
    const walkClip = gltf.animations.find((clip) => clip.name === TEOWERINE_WALK_CLIP);
    const danceClip = gltf.animations.find((clip) => clip.name === TEOWERINE_DANCE_CLIP);
    const castClip = gltf.animations.find((clip) => clip.name === TEOWERINE_CAST_CLIP);
    const fallClip = gltf.animations.find((clip) => clip.name === TEOWERINE_FALL_CLIP);
    if (!idleClip || !walkClip || !danceClip || !castClip || !fallClip) {
      throw new Error('Teowerine GLB is missing a required wait, walk, dance, cast, or fall animation');
    }
    if (
      Math.abs(walkClip.duration - TEOWERINE_WALK_CLIP_DURATION) > .05
      || Math.abs(danceClip.duration - TEOWERINE_DANCE_CLIP_DURATION) > .05
      || Math.abs(castClip.duration - TEOWERINE_CAST_CLIP_DURATION) > .05
    ) {
      throw new Error('A Teowerine animation duration changed; update its shared timing constant');
    }
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const mixer = new THREE.AnimationMixer(model);

    return {
      model,
      scale: (enemy.scale * 1.45) / Math.max(size.y, .001),
      offset: new THREE.Vector3(-center.x, -bounds.min.y, -center.z),
      mixer,
      actions: {
        idle: mixer.clipAction(idleClip),
        walk: mixer.clipAction(walkClip),
        dance: mixer.clipAction(danceClip),
        cast: mixer.clipAction(castClip),
        fall: mixer.clipAction(fallClip),
      },
      idleClip,
      walkClip,
      danceClip,
      castClip,
      fallClip,
    };
  }, [enemy.scale, gltf.animations, gltf.scene]);
  const rootRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const healthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const animationState = useRef<{ kind: 'idle' | 'walk' | 'dance' | 'cast' | 'fall'; sequence: number }>({ kind: 'idle', sequence: -1 });

  useFrame(() => {
    const dead = enemy.death > 0;
    const dancing = !dead && enemy.danceTimer > 0;
    const casting = !dead && !dancing && enemy.castTimer > 0;
    const walking = !dead && !dancing && !casting && enemy.moveBlend > .08;
    const kind = dead ? 'fall' : dancing ? 'dance' : casting ? 'cast' : walking ? 'walk' : 'idle';
    const sequence = kind === 'dance' ? enemy.danceSequence : kind === 'cast' ? enemy.castSequence : 0;
    if (animationState.current.kind !== kind || animationState.current.sequence !== sequence) {
      character.mixer.stopAllAction();
      const action = character.actions[kind];
      action.reset();
      const looping = kind === 'idle' || kind === 'walk';
      action.setLoop(looping ? THREE.LoopRepeat : THREE.LoopOnce, looping ? Infinity : 1);
      action.clampWhenFinished = !looping;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(kind === 'dance'
        ? TEOWERINE_DANCE_TIME_SCALE
        : kind === 'cast'
          ? TEOWERINE_CAST_TIME_SCALE
          : 1);
      action.play();
      animationState.current = { kind, sequence };
    }

    const action = character.actions[kind];
    if (kind === 'fall') {
      action.time = Math.min(enemy.death, character.fallClip.duration);
    } else if (kind === 'dance') {
      action.time = THREE.MathUtils.clamp(
        (TEOWERINE_DANCE_CLIP_DURATION / TEOWERINE_DANCE_TIME_SCALE - enemy.danceTimer) * TEOWERINE_DANCE_TIME_SCALE,
        0,
        character.danceClip.duration,
      );
    } else if (kind === 'cast') {
      action.time = THREE.MathUtils.clamp(
        (TEOWERINE_CAST_CLIP_DURATION / TEOWERINE_CAST_TIME_SCALE - enemy.castTimer) * TEOWERINE_CAST_TIME_SCALE,
        0,
        character.castClip.duration,
      );
    } else if (kind === 'walk') {
      action.time = (enemy.phase * 1.25) % character.walkClip.duration;
    } else {
      action.time = enemy.phase % character.idleClip.duration;
    }
    character.mixer.update(0);

    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, .02, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    const ratio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
    if (healthFillRef.current) {
      healthFillRef.current.scale.x = ratio;
      healthFillRef.current.position.x = -.62 * (1 - ratio);
    }
    if (healthMaterialRef.current) {
      healthMaterialRef.current.color.set(enemy.hitFlash > 0 ? '#f4e9c7' : '#e8a843');
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.86, 1, 48]} />
        <meshBasicMaterial color="#ffc15b" transparent opacity={.95} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffbd54" intensity={1.4} distance={5} />
      <group scale={character.scale}>
        <primitive object={character.model} position={character.offset} />
      </group>
      {enemy.death <= 0 && (
        <group position={[0, 2.3, 0]}>
          <mesh>
            <boxGeometry args={[1.3, .105, .045]} />
            <meshBasicMaterial color="#10171b" />
          </mesh>
          <mesh ref={healthFillRef} position={[-.62, 0, .03]}>
            <boxGeometry args={[1.2, .055, .025]} />
            <meshStandardMaterial ref={healthMaterialRef} color="#e8a843" emissive="#8d4c19" emissiveIntensity={.55} />
          </mesh>
        </group>
      )}
    </group>
  );
}