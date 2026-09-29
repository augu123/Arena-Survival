import * as THREE from 'three';

type Limb = 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export type OperatorBones = Record<Limb, { upper: THREE.Bone; lower: THREE.Bone }>;

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * The supplied GLB is one mesh in a standing pose. Skin it in its original
 * coordinate system so its texture, dimensions and existing weapon offset stay
 * intact. Soft weights around the joints avoid hard seams in the mesh.
 */
export function skinOperator(source: THREE.Mesh) {
  const geometry = source.geometry.clone();
  const positions = geometry.getAttribute('position');
  const indices = new Uint16Array(positions.count * 4);
  const weights = new Float32Array(positions.count * 4);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const absX = Math.abs(x);
    const arm = smoothstep(.21, .35, absX)
      * smoothstep(.78, 1.02, y) * (1 - smoothstep(1.61, 1.74, y));
    const leg = smoothstep(.045, .17, absX) * (1 - smoothstep(.77, .96, y));
    const isLeft = x < 0;
    const armAmount = Math.min(1, arm);
    const legAmount = Math.min(1 - armAmount, leg);
    const amount = armAmount + legAmount;
    const lower = armAmount
      ? 1 - smoothstep(1.11, 1.32, y)
      : 1 - smoothstep(.34, .52, y);
    const upperIndex = armAmount ? (isLeft ? 1 : 3) : (isLeft ? 5 : 7);
    const offset = i * 4;
    indices[offset] = 0;
    indices[offset + 1] = upperIndex;
    indices[offset + 2] = upperIndex + 1;
    weights[offset] = 1 - amount;
    weights[offset + 1] = amount * (1 - lower);
    weights[offset + 2] = amount * lower;
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));

  const root = new THREE.Bone();
  root.name = 'operatorRoot';
  const makeLimb = (name: Limb, x: number, y: number, z: number, elbowX: number, elbowY: number) => {
    const upper = new THREE.Bone();
    upper.name = `${name}Upper`;
    upper.position.set(x, y, z);
    root.add(upper);
    const lowerBone = new THREE.Bone();
    lowerBone.name = `${name}Lower`;
    lowerBone.position.set(elbowX, elbowY, 0);
    upper.add(lowerBone);
    return { upper, lower: lowerBone };
  };
  const bones: OperatorBones = {
    leftArm: makeLimb('leftArm', -.32, 1.53, .015, -.035, -.32),
    rightArm: makeLimb('rightArm', .32, 1.53, .015, .035, -.32),
    leftLeg: makeLimb('leftLeg', -.18, .82, 0, 0, -.4),
    rightLeg: makeLimb('rightLeg', .18, .82, 0, 0, -.4),
  };

  const mesh = new THREE.SkinnedMesh(geometry, source.material);
  mesh.name = 'animatedOperator';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.add(root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([
    root,
    bones.leftArm.upper, bones.leftArm.lower,
    bones.rightArm.upper, bones.rightArm.lower,
    bones.leftLeg.upper, bones.leftLeg.lower,
    bones.rightLeg.upper, bones.rightLeg.lower,
  ]));
  return { mesh, bones };
}