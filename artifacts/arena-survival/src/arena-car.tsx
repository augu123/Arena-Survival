import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import carModelUrl from '@assets/luxury+car+3d+model_1790685156102.glb?url';
import { ARENA_CAR, type Engine } from './game-simulation';

function MovingVehicleRoot({
  engineRef,
  children,
}: {
  engineRef: MutableRefObject<Engine>;
  children: ReactNode;
}) {
  const rootRef = useRef<THREE.Group | null>(null);
  const shieldRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    const vehicle = engineRef.current.vehicle;
    if (rootRef.current) {
      rootRef.current.position.set(vehicle.x, ARENA_CAR.y, vehicle.z);
      rootRef.current.rotation.y = vehicle.heading;
    }
    if (shieldRef.current) shieldRef.current.visible = vehicle.driving;
  });

  return (
    <group ref={rootRef} position={[ARENA_CAR.x, ARENA_CAR.y, ARENA_CAR.z]} rotation={[0, ARENA_CAR.rotationY, 0]} scale={ARENA_CAR.scale}>
      {children}
      <mesh ref={shieldRef} position={[0, .008, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[.57, .62, 48]} />
        <meshBasicMaterial color="#54e6ff" transparent opacity={.9} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function ArenaCarModel({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
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
    <MovingVehicleRoot engineRef={engineRef}>
      <primitive object={model} dispose={null} />
    </MovingVehicleRoot>
  );
}

export function ArenaCarPlaceholder({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  return (
    <MovingVehicleRoot engineRef={engineRef}>
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
    </MovingVehicleRoot>
  );
}