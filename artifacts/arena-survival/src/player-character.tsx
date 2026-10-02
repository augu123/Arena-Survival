import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import playerModelUrl from '@assets/models/player.glb?url';
import { CarbineModel, type OperatorMotion, type OperatorRig } from './game-models';

/**
 * Rigged player model. Clips in the GLB: idle, walk, run and front_kick_01,
 * which plays for the melee strike (F / right mouse).
 */
const CLIPS = { idle: 'idle', walk: 'walk', run: 'run', kick: 'front_kick_01' } as const;

const BODY_HEIGHT = 1.75;
/** Real-world pace the in-place walk/run clips look right at, in m/s. */
const WALK_PACE = 1.6;
const RUN_PACE = 5.2;
/** game.playerSpeed is normalised against this top speed (m/s). */
const PLAYER_TOP_SPEED = 7.4;
const KICK_TIME_SCALE = 1.7;
/** How much of the wind-up to keep before the foot reaches full extension (clip seconds). */
const KICK_LEAD_IN = .22;

const withMeshopt = (loader: GLTFLoader) => { loader.setMeshoptDecoder(MeshoptDecoder); };
useLoader.preload(GLTFLoader, playerModelUrl, withMeshopt);

type Prepared = {
  idle: THREE.AnimationClip;
  walk: THREE.AnimationClip;
  run: THREE.AnimationClip;
  kick: THREE.AnimationClip;
  /** Clip time at which the kicking foot is furthest forward. */
  kickImpact: number;
  height: number;
  offset: THREE.Vector3;
};

const cache = new WeakMap<GLTF, Prepared>();

