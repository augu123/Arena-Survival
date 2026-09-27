import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ARENA_LIMIT,
  MAX_PARTICLES,
  type AmmoPickup,
  type Bullet,
  type Engine,
  type Enemy,
  type Explosion,
  type GrenadeProjectile,
  type Particle,
} from './game-simulation';

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 18, 12),
  lowSphere: new THREE.SphereGeometry(1, 12, 8),
  capsule: new THREE.CapsuleGeometry(1, .7, 4, 10),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 12),
  torus: new THREE.TorusGeometry(.5, .025, 6, 28),
  particle: new THREE.IcosahedronGeometry(1, 0),
};

const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: '#c69273', roughness: .74 }),
  skinLight: new THREE.MeshStandardMaterial({ color: '#d0a084', roughness: .72 }),
  skinShade: new THREE.MeshStandardMaterial({ color: '#8b5d4c', roughness: .84 }),
  hair: new THREE.MeshStandardMaterial({ color: '#2c211c', roughness: .88 }),
  beard: new THREE.MeshStandardMaterial({ color: '#342822', roughness: .94 }),
  tank: new THREE.MeshStandardMaterial({ color: '#353c3e', roughness: .82 }),
  tankEdge: new THREE.MeshStandardMaterial({ color: '#51595a', roughness: .7 }),
  shorts: new THREE.MeshStandardMaterial({ color: '#171d20', roughness: .82 }),
  cloth: new THREE.MeshStandardMaterial({ color: '#303a3b', roughness: .92 }),
  clothLight: new THREE.MeshStandardMaterial({ color: '#56615f', roughness: .9 }),
  boot: new THREE.MeshStandardMaterial({ color: '#202528', roughness: .8 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#111719', roughness: .96 }),
  steel: new THREE.MeshStandardMaterial({ color: '#728087', metalness: .72, roughness: .3 }),
  aluminum: new THREE.MeshStandardMaterial({ color: '#a4b1b5', metalness: .84, roughness: .24 }),
  rifle: new THREE.MeshStandardMaterial({ color: '#20292d', metalness: .42, roughness: .48 }),
  rifleDark: new THREE.MeshStandardMaterial({ color: '#11191d', metalness: .28, roughness: .58 }),
  riflePanel: new THREE.MeshStandardMaterial({ color: '#3e4a50', metalness: .6, roughness: .3 }),
  cyanMetal: new THREE.MeshStandardMaterial({
    color: '#51dff7',
    emissive: '#18bce1',
    emissiveIntensity: 2.1,
    metalness: .38,
    roughness: .28,
  }),
  cyan: new THREE.MeshBasicMaterial({ color: '#73efff', toneMapped: false }),
  zombieSkin: new THREE.MeshStandardMaterial({ color: '#b7c1bf', roughness: .86 }),
  zombieSkinLight: new THREE.MeshStandardMaterial({ color: '#d0d7d3', roughness: .82 }),
  zombieShadow: new THREE.MeshStandardMaterial({ color: '#707e7e', roughness: .95 }),
  overalls: new THREE.MeshStandardMaterial({ color: '#343d3e', roughness: .95 }),
  overallsDark: new THREE.MeshStandardMaterial({ color: '#202a2c', roughness: .94 }),
  eye: new THREE.MeshBasicMaterial({ color: '#5deaff', toneMapped: false }),
  mouth: new THREE.MeshStandardMaterial({ color: '#342f2e', roughness: 1 }),
  pickup: new THREE.MeshBasicMaterial({ color: '#50dff6', toneMapped: false }),
  groundShadow: new THREE.MeshBasicMaterial({ color: '#03080b', transparent: true, opacity: .32, depthWrite: false }),
};

type Vec3 = [number, number, number];
type PartProps = {
  geometry?: THREE.BufferGeometry;
  material: THREE.Material;
  position?: Vec3;
  scale?: Vec3;
  rotation?: Vec3;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

function Part({
  geometry = GEO.sphere,
  material,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
}: PartProps) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow} dispose={null}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export type OperatorRig = {
  torso: THREE.Group | null;
  hips: THREE.Group | null;
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
  leftLeg: THREE.Group | null;
  rightLeg: THREE.Group | null;
  rifle: THREE.Group | null;
  magazine: THREE.Group | null;
  muzzle: THREE.Group | null;
  weaponLight: THREE.PointLight | null;
};

export type OperatorMotion = {
  time: number;
  speed: number;
  firePulse: number;
  reloadBlend: number;
  damagePulse: number;
};

export function createOperatorRig(): OperatorRig {
  return {
    torso: null,
    hips: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
    rifle: null,
    magazine: null,
    muzzle: null,
    weaponLight: null,
  };
}

function CarbineModel({
  rigRef,
  motionRef,
  scale = 1,
}: {
  rigRef?: MutableRefObject<OperatorRig>;
  motionRef?: MutableRefObject<OperatorMotion>;
  scale?: number;
}) {
  const muzzleRef = useRef<THREE.Group>(null);
  const weaponLightRef = useRef<THREE.PointLight>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const magazineRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (rigRef) {
      rigRef.current.rifle = weaponRef.current;
      rigRef.current.magazine = magazineRef.current;
      rigRef.current.muzzle = muzzleRef.current;
      rigRef.current.weaponLight = weaponLightRef.current;
    }
    const firing = motionRef?.current.firePulse ?? 0;
    const reloading = motionRef?.current.reloadBlend ?? 0;
    if (weaponRef.current) {
      weaponRef.current.position.z = .29 - firing * .16 + reloading * .025;
      weaponRef.current.rotation.x = firing * .12 + reloading * .08;
    }
    if (magazineRef.current) {
      magazineRef.current.position.y = -.16 - Math.sin(reloading * Math.PI) * .16;
      magazineRef.current.rotation.x = reloading * .42;
    }
    if (muzzleRef.current) {
      muzzleRef.current.visible = firing > .015;
      muzzleRef.current.scale.setScalar(.65 + firing * 3.1);
      muzzleRef.current.rotation.z = (motionRef?.current.time ?? 0) * 5;
    }
    if (weaponLightRef.current) weaponLightRef.current.intensity = firing > .015 ? 4.2 : 0;
  });

  return (
    <group ref={weaponRef} position={[.13, .015, .29]} scale={scale} dispose={null}>
      {/* Reinforced polymer stock and receiver */}
      <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, 0, -.2]} scale={[.105, .105, .34]} />
      <Part geometry={GEO.box} material={MAT.rifle} position={[0, .015, .005]} scale={[.17, .17, .39]} />
      <Part geometry={GEO.box} material={MAT.riflePanel} position={[0, .025, -.03]} scale={[.174, .07, .19]} />
      <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, -.1, .035]} scale={[.105, .19, .095]} rotation={[-.12, 0, 0]} />
      <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, .105, .01]} scale={[.12, .035, .29]} />
      {/* Machined barrel, vented handguard, muzzle collar */}
      <Part geometry={GEO.cylinder} material={MAT.aluminum} position={[0, .01, .3]} scale={[.043, .043, .39]} rotation={[Math.PI / 2, 0, 0]} />
      <Part geometry={GEO.box} material={MAT.rifle} position={[0, .018, .22]} scale={[.145, .105, .23]} />
      <Part geometry={GEO.cylinder} material={MAT.rifleDark} position={[0, .01, .48]} scale={[.064, .064, .045]} rotation={[Math.PI / 2, 0, 0]} />
      <Part geometry={GEO.cylinder} material={MAT.steel} position={[0, .01, .514]} scale={[.048, .048, .026]} rotation={[Math.PI / 2, 0, 0]} />
      <Part geometry={GEO.torus} material={MAT.cyanMetal} position={[0, .01, .53]} scale={[.065, .065, .8]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Charging core, barrel light guides, optic, selector and details */}
      <Part geometry={GEO.box} material={MAT.cyanMetal} position={[0, .062, .085]} scale={[.1, .018, .2]} />
      <Part geometry={GEO.box} material={MAT.cyan} position={[0, .065, .3]} scale={[.018, .014, .21]} />
      <Part geometry={GEO.box} material={MAT.riflePanel} position={[0, .14, .01]} scale={[.12, .045, .11]} />
      <Part geometry={GEO.box} material={MAT.aluminum} position={[0, .178, .01]} scale={[.072, .025, .075]} />
      <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, -.09, .17]} scale={[.045, .18, .09]} />
      <Part geometry={GEO.box} material={MAT.riflePanel} position={[-.092, .025, .025]} scale={[.018, .07, .15]} />
      <Part geometry={GEO.box} material={MAT.riflePanel} position={[.092, .025, .025]} scale={[.018, .07, .15]} />
      <Part geometry={GEO.box} material={MAT.steel} position={[0, .143, -.07]} scale={[.13, .018, .22]} />
      <group ref={magazineRef} position={[0, -.16, .005]}>
        <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, -.06, 0]} scale={[.105, .23, .11]} rotation={[.08, 0, 0]} />
        <Part geometry={GEO.box} material={MAT.steel} position={[0, -.175, 0]} scale={[.086, .018, .09]} />
      </group>
      <Part geometry={GEO.box} material={MAT.rifleDark} position={[.105, -.005, -.13]} scale={[.07, .065, .13]} />
      <group ref={muzzleRef} position={[0, .01, .56]} visible={false}>
        <Part geometry={GEO.sphere} material={MAT.cyan} scale={[.09, .09, .2]} />
        <Part geometry={GEO.cone} material={MAT.cyan} position={[0, 0, .15]} scale={[.08, .08, .27]} rotation={[Math.PI / 2, 0, 0]} />
        <pointLight ref={weaponLightRef} color="#54e5ff" intensity={0} distance={2.8} />
      </group>
    </group>
  );
}

