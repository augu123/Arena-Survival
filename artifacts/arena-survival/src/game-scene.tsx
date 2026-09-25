import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';
export type HudStats = { health: number; score: number; wave: number; survival: number; enemies: number };
export type InputState = {
  keys: Record<string, boolean>;
  fire: boolean;
  aimX: number;
  aimZ: number;
  touchX: number;
  touchZ: number;
};

type Enemy = { id: number; x: number; z: number; speed: number; variant: number };
type Bullet = { id: number; x: number; z: number; vx: number; vz: number; life: number };
type Engine = {
  playerX: number; playerZ: number; health: number; score: number; kills: number;
  wave: number; survival: number; spawnTimer: number; fireTimer: number; nextId: number; ended: boolean;
  enemies: Enemy[]; bullets: Bullet[];
};

const ARENA_LIMIT = 8.35;
const freshEngine = (): Engine => ({
  playerX: 0, playerZ: 0, health: 100, score: 0, kills: 0, wave: 1, survival: 0,
  spawnTimer: .65, fireTimer: 0, nextId: 1, ended: false, enemies: [], bullets: [],
});

type SceneProps = {
  active: boolean;
  resetKey: number;
  inputRef: MutableRefObject<InputState>;
  onHud: (stats: HudStats) => void;
  onGameOver: (stats: HudStats) => void;
  onPause: () => void;
};

