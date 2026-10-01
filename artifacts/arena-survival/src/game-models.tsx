import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  MAX_PARTICLES,
  type Bullet,
  type Engine,
  type Enemy,
  type Explosion,
  type Floater,
  type GrenadeProjectile,
  type HostileShot,
  type Loot,
  type Particle,
  type Telegraph,
} from './game-simulation';

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 18, 12),
  lowSphere: new THREE.SphereGeometry(1, 12, 8),
  capsule: new THREE.CapsuleGeometry(1, .7, 4, 10),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  coin: new THREE.CylinderGeometry(1, 1, .18, 20),
  cone: new THREE.ConeGeometry(1, 1, 12),
  torus: new THREE.TorusGeometry(.5, .025, 6, 28),
  particle: new THREE.IcosahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  disc: new THREE.CircleGeometry(1, 40),
  ring: new THREE.RingGeometry(.86, 1, 48),
  thinRing: new THREE.RingGeometry(.95, 1, 48),
  arc: new THREE.RingGeometry(.6, 1, 24, 1, -Math.PI * .35, Math.PI * .7),
  shell: new THREE.SphereGeometry(1, 28, 16),
  column: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true),
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
  steel: new THREE.MeshStandardMaterial({ color: '#728087', metalness: .8, roughness: .22, envMapIntensity: 1.3 }),
  aluminum: new THREE.MeshStandardMaterial({ color: '#aab7bb', metalness: .9, roughness: .16, envMapIntensity: 1.4 }),
  rifle: new THREE.MeshStandardMaterial({ color: '#20292d', metalness: .46, roughness: .42, envMapIntensity: 1 }),
  rifleDark: new THREE.MeshStandardMaterial({ color: '#11191d', metalness: .3, roughness: .52, envMapIntensity: .9 }),
  riflePanel: new THREE.MeshStandardMaterial({ color: '#3e4a50', metalness: .68, roughness: .24, envMapIntensity: 1.2 }),
  cyanMetal: new THREE.MeshStandardMaterial({ color: '#51dff7', emissive: '#18bce1', emissiveIntensity: 2.1, metalness: .38, roughness: .28 }),
  cyan: new THREE.MeshBasicMaterial({ color: '#73efff', toneMapped: false }),
  crit: new THREE.MeshBasicMaterial({ color: '#ffe38a', toneMapped: false }),
  zombieSkin: new THREE.MeshPhysicalMaterial({ color: '#b7c1bf', roughness: .78, clearcoat: .22, clearcoatRoughness: .55, sheen: .3, sheenColor: '#8fdcef' }),
  zombieSkinLight: new THREE.MeshPhysicalMaterial({ color: '#d0d7d3', roughness: .72, clearcoat: .28, clearcoatRoughness: .5, sheen: .32, sheenColor: '#9fe4f4' }),
  runnerSkin: new THREE.MeshPhysicalMaterial({ color: '#a3aeb8', roughness: .7, clearcoat: .3, clearcoatRoughness: .45 }),
  bruteSkin: new THREE.MeshPhysicalMaterial({ color: '#9c928c', roughness: .82, clearcoat: .12, clearcoatRoughness: .7 }),
  spitterSkin: new THREE.MeshPhysicalMaterial({ color: '#a8b89b', roughness: .7, clearcoat: .35, clearcoatRoughness: .4, sheen: .4, sheenColor: '#9dff8a' }),
  zombieShadow: new THREE.MeshStandardMaterial({ color: '#707e7e', roughness: .95 }),
  overalls: new THREE.MeshStandardMaterial({ color: '#343d3e', roughness: .95 }),
  overallsDark: new THREE.MeshStandardMaterial({ color: '#202a2c', roughness: .94 }),
  eye: new THREE.MeshBasicMaterial({ color: '#5deaff', toneMapped: false }),
  eyeAcid: new THREE.MeshBasicMaterial({ color: '#9dff6a', toneMapped: false }),
  eyeElite: new THREE.MeshBasicMaterial({ color: '#ffcf4a', toneMapped: false }),
  acidSac: new THREE.MeshStandardMaterial({ color: '#79e05c', emissive: '#3fbf2a', emissiveIntensity: 1.4, roughness: .3, transparent: true, opacity: .9 }),
  mouth: new THREE.MeshStandardMaterial({ color: '#342f2e', roughness: 1 }),
  groundShadow: new THREE.MeshBasicMaterial({ color: '#03080b', transparent: true, opacity: .32, depthWrite: false }),
  acid: new THREE.MeshBasicMaterial({ color: '#a4ff7a', toneMapped: false }),
  acidGlow: new THREE.MeshBasicMaterial({ color: '#56e04a', transparent: true, opacity: .35, depthWrite: false, toneMapped: false }),
  gold: new THREE.MeshStandardMaterial({ color: '#ffcf4a', emissive: '#c98a12', emissiveIntensity: .9, metalness: .9, roughness: .25 }),
  heal: new THREE.MeshBasicMaterial({ color: '#7dff96', toneMapped: false }),
  energy: new THREE.MeshBasicMaterial({ color: '#c9a2ff', toneMapped: false }),
  ammoBox: new THREE.MeshStandardMaterial({ color: '#2a3438', metalness: .5, roughness: .4 }),
};

