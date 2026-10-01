import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import wardenModelUrl from '@assets/Tripo+Demo+Model_1790837907580.glb?url';
import type { Enemy } from './game-simulation';

export function WardenCharacter({ enemy, tint }: { enemy: Enemy; tint: string }) {
  const gltf = useLoader(GLTFLoader, wardenModelUrl);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const normalizedModel = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    return {
      model,
      scale: enemy.scale / Math.max(size.y, .001),
      offset: new THREE.Vector3(-center.x, -bounds.min.y, -center.z),
    };
  }, [enemy.scale, gltf.scene]);

  useFrame(() => {
    const spawnT = THREE.MathUtils.clamp(enemy.spawn / 1.8, 0, 1);
    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, .02 - Math.pow(spawnT, 1.4) * .65, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(Math.sin(enemy.phase * 1.35)) * .025;
      bodyRef.current.rotation.z = Math.sin(enemy.phase * 1.8) * .018;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.2 + enemy.hitFlash * 4;
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.02, 1.13, 48]} />
        <meshBasicMaterial color={tint} transparent opacity={.9} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1.4, 0]} color={tint} intensity={1.2} distance={5} />
      <group ref={bodyRef} scale={normalizedModel.scale}>
        <primitive object={normalizedModel.model} position={normalizedModel.offset} />
      </group>
    </group>
  );
}