export function OperatorCharacter({
  rootRef,
  rigRef,
  motionRef,
}: {
  rootRef: MutableRefObject<THREE.Group | null>;
  rigRef: MutableRefObject<OperatorRig>;
  motionRef: MutableRefObject<OperatorMotion>;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const rig = rigRef.current;
    rig.torso = torsoRef.current;
    rig.hips = hipsRef.current;
    rig.leftArm = leftArmRef.current;
    rig.rightArm = rightArmRef.current;
    rig.leftLeg = leftLegRef.current;
    rig.rightLeg = rightLegRef.current;
    const motion = motionRef.current;
    const stride = Math.min(1, motion.speed);
    const swing = Math.sin(motion.time * 10.5);
    if (hipsRef.current) hipsRef.current.position.y = .91 + Math.abs(swing) * .025 * stride;
    if (torsoRef.current) {
      torsoRef.current.rotation.x = -.035 * stride + motion.damagePulse * .08;
      torsoRef.current.rotation.z = -.045 * swing * stride;
      torsoRef.current.position.y = 1.02 + Math.abs(swing) * .025 * stride;
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * .58 * stride;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * .58 * stride;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -.68 + swing * .28 * stride - motion.firePulse * .12;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -.52 - swing * .24 * stride - motion.firePulse * .24;
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[.43, 28]} />
        <primitive object={MAT.groundShadow} attach="material" />
      </mesh>
      <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[.39, .44, 32]} />
        <meshBasicMaterial color="#48d9f5" transparent opacity={.54} side={THREE.DoubleSide} />
      </mesh>
      <group ref={hipsRef} position={[0, .91, 0]}>
        <Part geometry={GEO.sphere} material={MAT.shorts} position={[0, -.015, 0]} scale={[.255, .21, .18]} />
        <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, .095, .012]} scale={[.45, .055, .29]} />
        <Part geometry={GEO.box} material={MAT.steel} position={[.19, .095, .02]} scale={[.055, .055, .035]} />
        <Part geometry={GEO.box} material={MAT.shorts} position={[-.205, -.015, .03]} scale={[.1, .16, .2]} />
        <Part geometry={GEO.box} material={MAT.shorts} position={[.205, -.015, .03]} scale={[.1, .16, .2]} />
        <Part geometry={GEO.box} material={MAT.riflePanel} position={[-.205, -.04, .137]} scale={[.068, .075, .018]} />
        <Part geometry={GEO.box} material={MAT.riflePanel} position={[.205, -.04, .137]} scale={[.068, .075, .018]} />
      </group>

      <group ref={leftLegRef} position={[-.145, .82, 0]}>
        <Part geometry={GEO.capsule} material={MAT.skin} position={[0, -.2, 0]} scale={[.112, .22, .112]} />
        <Part geometry={GEO.sphere} material={MAT.skinLight} position={[0, -.405, .012]} scale={[.115, .105, .115]} />
        <Part geometry={GEO.capsule} material={MAT.skin} position={[0, -.61, 0]} scale={[.078, .23, .082]} />
        <Part geometry={GEO.cylinder} material={MAT.boot} position={[0, -.815, .038]} scale={[.115, .17, .13]} rotation={[.1, 0, 0]} />
        <Part geometry={GEO.box} material={MAT.rubber} position={[0, -.89, .075]} scale={[.13, .045, .2]} />
        <Part geometry={GEO.box} material={MAT.steel} position={[0, -.79, .1]} scale={[.035, .045, .012]} />
      </group>
      <group ref={rightLegRef} position={[.145, .82, 0]}>
        <Part geometry={GEO.capsule} material={MAT.skin} position={[0, -.2, 0]} scale={[.112, .22, .112]} />
        <Part geometry={GEO.sphere} material={MAT.skinLight} position={[0, -.405, .012]} scale={[.115, .105, .115]} />
        <Part geometry={GEO.capsule} material={MAT.skin} position={[0, -.61, 0]} scale={[.078, .23, .082]} />
        <Part geometry={GEO.cylinder} material={MAT.boot} position={[0, -.815, .038]} scale={[.115, .17, .13]} rotation={[.1, 0, 0]} />
        <Part geometry={GEO.box} material={MAT.rubber} position={[0, -.89, .075]} scale={[.13, .045, .2]} />
        <Part geometry={GEO.box} material={MAT.steel} position={[0, -.79, .1]} scale={[.035, .045, .012]} />
      </group>

      <group ref={torsoRef} position={[0, 1.02, 0]}>
        <Part geometry={GEO.capsule} material={MAT.tank} position={[0, .285, 0]} scale={[.285, .34, .18]} />
        <Part geometry={GEO.sphere} material={MAT.skinLight} position={[0, .39, .143]} scale={[.24, .145, .045]} />
        <Part geometry={GEO.sphere} material={MAT.skinLight} position={[-.105, .22, .15]} scale={[.095, .105, .035]} />
        <Part geometry={GEO.sphere} material={MAT.skinLight} position={[.105, .22, .15]} scale={[.095, .105, .035]} />
        <Part geometry={GEO.box} material={MAT.tankEdge} position={[0, .435, .01]} scale={[.44, .09, .23]} />
        <Part geometry={GEO.cylinder} material={MAT.tank} position={[-.22, .43, .015]} scale={[.13, .13, .22]} rotation={[0, 0, Math.PI / 2]} />
        <Part geometry={GEO.cylinder} material={MAT.tank} position={[.22, .43, .015]} scale={[.13, .13, .22]} rotation={[0, 0, Math.PI / 2]} />
        {/* Abdominal definition and chest seam */}
        {[-.11, -.015, .08].map((y, index) => (
          <Part key={`abs-${index}`} geometry={GEO.sphere} material={MAT.tankEdge} position={[0, y + .11, .157]} scale={[.075, .035, .018]} />
        ))}
        <Part geometry={GEO.box} material={MAT.rifleDark} position={[0, .19, .178]} scale={[.13, .035, .025]} />
        <Part geometry={GEO.cylinder} material={MAT.steel} position={[.04, .08, .183]} scale={[.03, .03, .03]} />
        {/* Radio and belt equipment */}
        <Part geometry={GEO.box} material={MAT.rifleDark} position={[-.22, .18, -.04]} scale={[.09, .22, .13]} />
        <Part geometry={GEO.box} material={MAT.steel} position={[-.22, .19, .035]} scale={[.05, .09, .014]} />
        <Part geometry={GEO.box} material={MAT.shorts} position={[0, -.02, -.01]} scale={[.42, .12, .24]} />

        <group ref={leftArmRef} position={[-.32, .41, .035]}>
          <Part geometry={GEO.capsule} material={MAT.skin} position={[-.02, -.16, .02]} scale={[.105, .19, .11]} rotation={[0, 0, -.22]} />
          <Part geometry={GEO.torus} material={MAT.beard} position={[-.045, -.2, .035]} scale={[.105, .105, .55]} rotation={[Math.PI / 2, 0, -.22]} />
          <group position={[.005, -.31, .08]} rotation={[-.32, 0, .12]}>
            <Part geometry={GEO.capsule} material={MAT.skinLight} position={[0, -.14, .015]} scale={[.083, .18, .085]} />
            <Part geometry={GEO.sphere} material={MAT.rubber} position={[0, -.29, .045]} scale={[.09, .07, .09]} />
            <Part geometry={GEO.box} material={MAT.skinShade} position={[0, -.31, .105]} scale={[.08, .045, .025]} />
          </group>
        </group>
        <group ref={rightArmRef} position={[.32, .41, .035]}>
          <Part geometry={GEO.capsule} material={MAT.skin} position={[.02, -.16, .02]} scale={[.105, .19, .11]} rotation={[0, 0, .22]} />
          <Part geometry={GEO.torus} material={MAT.beard} position={[.045, -.2, .035]} scale={[.105, .105, .55]} rotation={[Math.PI / 2, 0, .22]} />
          <group position={[-.005, -.31, .08]} rotation={[-.38, 0, -.12]}>
            <Part geometry={GEO.capsule} material={MAT.skinLight} position={[0, -.14, .015]} scale={[.083, .18, .085]} />
            <Part geometry={GEO.sphere} material={MAT.rubber} position={[0, -.29, .045]} scale={[.09, .07, .09]} />
            <Part geometry={GEO.box} material={MAT.skinShade} position={[0, -.31, .105]} scale={[.08, .045, .025]} />
          </group>
        </group>
        {/* Head, short hair, brows, beard and facial landmarks */}
        <Part geometry={GEO.cylinder} material={MAT.skinShade} position={[0, .51, 0]} scale={[.075, .15, .075]} />
        <group position={[0, .65, .015]}>
          <Part geometry={GEO.sphere} material={MAT.skin} scale={[.145, .19, .135]} />
          <Part geometry={GEO.sphere} material={MAT.hair} position={[0, .13, -.015]} scale={[.15, .075, .14]} />
          <Part geometry={GEO.sphere} material={MAT.beard} position={[0, -.095, .047]} scale={[.13, .09, .105]} />
          <Part geometry={GEO.sphere} material={MAT.skinLight} position={[0, -.015, .119]} scale={[.023, .045, .018]} />
          <Part geometry={GEO.sphere} material={MAT.rubber} position={[-.052, .035, .119]} scale={[.018, .014, .012]} />
          <Part geometry={GEO.sphere} material={MAT.rubber} position={[.052, .035, .119]} scale={[.018, .014, .012]} />
          <Part geometry={GEO.box} material={MAT.hair} position={[-.052, .063, .12]} scale={[.046, .015, .014]} rotation={[0, 0, -.1]} />
          <Part geometry={GEO.box} material={MAT.hair} position={[.052, .063, .12]} scale={[.046, .015, .014]} rotation={[0, 0, .1]} />
          <Part geometry={GEO.box} material={MAT.beard} position={[0, -.135, .11]} scale={[.085, .035, .03]} />
          <Part geometry={GEO.sphere} material={MAT.skinShade} position={[-.148, -.015, 0]} scale={[.025, .045, .035]} />
          <Part geometry={GEO.sphere} material={MAT.skinShade} position={[.148, -.015, 0]} scale={[.025, .045, .035]} />
        </group>
        <CarbineModel rigRef={rigRef} motionRef={motionRef} scale={.88} />
      </group>
    </group>
  );
}

