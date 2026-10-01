import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import bossModelUrl from '@assets/models/teowerine-dance.glb?url';
import type { Enemy } from './game-simulation';
import {
  TEOWERINE_DANCE_CLIP,
  TEOWERINE_DANCE_CLIP_DURATION,
  TEOWERINE_DANCE_TIME_SCALE,
  TEOWERINE_FALL_CLIP,
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
    const danceClip = gltf.animations.find((clip) => clip.name === TEOWERINE_DANCE_CLIP);
    const fallClip = gltf.animations.find((clip) => clip.name === TEOWERINE_FALL_CLIP);
    if (!danceClip || !fallClip) {
      throw new Error(`Teowerine GLB must include "${TEOWERINE_DANCE_CLIP}" and "${TEOWERINE_FALL_CLIP}" animations`);
    }
    if (Math.abs(danceClip.duration - TEOWERINE_DANCE_CLIP_DURATION) > .05) {
      throw new Error('Teowerine dance duration changed; update the shared simulation timing constant');
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
      danceAction: mixer.clipAction(danceClip),
      fallAction: mixer.clipAction(fallClip),
      danceClip,
      fallClip,
    };
  }, [enemy.scale, gltf.animations, gltf.scene]);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const healthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const animationState = useRef<{ kind: 'idle' | 'dance' | 'fall'; sequence: number }>({ kind: 'idle', sequence: -1 });

  useFrame(() => {
    const dead = enemy.death > 0;
    const dancing = !dead && enemy.danceTimer > 0;
    if (dead) {
      if (animationState.current.kind !== 'fall') {
        character.mixer.stopAllAction();
        character.fallAction.reset();
        character.fallAction.setLoop(THREE.LoopOnce, 1);
        character.fallAction.clampWhenFinished = true;
        character.fallAction.setEffectiveTimeScale(1);
        character.fallAction.setEffectiveWeight(1);
        character.fallAction.play();
        animationState.current = { kind: 'fall', sequence: enemy.danceSequence };
      }
      character.fallAction.time = Math.min(enemy.death, character.fallClip.duration);
      character.mixer.update(0);
    } else if (dancing) {
      if (animationState.current.kind !== 'dance' || animationState.current.sequence !== enemy.danceSequence) {
        character.mixer.stopAllAction();
        character.danceAction.reset();
        character.danceAction.setLoop(THREE.LoopOnce, 1);
        character.danceAction.clampWhenFinished = true;
        character.danceAction.setEffectiveTimeScale(TEOWERINE_DANCE_TIME_SCALE);
        character.danceAction.setEffectiveWeight(1);
        character.danceAction.play();
        animationState.current = { kind: 'dance', sequence: enemy.danceSequence };
      }
      character.danceAction.time = THREE.MathUtils.clamp(
        (TEOWERINE_DANCE_CLIP_DURATION / TEOWERINE_DANCE_TIME_SCALE - enemy.danceTimer) * TEOWERINE_DANCE_TIME_SCALE,
        0,
        character.danceClip.duration,
      );
      character.mixer.update(0);
    } else if (animationState.current.kind !== 'idle') {
      character.mixer.stopAllAction();
      character.mixer.update(0);
      animationState.current = { kind: 'idle', sequence: enemy.danceSequence };
    }

    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, .02, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    if (bodyRef.current) {
      if (dancing || dead) {
        bodyRef.current.position.set(0, 0, 0);
        bodyRef.current.rotation.set(0, 0, 0);
      } else {
        const movement = THREE.MathUtils.clamp(enemy.moveBlend, 0, 1);
        const stride = Math.sin(enemy.phase * 2.5);
        bodyRef.current.position.y = Math.abs(stride) * .075 * movement
          + Math.abs(Math.sin(enemy.phase * 1.35)) * .025;
        bodyRef.current.rotation.z = stride * (.025 + movement * .065);
        bodyRef.current.rotation.x = enemy.attackPulse > 0
          ? -.16
          : Math.sin(enemy.phase * 2.5 + Math.PI / 2) * .035 * movement;
        bodyRef.current.rotation.y = Math.sin(enemy.phase * 1.2) * .035 * movement;
      }
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
      <group ref={bodyRef} scale={character.scale}>
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