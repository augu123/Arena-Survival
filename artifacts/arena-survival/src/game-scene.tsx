import { Component, type MutableRefObject, type PointerEvent, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LEVELS, type LevelDef } from './game-levels';
import {
  ARENA_CAR,
  DASH_DURATION,
  currentLevel,
  stepGame,
  toHud,
  ventState,
  type Bullet,
  type Engine,
  type Enemy,
  type Explosion,
  type Floater,
  type GrenadeProjectile,
  type HostileShot,
  type HudStats,
  type InputState,
  type Loot,
  type Telegraph,
} from './game-simulation';
import {
  BulletMesh,
  createOperatorRig,
  ExplosionMesh,
  FloaterLabel,
  GrenadeMesh,
  HostileShotMesh,
  idleMotion,
  LevelUpPillar,
  LootMesh,
  OperatorCharacter,
  ParticleField,
  SleeperCharacter,
  TelegraphMesh,
  type OperatorMotion,
} from './game-models';
import { ArenaCarModel, ArenaCarPlaceholder } from './arena-car';
import { MiniBossCharacter } from './mini-boss-character';
import { WardenCharacter } from './warden-character';
import { GLBOperatorCharacter } from './glb-operator-character';
import { ArenaGeometry, LevelLighting } from './arena-environment';

export type { GameStatus, HudStats, InputState } from './game-simulation';

type SceneProps = {
  active: boolean;
  /** False while the title menu is up - the camera does a slow flyover instead. */
  started: boolean;
  resetKey: number;
  levelIndex: number;
  engineRef: MutableRefObject<Engine>;
  inputRef: MutableRefObject<InputState>;
  onHud: (stats: HudStats) => void;
  onGameOver: (stats: HudStats) => void;
  onPause: () => void;
  onLevelUp: () => void;
  onLevelComplete: (stats: HudStats) => void;
};

// ── Pointer lock ────────────────────────────────────────────────────────────

let suppressUnlockPause = false;

/** Leave mouse-look without the unlock being treated as "player hit Esc". */
export function releasePointer() {
  if (typeof document === 'undefined' || !document.pointerLockElement) return;
  suppressUnlockPause = true;
  document.exitPointerLock();
}

export function capturePointer() {
  if (typeof document === 'undefined') return;
  const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas canvas');
  if (!canvas || document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
  try {
    const result = canvas.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => undefined);
  } catch {
    // Pointer lock is optional (embedded previews often refuse it); drag-to-look still works.
  }
}

// ── Keyboard ────────────────────────────────────────────────────────────────

function useKeyboard(inputRef: MutableRefObject<InputState>, active: boolean, onPause: () => void) {
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const down = event.type === 'keydown';
      inputRef.current.keys[event.code] = down;
      if (down && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) event.preventDefault();
      if (down && !event.repeat && active && (event.code === 'KeyP' || (event.code === 'Escape' && !document.pointerLockElement))) pauseRef.current();
    };
    const releaseKeys = () => {
      inputRef.current.fire = false;
      inputRef.current.keys = {};
    };
    const releaseFire = () => { inputRef.current.fire = false; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', releaseKeys);
    window.addEventListener('pointerup', releaseFire);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', releaseKeys);
      window.removeEventListener('pointerup', releaseFire);
    };
  }, [active, inputRef]);
}

// Shared by the 3D loop and the 2D fallback: step the sim, fire callbacks.
function useGameCallbacks(props: SceneProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const hudClock = useRef(0);
  const notifiedLevel = useRef(-1);
  return (rawDelta: number) => {
    const { engineRef, inputRef, onHud, onGameOver, onLevelUp, onLevelComplete } = callbacks.current;
    const game = engineRef.current;
    const events = stepGame(game, inputRef.current, rawDelta);
    if (game.ended) {
      onGameOver(toHud(game));
      return events;
    }
    if (game.levelComplete && notifiedLevel.current !== game.epoch) {
      notifiedLevel.current = game.epoch;
      onLevelComplete(toHud(game));
      return events;
    }
    if (game.pendingLevelUps > 0 && game.perkChoices.length > 0 && game.dying <= 0 && !game.levelComplete) {
      onHud(toHud(game));
      onLevelUp();
      return events;
    }
    hudClock.current += Math.min(rawDelta, .05);
    if (hudClock.current >= .08) {
      hudClock.current = 0;
      onHud(toHud(game));
    }
    return events;
  };
}