function prepare(gltf: GLTF): Prepared {
  const hit = cache.get(gltf);
  if (hit) return hit;
  const find = (name: string) => {
    const clip = gltf.animations.find((entry) => entry.name === name);
    if (!clip) throw new Error(`player.glb is missing its "${name}" animation`);
    return clip;
  };
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const center = bounds.getCenter(new THREE.Vector3());
  const kick = find(CLIPS.kick);

  // Find the moment of impact so the strike starts close to it instead of at the
  // beginning of a slow wind-up (the hit itself lands the instant F is pressed).
  const probe = cloneSkinned(gltf.scene);
  const mixer = new THREE.AnimationMixer(probe);
  const action = mixer.clipAction(kick).play();
  const feet = ['mixamorigRightFoot', 'mixamorigLeftFoot'].map((name) => probe.getObjectByName(name)).filter(Boolean) as THREE.Object3D[];
  const foot = new THREE.Vector3();
  let kickImpact = kick.duration * .4;
  let furthest = -Infinity;
  for (let i = 0; i <= 60; i += 1) {
    action.time = (i / 60) * kick.duration;
    mixer.update(0);
    probe.updateMatrixWorld(true);
    for (const bone of feet) {
      bone.getWorldPosition(foot);
      // Forward is +Z for these models; a raised foot counts too.
      const reach = foot.z + foot.y * .5;
      if (reach > furthest) { furthest = reach; kickImpact = action.time; }
    }
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(probe);

  const result: Prepared = {
    idle: find(CLIPS.idle),
    walk: find(CLIPS.walk),
    run: find(CLIPS.run),
    kick,
    kickImpact,
    height: Math.max(bounds.max.y - bounds.min.y, 1e-3),
    offset: new THREE.Vector3(-center.x, -bounds.min.y, -center.z),
  };
  cache.set(gltf, result);
  return result;
}

export function PlayerCharacter({
  rootRef,
  rigRef,
  motionRef,
}: {
  rootRef: MutableRefObject<THREE.Group | null>;
  rigRef: MutableRefObject<OperatorRig>;
  motionRef: MutableRefObject<OperatorMotion>;
}) {
  const gltf = useLoader(GLTFLoader, playerModelUrl, withMeshopt);
  const clips = prepare(gltf);

  const character = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const idle = mixer.clipAction(clips.idle);
    const walk = mixer.clipAction(clips.walk);
    const run = mixer.clipAction(clips.run);
    const kick = mixer.clipAction(clips.kick);
    kick.setLoop(THREE.LoopOnce, 1);
    kick.clampWhenFinished = true;
    for (const action of [idle, walk, run]) {
      action.setEffectiveWeight(0);
      action.play();
    }
    idle.setEffectiveWeight(1);
    const hand = model.getObjectByName('mixamorigRightHand') ?? null;
    return { model, mixer, idle, walk, run, kick, hand };
  }, [gltf.scene, clips]);

  useEffect(() => () => {
    character.mixer.stopAllAction();
    character.mixer.uncacheRoot(character.model);
  }, [character]);

  const scale = BODY_HEIGHT / clips.height;
  const bodyRef = useRef<THREE.Group>(null);
  const gunRef = useRef<THREE.Group>(null);
  const state = useRef({ time: motionRef.current.time, move: 0, run: 0, kick: 0, lastMelee: 0 });
  const handWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame((_frame, delta) => {
    const motion = motionRef.current;
    const s = state.current;
    rigRef.current.torso = bodyRef.current;

    // Simulation time drives the mixer, so pausing freezes the pose.
    const dt = THREE.MathUtils.clamp(motion.time - s.time, 0, .1);
    s.time = motion.time;
    const fade = 1 - Math.exp(-dt * 8);

    // F starts a strike: motion.melee jumps from 0 to just above 0.
    if (motion.melee > 0 && (s.lastMelee === 0 || motion.melee < s.lastMelee)) {
      character.kick.reset();
      character.kick.time = Math.max(0, clips.kickImpact - KICK_LEAD_IN);
      character.kick.setEffectiveTimeScale(KICK_TIME_SCALE);
      character.kick.setEffectiveWeight(1);
      character.kick.play();
    }
    s.lastMelee = motion.melee;
    const kicking = character.kick.isRunning() && character.kick.time < clips.kick.duration - .25;
    s.kick += ((kicking ? 1 : 0) - s.kick) * (1 - Math.exp(-dt * (kicking ? 30 : 6)));

    const metresPerSecond = THREE.MathUtils.clamp(motion.speed, 0, 1) * PLAYER_TOP_SPEED;
    const moving = metresPerSecond > .3 ? 1 : 0;
    const running = metresPerSecond > (WALK_PACE + RUN_PACE) / 2 ? 1 : 0;
    s.move += (moving - s.move) * fade;
    s.run += (running - s.run) * fade;

    const body = 1 - s.kick;
    character.kick.setEffectiveWeight(s.kick);
    character.idle.setEffectiveWeight((1 - s.move) * body);
    character.walk.setEffectiveWeight(s.move * (1 - s.run) * body);
    character.run.setEffectiveWeight(s.move * s.run * body);
    // Backpedalling plays the cycle in reverse.
    const direction = motion.forward < -.2 ? -1 : 1;
    character.walk.setEffectiveTimeScale(direction * THREE.MathUtils.clamp(metresPerSecond / WALK_PACE, .6, 1.8));
    character.run.setEffectiveTimeScale(direction * THREE.MathUtils.clamp(metresPerSecond / RUN_PACE, .7, 1.5));
    character.mixer.update(dt);

    if (bodyRef.current) {
      // Dodge roll and death have no clips in this model, so they stay procedural.
      const fall = motion.dying > 0 ? 1 - Math.pow(1 - Math.min(motion.dying / .6, 1), 3) : 0;
      bodyRef.current.rotation.x = motion.dash > 0 ? motion.dash * Math.PI * 2 : -fall * Math.PI / 2 + motion.damagePulse * .05;
      bodyRef.current.position.y = motion.dash > 0 ? Math.sin(motion.dash * Math.PI) * .45 : fall * .25;
    }

    // The carbine follows the right hand but keeps pointing where the body faces,
    // so it stays usable whatever the arms are doing in the animation.
    if (gunRef.current && character.hand && rootRef.current) {
      character.model.updateMatrixWorld(true);
      character.hand.getWorldPosition(handWorld);
      rootRef.current.worldToLocal(handWorld);
      gunRef.current.position.copy(handWorld);
      gunRef.current.visible = s.kick < .5 && motion.dying <= 0;
    }
  }, -2);

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
      <group ref={bodyRef} position={[0, 0, 0]}>
        <group scale={scale}>
          <primitive object={character.model} position={clips.offset} />
        </group>
      </group>
      <group ref={gunRef}>
        <CarbineModel rigRef={rigRef} motionRef={motionRef} scale={.72} />
      </group>
    </group>
  );
}