const bossEyeCache = new Map<string, THREE.MeshBasicMaterial>();
const bossEye = (tint: string) => {
  let material = bossEyeCache.get(tint);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ color: tint, toneMapped: false });
    bossEyeCache.set(tint, material);
  }
  return material;
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

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Shortest-path angle interpolation so characters turn instead of snapping. */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let delta = target - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return current + delta * (1 - Math.exp(-lambda * dt));
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
  forward: number;
  firePulse: number;
  reloadBlend: number;
  damagePulse: number;
  /** 0..1 progress through a dodge roll, 0 when not dashing. */
  dash: number;
  /** 0..1 progress through a melee strike. */
  melee: number;
  /** 0..1 casting pose (nova / throw). */
  cast: number;
  /** Seconds since death, 0 while alive. */
  dying: number;
  /** Local (body-space) movement direction for strafing gait. */
  strafe: number;
};

export const idleMotion = (): OperatorMotion => ({ time: 0, speed: 0, forward: 0, firePulse: 0, reloadBlend: 0, damagePulse: 0, dash: 0, melee: 0, cast: 0, dying: 0, strafe: 0 });

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

export function CarbineModel({
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
  const fallRef = useRef<THREE.Group>(null);
  const rollRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // The body is dozens of small parts; let all of them cast into the key light.
    rootRef.current?.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.position.y > .05) child.castShadow = true;
    });
  }, [rootRef]);

  useFrame(() => {
    const rig = rigRef.current;
    rig.torso = torsoRef.current;
    rig.hips = hipsRef.current;
    rig.leftArm = leftArmRef.current;
    rig.rightArm = rightArmRef.current;
    rig.leftLeg = leftLegRef.current;
    rig.rightLeg = rightLegRef.current;
    const motion = motionRef.current;
    const stride = Math.min(1, motion.speed) * (motion.dying > 0 ? 0 : 1);
    const swing = Math.sin(motion.time * 10.5) * (motion.strafe < 0 ? -1 : 1);
    const breathe = Math.sin(motion.time * 2.2);
    const melee = Math.sin(Math.min(1, motion.melee) * Math.PI);
    const meleeWind = motion.melee > 0 ? (motion.melee < .35 ? motion.melee / .35 : 1 - (motion.melee - .35) / .65) : 0;
    const fall = easeOut(motion.dying / .8);

    if (fallRef.current) {
      fallRef.current.rotation.x = -fall * 1.42;
      fallRef.current.position.y = -fall * .05;
    }
    if (rollRef.current) {
      rollRef.current.rotation.x = motion.dash > 0 ? motion.dash * Math.PI * 2 : 0;
      rollRef.current.position.y = .75 - Math.sin(motion.dash * Math.PI) * .38;
    }
    if (hipsRef.current) hipsRef.current.position.y = .91 + Math.abs(swing) * .025 * stride;
    if (torsoRef.current) {
      torsoRef.current.rotation.x = -.035 * stride + motion.damagePulse * .08 + motion.cast * -.12 + melee * .18;
      torsoRef.current.rotation.y = -meleeWind * .95;
      torsoRef.current.rotation.z = -.045 * swing * stride;
      torsoRef.current.position.y = 1.02 + Math.abs(swing) * .025 * stride + breathe * .006;
      torsoRef.current.scale.set(1, 1 + breathe * .01, 1);
    }
    const tuck = motion.dash > 0 ? Math.sin(motion.dash * Math.PI) : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * .58 * stride - tuck * 1.3;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * .58 * stride - tuck * 1.3;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -.68 + swing * .28 * stride - motion.firePulse * .12 - motion.cast * 1.9 - melee * .5;
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -.52 - swing * .24 * stride - motion.firePulse * .24 - motion.cast * 1.6 - melee * 1.1;
      rightArmRef.current.rotation.z = melee * .5;
    }
    if (rig.rifle) rig.rifle.rotation.y = melee * .9;
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
      <group ref={fallRef}>
        <group ref={rollRef} position={[0, .75, 0]}>
          <group position={[0, -.75, 0]}>
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
        </group>
      </group>
    </group>
  );
}