function Ground({ inputRef }: { inputRef: MutableRefObject<InputState> }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(event) => { inputRef.current.aimX = event.point.x; inputRef.current.aimZ = event.point.z; }}
      onPointerDown={(event) => { event.stopPropagation(); inputRef.current.fire = true; }}
      onPointerUp={(event) => { event.stopPropagation(); inputRef.current.fire = false; }}
      onPointerOut={() => { inputRef.current.fire = false; }}
    >
      <planeGeometry args={[19, 19]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ArenaGeometry() {
  const pillars: Array<[number, number]> = [
    [-8.7, -8.7], [8.7, -8.7], [-8.7, 8.7], [8.7, 8.7],
    [-8.7, 0], [8.7, 0], [0, -8.7], [0, 8.7],
  ];
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.12, 0]}>
        <planeGeometry args={[19, 19]} />
        <meshStandardMaterial color="#171b2a" roughness={.94} metalness={.2} />
      </mesh>
      <gridHelper args={[17, 17, '#344154', '#22283a']} position={[0, -.08, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]}>
        <ringGeometry args={[3.2, 3.25, 64]} />
        <meshBasicMaterial color="#f6c23d" transparent opacity={.6} />
      </mesh>
      {pillars.map(([x, z], index) => (
        <group key={index} position={[x, .2, z]}>
          <mesh>
            <boxGeometry args={[.45, .8, .45]} />
            <meshStandardMaterial color="#3a425a" emissive="#13212d" emissiveIntensity={.5} />
          </mesh>
          <mesh position={[0, .46, 0]}>
            <boxGeometry args={[.12, .05, .12]} />
            <meshBasicMaterial color={index % 2 ? '#24d6ed' : '#f6c23d'} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Player({ refProp }: { refProp: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={refProp} position={[0, .4, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[.42, 1.15, 6]} />
        <meshStandardMaterial color="#f6c23d" emissive="#ad7018" emissiveIntensity={.7} metalness={.45} roughness={.3} />
      </mesh>
      <mesh position={[0, .18, 0]}>
        <sphereGeometry args={[.16, 12, 8]} />
        <meshBasicMaterial color="#fdf1bd" />
      </mesh>
      <pointLight color="#f6c23d" intensity={1.6} distance={2.8} />
    </group>
  );
}

function EnemyMesh({ enemy, refMap }: { enemy: Enemy; refMap: MutableRefObject<Map<number, THREE.Mesh>> }) {
  const local = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (local.current) refMap.current.set(enemy.id, local.current);
    return () => { refMap.current.delete(enemy.id); };
  }, [enemy.id, refMap]);
  const color = enemy.variant === 0 ? '#e44f6d' : enemy.variant === 1 ? '#b266dd' : '#f0804d';
  return (
    <mesh ref={local} position={[enemy.x, .42, enemy.z]}>
      <icosahedronGeometry args={[.42, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.32} metalness={.25} roughness={.5} />
    </mesh>
  );
}

function BulletMesh({ bullet, refMap }: { bullet: Bullet; refMap: MutableRefObject<Map<number, THREE.Mesh>> }) {
  const local = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (local.current) refMap.current.set(bullet.id, local.current);
    return () => { refMap.current.delete(bullet.id); };
  }, [bullet.id, refMap]);
  return (
    <mesh ref={local} position={[bullet.x, .32, bullet.z]}>
      <sphereGeometry args={[.11, 8, 8]} />
      <meshBasicMaterial color="#f7efbd" />
    </mesh>
  );
}

function GameLoop({ active, resetKey, inputRef, onHud, onGameOver, onPause }: SceneProps) {
  const engine = useRef<Engine>(freshEngine());
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const playerRef = useRef<THREE.Group | null>(null);
  const enemyRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const bulletRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const renderedEnemyCount = useRef(0);
  const renderedBulletCount = useRef(0);
  const hudClock = useRef(0);
  const hudRef = useRef(onHud);
  const gameOverRef = useRef(onGameOver);
  const pauseRef = useRef(onPause);
  hudRef.current = onHud;
  gameOverRef.current = onGameOver;
  pauseRef.current = onPause;

  useEffect(() => {
    engine.current = freshEngine();
    setEnemies([]);
    setBullets([]);
    renderedEnemyCount.current = 0;
    renderedBulletCount.current = 0;
    hudClock.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      inputRef.current.keys[event.code] = event.type === 'keydown';
      if (event.type === 'keydown' && event.code === 'KeyP' && active) pauseRef.current();
      if (event.type === 'keydown' && event.code === 'Space') inputRef.current.fire = true;
      if (event.type === 'keyup' && event.code === 'Space') inputRef.current.fire = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const releaseFire = () => { inputRef.current.fire = false; };
    window.addEventListener('pointerup', releaseFire);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('pointerup', releaseFire);
    };
  }, [active, inputRef]);

  useFrame((_state, rawDelta) => {
    if (!active || engine.current.ended) return;
    const dt = Math.min(rawDelta, .05);
    const game = engine.current;
    const input = inputRef.current;
    game.survival += dt;
    game.wave = Math.floor(game.survival / 12) + 1;

    let x = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) + input.touchX;
    let z = (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0) - (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) + input.touchZ;
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    game.playerX = THREE.MathUtils.clamp(game.playerX + x * dt * 6.1, -ARENA_LIMIT, ARENA_LIMIT);
    game.playerZ = THREE.MathUtils.clamp(game.playerZ + z * dt * 6.1, -ARENA_LIMIT, ARENA_LIMIT);
    if (playerRef.current) {
      playerRef.current.position.set(game.playerX, .4, game.playerZ);
      playerRef.current.rotation.y = Math.atan2(input.aimX - game.playerX, input.aimZ - game.playerZ);
    }

    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 8.6 + Math.random() * 1.1;
      const enemy: Enemy = {
        id: game.nextId++, x: Math.cos(angle) * distance, z: Math.sin(angle) * distance,
        speed: 1.15 + game.wave * .1 + Math.random() * .38, variant: Math.floor(Math.random() * 3),
      };
      game.enemies.push(enemy);
      setEnemies([...game.enemies]);
      renderedEnemyCount.current = game.enemies.length;
      game.spawnTimer = Math.max(.26, 1.12 - game.wave * .065) * (.75 + Math.random() * .4);
    }

    game.fireTimer -= dt;
    if ((input.fire || input.keys.Space) && game.fireTimer <= 0) {
      const dx = input.aimX - game.playerX;
      const dz = input.aimZ - game.playerZ;
      const distance = Math.hypot(dx, dz) || 1;
      game.bullets.push({
        id: game.nextId++, x: game.playerX, z: game.playerZ,
        vx: dx / distance * 14, vz: dz / distance * 14, life: 1.25,
      });
      setBullets([...game.bullets]);
      renderedBulletCount.current = game.bullets.length;
      game.fireTimer = .13;
    }

    const livingBullets: Bullet[] = [];
    for (const bullet of game.bullets) {
      bullet.x += bullet.vx * dt; bullet.z += bullet.vz * dt; bullet.life -= dt;
      if (bullet.life <= 0 || Math.abs(bullet.x) > 10 || Math.abs(bullet.z) > 10) continue;
      let hit = false;
      for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
        const enemy = game.enemies[index];
        if (Math.hypot(enemy.x - bullet.x, enemy.z - bullet.z) < .65) {
          game.enemies.splice(index, 1); game.score += 25 + game.wave * 5; game.kills += 1; hit = true; break;
        }
      }
      if (!hit) livingBullets.push(bullet);
    }
    game.bullets = livingBullets;
    if (game.bullets.length !== renderedBulletCount.current) {
      setBullets([...game.bullets]);
      renderedBulletCount.current = game.bullets.length;
    }
    if (game.enemies.length !== renderedEnemyCount.current) {
      setEnemies([...game.enemies]);
      renderedEnemyCount.current = game.enemies.length;
    }

    for (const enemy of game.enemies) {
      const dx = game.playerX - enemy.x; const dz = game.playerZ - enemy.z;
      const distance = Math.hypot(dx, dz) || 1;
      enemy.x += dx / distance * enemy.speed * dt; enemy.z += dz / distance * enemy.speed * dt;
      if (distance < .76) game.health -= dt * (8.5 + game.wave * .45);
      const mesh = enemyRefs.current.get(enemy.id);
      if (mesh) { mesh.position.set(enemy.x, .42, enemy.z); mesh.rotation.y += dt * 2; }
    }
    for (const bullet of game.bullets) {
      const mesh = bulletRefs.current.get(bullet.id);
      if (mesh) mesh.position.set(bullet.x, .32, bullet.z);
    }
    if (game.health <= 0) {
      game.health = 0; game.ended = true;
      gameOverRef.current({ health: 0, score: game.score, wave: game.wave, survival: game.survival, enemies: game.enemies.length });
      return;
    }
    hudClock.current += dt;
    if (hudClock.current >= .1) {
      hudClock.current = 0;
      hudRef.current({ health: game.health, score: game.score, wave: game.wave, survival: game.survival, enemies: game.enemies.length });
    }
  });

  return (
    <>
      <Player refProp={playerRef} />
      {enemies.map((enemy) => <EnemyMesh key={enemy.id} enemy={enemy} refMap={enemyRefs} />)}
      {bullets.map((bullet) => <BulletMesh key={bullet.id} bullet={bullet} refMap={bulletRefs} />)}
    </>
  );
}

function CameraAndLights() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return (
    <>
      <ambientLight intensity={.65} color="#8995b7" />
      <directionalLight position={[3, 10, 5]} intensity={2.1} color="#fff2d0" />
      <pointLight position={[-5, 4, -3]} intensity={16} distance={15} color="#165e72" />
      <fog attach="fog" args={['#0f1320', 12, 27]} />
    </>
  );
}

export function GameScene(props: SceneProps) {
  return (
    <Canvas
      className="game-canvas"
      camera={{ position: [0, 15, 11], fov: 47, near: .1, far: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.setClearColor('#0f1320'); }}
    >
      <CameraAndLights />
      <ArenaGeometry />
      <Ground inputRef={props.inputRef} />
      <GameLoop {...props} />
    </Canvas>
  );
}