export function SleeperCharacter({
  enemy,
  rootRef,
}: {
  enemy: Enemy;
  rootRef: MutableRefObject<THREE.Group | null>;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const chestMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#495252', roughness: .94, emissive: '#35d7eb', emissiveIntensity: .025 }),
    [],
  );
  useEffect(() => () => chestMaterial.dispose(), [chestMaterial]);

  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, 0, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    const gait = enemy.moveBlend;
    const step = Math.sin(enemy.phase * 7.2);
    if (torsoRef.current) {
      torsoRef.current.rotation.x = -.14 - enemy.attackPulse * .58 + Math.sin(enemy.phase * 1.3) * .025;
      torsoRef.current.rotation.z = Math.sin(enemy.phase * 2.1) * .045;
      torsoRef.current.position.y = 1.02 + Math.abs(step) * .018 * gait;
    }
    if (headRef.current) headRef.current.rotation.z = .09 + Math.sin(enemy.phase * 1.1) * .11;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -.25 + step * .35 * gait + enemy.attackPulse * .7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -.48 - step * .28 * gait + enemy.attackPulse * 1.1;
    if (leftLegRef.current) leftLegRef.current.rotation.x = step * .53 * gait;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -step * .53 * gait;
    chestMaterial.emissiveIntensity = enemy.hitFlash > 0 ? .9 : .025;
    if (healthFillRef.current) {
      const ratio = Math.max(0, enemy.health / enemy.maxHealth);
      healthFillRef.current.scale.x = ratio;
      healthFillRef.current.position.x = -.21 * (1 - ratio);
    }
  });

  return (
    <group ref={rootRef} dispose={null}>
      <group scale={enemy.variant === 2 ? 1.08 : enemy.variant === 1 ? .94 : 1}>
        <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[.4, 24]} />
          <primitive object={MAT.groundShadow} attach="material" />
        </mesh>
        <group ref={leftLegRef} position={[-.115, .84, 0]}>
          <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[0, -.2, 0]} scale={[.077, .22, .078]} />
          <Part geometry={GEO.capsule} material={MAT.overalls} position={[0, -.14, .012]} scale={[.09, .15, .09]} />
          <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[0, -.405, .005]} scale={[.08, .075, .08]} />
          <Part geometry={GEO.capsule} material={MAT.overalls} position={[0, -.61, 0]} scale={[.07, .21, .072]} />
          <Part geometry={GEO.box} material={MAT.overallsDark} position={[0, -.74, .02]} scale={[.11, .1, .12]} rotation={[0, 0, .08]} />
          <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[0, -.78, .06]} scale={[.035, .105, .07]} />
        </group>
        <group ref={rightLegRef} position={[.115, .84, 0]}>
          <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[0, -.2, 0]} scale={[.077, .22, .078]} />
          <Part geometry={GEO.capsule} material={MAT.overalls} position={[0, -.14, .012]} scale={[.09, .15, .09]} />
          <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[0, -.405, .005]} scale={[.08, .075, .08]} />
          <Part geometry={GEO.capsule} material={MAT.overalls} position={[0, -.61, 0]} scale={[.07, .21, .072]} />
          <Part geometry={GEO.box} material={MAT.overallsDark} position={[0, -.74, .02]} scale={[.11, .1, .12]} rotation={[0, 0, -.08]} />
          <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[0, -.78, .06]} scale={[.035, .105, .07]} />
        </group>
        <group ref={torsoRef} position={[0, 1.02, 0]}>
          <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[0, .29, -.015]} scale={[.19, .33, .14]} />
          <Part geometry={GEO.sphere} material={chestMaterial} position={[0, .23, .12]} scale={[.14, .21, .075]} />
          <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[-.08, .31, .17]} scale={[.08, .12, .038]} />
          <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[.08, .31, .17]} scale={[.08, .12, .038]} />
          <Part geometry={GEO.box} material={MAT.overalls} position={[0, .18, .18]} scale={[.23, .32, .045]} rotation={[-.04, 0, 0]} />
          <Part geometry={GEO.box} material={MAT.overallsDark} position={[-.085, .4, .155]} scale={[.035, .32, .045]} rotation={[0, 0, -.1]} />
          <Part geometry={GEO.box} material={MAT.overallsDark} position={[.085, .4, .155]} scale={[.035, .32, .045]} rotation={[0, 0, .1]} />
          <Part geometry={GEO.box} material={MAT.steel} position={[-.085, .28, .185]} scale={[.045, .035, .018]} />
          <Part geometry={GEO.box} material={MAT.steel} position={[.085, .28, .185]} scale={[.045, .035, .018]} />
          <Part geometry={GEO.box} material={MAT.overallsDark} position={[0, .015, .19]} scale={[.12, .08, .03]} />
          {/* Frayed cloth strips and patched knees */}
          <Part geometry={GEO.cone} material={MAT.overallsDark} position={[-.085, -.12, .12]} scale={[.075, .16, .035]} rotation={[0, 0, .16]} />
          <Part geometry={GEO.cone} material={MAT.overallsDark} position={[.095, -.13, .12]} scale={[.068, .14, .035]} rotation={[0, 0, -.18]} />

          <group ref={leftArmRef} position={[-.23, .43, .015]}>
            <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[-.07, -.18, .01]} scale={[.072, .22, .075]} rotation={[0, 0, -.17]} />
            <group position={[-.12, -.34, .035]} rotation={[-.16, 0, -.12]}>
              <Part geometry={GEO.capsule} material={MAT.zombieSkinLight} position={[0, -.17, .025]} scale={[.062, .2, .065]} />
              <Part geometry={GEO.sphere} material={MAT.zombieSkin} position={[0, -.32, .06]} scale={[.075, .07, .07]} />
              {[-.045, -.015, .015, .045].map((x) => (
                <Part key={`left-finger-${x}`} geometry={GEO.capsule} material={MAT.zombieSkinLight} position={[x, -.385, .09]} scale={[.014, .055, .018]} rotation={[-.18, 0, x * 1.5]} />
              ))}
            </group>
          </group>
          <group ref={rightArmRef} position={[.23, .43, .015]}>
            <Part geometry={GEO.capsule} material={MAT.zombieSkin} position={[.07, -.18, .01]} scale={[.072, .22, .075]} rotation={[0, 0, .17]} />
            <group position={[.12, -.34, .035]} rotation={[-.22, 0, .12]}>
              <Part geometry={GEO.capsule} material={MAT.zombieSkinLight} position={[0, -.17, .025]} scale={[.062, .2, .065]} />
              <Part geometry={GEO.sphere} material={MAT.zombieSkin} position={[0, -.32, .06]} scale={[.075, .07, .07]} />
              {[-.045, -.015, .015, .045].map((x) => (
                <Part key={`right-finger-${x}`} geometry={GEO.capsule} material={MAT.zombieSkinLight} position={[x, -.385, .09]} scale={[.014, .055, .018]} rotation={[-.18, 0, x * 1.5]} />
              ))}
            </group>
          </group>

          <group ref={headRef} position={[0, .67, .025]}>
            <Part geometry={GEO.sphere} material={MAT.zombieSkin} scale={[.14, .17, .135]} />
            <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[0, -.045, .092]} scale={[.095, .085, .065]} />
            <Part geometry={GEO.box} material={MAT.mouth} position={[0, -.09, .145]} scale={[.055, .022, .012]} />
            <Part geometry={GEO.sphere} material={MAT.zombieShadow} position={[-.048, .012, .116]} scale={[.036, .022, .015]} />
            <Part geometry={GEO.sphere} material={MAT.zombieShadow} position={[.048, .012, .116]} scale={[.036, .022, .015]} />
            <Part geometry={GEO.sphere} material={MAT.eye} position={[-.05, .025, .13]} scale={[.022, .016, .012]} />
            <Part geometry={GEO.sphere} material={MAT.eye} position={[.05, .025, .13]} scale={[.022, .016, .012]} />
            <Part geometry={GEO.sphere} material={MAT.zombieSkinLight} position={[0, -.015, .148]} scale={[.025, .04, .024]} />
          </group>
        </group>
        <group ref={(node) => { if (node) node.position.y = 2.2; }}>
          <mesh position={[0, 0, 0]} scale={[.5, .07, .04]}>
            <primitive object={GEO.box} attach="geometry" />
            <meshBasicMaterial color="#11191c" transparent opacity={.8} />
          </mesh>
          <mesh ref={healthFillRef} position={[0, 0, .025]} scale={[1, .045, .018]}>
            <primitive object={GEO.box} attach="geometry" />
            <meshBasicMaterial color={enemy.variant === 2 ? '#f0b564' : '#64deef'} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function BulletMesh({ bullet }: { bullet: Bullet }) {
  const ref = useRef<THREE.Group>(null);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(bullet.x, bullet.y, bullet.z);
    direction.set(bullet.vx, 0, bullet.vz).normalize();
    ref.current.quaternion.setFromUnitVectors(axis, direction);
  });
  return (
    <group ref={ref} dispose={null}>
      <Part geometry={GEO.cylinder} material={MAT.cyan} scale={[.026, .34, .026]} />
      <Part geometry={GEO.sphere} material={MAT.cyan} position={[0, .17, 0]} scale={[.044, .044, .044]} />
    </group>
  );
}