// ── Arena ───────────────────────────────────────────────────────────────────
// Arena geometry, materials, hazards and level lighting live in arena-environment.tsx.

function PostFX() {
  return (
    <EffectComposer multisampling={4} enableNormalPass>
      <N8AO aoRadius={.9} intensity={2} distanceFalloff={1} color="#02070a" halfRes />
      <Bloom mipmapBlur luminanceThreshold={.35} luminanceSmoothing={.35} intensity={.9} radius={.62} />
    </EffectComposer>
  );
}

class SceneErrorBoundary extends Component<
  { context: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.context} failed; switching to its fallback.`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** One pooled light that flashes on explosions - avoids adding/removing lights (shader recompiles). */
function FlashLight({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const light = ref.current;
    if (!light) return;
    const latest = engineRef.current.explosions.at(-1);
    if (!latest || latest.kind === 'melee' || latest.kind === 'acid') {
      light.intensity = 0;
      return;
    }
    const fade = latest.life / latest.duration;
    light.position.set(latest.x, 1.2, latest.z);
    light.color.set(latest.kind === 'frag' ? '#ff9a4a' : latest.kind === 'fire' ? '#ff7c39' : latest.kind === 'nova' ? '#8ef1ff' : latest.kind === 'levelup' ? '#ffd45e' : '#ff5a4f');
    light.intensity = fade * 30;
  });
  return <pointLight ref={ref} intensity={0} distance={9} decay={2} />;
}

// ── Third-person camera ─────────────────────────────────────────────────────

function ThirdPersonCamera({ engineRef, inputRef, active, started, onPause, resetKey }: {
  engineRef: MutableRefObject<Engine>;
  inputRef: MutableRefObject<InputState>;
  active: boolean;
  started: boolean;
  onPause: () => void;
  resetKey: number;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(.26);
  const distance = useRef(5.4);
  const epoch = useRef(-1);
  const activeRef = useRef(active);
  const pauseRef = useRef(onPause);
  activeRef.current = active;
  pauseRef.current = onPause;
  const temp = useMemo(() => ({
    desired: new THREE.Vector3(),
    target: new THREE.Vector3(),
    look: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  }), []);

  useEffect(() => {
    yaw.current = 0;
    pitch.current = .26;
  }, [resetKey]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = 62;
    perspective.far = 160;
    perspective.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    const element = gl.domElement;
    element.style.touchAction = 'none';
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: globalThis.PointerEvent) => {
      if (!activeRef.current) return;
      lastX = event.clientX;
      lastY = event.clientY;
      dragging = true;
      if (event.pointerType === 'mouse') {
        if (!document.pointerLockElement) capturePointer();
        if (event.button === 0) inputRef.current.fire = true;
        if (event.button === 2) inputRef.current.keys.MouseRight = true;
      }
    };
    const onMove = (event: globalThis.PointerEvent) => {
      if (!activeRef.current) return;
      if (document.pointerLockElement === element) {
        // Chrome can report a bogus jump right after the pointer locks; drop those spikes.
        if (Math.abs(event.movementX) < 300 && Math.abs(event.movementY) < 300) {
          inputRef.current.lookDX += event.movementX;
          inputRef.current.lookDY += event.movementY;
        }
      } else if (dragging) {
        inputRef.current.lookDX += (event.clientX - lastX) * (event.pointerType === 'mouse' ? 1 : 1.6);
        inputRef.current.lookDY += (event.clientY - lastY) * (event.pointerType === 'mouse' ? 1 : 1.6);
      }
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onUp = (event: globalThis.PointerEvent) => {
      dragging = false;
      if (event.pointerType === 'mouse') {
        if (event.button === 0) inputRef.current.fire = false;
        if (event.button === 2) inputRef.current.keys.MouseRight = false;
      }
    };
    const onWheel = (event: WheelEvent) => {
      distance.current = THREE.MathUtils.clamp(distance.current + event.deltaY * .004, 3.2, 9);
    };
    const onContext = (event: Event) => event.preventDefault();
    const onLockChange = () => {
      if (document.pointerLockElement === element) return;
      inputRef.current.fire = false;
      if (suppressUnlockPause) {
        suppressUnlockPause = false;
        return;
      }
      if (activeRef.current) pauseRef.current();
    };
    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    element.addEventListener('wheel', onWheel, { passive: true });
    element.addEventListener('contextmenu', onContext);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContext);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [gl, inputRef]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, .05);
    const game = engineRef.current;
    const input = inputRef.current;
    const level = currentLevel(game);

    if (!started) {
      const t = state.clock.elapsedTime * .08;
      camera.position.set(Math.sin(t) * level.radius * .85, 5.5, Math.cos(t) * level.radius * .85);
      camera.lookAt(0, 1.2, 0);
      return;
    }
    if (epoch.current !== game.epoch) {
      epoch.current = game.epoch;
      yaw.current = 0;
      pitch.current = .26;
    }

    if (active) {
      yaw.current -= input.lookDX * .0024;
      pitch.current += input.lookDY * .002;
      if (input.keys.ArrowLeft) yaw.current += 2.3 * dt;
      if (input.keys.ArrowRight) yaw.current -= 2.3 * dt;
      pitch.current = THREE.MathUtils.clamp(pitch.current, -.12, 1.05);
    }
    input.lookDX = 0;
    input.lookDY = 0;
    input.cameraYaw = yaw.current;

    const sin = Math.sin(yaw.current);
    const cos = Math.cos(yaw.current);
    const fx = -sin;
    const fz = -cos;
    const rx = cos;
    const rz = -sin;
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);
    const shoulder = .85;
    const dying = game.dying > 0;
    const orbit = dying ? distance.current + Math.min(game.dying, 2) * 1.5 : distance.current;

    temp.target.set(game.playerX + rx * shoulder, 2.25, game.playerZ + rz * shoulder);
    // Pull the camera in if it would end up outside the arena wall.
    let reach = orbit;
    for (let step = 0; step < 8; step += 1) {
      const px = temp.target.x - fx * reach * cp;
      const pz = temp.target.z - fz * reach * cp;
      if (Math.hypot(px, pz) < level.radius + .6) break;
      reach *= .85;
    }
    temp.desired.set(temp.target.x - fx * reach * cp, Math.max(.45, temp.target.y + reach * sp), temp.target.z - fz * reach * cp);
    // Lock to the player: any easing here makes the character drift inside the frame.
    camera.position.copy(temp.desired);
    const shake = active ? game.cameraShake : 0;
    if (shake > 0) {
      camera.position.x += (Math.random() - .5) * shake * .35;
      camera.position.y += (Math.random() - .5) * shake * .3;
    }
    temp.dir.set(fx * cp, -sp, fz * cp);
    temp.look.copy(camera.position).add(temp.dir);
    camera.lookAt(temp.look);

    // Crosshair ray → the point on the bullet plane the weapon should aim at.
    const planeY = 1.3;
    let aimX = game.playerX + fx * 30;
    let aimZ = game.playerZ + fz * 30;
    if (temp.dir.y < -.02) {
      const t = (planeY - camera.position.y) / temp.dir.y;
      if (t > 0) {
        const hitX = camera.position.x + temp.dir.x * t;
        const hitZ = camera.position.z + temp.dir.z * t;
        if (Math.hypot(hitX - game.playerX, hitZ - game.playerZ) > 2.2) {
          aimX = hitX;
          aimZ = hitZ;
        } else {
          aimX = game.playerX + fx * 2.2;
          aimZ = game.playerZ + fz * 2.2;
        }
      }
    }
    input.aimX = aimX;
    input.aimZ = aimZ;
  });
  return null;
}

// ── Game loop (3D) ──────────────────────────────────────────────────────────

function SceneEntities(props: SceneProps & { level: LevelDef }) {
  const { active, started, engineRef, inputRef, onPause, level } = props;
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [corpses, setCorpses] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [shots, setShots] = useState<HostileShot[]>([]);
  const [grenades, setGrenades] = useState<GrenadeProjectile[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [telegraphs, setTelegraphs] = useState<Telegraph[]>([]);
  const [loot, setLoot] = useState<Loot[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const playerRef = useRef<THREE.Group | null>(null);
  const rigRef = useRef(createOperatorRig());
  const motionRef = useRef<OperatorMotion>(idleMotion());
  const heading = useRef(Math.PI);
  const combatHold = useRef(0);
  const syncedEpoch = useRef(-1);
  const step = useGameCallbacks(props);
  useKeyboard(inputRef, active, onPause);

  useFrame((_state, rawDelta) => {
    const game = engineRef.current;
    if (syncedEpoch.current !== game.epoch) {
      syncedEpoch.current = game.epoch;
      setEnemies([...game.enemies]);
      setCorpses([...game.corpses]);
      setBullets([...game.bullets]);
      setShots([...game.hostileShots]);
      setGrenades([...game.grenades]);
      setExplosions([...game.explosions]);
      setTelegraphs([...game.telegraphs]);
      setLoot([...game.loot]);
      setFloaters([...game.floaters]);
      heading.current = game.facing;
    }
    const dt = Math.min(rawDelta, .05);
    if (active && !game.ended) {
      const events = step(rawDelta);
      if (events.enemiesChanged) setEnemies([...game.enemies]);
      if (events.corpsesChanged) setCorpses([...game.corpses]);
      if (events.bulletsChanged) setBullets([...game.bullets]);
      if (events.shotsChanged) setShots([...game.hostileShots]);
      if (events.grenadesChanged) setGrenades([...game.grenades]);
      if (events.explosionsChanged) setExplosions([...game.explosions]);
      if (events.telegraphsChanged) setTelegraphs([...game.telegraphs]);
      if (events.lootChanged) setLoot([...game.loot]);
      if (events.floatersChanged) setFloaters([...game.floaters]);
    }

    // Face where you're running; snap to the crosshair while fighting (and briefly after).
    const fighting = inputRef.current.fire || game.firePulse > 0 || game.meleeTimer > 0 || game.castTimer > 0 || game.vehicle.driving;
    combatHold.current = fighting ? .6 : Math.max(0, combatHold.current - dt);
    const moving = Math.hypot(game.playerVX, game.playerVZ) > .6;
    const targetHeading = combatHold.current > 0 || !moving
      ? game.facing
      : Math.atan2(game.playerVX, game.playerVZ);
    let delta = targetHeading - heading.current;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    heading.current += delta * (1 - Math.exp(-dt * (combatHold.current > 0 ? 28 : 16)));
    if (playerRef.current) {
      playerRef.current.position.set(game.playerX, .02, game.playerZ);
      playerRef.current.rotation.y = heading.current;
      playerRef.current.visible = !game.vehicle.driving;
    }
    // Gait is measured against the body's actual heading so legs match the travel direction.
    const bodySin = Math.sin(heading.current);
    const bodyCos = Math.cos(heading.current);
    const forwardSpeed = game.playerVX * bodySin + game.playerVZ * bodyCos;
    const lateralSpeed = game.playerVX * bodyCos - game.playerVZ * bodySin;
    motionRef.current = {
      time: game.playerPhase,
      speed: game.dashTimer > 0 ? 0 : game.playerSpeed,
      forward: Math.max(-1, Math.min(1, forwardSpeed / 7.4)),
      firePulse: game.firePulse,
      reloadBlend: game.reloadDuration > 0 ? 1 - game.reloadTimer / game.reloadDuration : 0,
      damagePulse: game.damageFlash,
      dash: game.dashTimer > 0 ? 1 - game.dashTimer / DASH_DURATION : 0,
      melee: game.meleeTimer > 0 ? 1 - game.meleeTimer / .38 : 0,
      cast: Math.min(1, game.castTimer * 3),
      dying: game.dying,
      strafe: Math.max(-1, Math.min(1, lateralSpeed / 7.4)),
    };
  }, -3);

  const tint = level.boss.tint;
  return (
    <>
      {started && (
        <SceneErrorBoundary
          context="Car model"
          fallback={<ArenaCarPlaceholder engineRef={engineRef} />}
        >
          <Suspense fallback={<ArenaCarPlaceholder engineRef={engineRef} />}>
            <ArenaCarModel engineRef={engineRef} />
          </Suspense>
        </SceneErrorBoundary>
      )}
      {started && (
        <SceneErrorBoundary
          context="Operator model"
          fallback={<OperatorCharacter rootRef={playerRef} rigRef={rigRef} motionRef={motionRef} />}
        >
          <Suspense fallback={<OperatorCharacter rootRef={playerRef} rigRef={rigRef} motionRef={motionRef} />}>
            <GLBOperatorCharacter rootRef={playerRef} rigRef={rigRef} motionRef={motionRef} />
          </Suspense>
        </SceneErrorBoundary>
      )}
      {enemies.map((enemy) => <EnemyEntity key={enemy.id} enemy={enemy} tint={tint} />)}
      {corpses.map((enemy) => <EnemyEntity key={`corpse-${enemy.id}`} enemy={enemy} tint={tint} />)}
      {bullets.map((bullet) => <BulletMesh key={bullet.id} bullet={bullet} />)}
      {shots.map((shot) => <HostileShotMesh key={shot.id} shot={shot} />)}
      {grenades.map((grenade) => <GrenadeMesh key={grenade.id} grenade={grenade} />)}
      {explosions.map((explosion) => <ExplosionMesh key={explosion.id} explosion={explosion} tint={tint} />)}
      {telegraphs.map((telegraph) => <TelegraphMesh key={telegraph.id} telegraph={telegraph} tint={tint} />)}
      {loot.map((item) => <LootMesh key={item.id} loot={item} />)}
      {floaters.map((floater) => <FloaterLabel key={floater.id} floater={floater} />)}
      <LevelUpPillar engineRef={engineRef} />
      <ParticleField engineRef={engineRef} />
      <FlashLight engineRef={engineRef} />
    </>
  );
}

function TeowerineFallback({ enemy }: { enemy: Enemy }) {
  const rootRef = useRef<THREE.Group>(null);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const healthMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.position.set(enemy.x, .02, enemy.z);
      rootRef.current.rotation.y = Math.atan2(enemy.facingX, enemy.facingZ);
    }
    const ratio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
    if (healthFillRef.current) {
      healthFillRef.current.scale.x = ratio;
      healthFillRef.current.position.x = -.62 * (1 - ratio);
    }
    healthMaterialRef.current?.color.set(enemy.hitFlash > 0 ? '#fff2d4' : '#e8a843');
  });

  return (
    <group ref={rootRef}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.54, .61, 36]} />
        <meshBasicMaterial color="#e8a843" transparent opacity={.82} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} color="#e8a843" intensity={.8} distance={3.8} />
      <mesh position={[0, .78, 0]} castShadow>
        <capsuleGeometry args={[.43, .82, 5, 9]} />
        <meshStandardMaterial color="#91652f" roughness={.82} />
      </mesh>
      <mesh position={[0, 1.48, .02]} castShadow>
        <sphereGeometry args={[.31, 16, 12]} />
        <meshStandardMaterial color="#c09252" roughness={.7} />
      </mesh>
      <mesh position={[-.12, 1.5, .28]}>
        <sphereGeometry args={[.035, 8, 6]} />
        <meshBasicMaterial color="#ffe29a" toneMapped={false} />
      </mesh>
      <mesh position={[.12, 1.5, .28]}>
        <sphereGeometry args={[.035, 8, 6]} />
        <meshBasicMaterial color="#ffe29a" toneMapped={false} />
      </mesh>
      <group position={[0, 2.3, 0]}>
        <mesh>
          <boxGeometry args={[1.3, .105, .045]} />
          <meshBasicMaterial color="#10171b" />
        </mesh>
        <mesh ref={healthFillRef} position={[-.62, 0, .03]}>
          <boxGeometry args={[1.2, .055, .025]} />
          <meshBasicMaterial ref={healthMaterialRef} color="#e8a843" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function EnemyEntity({ enemy, tint }: { enemy: Enemy; tint: string }) {
  const rootRef = useRef<THREE.Group | null>(null);
  if (enemy.kind === 'boss') {
    const fallback = <SleeperCharacter enemy={enemy} rootRef={rootRef} bossTint={tint} />;
    return (
      <SceneErrorBoundary context="Warden model" fallback={fallback}>
        <Suspense fallback={fallback}>
          <WardenCharacter enemy={enemy} tint={tint} />
        </Suspense>
      </SceneErrorBoundary>
    );
  }
  if (enemy.kind === 'teowerine') {
    const fallback = <TeowerineFallback enemy={enemy} />;
    return (
      <SceneErrorBoundary context="Teowerine model" fallback={fallback}>
        <Suspense fallback={fallback}>
          <MiniBossCharacter enemy={enemy} />
        </Suspense>
      </SceneErrorBoundary>
    );
  }
  return <SleeperCharacter enemy={enemy} rootRef={rootRef} bossTint={tint} />;
}

// ── 2D fallback (no WebGL) ──────────────────────────────────────────────────

function FallbackScene(props: SceneProps) {
  const { active, inputRef, engineRef, onPause, resetKey } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const step = useGameCallbacks(props);
  const stepRef = useRef(step);
  stepRef.current = step;
  useKeyboard(inputRef, active, onPause);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let previousTime = 0;
    const size = { width: 0, height: 0, dpr: 1 };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.width = Math.max(1, bounds.width);
      size.height = Math.max(1, bounds.height);
      size.dpr = dpr;
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const game = engineRef.current;
      const level = currentLevel(game);
      const now = performance.now();
      const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
      previousTime = now;
      inputRef.current.cameraYaw = 0;
      if (active && !game.ended) stepRef.current(dt);

      const { width, height } = size;
      const scale = Math.min(width, height) / (level.radius * 2.35);
      const cx = width / 2;
      const cy = height / 2;
      const sx = (x: number) => cx + x * scale;
      const sy = (z: number) => cy + z * scale;
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.fillStyle = level.theme.sky;
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(cx, cy, (level.radius + 1) * scale, 0, Math.PI * 2);
      ctx.fillStyle = level.theme.wall;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, level.radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#2b333a';
      ctx.fill();
      ctx.strokeStyle = level.theme.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      for (const hazard of level.hazards) {
        const vent = ventState(hazard, game.time);
        ctx.beginPath();
        ctx.arc(sx(hazard.x), sy(hazard.z), hazard.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = hazard.kind === 'toxic' ? 'rgba(70,214,114,.45)' : vent.state === 'active' ? 'rgba(255,138,61,.85)' : vent.state === 'warn' ? `rgba(255,138,61,${.2 + vent.intensity * .4})` : 'rgba(40,30,25,.8)';
        ctx.fill();
      }
      for (const obstacle of level.obstacles) {
        ctx.fillStyle = obstacle.kind === 'crate' ? '#6b4f35' : '#6a767c';
        ctx.fillRect(sx(obstacle.x - obstacle.halfX), sy(obstacle.z - obstacle.halfZ), obstacle.halfX * 2 * scale, obstacle.halfZ * 2 * scale);
      }
      ctx.save();
      ctx.translate(sx(game.vehicle.x), sy(game.vehicle.z));
      ctx.rotate(-game.vehicle.heading);
      ctx.fillStyle = '#090e12';
      for (const side of [-1, 1]) {
        ctx.fillRect(side * .55 * scale - .11 * scale, -1.08 * scale, .22 * scale, .43 * scale);
        ctx.fillRect(side * .55 * scale - .11 * scale, .65 * scale, .22 * scale, .43 * scale);
      }
      ctx.fillStyle = '#a66d34';
      ctx.fillRect(-.45 * scale, -1.22 * scale, .9 * scale, 2.45 * scale);
      ctx.fillStyle = '#79cde0';
      ctx.fillRect(-.32 * scale, -.8 * scale, .64 * scale, .55 * scale);
      ctx.fillStyle = '#f6d98e';
      ctx.fillRect(-.3 * scale, -1.12 * scale, .14 * scale, .08 * scale);
      ctx.fillRect(.16 * scale, -1.12 * scale, .14 * scale, .08 * scale);
      if (game.vehicle.driving) {
        ctx.strokeStyle = '#48d9f5';
        ctx.lineWidth = 2;
        ctx.strokeRect(-ARENA_CAR.halfX * scale - 2, -ARENA_CAR.halfZ * scale - 2, ARENA_CAR.halfX * 2 * scale + 4, ARENA_CAR.halfZ * 2 * scale + 4);
      }
      ctx.restore();
      for (const telegraph of game.telegraphs) {
        const progress = 1 - telegraph.life / telegraph.duration;
        ctx.beginPath();
        ctx.arc(sx(telegraph.x), sy(telegraph.z), telegraph.radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4538';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx(telegraph.x), sy(telegraph.z), telegraph.radius * progress * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,69,56,.3)';
        ctx.fill();
      }
      for (const explosion of game.explosions) {
        const progress = 1 - explosion.life / explosion.duration;
        ctx.beginPath();
        ctx.arc(sx(explosion.x), sy(explosion.z), Math.max(1, explosion.radius * progress * scale), 0, Math.PI * 2);
        ctx.strokeStyle = explosion.kind === 'frag' ? '#ff9a4a' : explosion.kind === 'fire' ? '#ff7c39' : explosion.kind === 'slam' ? '#ff5a4f' : explosion.kind === 'acid' ? '#8dff6a' : '#8ef1ff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      for (const item of game.loot) {
        ctx.beginPath();
        ctx.arc(sx(item.x), sy(item.z), 4, 0, Math.PI * 2);
        ctx.fillStyle = item.kind === 'gold' ? '#ffcf4a' : item.kind === 'health' ? '#7dff96' : item.kind === 'energy' ? '#c9a2ff' : '#73efff';
        ctx.fill();
      }
      for (const particle of game.particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.duration);
        ctx.fillStyle = particle.color;
        ctx.fillRect(sx(particle.x) - 1.5, sy(particle.z) - particle.y * scale * .3 - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
      for (const corpse of game.corpses) {
        ctx.globalAlpha = Math.max(0, 1 - corpse.death / 2);
        ctx.fillStyle = '#3f4a4b';
        ctx.beginPath();
        ctx.arc(sx(corpse.x), sy(corpse.z), corpse.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const enemy of game.enemies) {
        const color = enemy.kind === 'boss' ? level.boss.tint : enemy.kind === 'teowerine' ? '#e8a843' : enemy.kind === 'spitter' ? '#8fb87a' : enemy.kind === 'brute' ? '#9c928c' : enemy.kind === 'runner' ? '#a3aeb8' : '#b7c1bf';
        ctx.globalAlpha = enemy.spawn > 0 ? .4 : 1;
        ctx.beginPath();
        ctx.arc(sx(enemy.x), sy(enemy.z), enemy.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : color;
        ctx.fill();
        if (enemy.elite) {
          ctx.strokeStyle = '#ffcf4a';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (enemy.health < enemy.maxHealth) {
          const ratio = Math.max(0, enemy.health / enemy.maxHealth);
          ctx.fillStyle = 'rgba(5,12,17,.78)';
          ctx.fillRect(sx(enemy.x) - 12, sy(enemy.z) - enemy.radius * scale - 8, 24, 3);
          ctx.fillStyle = enemy.kind === 'teowerine' ? '#e8a843' : '#64deef';
          ctx.fillRect(sx(enemy.x) - 12, sy(enemy.z) - enemy.radius * scale - 8, 24 * ratio, 3);
        }
      }
      for (const shot of game.hostileShots) {
        ctx.beginPath();
        ctx.arc(sx(shot.x), sy(shot.z), 4, 0, Math.PI * 2);
        ctx.fillStyle = shot.kind === 'fire' ? '#ff8a32' : '#a4ff7a';
        ctx.fill();
      }
      for (const bullet of game.bullets) {
        ctx.strokeStyle = bullet.crit ? '#ffe38a' : '#73efff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx(bullet.x - bullet.vx * .02), sy(bullet.z - bullet.vz * .02));
        ctx.lineTo(sx(bullet.x), sy(bullet.z));
        ctx.stroke();
      }
      for (const grenade of game.grenades) {
        ctx.beginPath();
        ctx.arc(sx(grenade.x), sy(grenade.z) - grenade.y * scale * .3, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#c8fbff';
        ctx.fill();
      }
      if (!game.vehicle.driving) {
        ctx.save();
        ctx.translate(sx(game.playerX), sy(game.playerZ));
        ctx.rotate(-game.facing + Math.PI);
        ctx.fillStyle = game.invulnerable > 0 ? '#bdf8ff' : '#59656a';
        ctx.beginPath();
        ctx.arc(0, 0, .38 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#48d9f5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -.8 * scale);
        ctx.stroke();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active, inputRef, engineRef, resetKey]);

  const updateAim = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const level = currentLevel(engineRef.current);
    const scale = Math.min(bounds.width, bounds.height) / (level.radius * 2.35);
    inputRef.current.aimX = (event.clientX - bounds.left - bounds.width / 2) / scale;
    inputRef.current.aimZ = (event.clientY - bounds.top - bounds.height / 2) / scale;
  };

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      aria-label="Arena Survival game scene"
      onPointerMove={updateAim}
      onPointerDown={(event) => {
        updateAim(event);
        if (event.button === 2) inputRef.current.keys.MouseRight = true;
        else inputRef.current.fire = true;
      }}
      onPointerUp={(event) => {
        if (event.button === 2) inputRef.current.keys.MouseRight = false;
        inputRef.current.fire = false;
      }}
      onPointerLeave={() => { inputRef.current.fire = false; }}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const loseContext = context?.getExtension('WEBGL_lose_context');
    loseContext?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

export function GameScene(props: SceneProps) {
  const [webglAvailable] = useState(supportsWebGL);
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, props.levelIndex))];
  if (!webglAvailable) return <FallbackScene {...props} />;

  return (
    <SceneErrorBoundary
      context="3D arena"
      fallback={<FallbackScene {...props} />}
    >
      <Canvas
        className="game-canvas"
        camera={{ position: [0, 6, 12], fov: 62, near: .1, far: 160 }}
        dpr={[1, 1.5]}
        shadows="percentage"
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <LevelLighting level={level} engineRef={props.engineRef} />
        <ThirdPersonCamera
          engineRef={props.engineRef}
          inputRef={props.inputRef}
          active={props.active}
          started={props.started}
          onPause={props.onPause}
          resetKey={props.resetKey}
        />
        <ArenaGeometry key={level.id} level={level} engineRef={props.engineRef} />
        <SceneEntities {...props} level={level} />
        <PostFX />
      </Canvas>
    </SceneErrorBoundary>
  );
}
