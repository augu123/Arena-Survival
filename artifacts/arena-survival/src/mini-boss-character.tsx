import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import bossModelUrl from '@assets/base_basic_pbr_(1)_1790682226476.glb?url';
import type { Enemy } from './game-simulation';

export function MiniBossCharacter({ enemy }: { enemy: Enemy }) {
  const gltf = useLoader(GLTFLoader, bossModelUrl);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const healthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [model]);

  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, .02, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    if (bodyRef.current) {
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
      <group ref={bodyRef} scale={enemy.scale * 1.45}>
        <primitive object={model} />
      </group>
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
    </group>
  );
}