import { type MutableRefObject, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Prop, getGlowTexture } from './arena-props';
import type { DeviceDef, LevelDef, Obstacle } from './game-levels';
import {
  ARC_TRAP_RADIUS,
  PAD_CAPACITY,
  PAD_RADIUS,
  STACK_BLAST_RADIUS,
  type Emitter,
  type Engine,
} from './game-simulation';

/**
 * Interactive arena set pieces built from the second prop batch:
 * arc traps (arc_trap), pressure stacks (stack_vent), recharge pads (floor_tile),
 * spawn gates (dome_segment), curved cover (wall_arc) and boss shield pylons (field_emitter).
 * The simulation owns all state; these components only read it each frame.
 */

const FLOOR_RING = new THREE.RingGeometry(.94, 1, 64);
const FLOOR_DISC = new THREE.CircleGeometry(1, 48);

function GlowSprite({ spriteRef, color, scale, position }: {
  spriteRef?: MutableRefObject<THREE.Sprite | null>;
  color: string;
  scale: number;
  position: [number, number, number];
}) {
  return (
    <sprite ref={spriteRef} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={getGlowTexture()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0} />
    </sprite>
  );
}

// ── Static devices ──────────────────────────────────────────────────────────

function ArcTrap({ engineRef, index, device }: { engineRef: MutableRefObject<Engine>; index: number; device: DeviceDef }) {
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const fillMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const fill = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite | null>(null);
  useFrame(({ clock }) => {
    const state = engineRef.current.devices[index];
    if (!state) return;
    const flicker = .75 + Math.sin(clock.elapsedTime * 40) * .25;
    if (ringMaterial.current) ringMaterial.current.opacity = .06 + state.charge * .6 * flicker + state.cooldown * 1.6;
    if (fill.current && fillMaterial.current) {
      fill.current.scale.setScalar(Math.max(.01, state.charge * ARC_TRAP_RADIUS));
      fillMaterial.current.opacity = state.charge * .22 + state.cooldown * .9;
    }
    if (glow.current) {
      const material = glow.current.material as THREE.SpriteMaterial;
      material.opacity = .15 + state.charge * .8 * flicker + state.cooldown * 2.5;
      const size = 1.1 + state.charge * 1.4 + state.cooldown * 6;
      glow.current.scale.set(size, size, 1);
    }
  });
  return (
    <group position={[device.x, 0, device.z]}>
      <Prop name="arc_trap" size={[1.3, 1.65, 1.3]} maxStretch={1.15} fallback={(
        <mesh position={[0, .7, 0]} castShadow>
          <cylinderGeometry args={[.2, .5, 1.4, 12]} />
          <meshStandardMaterial color="#59646a" metalness={.6} roughness={.4} />
        </mesh>
      )} />
      {/* The danger radius: faint at rest, filling and flickering as the coil charges. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]} scale={ARC_TRAP_RADIUS} geometry={FLOOR_RING}>
        <meshBasicMaterial ref={ringMaterial} color="#8ef1ff" transparent opacity={.15} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={fill} rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]} geometry={FLOOR_DISC}>
        <meshBasicMaterial ref={fillMaterial} color="#8ef1ff" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <GlowSprite spriteRef={glow} color="#bff6ff" scale={1.2} position={[0, 1.6, 0]} />
    </group>
  );
}

function PressureStack({ engineRef, index, device }: { engineRef: MutableRefObject<Engine>; index: number; device: DeviceDef }) {
  const group = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Sprite | null>(null);
  useFrame(({ clock }) => {
    const state = engineRef.current.devices[index];
    if (!state) return;
    const armed = state.cooldown <= 0;
    // Rattles harder the closer it is to overloading.
    const shake = armed ? state.charge * .035 * Math.sin(clock.elapsedTime * 60) : 0;
    if (group.current) {
      group.current.position.set(device.x + shake, 0, device.z - shake);
      const pulse = 1 + state.hitFlash * .6;
      group.current.scale.set(pulse > 1 ? 2 - pulse * .97 : 1, pulse, pulse > 1 ? 2 - pulse * .97 : 1);
    }
    if (ringMaterial.current) {
      ringMaterial.current.color.set(armed ? '#ffb347' : '#6a757a');
      ringMaterial.current.opacity = armed && state.charge > 0 ? .1 + state.charge * .65 * (.6 + Math.sin(clock.elapsedTime * (6 + state.charge * 24)) * .4) : 0;
    }
    if (glow.current) {
      const material = glow.current.material as THREE.SpriteMaterial;
      material.opacity = armed ? .25 + state.charge * .9 : 0;
    }
  });
  return (
    <group ref={group} position={[device.x, 0, device.z]}>
      <Prop name="stack_vent" size={[1.35, 1, 1.35]} maxStretch={1.2} fallback={(
        <mesh position={[0, .45, 0]} castShadow>
          <cylinderGeometry args={[.6, .65, .9, 18]} />
          <meshStandardMaterial color="#4a5257" metalness={.5} roughness={.5} />
        </mesh>
      )} />
      {/* Blast radius hint: only obvious once the stack is close to going up. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]} scale={STACK_BLAST_RADIUS} geometry={FLOOR_RING}>
        <meshBasicMaterial ref={ringMaterial} color="#ffb347" transparent opacity={.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <GlowSprite spriteRef={glow} color="#ffb347" scale={1.4} position={[0, .75, 0]} />
    </group>
  );
}

function RechargePad({ engineRef, index, device }: { engineRef: MutableRefObject<Engine>; index: number; device: DeviceDef }) {
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const discMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Sprite | null>(null);
  useFrame(({ clock }) => {
    const state = engineRef.current.devices[index];
    if (!state) return;
    const level = state.charge / PAD_CAPACITY;
    const pulse = state.active ? .7 + Math.sin(clock.elapsedTime * 10) * .3 : .85 + Math.sin(clock.elapsedTime * 2) * .15;
    if (ringMaterial.current) ringMaterial.current.opacity = (.15 + level * .7) * pulse;
    if (discMaterial.current) discMaterial.current.opacity = (state.active ? .35 : .12) * level;
    if (glow.current) (glow.current.material as THREE.SpriteMaterial).opacity = state.active ? .7 * pulse : .15 * level;
  });
  return (
    <group position={[device.x, 0, device.z]}>
      {/* floor_tile is a standing slab; lay it flat (its grid face up) as the pad plate. */}
      <Prop name="floor_tile" orient={[0, 0, Math.PI / 2]} size={[PAD_RADIUS * 1.8, .16, PAD_RADIUS * 1.8]} castShadow={false} fallback={(
        <mesh position={[0, .05, 0]} receiveShadow>
          <boxGeometry args={[PAD_RADIUS * 1.8, .1, PAD_RADIUS * 1.8]} />
          <meshStandardMaterial color="#3b464c" metalness={.6} roughness={.4} />
        </mesh>
      )} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .18, 0]} scale={PAD_RADIUS} geometry={FLOOR_RING}>
        <meshBasicMaterial ref={ringMaterial} color="#7df3c4" transparent opacity={.6} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .175, 0]} scale={PAD_RADIUS * .9} geometry={FLOOR_DISC}>
        <meshBasicMaterial ref={discMaterial} color="#7df3c4" transparent opacity={.1} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <GlowSprite spriteRef={glow} color="#7df3c4" scale={2.4} position={[0, .4, 0]} />
    </group>
  );
}