type SleeperLook = {
  skin: THREE.Material;
  skinLight: THREE.Material;
  cloth: THREE.Material;
  clothDark: THREE.Material;
  eye: THREE.Material;
  lean: number;
  bulk: number;
};

function sleeperLook(enemy: Enemy, bossTint: string): SleeperLook {
  const eye = enemy.kind === 'boss' ? bossEye(bossTint) : enemy.elite ? MAT.eyeElite : enemy.kind === 'spitter' ? MAT.eyeAcid : MAT.eye;
  switch (enemy.kind) {
    case 'runner': return { skin: MAT.runnerSkin, skinLight: MAT.zombieSkinLight, cloth: MAT.clothLight, clothDark: MAT.overallsDark, eye, lean: .38, bulk: .88 };
    case 'brute': return { skin: MAT.bruteSkin, skinLight: MAT.bruteSkin, cloth: MAT.overallsDark, clothDark: MAT.rubber, eye, lean: .1, bulk: 1.25 };
    case 'spitter': return { skin: MAT.spitterSkin, skinLight: MAT.spitterSkin, cloth: MAT.overalls, clothDark: MAT.overallsDark, eye, lean: .5, bulk: .95 };
    case 'boss': return { skin: MAT.bruteSkin, skinLight: MAT.zombieShadow, cloth: MAT.rubber, clothDark: MAT.rifleDark, eye, lean: .12, bulk: 1.2 };
    default: return { skin: MAT.zombieSkin, skinLight: MAT.zombieSkinLight, cloth: MAT.overalls, clothDark: MAT.overallsDark, eye, lean: .14, bulk: 1 };
  }
}

