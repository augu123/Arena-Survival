import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import operatorModelUrl from '@assets/base_basic_pbr_1790662051664.glb?url';
import { CarbineModel, type OperatorMotion, type OperatorRig } from './game-models';
import { skinOperator } from './operator-skin';

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
  const skinned = useMemo(() => {
    const source = gltf.scene.getObjectByName('model');
    if (!(source instanceof THREE.Mesh)) throw new Error('Operator GLB is missing its model mesh');
    return skinOperator(source);
  }, [gltf.scene]);
  useEffect(() => () => {
    skinned.mesh.geometry.dispose();
    skinned.mesh.skeleton.dispose();
  }, [skinned]);
  const strideRef = useRef(0);

  useFrame((_, delta) => {
    const motion = motionRef.current;
    rigRef.current.torso = bodyRef.current;
    const blend = 1 - Math.exp(-Math.min(delta, .05) * 12);
    strideRef.current = THREE.MathUtils.lerp(strideRef.current, THREE.MathUtils.clamp(motion.speed, 0, 1), blend);
    const stride = strideRef.current;
    const step = Math.sin(motion.time * 10.5);
    const breathing = Math.sin(motion.time * 2.3);
    const fire = THREE.MathUtils.clamp(motion.firePulse / .12, 0, 1);
    const { leftArm, rightArm, leftLeg, rightLeg } = skinned.bones;
    const forward = THREE.MathUtils.clamp(motion.forward, -1, 1);
    const strafe = THREE.MathUtils.clamp(motion.strafe, -1, 1);
    const gait = step * stride * (forward < -.15 ? -1 : 1);

    leftLeg.upper.rotation.x = gait * .48;
    rightLeg.upper.rotation.x = -gait * .48;
    leftLeg.upper.rotation.z = -step * .13 * strafe;
    rightLeg.upper.rotation.z = step * .13 * strafe;
    leftLeg.lower.rotation.x = Math.max(0, -step) * .52 * stride;
    rightLeg.lower.rotation.x = Math.max(0, step) * .52 * stride;
    leftArm.upper.rotation.x = -.13 - step * .13 * stride - breathing * .018 + fire * .09;
    rightArm.upper.rotation.x = -.18 + step * .11 * stride - breathing * .018 + fire * .16;
    leftArm.lower.rotation.x = -.17 - fire * .08;
    rightArm.lower.rotation.x = -.22 - fire * .12;
    leftArm.upper.rotation.z = -.015 - .02 * step * stride;
    rightArm.upper.rotation.z = .015 - .02 * step * stride;

    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(step) * .015 * stride + breathing * .004;
      bodyRef.current.rotation.z = -.012 * step * stride;
      bodyRef.current.rotation.x = motion.damagePulse * .035 - fire * .02;
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
        <primitive object={skinned.mesh} />
        <group position={[.18, 1.12, .14]}>
          <CarbineModel rigRef={rigRef} motionRef={motionRef} scale={.72} />
        </group>
      </group>
    </group>
  );
}