export function DeviceLayer({ level, engineRef }: { level: LevelDef; engineRef: MutableRefObject<Engine> }) {
  return (
    <>
      {level.devices.map((device, index) => {
        const key = `${level.id}-device-${index}`;
        if (device.kind === 'arcTrap') return <ArcTrap key={key} engineRef={engineRef} index={index} device={device} />;
        if (device.kind === 'pressureStack') return <PressureStack key={key} engineRef={engineRef} index={index} device={device} />;
        return <RechargePad key={key} engineRef={engineRef} index={index} device={device} />;
      })}
    </>
  );
}

// ── Spawn gates and curved cover ────────────────────────────────────────────

function SpawnGate({ level, angle, index, engineRef }: { level: LevelDef; angle: number; index: number; engineRef: MutableRefObject<Engine> }) {
  const glowMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const lamp = useRef<THREE.Sprite | null>(null);
  const distance = level.radius + .55;
  useFrame(({ clock }) => {
    const glow = engineRef.current.gateGlow[index] ?? 0;
    if (glowMaterial.current) glowMaterial.current.opacity = .18 + glow * .7;
    if (lamp.current) {
      (lamp.current.material as THREE.SpriteMaterial).opacity = .2 + glow * (.7 + Math.sin(clock.elapsedTime * 18) * .3);
    }
  });
  // Local +x is the tunnel's closed end; point it out through the wall so the mouth faces the arena.
  return (
    <group position={[Math.cos(angle) * distance, 0, Math.sin(angle) * distance]} rotation={[0, -angle, 0]}>
      <Prop name="dome_segment" size={[2.3, 2.6, 2.8]} maxStretch={1.2} />
      {/* The dark throat lights up as something comes through. */}
      <mesh position={[.15, 1.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2, 1.9]} />
        <meshBasicMaterial ref={glowMaterial} color="#ff5a3c" transparent opacity={.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <GlowSprite spriteRef={lamp} color={level.theme.accent} scale={1.6} position={[-1.1, 2.55, 0]} />
    </group>
  );
}

export function GateLayer({ level, engineRef }: { level: LevelDef; engineRef: MutableRefObject<Engine> }) {
  return (
    <>
      {level.gates.map((angle, index) => (
        <SpawnGate key={`${level.id}-gate-${index}`} level={level} angle={angle} index={index} engineRef={engineRef} />
      ))}
    </>
  );
}

/** One wall_arc model for a curved cover wall (see arcWall in game-levels.ts). */
export function ArcWall({ obstacle, fallbackMaterial }: { obstacle: Obstacle; fallbackMaterial: THREE.Material }) {
  const render = obstacle.render;
  if (!render) return null;
  // The model's hollow is local +x; turn it to face `yaw`.
  return (
    <group position={[render.x, 0, render.z]} rotation={[0, -render.yaw, 0]}>
      <Prop
        name="wall_arc"
        size={[.6, 1.75, render.length]}
        maxStretch={2.6}
        fallback={(
          <mesh position={[0, .85, 0]} material={fallbackMaterial} castShadow receiveShadow>
            <boxGeometry args={[.5, 1.7, render.length]} />
          </mesh>
        )}
      />
    </group>
  );
}

// ── Boss shield pylons ──────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0);

function Pylon({ emitter, engineRef, tint }: { emitter: Emitter; engineRef: MutableRefObject<Engine>; tint: string }) {
  const body = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const beamMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const healthFill = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite | null>(null);
  const temp = useMemo(() => ({ from: new THREE.Vector3(), to: new THREE.Vector3(), mid: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const game = engineRef.current;
    if (body.current) {
      const rise = 1 - Math.pow(1 - emitter.rise, 3);
      body.current.position.y = -1.9 * (1 - rise);
      body.current.rotation.y = clock.elapsedTime * .6 + emitter.id;
      const pulse = 1 + emitter.hitFlash * .8;
      body.current.scale.setScalar(pulse);
    }
    if (healthFill.current) {
      const ratio = Math.max(0, emitter.health / emitter.maxHealth);
      healthFill.current.scale.x = Math.max(.001, ratio);
      healthFill.current.position.x = -.45 * (1 - ratio);
    }
    if (glow.current) (glow.current.material as THREE.SpriteMaterial).opacity = (.55 + Math.sin(clock.elapsedTime * 6 + emitter.id) * .2) * emitter.rise;
    // Beam from the pylon's core to the boss it is shielding.
    const boss = game.enemies.find((enemy) => enemy.id === game.bossId);
    if (beam.current && beamMaterial.current) {
      beam.current.visible = Boolean(boss) && emitter.rise > .9;
      if (boss) {
        temp.from.set(emitter.x, 1.25, emitter.z);
        temp.to.set(boss.x, 1.4 * boss.scale, boss.z);
        temp.mid.copy(temp.from).add(temp.to).multiplyScalar(.5);
        temp.dir.copy(temp.to).sub(temp.from);
        const length = temp.dir.length();
        beam.current.position.copy(temp.mid);
        beam.current.quaternion.setFromUnitVectors(UP, temp.dir.normalize());
        const width = .05 + Math.sin(clock.elapsedTime * 25 + emitter.id) * .015;
        beam.current.scale.set(width, length, width);
        beamMaterial.current.opacity = .55 + Math.sin(clock.elapsedTime * 12) * .2;
      }
    }
  });
  return (
    <>
      <group position={[emitter.x, 0, emitter.z]}>
        <group ref={body}>
          <Prop name="field_emitter" size={[1, 1.75, 1.25]} maxStretch={1.3} fallback={(
            <mesh position={[0, .85, 0]} castShadow>
              <octahedronGeometry args={[.6, 0]} />
              <meshStandardMaterial color="#5d6b72" emissive={tint} emissiveIntensity={.6} metalness={.6} roughness={.35} />
            </mesh>
          )} />
          <GlowSprite spriteRef={glow} color="#8ef1ff" scale={1.9} position={[0, 1.1, 0]} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .03, 0]} scale={1.05} geometry={FLOOR_RING}>
          <meshBasicMaterial color="#8ef1ff" transparent opacity={.7} depthWrite={false} toneMapped={false} />
        </mesh>
        <Billboard position={[0, 2.25, 0]}>
          <mesh scale={[1, .09, .02]}>
            <boxGeometry />
            <meshBasicMaterial color="#10171b" transparent opacity={.85} />
          </mesh>
          <mesh ref={healthFill} position={[0, 0, .015]} scale={[1, .055, .012]}>
            <boxGeometry args={[.9, 1, 1]} />
            <meshBasicMaterial color="#8ef1ff" toneMapped={false} />
          </mesh>
        </Billboard>
      </group>
      <mesh ref={beam} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial ref={beamMaterial} color="#8ef1ff" transparent opacity={.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Translucent bubble around the boss while any pylon stands. */
function BossShield({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const game = engineRef.current;
    const boss = game.enemies.find((enemy) => enemy.id === game.bossId);
    if (!mesh.current || !material.current) return;
    mesh.current.visible = Boolean(boss) && game.emitters.length > 0;
    if (!boss) return;
    const size = boss.scale * 1.05;
    mesh.current.position.set(boss.x, boss.scale * .95, boss.z);
    mesh.current.scale.set(size * .8, size, size * .8);
    mesh.current.rotation.y = clock.elapsedTime * .5;
    material.current.opacity = .16 + boss.hitFlash * 1.4 + Math.sin(clock.elapsedTime * 3) * .04;
  });
  return (
    <mesh ref={mesh} visible={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial ref={material} color="#8ef1ff" wireframe transparent opacity={.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

export function PylonLayer({ emitters, engineRef, tint }: { emitters: Emitter[]; engineRef: MutableRefObject<Engine>; tint: string }) {
  return (
    <>
      {emitters.map((emitter) => <Pylon key={emitter.id} emitter={emitter} engineRef={engineRef} tint={tint} />)}
      <BossShield engineRef={engineRef} />
    </>
  );
}

// ── Lightning ───────────────────────────────────────────────────────────────

const ZAP_POOL = 24;
const ZAP_POINTS = 9;

/** A fixed pool of jagged lines redrawn every frame from the simulation's zap list. */
export function ZapLayer({ engineRef }: { engineRef: MutableRefObject<Engine> }) {
  const lines = useMemo(() => Array.from({ length: ZAP_POOL }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ZAP_POINTS * 3), 3));
    const material = new THREE.LineBasicMaterial({ color: '#d8fbff', transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }), []);
  useFrame(() => {
    const zaps = engineRef.current.zaps;
    for (let index = 0; index < ZAP_POOL; index += 1) {
      const line = lines[index];
      const zap = zaps[index];
      if (!zap) {
        line.visible = false;
        continue;
      }
      line.visible = true;
      const positions = line.geometry.attributes.position as THREE.BufferAttribute;
      const length = Math.hypot(zap.x2 - zap.x1, zap.y2 - zap.y1, zap.z2 - zap.z1);
      const jitter = Math.min(.45, length * .09);
      for (let point = 0; point < ZAP_POINTS; point += 1) {
        const t = point / (ZAP_POINTS - 1);
        const edge = point === 0 || point === ZAP_POINTS - 1 ? 0 : 1;
        positions.setXYZ(
          point,
          zap.x1 + (zap.x2 - zap.x1) * t + (Math.random() - .5) * jitter * edge,
          zap.y1 + (zap.y2 - zap.y1) * t + (Math.random() - .5) * jitter * edge,
          zap.z1 + (zap.z2 - zap.z1) * t + (Math.random() - .5) * jitter * edge,
        );
      }
      positions.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = Math.min(1, (zap.life / zap.duration) * 1.6);
    }
  });
  return (
    <>
      {lines.map((line, index) => <primitive key={index} object={line} />)}
    </>
  );
}