export function SleeperCharacter({
  enemy,
  rootRef,
  bossTint = '#ff5a4f',
}: {
  enemy: Enemy;
  rootRef: MutableRefObject<THREE.Group | null>;
  bossTint?: string;
}) {
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const healthRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const portalMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const heading = useRef(Math.atan2(enemy.facingX, enemy.facingZ));
  const look = useMemo(() => sleeperLook(enemy, bossTint), [enemy, bossTint]);
  const chestMaterial = useMemo(() => {
    const glow = enemy.kind === 'boss' ? bossTint : enemy.kind === 'spitter' ? '#7dff5a' : enemy.elite ? '#ffcf4a' : '#35d7eb';
    return new THREE.MeshStandardMaterial({ color: '#495252', roughness: .94, emissive: glow, emissiveIntensity: enemy.kind === 'boss' ? .6 : .025 });
  }, [enemy.kind, enemy.elite, bossTint]);
  useEffect(() => () => chestMaterial.dispose(), [chestMaterial]);
  const isBoss = enemy.kind === 'boss';
  const baseGlow = isBoss ? .6 : enemy.elite ? .35 : .025;

  useFrame((_state, delta) => {
    const dt = Math.min(delta, .05);
    const dying = enemy.death > 0;
    const spawnT = enemy.spawn > 0 ? enemy.spawn / (isBoss ? 1.8 : .9) : 0;
    if (rootRef.current) {
      heading.current = dying ? heading.current : dampAngle(heading.current, Math.atan2(enemy.facingX, enemy.facingZ), 10, dt);
      const sink = dying ? Math.max(0, enemy.death - (isBoss ? 2.2 : 1.1)) * .7 : 0;
      const spawnSink = Math.pow(spawnT, 1.4) * .65 * Math.min(enemy.scale, 1.4);
      const rootY = .02 - spawnSink - sink;
      rootRef.current.position.set(enemy.x, rootY, enemy.z);
      if (portalRef.current) portalRef.current.position.y = .03 - rootY;
      rootRef.current.rotation.y = heading.current;
      const pulse = 1 + enemy.hitFlash * .25;
      rootRef.current.scale.set(enemy.scale * (2 - pulse * 1), enemy.scale * pulse, enemy.scale * (2 - pulse * 1));
    }
    if (bodyRef.current) {
      const fall = dying ? easeOut(enemy.death / (isBoss ? 1.2 : .55)) : 0;
      bodyRef.current.rotation.x = -fall * 1.5;
      bodyRef.current.rotation.z = dying ? fall * (enemy.id % 2 ? .25 : -.25) : 0;
    }
    const gait = dying ? 0 : enemy.moveBlend;
    const cadence = enemy.kind === 'runner' ? 10 : enemy.kind === 'brute' || isBoss ? 5.4 : 7.2;
    const step = Math.sin(enemy.phase * cadence);
    const lunge = enemy.attackPulse / .42;
    if (torsoRef.current) {
      torsoRef.current.rotation.x = -look.lean * (enemy.kind === 'runner' ? gait : 1) - .1 - lunge * .58 + Math.sin(enemy.phase * 1.3) * .025 - (spawnT > 0 ? .5 * spawnT : 0);
      torsoRef.current.rotation.z = Math.sin(enemy.phase * 2.1) * .045 + (enemy.stagger > 0 ? .25 : 0);
      torsoRef.current.position.y = 1.02 + Math.abs(step) * .018 * gait;
    }
    if (headRef.current) {
      headRef.current.rotation.z = .09 + Math.sin(enemy.phase * 1.1) * .11;
      headRef.current.rotation.x = enemy.kind === 'spitter' ? -lunge * .6 : 0;
    }
    const reach = spawnT > 0 ? spawnT * 2.4 : 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -.25 + step * .35 * gait + lunge * (isBoss ? -2.2 : .7) - reach;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -.48 - step * .28 * gait + lunge * (isBoss ? -2.2 : 1.1) - reach;
    if (leftLegRef.current) leftLegRef.current.rotation.x = step * .53 * gait;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -step * .53 * gait;
    chestMaterial.emissiveIntensity = enemy.hitFlash > 0 ? 1.4 : baseGlow + (isBoss && enemy.slamCharge > 0 ? 2 : 0);
    if (healthRef.current) healthRef.current.visible = !dying && !isBoss && enemy.spawn <= 0 && (enemy.health < enemy.maxHealth || enemy.elite);
    if (healthFillRef.current) {
      const ratio = Math.max(0, enemy.health / enemy.maxHealth);
      healthFillRef.current.scale.x = Math.max(.001, ratio);
      healthFillRef.current.position.x = -.25 * (1 - ratio);
    }
    if (portalRef.current && portalMaterialRef.current) {
      portalRef.current.visible = spawnT > 0;
      portalRef.current.rotation.z += dt * 3;
      portalMaterialRef.current.opacity = spawnT * .9;
    }
  });

  const bulk = look.bulk;
  return (
    <group ref={rootRef} dispose={null}>
      <mesh ref={portalRef} position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.75} visible={false}>
        <primitive object={GEO.ring} attach="geometry" />
        <meshBasicMaterial ref={portalMaterialRef} color={isBoss ? bossTint : '#8ef1ff'} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.4, 24]} />
        <primitive object={MAT.groundShadow} attach="material" />
      </mesh>
      {enemy.elite && (
        <mesh position={[0, .045, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.5}>
          <primitive object={GEO.ring} attach="geometry" />
          <meshBasicMaterial color="#ffcf4a" transparent opacity={.7} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <group ref={bodyRef}>
        <group ref={leftLegRef} position={[-.115 * bulk, .84, 0]}>
          <Part geometry={GEO.capsule} material={look.skin} position={[0, -.2, 0]} scale={[.077 * bulk, .22, .078 * bulk]} castShadow />
          <Part geometry={GEO.capsule} material={look.cloth} position={[0, -.14, .012]} scale={[.09 * bulk, .15, .09 * bulk]} />
          <Part geometry={GEO.sphere} material={look.skinLight} position={[0, -.405, .005]} scale={[.08, .075, .08]} />
          <Part geometry={GEO.capsule} material={look.cloth} position={[0, -.61, 0]} scale={[.07 * bulk, .21, .072 * bulk]} />
          <Part geometry={GEO.box} material={look.clothDark} position={[0, -.74, .02]} scale={[.11, .1, .12]} rotation={[0, 0, .08]} />
          <Part geometry={GEO.capsule} material={look.skin} position={[0, -.78, .06]} scale={[.035, .105, .07]} />
        </group>
        <group ref={rightLegRef} position={[.115 * bulk, .84, 0]}>
          <Part geometry={GEO.capsule} material={look.skin} position={[0, -.2, 0]} scale={[.077 * bulk, .22, .078 * bulk]} castShadow />
          <Part geometry={GEO.capsule} material={look.cloth} position={[0, -.14, .012]} scale={[.09 * bulk, .15, .09 * bulk]} />
          <Part geometry={GEO.sphere} material={look.skinLight} position={[0, -.405, .005]} scale={[.08, .075, .08]} />
          <Part geometry={GEO.capsule} material={look.cloth} position={[0, -.61, 0]} scale={[.07 * bulk, .21, .072 * bulk]} />
          <Part geometry={GEO.box} material={look.clothDark} position={[0, -.74, .02]} scale={[.11, .1, .12]} rotation={[0, 0, -.08]} />
          <Part geometry={GEO.capsule} material={look.skin} position={[0, -.78, .06]} scale={[.035, .105, .07]} />
        </group>
        <group ref={torsoRef} position={[0, 1.02, 0]}>
          <Part geometry={GEO.capsule} material={look.skin} position={[0, .29, -.015]} scale={[.19 * bulk, .33, .14 * bulk]} castShadow />
          <Part geometry={GEO.sphere} material={chestMaterial} position={[0, .23, .12 * bulk]} scale={[.14 * bulk, .21, .075]} />
          <Part geometry={GEO.sphere} material={look.skinLight} position={[-.08 * bulk, .31, .17 * bulk]} scale={[.08 * bulk, .12, .038]} />
          <Part geometry={GEO.sphere} material={look.skinLight} position={[.08 * bulk, .31, .17 * bulk]} scale={[.08 * bulk, .12, .038]} />
          <Part geometry={GEO.box} material={look.cloth} position={[0, .18, .18 * bulk]} scale={[.23 * bulk, .32, .045]} rotation={[-.04, 0, 0]} />
          <Part geometry={GEO.box} material={look.clothDark} position={[-.085 * bulk, .4, .155 * bulk]} scale={[.035, .32, .045]} rotation={[0, 0, -.1]} />
          <Part geometry={GEO.box} material={look.clothDark} position={[.085 * bulk, .4, .155 * bulk]} scale={[.035, .32, .045]} rotation={[0, 0, .1]} />
          <Part geometry={GEO.box} material={MAT.steel} position={[-.085 * bulk, .28, .185 * bulk]} scale={[.045, .035, .018]} />
          <Part geometry={GEO.box} material={MAT.steel} position={[.085 * bulk, .28, .185 * bulk]} scale={[.045, .035, .018]} />
          <Part geometry={GEO.cone} material={look.clothDark} position={[-.085, -.12, .12]} scale={[.075, .16, .035]} rotation={[0, 0, .16]} />
          <Part geometry={GEO.cone} material={look.clothDark} position={[.095, -.13, .12]} scale={[.068, .14, .035]} rotation={[0, 0, -.18]} />
          {(enemy.kind === 'brute' || isBoss) && (
            <>
              <Part geometry={GEO.sphere} material={MAT.steel} position={[-.28, .5, 0]} scale={[.16, .1, .16]} rotation={[0, 0, .4]} castShadow />
              <Part geometry={GEO.sphere} material={MAT.steel} position={[.28, .5, 0]} scale={[.16, .1, .16]} rotation={[0, 0, -.4]} castShadow />
            </>
          )}
          {enemy.kind === 'spitter' && (
            <>
              <Part geometry={GEO.sphere} material={MAT.acidSac} position={[0, .42, -.17]} scale={[.16, .18, .13]} />
              <Part geometry={GEO.sphere} material={MAT.acidSac} position={[-.12, .25, -.15]} scale={[.09, .1, .08]} />
              <Part geometry={GEO.sphere} material={MAT.acidSac} position={[.12, .27, -.15]} scale={[.08, .09, .08]} />
            </>
          )}
          {isBoss && [-.3, -.15, 0, .15, .3].map((x) => (
            <Part key={`spine-${x}`} geometry={GEO.cone} material={bossEye(bossTint)} position={[x * .6, .55 - Math.abs(x) * .3, -.12]} scale={[.035, .22 - Math.abs(x) * .3, .035]} rotation={[-.5, 0, -x]} />
          ))}

          <group ref={leftArmRef} position={[-.23 * bulk, .43, .015]}>
            <Part geometry={GEO.capsule} material={look.skin} position={[-.07, -.18, .01]} scale={[.072 * bulk, .22, .075 * bulk]} rotation={[0, 0, -.17]} castShadow />
            <group position={[-.12, -.34, .035]} rotation={[-.16, 0, -.12]}>
              <Part geometry={GEO.capsule} material={look.skinLight} position={[0, -.17, .025]} scale={[.062 * bulk, .2, .065 * bulk]} />
              <Part geometry={GEO.sphere} material={look.skin} position={[0, -.32, .06]} scale={[.075 * bulk, .07, .07]} />
              {[-.045, -.015, .015, .045].map((x) => (
                <Part key={`left-finger-${x}`} geometry={GEO.capsule} material={look.skinLight} position={[x, -.385, .09]} scale={[.014, .055 * (isBoss ? 1.8 : 1), .018]} rotation={[-.18, 0, x * 1.5]} />
              ))}
            </group>
          </group>
          <group ref={rightArmRef} position={[.23 * bulk, .43, .015]}>
            <Part geometry={GEO.capsule} material={look.skin} position={[.07, -.18, .01]} scale={[.072 * bulk, .22, .075 * bulk]} rotation={[0, 0, .17]} castShadow />
            <group position={[.12, -.34, .035]} rotation={[-.22, 0, .12]}>
              <Part geometry={GEO.capsule} material={look.skinLight} position={[0, -.17, .025]} scale={[.062 * bulk, .2, .065 * bulk]} />
              <Part geometry={GEO.sphere} material={look.skin} position={[0, -.32, .06]} scale={[.075 * bulk, .07, .07]} />
              {[-.045, -.015, .015, .045].map((x) => (
                <Part key={`right-finger-${x}`} geometry={GEO.capsule} material={look.skinLight} position={[x, -.385, .09]} scale={[.014, .055 * (isBoss ? 1.8 : 1), .018]} rotation={[-.18, 0, x * 1.5]} />
              ))}
            </group>
          </group>

          <group ref={headRef} position={[0, .67, .025]}>
            <Part geometry={GEO.sphere} material={look.skin} scale={[.14, .17, .135]} castShadow />
            <Part geometry={GEO.sphere} material={look.skinLight} position={[0, -.045, .092]} scale={[.095, .085, .065]} />
            <Part geometry={GEO.box} material={MAT.mouth} position={[0, -.09, .145]} scale={[.055, enemy.kind === 'spitter' ? .05 : .022, .012]} />
            <Part geometry={GEO.sphere} material={MAT.zombieShadow} position={[-.048, .012, .116]} scale={[.036, .022, .015]} />
            <Part geometry={GEO.sphere} material={MAT.zombieShadow} position={[.048, .012, .116]} scale={[.036, .022, .015]} />
            <Part geometry={GEO.sphere} material={look.eye} position={[-.05, .025, .13]} scale={[.022, .016, .012]} />
            <Part geometry={GEO.sphere} material={look.eye} position={[.05, .025, .13]} scale={[.022, .016, .012]} />
            <Part geometry={GEO.sphere} material={look.skinLight} position={[0, -.015, .148]} scale={[.025, .04, .024]} />
            {isBoss && [-.09, 0, .09].map((x) => (
              <Part key={`crown-${x}`} geometry={GEO.cone} material={bossEye(bossTint)} position={[x, .19 - Math.abs(x) * .3, -.01]} scale={[.03, x === 0 ? .16 : .11, .03]} rotation={[0, 0, -x * 2]} />
            ))}
          </group>
        </group>
      </group>
      <group ref={healthRef} position={[0, 2.25, 0]} visible={false}>
        <Billboard>
          <mesh scale={[.56, .075, .02]}>
            <primitive object={GEO.box} attach="geometry" />
            <meshBasicMaterial color="#11191c" transparent opacity={.8} />
          </mesh>
          <mesh ref={healthFillRef} position={[0, 0, .015]} scale={[1, .05, .012]}>
            <boxGeometry args={[.5, 1, 1]} />
            <meshBasicMaterial color={enemy.elite ? '#ffcf4a' : enemy.kind === 'brute' ? '#f0b564' : enemy.kind === 'spitter' ? '#9dff6a' : '#64deef'} toneMapped={false} />
          </mesh>
        </Billboard>
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
  const material = bullet.crit ? MAT.crit : MAT.cyan;
  return (
    <group ref={ref} dispose={null}>
      <Part geometry={GEO.cylinder} material={material} position={[0, -.2, 0]} scale={[.022, .5, .022]} />
      <Part geometry={GEO.sphere} material={material} position={[0, .05, 0]} scale={[.045, .06, .045]} />
    </group>
  );
}

export function HostileShotMesh({ shot }: { shot: HostileShot }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.set(shot.x, shot.y + Math.sin(clock.elapsedTime * 14 + shot.id) * .04, shot.z);
    ref.current.rotation.y = Math.atan2(shot.vx, shot.vz);
  });
  return (
    <group ref={ref} dispose={null}>
      <Part geometry={GEO.lowSphere} material={MAT.acid} scale={[.14, .14, .2]} />
      <Part geometry={GEO.lowSphere} material={MAT.acidGlow} scale={[.3, .3, .38]} />
      <Part geometry={GEO.lowSphere} material={MAT.acidGlow} position={[0, 0, -.35]} scale={[.12, .12, .24]} />
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

const EXPLOSION_COLORS: Record<Explosion['kind'], { ring: string; core: string }> = {
  frag: { ring: '#ff9a4a', core: '#ffe2a8' },
  nova: { ring: '#8ef1ff', core: '#d9b8ff' },
  slam: { ring: '#ff5a4f', core: '#ffb09a' },
  acid: { ring: '#8dff6a', core: '#d6ffbf' },
  levelup: { ring: '#ffd45e', core: '#fff2b0' },
  melee: { ring: '#d8fbff', core: '#ffffff' },
};

export function ExplosionMesh({ explosion, tint }: { explosion: Explosion; tint?: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const coreMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const colors = EXPLOSION_COLORS[explosion.kind];
  const ringColor = explosion.kind === 'slam' && tint ? tint : colors.ring;
  const isShell = explosion.kind === 'nova';

  useFrame(() => {
    const progress = Math.max(0, 1 - explosion.life / explosion.duration);
    const fade = Math.max(0, explosion.life / explosion.duration);
    const grow = easeOut(progress);
    if (ring.current) {
      ring.current.scale.setScalar(.2 + grow * explosion.radius);
      ring.current.position.y = .06 + progress * .1;
    }
    if (core.current) {
      if (isShell) {
        core.current.scale.set(grow * explosion.radius, grow * explosion.radius * .45, grow * explosion.radius);
        core.current.position.y = 0;
      } else {
        const size = explosion.kind === 'melee' ? .3 + grow * .5 : (.3 + grow * .9) * Math.min(1.6, explosion.radius / 2.2);
        core.current.scale.set(size, size * .75, size);
        core.current.position.y = explosion.kind === 'acid' ? .3 : .35 + progress * .6;
      }
    }
    if (ringMaterial.current) ringMaterial.current.opacity = fade * .95;
    if (coreMaterial.current) coreMaterial.current.opacity = fade * (isShell ? .28 : .6);
  });

  return (
    <group position={[explosion.x, 0, explosion.z]} dispose={null}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={GEO.ring} attach="geometry" />
        <meshBasicMaterial ref={ringMaterial} color={ringColor} transparent opacity={.95} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={core}>
        <primitive object={GEO.shell} attach="geometry" />
        <meshBasicMaterial ref={coreMaterial} color={colors.core} transparent opacity={.6} depthWrite={false} toneMapped={false} side={isShell ? THREE.DoubleSide : THREE.FrontSide} />
      </mesh>
    </group>
  );
}

export function TelegraphMesh({ telegraph, tint }: { telegraph: Telegraph; tint: string }) {
  const fill = useRef<THREE.Mesh>(null);
  const fillMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMaterial = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const progress = 1 - telegraph.life / telegraph.duration;
    if (fill.current) fill.current.scale.setScalar(Math.max(.01, progress * telegraph.radius));
    if (fillMaterial.current) fillMaterial.current.opacity = .18 + progress * .3;
    if (edgeMaterial.current) edgeMaterial.current.opacity = .5 + Math.sin(clock.elapsedTime * 30) * .3;
  });
  return (
    <group position={[telegraph.x, .05, telegraph.z]} rotation={[-Math.PI / 2, 0, 0]} dispose={null}>
      <mesh ref={fill}>
        <primitive object={GEO.disc} attach="geometry" />
        <meshBasicMaterial ref={fillMaterial} color="#ff4538" transparent opacity={.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={telegraph.radius}>
        <primitive object={GEO.thinRing} attach="geometry" />
        <meshBasicMaterial ref={edgeMaterial} color={tint} transparent opacity={.7} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LootMesh({ loot }: { loot: Loot }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const bob = loot.vy === 0 ? Math.sin(clock.elapsedTime * 3 + loot.id) * .08 : 0;
    ref.current.position.set(loot.x, loot.y + bob, loot.z);
    ref.current.rotation.y = clock.elapsedTime * 2.2 + loot.id;
    ref.current.visible = loot.life > 4 || Math.sin(clock.elapsedTime * 18) > 0;
  });
  return (
    <group ref={ref} dispose={null}>
      {loot.kind === 'gold' && <Part geometry={GEO.coin} material={MAT.gold} scale={[.16, .16, .16]} rotation={[Math.PI / 2, 0, 0]} />}
      {loot.kind === 'health' && (
        <>
          <Part geometry={GEO.box} material={MAT.heal} scale={[.34, .11, .11]} />
          <Part geometry={GEO.box} material={MAT.heal} scale={[.11, .34, .11]} />
        </>
      )}
      {loot.kind === 'energy' && <Part geometry={GEO.octa} material={MAT.energy} scale={[.17, .24, .17]} />}
      {loot.kind === 'ammo' && (
        <>
          <Part geometry={GEO.box} material={MAT.ammoBox} scale={[.46, .3, .3]} />
          <Part geometry={GEO.box} material={MAT.cyan} position={[0, 0, .152]} scale={[.38, .05, .01]} />
          <Part geometry={GEO.box} material={MAT.cyan} position={[0, 0, -.152]} scale={[.38, .05, .01]} />
        </>
      )}
      <mesh position={[0, -loot.y + .04, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.32}>
        <primitive object={GEO.ring} attach="geometry" />
        <meshBasicMaterial color={loot.kind === 'gold' ? '#ffcf4a' : loot.kind === 'health' ? '#7dff96' : loot.kind === 'energy' ? '#c9a2ff' : '#73efff'} transparent opacity={.55} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function FloaterLabel({ floater }: { floater: Floater }) {
  return (
    <Html position={[floater.x, floater.y, floater.z]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`floater floater-${floater.tone}`}>{floater.text}</div>
    </Html>
  );
}

export function LevelUpPillar({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const ref = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const game = engineRef.current;
    if (!ref.current || !materialRef.current) return;
    const t = game.levelUpFx / 1.4;
    ref.current.visible = t > 0;
    ref.current.position.set(game.playerX, 0, game.playerZ);
    ref.current.rotation.y = clock.elapsedTime * 2;
    ref.current.scale.set(.6 + (1 - t) * .6, 1 + (1 - t) * 3, .6 + (1 - t) * .6);
    materialRef.current.opacity = t * .5;
  });
  return (
    <group ref={ref} visible={false} dispose={null}>
      <mesh position={[0, 1.5, 0]} scale={[1, 3, 1]}>
        <primitive object={GEO.column} attach="geometry" />
        <meshBasicMaterial ref={materialRef} color="#ffd45e" transparent opacity={.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
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