export function GrenadeMesh({ grenade }: { grenade: GrenadeProjectile }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(grenade.x, grenade.y, grenade.z);
    ref.current.rotation.set(grenade.spin * .38, grenade.spin, grenade.spin * .22);
  });
  return (
    <group ref={ref} dispose={null}>
      <Part geometry={GEO.sphere} material={MAT.rifleDark} scale={[.095, .12, .095]} />
      <Part geometry={GEO.cylinder} material={MAT.steel} position={[0, .078, 0]} scale={[.05, .035, .05]} />
      <Part geometry={GEO.torus} material={MAT.cyanMetal} position={[0, .01, 0]} scale={[.092, .092, .55]} rotation={[Math.PI / 2, 0, 0]} />
      <Part geometry={GEO.sphere} material={MAT.cyan} position={[0, .13, 0]} scale={[.02, .02, .02]} />
    </group>
  );
}

export function ExplosionMesh({ explosion }: { explosion: Explosion }) {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const coreMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(.72, 1, 40), []);

  useFrame(() => {
    const progress = Math.max(0, 1 - explosion.life / explosion.duration);
    const fade = Math.max(0, explosion.life / explosion.duration);
    if (ring.current) {
      ring.current.scale.setScalar(.6 + progress * explosion.radius);
      ring.current.position.y = .055 + progress * .14;
    }
    if (core.current) {
      const size = .35 + progress * 1.1;
      core.current.scale.set(size, size * .7, size);
      core.current.position.y = .28 + progress * .42;
    }
    if (ringMaterial.current) ringMaterial.current.opacity = fade * .92;
    if (coreMaterial.current) coreMaterial.current.opacity = fade * .5;
  });

  return (
    <group position={[explosion.x, 0, explosion.z]} dispose={null}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeometry}>
        <meshBasicMaterial ref={ringMaterial} color="#60e8fb" transparent opacity={.92} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={core}>
        <primitive object={GEO.sphere} attach="geometry" />
        <meshBasicMaterial ref={coreMaterial} color="#baf8ff" transparent opacity={.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#4cdef4" intensity={2.4} distance={5} decay={2} />
    </group>
  );
}

