import { type MutableRefObject, type PointerEvent, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import environmentImage from '@assets/environment_1790480278133.jpg';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';
export type HudStats = {
  health: number;
  shield: number;
  ammo: number;
  reserveAmmo: number;
  grenades: number;
  score: number;
  wave: number;
  survival: number;
  enemies: number;
  radar: Array<[number, number]>;
};
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
type Explosion = { id: number; x: number; z: number; life: number };
type Engine = {
  playerX: number; playerZ: number; health: number; shield: number; score: number; kills: number;
  ammo: number; reserveAmmo: number; grenades: number; reloadTimer: number; shieldDelay: number;
  wave: number; survival: number; spawnTimer: number; fireTimer: number; grenadeWasDown: boolean;
  nextId: number; ended: boolean; enemies: Enemy[]; bullets: Bullet[]; explosions: Explosion[];
};

const ARENA_LIMIT = 8.15;
const MAGAZINE_SIZE = 60;
const OBSTACLES: Array<{ x: number; z: number; halfX: number; halfZ: number }> = [
  { x: -3.05, z: -2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: -2.35, halfX: 1.12, halfZ: .27 },
  { x: -3.05, z: 2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: 2.35, halfX: 1.12, halfZ: .27 },
  { x: 0, z: -4.35, halfX: .65, halfZ: .4 },
  { x: 0, z: 4.35, halfX: .65, halfZ: .4 },
];
const freshEngine = (): Engine => ({
  playerX: 0, playerZ: 0, health: 100, shield: 50, score: 0, kills: 0,
  ammo: MAGAZINE_SIZE, reserveAmmo: 120, grenades: 3, reloadTimer: 0, shieldDelay: 0,
  wave: 1, survival: 0, spawnTimer: .65, fireTimer: 0, grenadeWasDown: false,
  nextId: 1, ended: false, enemies: [], bullets: [], explosions: [],
});
const toHud = (game: Engine): HudStats => ({
  health: game.health,
  shield: game.shield,
  ammo: game.ammo,
  reserveAmmo: game.reserveAmmo,
  grenades: game.grenades,
  score: game.score,
  wave: game.wave,
  survival: game.survival,
  enemies: game.enemies.length,
  radar: game.enemies.slice(0, 28).map((enemy) => [
    THREE.MathUtils.clamp((enemy.x - game.playerX) / 7, -1, 1),
    THREE.MathUtils.clamp((enemy.z - game.playerZ) / 7, -1, 1),
  ]),
});

function clampToArena(x: number, z: number) {
  const distance = Math.hypot(x, z);
  if (distance <= ARENA_LIMIT) return { x, z };
  const scale = ARENA_LIMIT / distance;
  return { x: x * scale, z: z * scale };
}

function hitsObstacle(x: number, z: number, radius = .28) {
  return OBSTACLES.some((obstacle) =>
    Math.abs(x - obstacle.x) < obstacle.halfX + radius
    && Math.abs(z - obstacle.z) < obstacle.halfZ + radius,
  );
}

function moveActor(x: number, z: number, dx: number, dz: number, radius = .28) {
  const next = clampToArena(x + dx, z + dz);
  if (!hitsObstacle(next.x, next.z, radius)) return next;
  const slideX = clampToArena(x + dx, z);
  const slideZ = clampToArena(x, z + dz);
  const allowX = !hitsObstacle(slideX.x, slideX.z, radius);
  const allowZ = !hitsObstacle(slideZ.x, slideZ.z, radius);
  if (allowX && allowZ) return Math.abs(dx) >= Math.abs(dz) ? slideX : slideZ;
  if (allowX) return slideX;
  if (allowZ) return slideZ;
  return { x, z };
}

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
  const wallSegments = Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return { angle, x: Math.cos(angle) * 9.05, z: Math.sin(angle) * 9.05 };
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]}>
        <circleGeometry args={[9.3, 96]} />
        <meshStandardMaterial color="#454e55" roughness={.96} metalness={.08} />
      </mesh>
      <gridHelper args={[16, 16, '#53606a', '#46525b']} position={[0, .006, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .004, 0]}>
        <ringGeometry args={[8.62, 8.72, 96]} />
        <meshBasicMaterial color="#3bc9ed" transparent opacity={.92} />
      </mesh>
      <mesh position={[0, .46, 0]}>
        <cylinderGeometry args={[9.28, 9.28, 1.35, 72, 1, true]} />
        <meshStandardMaterial color="#343e46" roughness={.88} metalness={.13} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.12, 0]}>
        <ringGeometry args={[9.12, 9.32, 72]} />
        <meshStandardMaterial color="#66737a" roughness={.7} metalness={.18} />
      </mesh>
      {wallSegments.filter((_, index) => index % 2 === 0).map(({ angle, x, z }, index) => (
        <group key={index} position={[x, .5, z]} rotation={[0, -angle, 0]}>
          <mesh>
            <boxGeometry args={[.15, 1.45, .48]} />
            <meshStandardMaterial color="#58636a" roughness={.82} metalness={.16} />
          </mesh>
          <mesh position={[0, -.35, .25]}>
            <boxGeometry args={[.09, .045, .025]} />
            <meshBasicMaterial color="#54d9f4" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {OBSTACLES.map((obstacle, index) => (
        <group key={index} position={[obstacle.x, 0, obstacle.z]}>
          <mesh position={[0, .38, 0]}>
            <boxGeometry args={[obstacle.halfX * 2, .76, obstacle.halfZ * 2]} />
            <meshStandardMaterial color="#667178" roughness={.9} metalness={.08} />
          </mesh>
          <mesh position={[0, .79, 0]}>
            <boxGeometry args={[obstacle.halfX * 1.9, .07, obstacle.halfZ * 1.8]} />
            <meshStandardMaterial color="#7b878c" roughness={.76} metalness={.13} />
          </mesh>
        </group>
      ))}
      {[[-1.7, -4.1], [1.8, -4.25], [-1.8, 4.15], [1.8, 4.2]].map(([x, z], index) => (
        <group key={`crate-${index}`} position={[x, .28, z]}>
          <mesh>
            <boxGeometry args={[.72, .56, .72]} />
            <meshStandardMaterial color="#454f55" roughness={.91} metalness={.04} />
          </mesh>
          <mesh position={[0, .29, 0]}>
            <boxGeometry args={[.75, .045, .75]} />
            <meshStandardMaterial color="#748087" roughness={.8} />
          </mesh>
          <mesh rotation={[0, Math.PI / 4, 0]} position={[0, .31, 0]}>
            <boxGeometry args={[.82, .035, .045]} />
            <meshBasicMaterial color="#75def4" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Player({ refProp }: { refProp: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={refProp} position={[0, 0, 0]}>
      <mesh position={[0, .055, 0]}>
        <ringGeometry args={[.38, .44, 28]} />
        <meshBasicMaterial color="#48d9f5" transparent opacity={.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-.13, .29, -.015]} rotation={[.12, 0, -.03]}>
        <cylinderGeometry args={[.105, .095, .48, 8]} />
        <meshStandardMaterial color="#303a40" roughness={.84} />
      </mesh>
      <mesh position={[.13, .29, -.015]} rotation={[.12, 0, .03]}>
        <cylinderGeometry args={[.105, .095, .48, 8]} />
        <meshStandardMaterial color="#303a40" roughness={.84} />
      </mesh>
      <mesh position={[-.13, .075, .07]}>
        <boxGeometry args={[.18, .12, .3]} />
        <meshStandardMaterial color="#151d22" roughness={.72} />
      </mesh>
      <mesh position={[.13, .075, .07]}>
        <boxGeometry args={[.18, .12, .3]} />
        <meshStandardMaterial color="#151d22" roughness={.72} />
      </mesh>
      <mesh position={[0, .78, 0]}>
        <cylinderGeometry args={[.28, .22, .69, 10]} />
        <meshStandardMaterial color="#556168" roughness={.88} metalness={.08} />
      </mesh>
      <mesh position={[0, .81, .19]}>
        <boxGeometry args={[.35, .42, .12]} />
        <meshStandardMaterial color="#252e33" roughness={.74} metalness={.2} />
      </mesh>
      <mesh position={[-.13, .82, .258]}>
        <boxGeometry args={[.03, .3, .012]} />
        <meshBasicMaterial color="#42cbe8" toneMapped={false} />
      </mesh>
      <mesh position={[.13, .82, .258]}>
        <boxGeometry args={[.03, .3, .012]} />
        <meshBasicMaterial color="#42cbe8" toneMapped={false} />
      </mesh>
      <mesh position={[-.31, .85, .07]} rotation={[.25, 0, -.22]}>
        <cylinderGeometry args={[.09, .075, .48, 8]} />
        <meshStandardMaterial color="#414b50" roughness={.88} />
      </mesh>
      <mesh position={[.31, .83, .15]} rotation={[.48, 0, .2]}>
        <cylinderGeometry args={[.09, .075, .42, 8]} />
        <meshStandardMaterial color="#414b50" roughness={.88} />
      </mesh>
      <mesh position={[0, 1.31, .025]}>
        <sphereGeometry args={[.2, 12, 10]} />
        <meshStandardMaterial color="#b68d76" roughness={.75} />
      </mesh>
      <mesh position={[0, 1.43, -.005]}>
        <sphereGeometry args={[.205, 12, 6, 0, Math.PI * 2, 0, Math.PI * .52]} />
        <meshStandardMaterial color="#292827" roughness={.86} />
      </mesh>
      <mesh position={[0, 1.29, .205]}>
        <boxGeometry args={[.08, .025, .016]} />
        <meshStandardMaterial color="#302722" roughness={.85} />
      </mesh>
      <group position={[.13, .83, .36]}>
        <mesh>
          <boxGeometry args={[.13, .12, .42]} />
          <meshStandardMaterial color="#222b30" metalness={.62} roughness={.32} />
        </mesh>
        <mesh position={[0, 0, .29]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[.045, .045, .42, 8]} />
          <meshStandardMaterial color="#89979d" metalness={.78} roughness={.25} />
        </mesh>
        <mesh position={[0, .066, .03]}>
          <boxGeometry args={[.035, .009, .22]} />
          <meshBasicMaterial color="#40d4f1" toneMapped={false} />
        </mesh>
        <mesh position={[0, -.13, -.08]}>
          <boxGeometry args={[.07, .14, .11]} />
          <meshStandardMaterial color="#151c20" metalness={.3} roughness={.4} />
        </mesh>
      </group>
      <pointLight position={[0, .9, .5]} color="#42cbe8" intensity={.35} distance={2.5} />
    </group>
  );
}

function EnemyMesh({ enemy, refMap }: { enemy: Enemy; refMap: MutableRefObject<Map<number, THREE.Group>> }) {
  const local = useRef<THREE.Group>(null);
  useEffect(() => {
    if (local.current) refMap.current.set(enemy.id, local.current);
    return () => { refMap.current.delete(enemy.id); };
  }, [enemy.id, refMap]);
  return (
    <group ref={local} position={[enemy.x, 0, enemy.z]}>
      <mesh position={[0, .24, 0]} rotation={[.16, 0, -.12]}>
        <cylinderGeometry args={[.12, .15, .5, 7]} />
        <meshStandardMaterial color={enemy.variant === 1 ? '#899497' : '#aab4b4'} roughness={.93} />
      </mesh>
      <mesh position={[0, .71, -.015]} rotation={[.12, 0, .16]}>
        <cylinderGeometry args={[.21, .16, .56, 8]} />
        <meshStandardMaterial color="#424b4b" roughness={.94} />
      </mesh>
      <mesh position={[0, 1.12, .01]} rotation={[.12, 0, -.05]}>
        <sphereGeometry args={[.175, 10, 8]} />
        <meshStandardMaterial color="#b5bfbe" roughness={.82} />
      </mesh>
      <mesh position={[-.065, 1.14, .155]}>
        <sphereGeometry args={[.033, 8, 6]} />
        <meshBasicMaterial color="#52e1fa" toneMapped={false} />
      </mesh>
      <mesh position={[.065, 1.14, .155]}>
        <sphereGeometry args={[.033, 8, 6]} />
        <meshBasicMaterial color="#52e1fa" toneMapped={false} />
      </mesh>
      <mesh position={[-.245, .75, .03]} rotation={[.08, 0, -.54]}>
        <cylinderGeometry args={[.075, .065, .52, 7]} />
        <meshStandardMaterial color="#8a9695" roughness={.95} />
      </mesh>
      <mesh position={[.245, .69, .02]} rotation={[-.12, 0, .48]}>
        <cylinderGeometry args={[.075, .065, .5, 7]} />
        <meshStandardMaterial color="#909b99" roughness={.95} />
      </mesh>
      <mesh position={[-.09, .06, -.01]}>
        <boxGeometry args={[.16, .11, .28]} />
        <meshStandardMaterial color="#313a3b" roughness={.98} />
      </mesh>
      <mesh position={[.09, .06, -.01]}>
        <boxGeometry args={[.16, .11, .28]} />
        <meshStandardMaterial color="#313a3b" roughness={.98} />
      </mesh>
    </group>
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
      <sphereGeometry args={[.09, 8, 8]} />
      <meshBasicMaterial color="#70e8ff" toneMapped={false} />
    </mesh>
  );
}

function ExplosionMesh({ explosion, refMap }: { explosion: Explosion; refMap: MutableRefObject<Map<number, THREE.Mesh>> }) {
  const local = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (local.current) refMap.current.set(explosion.id, local.current);
    return () => { refMap.current.delete(explosion.id); };
  }, [explosion.id, refMap]);
  return (
    <mesh ref={local} position={[explosion.x, .08, explosion.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.65, 1, 28]} />
      <meshBasicMaterial color="#5de3fa" transparent opacity={.82} side={THREE.DoubleSide} />
    </mesh>
  );
}
function GameLoop({ active, resetKey, inputRef, onHud, onGameOver, onPause }: SceneProps) {
  const engine = useRef<Engine>(freshEngine());
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const playerRef = useRef<THREE.Group | null>(null);
  const enemyRefs = useRef<Map<number, THREE.Group>>(new Map());
  const bulletRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const explosionRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const renderedEnemyCount = useRef(0);
  const renderedBulletCount = useRef(0);
  const renderedExplosionCount = useRef(0);
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
    setExplosions([]);
    renderedEnemyCount.current = 0;
    renderedBulletCount.current = 0;
    renderedExplosionCount.current = 0;
    hudClock.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      inputRef.current.keys[event.code] = event.type === 'keydown';
      if (event.type === 'keydown' && event.code === 'KeyP' && !event.repeat && active) pauseRef.current();
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
    const playerPosition = moveActor(game.playerX, game.playerZ, x * dt * 6.1, z * dt * 6.1, .3);
    game.playerX = playerPosition.x;
    game.playerZ = playerPosition.z;
    if (playerRef.current) {
      playerRef.current.position.set(game.playerX, .02 + Math.sin(game.survival * 7) * .015, game.playerZ);
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
    if (input.keys.KeyR && game.reloadTimer <= 0 && game.ammo < MAGAZINE_SIZE && game.reserveAmmo > 0) {
      game.reloadTimer = 1.15;
    }
    if (game.reloadTimer > 0) {
      game.reloadTimer -= dt;
      if (game.reloadTimer <= 0) {
        const loaded = Math.min(MAGAZINE_SIZE - game.ammo, game.reserveAmmo);
        game.ammo += loaded;
        game.reserveAmmo -= loaded;
        game.reloadTimer = 0;
      }
    }

    const grenadePressed = input.keys.KeyG && !game.grenadeWasDown;
    game.grenadeWasDown = input.keys.KeyG;
    if (grenadePressed && game.grenades > 0) {
      game.grenades -= 1;
      const dx = input.aimX - game.playerX;
      const dz = input.aimZ - game.playerZ;
      const distance = Math.hypot(dx, dz) || 1;
      const range = Math.min(4.2, distance);
      const impact = clampToArena(game.playerX + (dx / distance) * range, game.playerZ + (dz / distance) * range);
      game.explosions.push({ id: game.nextId++, x: impact.x, z: impact.z, life: .45 });
      for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
        const enemy = game.enemies[index];
        if (Math.hypot(enemy.x - impact.x, enemy.z - impact.z) <= 2.5) {
          game.enemies.splice(index, 1);
          game.score += 25 + game.wave * 5;
          game.kills += 1;
        }
      }
      setExplosions([...game.explosions]);
      renderedExplosionCount.current = game.explosions.length;
    }

    if ((input.fire || input.keys.Space) && game.fireTimer <= 0 && game.reloadTimer <= 0 && game.ammo > 0) {
      const dx = input.aimX - game.playerX;
      const dz = input.aimZ - game.playerZ;
      const distance = Math.hypot(dx, dz) || 1;
      game.bullets.push({
        id: game.nextId++, x: game.playerX, z: game.playerZ,
        vx: dx / distance * 14, vz: dz / distance * 14, life: 1.25,
      });
      game.ammo -= 1;
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
      const enemyPosition = moveActor(enemy.x, enemy.z, dx / distance * enemy.speed * dt, dz / distance * enemy.speed * dt, .23);
      enemy.x = enemyPosition.x;
      enemy.z = enemyPosition.z;
      if (distance < .76) {
        let damage = dt * (8.5 + game.wave * .45);
        const absorbed = Math.min(game.shield, damage);
        game.shield -= absorbed;
        damage -= absorbed;
        game.health -= damage;
        game.shieldDelay = 4;
      }
      const mesh = enemyRefs.current.get(enemy.id);
      if (mesh) {
        mesh.position.set(enemy.x, 0, enemy.z);
        mesh.rotation.y = Math.atan2(dx, dz);
        mesh.rotation.z = Math.sin(game.survival * 5 + enemy.id) * .035;
      }
    }
    if (game.shieldDelay > 0) game.shieldDelay -= dt;
    else game.shield = Math.min(50, game.shield + dt * 7.5);
    for (const bullet of game.bullets) {
      const mesh = bulletRefs.current.get(bullet.id);
      if (mesh) mesh.position.set(bullet.x, .32, bullet.z);
    }
    game.explosions = game.explosions.filter((explosion) => {
      explosion.life -= dt;
      const mesh = explosionRefs.current.get(explosion.id);
      if (mesh) {
        const progress = 1 - explosion.life / .45;
        mesh.scale.setScalar(1 + progress * 2.4);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, explosion.life / .45) * .82;
      }
      return explosion.life > 0;
    });
    if (game.explosions.length !== renderedExplosionCount.current) {
      setExplosions([...game.explosions]);
      renderedExplosionCount.current = game.explosions.length;
    }
    if (game.health <= 0) {
      game.health = 0; game.ended = true;
      gameOverRef.current(toHud(game));
      return;
    }
    hudClock.current += dt;
    if (hudClock.current >= .1) {
      hudClock.current = 0;
      hudRef.current(toHud(game));
    }
  });

  return (
    <>
      <Player refProp={playerRef} />
      {enemies.map((enemy) => <EnemyMesh key={enemy.id} enemy={enemy} refMap={enemyRefs} />)}
      {bullets.map((bullet) => <BulletMesh key={bullet.id} bullet={bullet} refMap={bulletRefs} />)}
      {explosions.map((explosion) => <ExplosionMesh key={explosion.id} explosion={explosion} refMap={explosionRefs} />)}
    </>
  );
}

