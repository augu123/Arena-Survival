import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import carModelUrl from '@assets/luxury+car+3d+model_1790685156102.glb?url';
import { ARENA_CAR } from './game-simulation';

export function ArenaCarModel() {
  const gltf = useLoader(GLTFLoader, carModelUrl);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <group
      position={[ARENA_CAR.x, ARENA_CAR.y, ARENA_CAR.z]}
      rotation={[0, ARENA_CAR.rotationY, 0]}
      scale={ARENA_CAR.scale}
      dispose={null}
    >
      <primitive object={model} />
    </group>
  );
}

export function ArenaCarPlaceholder() {
  return (
    <group
      position={[ARENA_CAR.x, ARENA_CAR.y, ARENA_CAR.z]}
      rotation={[0, ARENA_CAR.rotationY, 0]}
      scale={ARENA_CAR.scale}
    >
      <mesh position={[0, .02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.55, 28]} />
        <meshBasicMaterial color="#03080b" transparent opacity={.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, .13, 0]} castShadow>
        <boxGeometry args={[.43, .13, .93]} />
        <meshStandardMaterial color="#27333a" metalness={.48} roughness={.38} />
      </mesh>
      <mesh position={[0, .225, -.015]}>
        <boxGeometry args={[.31, .1, .43]} />
        <meshStandardMaterial color="#54717a" metalness={.34} roughness={.3} />
      </mesh>
      {[-1, 1].flatMap((side) => [-1, 1].map((end) => (
        <mesh key={`${side}-${end}`} position={[side * .215, .075, end * .28]}>
          <boxGeometry args={[.085, .13, .18]} />
          <meshStandardMaterial color="#101619" roughness={.88} />
        </mesh>
      )))}
    </group>
  );
}