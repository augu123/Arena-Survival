import { type MutableRefObject, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import operatorModelUrl from '@assets/base_basic_pbr_1790662051664.glb?url';
import { CarbineModel, type OperatorMotion, type OperatorRig } from './game-models';

export function GLBOperatorCharacter({
  rootRef,
  rigRef,
  motionRef,
}: {
  rootRef: MutableRefObject<THREE.Group | null>;
  rigRef: MutableRefObject<OperatorRig>;
  motionRef: MutableRefObject<OperatorMotion>;
}) {
  const gltf = useLoader(GLTFLoader, operatorModelUrl);
  const bodyRef = useRef<THREE.Group>(null);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((part) => {
      if (part instanceof THREE.Mesh) {
        part.castShadow = true;
        part.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);

  useFrame(() => {
    const motion = motionRef.current;
    rigRef.current.torso = bodyRef.current;
    if (bodyRef.current) {
      const stride = Math.min(1, motion.speed);
      const step = Math.sin(motion.time * 10.5);
      bodyRef.current.position.y = Math.abs(step) * .018 * stride;
      bodyRef.current.rotation.z = -.018 * step * stride;
      bodyRef.current.rotation.x = motion.damagePulse * .035 - motion.firePulse * .025;
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.43, 28]} />
        <meshBasicMaterial color="#03080b" transparent opacity={.32} depthWrite={false} />
      </mesh>
      <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.39, .44, 32]} />
        <meshBasicMaterial color="#48d9f5" transparent opacity={.54} side={THREE.DoubleSide} />
      </mesh>
      <group ref={bodyRef}>
        <primitive object={model} />
        <group position={[.18, 1.12, .14]}>
          <CarbineModel rigRef={rigRef} motionRef={motionRef} scale={.72} />
        </group>
      </group>
    </group>
  );
}