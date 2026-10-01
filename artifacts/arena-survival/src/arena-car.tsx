import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import carModelUrl from '@assets/models/arena-car.glb?url';
import { ARENA_CAR, type Engine } from './game-simulation';

// Start downloading as soon as the game boots, so the model is ready when it's first needed.
useLoader.preload(GLTFLoader, carModelUrl);

const CAR_MODEL_YAW_OFFSET = Math.PI;
const WHEEL_RADIUS = .067;
const WHEEL_POSITIONS: Array<[number, number, number]> = [
  [-.2, .06, -.33],
  [.2, .06, -.33],
  [-.2, .06, .33],
  [.2, .06, .33],
];

function AnimatedVehicleWheels({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const wheelRefs = useRef<Array<THREE.Group | null>>([]);
  const previousPosition = useRef<{ x: number; z: number } | null>(null);

  useFrame((_, delta) => {
    const vehicle = engineRef.current.vehicle;
    if (previousPosition.current) {
      const distance = Math.hypot(
        vehicle.x - previousPosition.current.x,
        vehicle.z - previousPosition.current.z,
      );
      const signedDistance = distance <= Math.max(.3, delta * 6)
        ? distance * Math.sign(vehicle.speed)
        : 0;
      const rotation = signedDistance / (WHEEL_RADIUS * ARENA_CAR.scale);
      wheelRefs.current.forEach((wheel) => {
        if (wheel) wheel.rotation.x += rotation;
      });
    }
    previousPosition.current = { x: vehicle.x, z: vehicle.z };
  });

  return (
    <>
      {WHEEL_POSITIONS.map(([x, y, z], index) => (
        <group
          key={`${x}-${z}`}
          ref={(wheel) => { wheelRefs.current[index] = wheel; }}
          position={[x, y, z]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, .055, 18]} />
            <meshStandardMaterial color="#090d10" roughness={.94} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * .029, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[.037, .037, .009, 14]} />
                <meshStandardMaterial color="#66777d" metalness={.72} roughness={.36} />
              </mesh>
              <group>
                {[0, 1, 2, 3, 4].map((spoke) => (
                  <mesh key={spoke} position={[0, .021, 0]} rotation={[spoke * Math.PI * 2 / 5, 0, 0]}>
                    <boxGeometry args={[.008, .035, .009]} />
                    <meshStandardMaterial color="#9baeb3" metalness={.68} roughness={.42} />
                  </mesh>
                ))}
              </group>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}

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
      {/* The source GLB points opposite the simulation's forward (-Z) axis. */}
      <group rotation={[0, CAR_MODEL_YAW_OFFSET, 0]}>
        {children}
        <AnimatedVehicleWheels engineRef={engineRef} />
      </group>
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
    </MovingVehicleRoot>
  );
}