function CameraAndLights() {
  const { camera, size } = useThree();
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const verticalHalfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * size.width / Math.max(1, size.height));
    const tilt = Math.atan2(14, 19);
    const radius = 9.35;
    const verticalExtent = radius * Math.cos(tilt) + 1.25 * Math.sin(tilt);
    const distance = Math.max(
      radius / Math.tan(horizontalHalfFov),
      verticalExtent / Math.tan(verticalHalfFov),
    ) * 1.1;
    camera.position.set(0, distance * Math.cos(tilt), distance * Math.sin(tilt));
    camera.lookAt(0, 0, 0);
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return (
    <>
      <ambientLight intensity={.48} color="#a9bac3" />
      <directionalLight position={[3, 10, 5]} intensity={1.55} color="#c8d6df" />
      <pointLight position={[-5, 4, -3]} intensity={9} distance={15} color="#165e72" />
      <fog attach="fog" args={['#0f1320', 12, 28]} />
    </>
  );
}

function FallbackScene({ active, resetKey, inputRef, onHud, onGameOver, onPause }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine>(freshEngine());
  const hudRef = useRef(onHud);
  const gameOverRef = useRef(onGameOver);
  const pauseRef = useRef(onPause);
  hudRef.current = onHud;
  gameOverRef.current = onGameOver;
  pauseRef.current = onPause;

  useEffect(() => {
    engine.current = freshEngine();
  }, [resetKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      inputRef.current.keys[event.code] = event.type === 'keydown';
      if (event.type === 'keydown' && event.code === 'KeyP' && !event.repeat && active) pauseRef.current();
      if (event.type === 'keydown' && event.code === 'Space') inputRef.current.fire = true;
      if (event.type === 'keyup' && event.code === 'Space') inputRef.current.fire = false;
    };
    const release = () => { inputRef.current.fire = false; inputRef.current.keys = {}; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    window.addEventListener('pointerup', release);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', release);
      window.removeEventListener('pointerup', release);
    };
  }, [active, inputRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const backdrop = new Image();
    backdrop.src = environmentImage;
    let frame = 0;
    let previousTime = 0;
    let hudClock = 0;
    const size = { width: 0, height: 0, dpr: 1 };
    const arenaMap = (width: number, height: number) => {
      const landscape = width > height * 1.15;
      const rx = landscape ? Math.min(width * .46, height * .74) : width * .43;
      const ry = landscape ? Math.min(height * .44, width * .24) : Math.min(height * .36, width * .74);
      return { cx: width / 2, cy: height / 2, rx, ry, sx: rx / ARENA_LIMIT, sy: ry / ARENA_LIMIT, landscape };
    };
    const toScreen = (x: number, z: number, map: ReturnType<typeof arenaMap>) => [
      map.cx + x * map.sx,
      map.cy + z * map.sy,
    ] as const;
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
      const width = size.width;
      const height = size.height;
      const game = engine.current;
      const now = performance.now();
      const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
      previousTime = now;
      const map = arenaMap(width, height);

      if (active && !game.ended) {
        game.survival += dt;
        game.wave = Math.floor(game.survival / 12) + 1;
        let x = (inputRef.current.keys.KeyD || inputRef.current.keys.ArrowRight ? 1 : 0)
          - (inputRef.current.keys.KeyA || inputRef.current.keys.ArrowLeft ? 1 : 0) + inputRef.current.touchX;
        let z = (inputRef.current.keys.KeyS || inputRef.current.keys.ArrowDown ? 1 : 0)
          - (inputRef.current.keys.KeyW || inputRef.current.keys.ArrowUp ? 1 : 0) + inputRef.current.touchZ;
        const length = Math.hypot(x, z);
        if (length > 1) { x /= length; z /= length; }
        const playerPosition = moveActor(game.playerX, game.playerZ, x * dt * 6.1, z * dt * 6.1, .3);
        game.playerX = playerPosition.x;
        game.playerZ = playerPosition.z;

        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 8.6 + Math.random() * 1.1;
          game.enemies.push({
            id: game.nextId++, x: Math.cos(angle) * distance, z: Math.sin(angle) * distance,
            speed: 1.15 + game.wave * .1 + Math.random() * .38, variant: Math.floor(Math.random() * 3),
          });
          game.spawnTimer = Math.max(.26, 1.12 - game.wave * .065) * (.75 + Math.random() * .4);
        }

        game.fireTimer -= dt;
        if (inputRef.current.keys.KeyR && game.reloadTimer <= 0 && game.ammo < MAGAZINE_SIZE && game.reserveAmmo > 0) {
          game.reloadTimer = 1.15;
        }
        if (game.reloadTimer > 0) {
          game.reloadTimer -= dt;
          if (game.reloadTimer <= 0) {
            const loaded = Math.min(MAGAZINE_SIZE - game.ammo, game.reserveAmmo);
            game.ammo += loaded;
            game.reserveAmmo -= loaded;
            game.reloadTimer = 0;
          }
        }

        const grenadePressed = inputRef.current.keys.KeyG && !game.grenadeWasDown;
        game.grenadeWasDown = inputRef.current.keys.KeyG;
        if (grenadePressed && game.grenades > 0) {
          game.grenades -= 1;
          const dx = inputRef.current.aimX - game.playerX;
          const dz = inputRef.current.aimZ - game.playerZ;
          const distance = Math.hypot(dx, dz) || 1;
          const range = Math.min(4.2, distance);
          const impact = clampToArena(game.playerX + (dx / distance) * range, game.playerZ + (dz / distance) * range);
          game.explosions.push({ id: game.nextId++, x: impact.x, z: impact.z, life: .45 });
          for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = game.enemies[index];
            if (Math.hypot(enemy.x - impact.x, enemy.z - impact.z) <= 2.5) {
              game.enemies.splice(index, 1);
              game.score += 25 + game.wave * 5;
              game.kills += 1;
            }
          }
        }

        if ((inputRef.current.fire || inputRef.current.keys.Space) && game.fireTimer <= 0 && game.reloadTimer <= 0 && game.ammo > 0) {
          const dx = inputRef.current.aimX - game.playerX;
          const dz = inputRef.current.aimZ - game.playerZ;
          const distance = Math.hypot(dx, dz) || 1;
          game.bullets.push({
            id: game.nextId++, x: game.playerX, z: game.playerZ,
            vx: dx / distance * 14, vz: dz / distance * 14, life: 1.25,
          });
          game.ammo -= 1;
          game.fireTimer = .13;
        }

        const livingBullets: Bullet[] = [];
        for (const bullet of game.bullets) {
          bullet.x += bullet.vx * dt;
          bullet.z += bullet.vz * dt;
          bullet.life -= dt;
          if (bullet.life <= 0 || Math.abs(bullet.x) > 10 || Math.abs(bullet.z) > 10) continue;
          let hit = false;
          for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = game.enemies[index];
            if (Math.hypot(enemy.x - bullet.x, enemy.z - bullet.z) < .65) {
              game.enemies.splice(index, 1);
              game.score += 25 + game.wave * 5;
              game.kills += 1;
              hit = true;
              break;
            }
          }
          if (!hit) livingBullets.push(bullet);
        }
        game.bullets = livingBullets;

        for (const enemy of game.enemies) {
          const dx = game.playerX - enemy.x;
          const dz = game.playerZ - enemy.z;
          const distance = Math.hypot(dx, dz) || 1;
          const enemyPosition = moveActor(enemy.x, enemy.z, dx / distance * enemy.speed * dt, dz / distance * enemy.speed * dt, .23);
          enemy.x = enemyPosition.x;
          enemy.z = enemyPosition.z;
          if (distance < .76) {
            let damage = dt * (8.5 + game.wave * .45);
            const absorbed = Math.min(game.shield, damage);
            game.shield -= absorbed;
            damage -= absorbed;
            game.health -= damage;
            game.shieldDelay = 4;
          }
        }
        if (game.shieldDelay > 0) game.shieldDelay -= dt;
        else game.shield = Math.min(50, game.shield + dt * 7.5);
        game.explosions = game.explosions.filter((explosion) => (explosion.life -= dt) > 0);

        if (game.health <= 0) {
          game.health = 0;
          game.ended = true;
          gameOverRef.current(toHud(game));
        }
        hudClock += dt;
        if (hudClock >= .1) {
          hudClock = 0;
          hudRef.current(toHud(game));
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0b1116';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      if (map.landscape && backdrop.complete && backdrop.naturalWidth > 0) {
        const scale = Math.max(width / backdrop.naturalWidth, height / backdrop.naturalHeight);
        const drawnWidth = backdrop.naturalWidth * scale;
        const drawnHeight = backdrop.naturalHeight * scale;
        ctx.drawImage(backdrop, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
        ctx.fillStyle = 'rgba(5, 12, 17, .35)';
        ctx.fillRect(0, 0, width, height);
      } else {
        const floor = ctx.createRadialGradient(map.cx, map.cy, map.ry * .05, map.cx, map.cy, map.ry);
        floor.addColorStop(0, '#59636a');
        floor.addColorStop(.74, '#39444b');
        floor.addColorStop(1, '#202a30');
        ctx.fillStyle = '#0a1116';
        ctx.fillRect(0, 0, width, height);
        ctx.beginPath();
        ctx.ellipse(map.cx, map.cy, map.rx * 1.08, map.ry * 1.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#343f45';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(map.cx, map.cy, map.rx, map.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = floor;
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(map.cx, map.cy, map.rx * .97, map.ry * .97, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(174, 195, 202, .10)';
        ctx.lineWidth = 1;
        for (let line = -8; line <= 8; line += 1) {
          ctx.beginPath(); ctx.moveTo(map.cx + line * map.sx, map.cy - map.ry); ctx.lineTo(map.cx + line * map.sx, map.cy + map.ry); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(map.cx - map.rx, map.cy + line * map.sy); ctx.lineTo(map.cx + map.rx, map.cy + line * map.sy); ctx.stroke();
        }
        ctx.restore();
      }

      ctx.beginPath();
      ctx.ellipse(map.cx, map.cy, map.rx * .92, map.ry * .92, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(73, 216, 242, .72)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#3bc9ed';
      ctx.shadowBlur = 13;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!(map.landscape && backdrop.complete && backdrop.naturalWidth > 0)) {
        for (const obstacle of OBSTACLES) {
          const [sx, sy] = toScreen(obstacle.x, obstacle.z, map);
          ctx.fillStyle = '#626e73';
          ctx.fillRect(sx - obstacle.halfX * map.sx, sy - obstacle.halfZ * map.sy, obstacle.halfX * 2 * map.sx, obstacle.halfZ * 2 * map.sy);
          ctx.fillStyle = 'rgba(112, 222, 244, .75)';
          ctx.fillRect(sx - obstacle.halfX * map.sx, sy - obstacle.halfZ * map.sy, obstacle.halfX * 2 * map.sx, Math.max(2, obstacle.halfZ * map.sy * .18));
        }
      }

      for (const explosion of game.explosions) {
        const [sx, sy] = toScreen(explosion.x, explosion.z, map);
        const progress = 1 - explosion.life / .45;
        ctx.beginPath();
        ctx.ellipse(sx, sy, (8 + progress * 90) * (map.sx / map.sy), 8 + progress * 26, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(93, 227, 250, ${Math.max(.1, explosion.life / .45)})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#55ddf3';
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      for (const bullet of game.bullets) {
        const [sx, sy] = toScreen(bullet.x, bullet.z, map);
        ctx.shadowColor = '#5de3fa';
        ctx.shadowBlur = 13;
        ctx.fillStyle = '#c6f8ff';
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const enemy of game.enemies) {
        const [sx, sy] = toScreen(enemy.x, enemy.z, map);
        const angle = Math.atan2((game.playerZ - enemy.z) * map.sy, (game.playerX - enemy.x) * map.sx) + Math.PI / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0,0,0,.36)';
        ctx.beginPath(); ctx.ellipse(0, 4, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7d8989';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7, 1); ctx.lineTo(-10, 12); ctx.moveTo(7, 1); ctx.lineTo(10, 12); ctx.stroke();
        ctx.strokeStyle = '#9ca7a5';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-14, 2); ctx.moveTo(8, -6); ctx.lineTo(14, 1); ctx.stroke();
        ctx.fillStyle = '#3f4a4b';
        ctx.fillRect(-9, -11, 18, 17);
        ctx.fillStyle = '#b3bebd';
        ctx.beginPath(); ctx.ellipse(0, -16, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = '#48dcf6';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#69efff';
        ctx.fillRect(-4, -18, 2.5, 2);
        ctx.fillRect(2, -18, 2.5, 2);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      const [playerX, playerY] = toScreen(game.playerX, game.playerZ, map);
      const aimX = (inputRef.current.aimX - game.playerX) * map.sx;
      const aimY = (inputRef.current.aimZ - game.playerZ) * map.sy;
      ctx.save();
      ctx.translate(playerX, playerY);
      ctx.rotate(Math.atan2(aimY, aimX) + Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath(); ctx.ellipse(0, 5, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#263137';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-7, 17); ctx.moveTo(5, 5); ctx.lineTo(7, 17); ctx.stroke();
      ctx.fillStyle = '#59656a';
      ctx.fillRect(-9, -10, 18, 20);
      ctx.fillStyle = '#303a40';
      ctx.fillRect(-8, -8, 16, 12);
      ctx.fillStyle = '#c49a7e';
      ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#282928';
      ctx.beginPath(); ctx.arc(0, -17, 7, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9ca9ad';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(9, -8); ctx.stroke();
      ctx.strokeStyle = '#48d9f5';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(9, -24); ctx.stroke();
      ctx.shadowColor = '#48d9f5';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#54e6ff';
      ctx.fillRect(6, -16, 5, 2);
      ctx.restore();
      ctx.shadowBlur = 0;

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active, inputRef, resetKey]);

  const updateAim = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const map = (() => {
      const landscape = bounds.width > bounds.height * 1.15;
      const rx = landscape ? Math.min(bounds.width * .46, bounds.height * .74) : bounds.width * .43;
      const ry = landscape ? Math.min(bounds.height * .44, bounds.width * .24) : Math.min(bounds.height * .36, bounds.width * .74);
      return { sx: rx / ARENA_LIMIT, sy: ry / ARENA_LIMIT, cx: bounds.width / 2, cy: bounds.height / 2 };
    })();
    inputRef.current.aimX = (event.clientX - bounds.left - map.cx) / map.sx;
    inputRef.current.aimZ = (event.clientY - bounds.top - map.cy) / map.sy;
  };

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      aria-label="Arena Survival game scene"
      onPointerMove={updateAim}
      onPointerDown={(event) => { updateAim(event); inputRef.current.fire = true; }}
      onPointerUp={() => { inputRef.current.fire = false; }}
      onPointerLeave={() => { inputRef.current.fire = false; }}
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
  if (!webglAvailable) return <FallbackScene {...props} />;

  return (
    <Canvas
      className="game-canvas"
      camera={{ position: [0, 19, 14], fov: 47, near: .1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.setClearColor('#0f1320'); }}
      fallback={<FallbackScene {...props} />}
    >
      <CameraAndLights />
      <ArenaGeometry />
      <Ground inputRef={props.inputRef} />
      <GameLoop {...props} />
    </Canvas>
  );
}