export function AmmoPickupMesh({ pickup }: { pickup: AmmoPickup }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.set(pickup.x, .35 + Math.sin(pickup.phase * 2.3) * .09, pickup.z);
    ref.current.rotation.y = clock.elapsedTime * .68;
  });
  return (
    <group ref={ref} dispose={null}>
      <mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.48, .54, 32]} />
        <meshBasicMaterial color="#4bdaf2" transparent opacity={.72} side={THREE.DoubleSide} />
      </mesh>
      <group rotation={[Math.PI / 2, 0, 0]} scale={.55}>
        <CarbineModel />
      </group>
      <pointLight color="#38cde9" intensity={.9} distance={2.3} />
    </group>
  );
}

export function ParticleField({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const particles: Particle[] = engineRef.current.particles;
    const visibleCount = Math.min(particles.length, MAX_PARTICLES);
    for (let index = 0; index < visibleCount; index += 1) {
      const particle = particles[index];
      const life = Math.max(0, particle.life / particle.duration);
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.rotation.set(particle.x * .7, particle.y * 1.3, particle.z * .5);
      dummy.scale.setScalar(particle.size * (.25 + life * .75));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(particle.color);
      mesh.setColorAt(index, color);
    }
    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false} dispose={null}>
      <primitive object={GEO.particle} attach="geometry" />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}