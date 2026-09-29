export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';

export type InputState = {
  keys: Record<string, boolean>;
  fire: boolean;
  aimX: number;
  aimZ: number;
  touchX: number;
  touchZ: number;
};

export type VehicleState = {
  x: number;
  z: number;
  heading: number;
  speed: number;
  driving: boolean;
  interactWasDown: boolean;
};

export type HudStats = {
  health: number;
  shield: number;
  ammo: number;
  reserveAmmo: number;
  grenades: number;
  score: number;
  wave: number;
  bossHealth: number;
  bossMaxHealth: number;
  survival: number;
  enemies: number;
  radar: Array<[number, number]>;
  reload: number;
  damageFlash: number;
  nearCar: boolean;
  playerDriving: boolean;
};

export type Enemy = {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  speed: number;
  variant: number;
  health: number;
  maxHealth: number;
  phase: number;
  moveBlend: number;
  stagger: number;
  attackCooldown: number;
  attackPulse: number;
  hitFlash: number;
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  z: number;
  muzzle?: { x: number; y: number; z: number; shotX: number; shotZ: number };
  vx: number;
  vz: number;
  life: number;
};

// The visual trail starts at the gun but rejoins the original collision path.
// Neither the bullet's logical coordinates nor its collision checks use this offset.
export function bulletRenderPosition(bullet: Bullet): { x: number; y: number; z: number } {
  if (!bullet.muzzle) return { x: bullet.x, y: bullet.y, z: bullet.z };
  const travel = Math.hypot(bullet.x - bullet.muzzle.shotX, bullet.z - bullet.muzzle.shotZ);
  const blend = Math.max(0, 1 - travel / 2.5);
  return {
    x: bullet.x + (bullet.muzzle.x - bullet.muzzle.shotX) * blend,
    y: bullet.y + (bullet.muzzle.y - bullet.y) * blend,
    z: bullet.z + (bullet.muzzle.z - bullet.muzzle.shotZ) * blend,
  };
}

export type GrenadeProjectile = {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuse: number;
  spin: number;
};

export type DartProjectile = {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
};

export type Explosion = {
  id: number;
  x: number;
  z: number;
  life: number;
  duration: number;
  radius: number;
};

export type SupplyPickup = { id: number; kind: 'ammo' | 'grenade'; x: number; z: number; phase: number };
export type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  duration: number;
  size: number;
  color: string;
};

export type Engine = {
  playerX: number;
  playerZ: number;
  playerVX: number;
  playerVZ: number;
  vehicle: VehicleState;
  playerSpeed: number;
  playerPhase: number;
  firePulse: number;
  reloadTimer: number;
  reloadDuration: number;
  grenadeCount: number;
  grenadeWasDown: boolean;
  grenadeCooldown: number;
  health: number;
  shield: number;
  shieldDelay: number;
  damageFlash: number;
  cameraShake: number;
  score: number;
  kills: number;
  ammo: number;
  reserveAmmo: number;
  wave: number;
  waveElapsed: number;
  bossWavePending: boolean;
  survival: number;
  spawnTimer: number;
  pickupTimer: number;
  grenadePickupTimer: number;
  fireTimer: number;
  nextId: number;
  ended: boolean;
  enemies: Enemy[];
  bullets: Bullet[];
  grenades: GrenadeProjectile[];
  darts: DartProjectile[];
  explosions: Explosion[];
  pickups: SupplyPickup[];
  particles: Particle[];
};

export type StepEvents = {
  enemiesChanged: boolean;
  bulletsChanged: boolean;
  grenadesChanged: boolean;
  dartsChanged: boolean;
  explosionsChanged: boolean;
  pickupsChanged: boolean;
};

export const ARENA_BOUNDARY_SCALE = 1.25;
export const ARENA_LIMIT = 8.15 * ARENA_BOUNDARY_SCALE;
export const MAGAZINE_SIZE = 60;
export const MAX_PARTICLES = 320;
export const OBSTACLES: Array<{ x: number; z: number; halfX: number; halfZ: number }> = [
  { x: -3.05, z: -2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: -2.35, halfX: 1.12, halfZ: .27 },
  { x: -3.05, z: 2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: 2.35, halfX: 1.12, halfZ: .27 },
  { x: 0, z: -4.35, halfX: .65, halfZ: .4 },
  { x: 0, z: 4.35, halfX: .65, halfZ: .4 },
];

export const ARENA_CAR = {
  x: 0,
  z: 2.25,
  y: .025,
  scale: 3,
  rotationY: 0,
  halfX: .72,
  halfZ: 1.53,
};

const STARTING_VEHICLE_POSITION = {
  x: ARENA_CAR.x,
  z: ARENA_CAR.z,
  heading: ARENA_CAR.rotationY,
};

export const VEHICLE_INTERACTION_REACH = 1.25;

export const freshEngine = (): Engine => ({
  playerX: 0,
  playerZ: 0,
  playerVX: 0,
  playerVZ: 0,
  vehicle: {
    ...STARTING_VEHICLE_POSITION,
    speed: 0,
    driving: false,
    interactWasDown: false,
  },
  playerSpeed: 0,
  playerPhase: 0,
  firePulse: 0,
  reloadTimer: 0,
  reloadDuration: 0,
  grenadeCount: 3,
  grenadeWasDown: false,
  grenadeCooldown: 0,
  health: 100,
  shield: 50,
  shieldDelay: 0,
  damageFlash: 0,
  cameraShake: 0,
  score: 0,
  kills: 0,
  ammo: MAGAZINE_SIZE,
  reserveAmmo: 120,
  wave: 1,
  waveElapsed: 0,
  bossWavePending: false,
  survival: 0,
  spawnTimer: .65,
  pickupTimer: 9,
  grenadePickupTimer: 12,
  fireTimer: 0,
  nextId: 1,
  ended: false,
  enemies: [],
  bullets: [],
  grenades: [],
  darts: [],
  explosions: [],
  pickups: [],
  particles: [],
});

export const toHud = (game: Engine): HudStats => ({
  health: game.health,
  shield: game.shield,
  ammo: game.ammo,
  reserveAmmo: game.reserveAmmo,
  grenades: game.grenadeCount,
  score: game.score,
  wave: game.wave,
  bossHealth: game.enemies.find((enemy) => enemy.variant === 3)?.health ?? 0,
  bossMaxHealth: game.enemies.find((enemy) => enemy.variant === 3)?.maxHealth ?? 0,
  survival: game.survival,
  enemies: game.enemies.length,
  radar: game.enemies.slice(0, 28).map((enemy) => [
    clamp((enemy.x - game.playerX) / 7, -1, 1),
    clamp((enemy.z - game.playerZ) / 7, -1, 1),
  ]),
  reload: game.reloadDuration > 0 ? clamp(1 - game.reloadTimer / game.reloadDuration, 0, 1) : 0,
  damageFlash: clamp(game.damageFlash, 0, 1),
  nearCar: !game.vehicle.driving && isNearVehicle(game.playerX, game.playerZ, game.vehicle),
  playerDriving: game.vehicle.driving,
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampToArena(x: number, z: number) {
  const distance = Math.hypot(x, z);
  if (distance <= ARENA_LIMIT) return { x, z };
  const scale = ARENA_LIMIT / distance;
  return { x: x * scale, z: z * scale };
}

type VehiclePose = Pick<VehicleState, 'x' | 'z' | 'heading'>;

function vehicleBounds(vehicle: VehiclePose) {
  const cosine = Math.abs(Math.cos(vehicle.heading));
  const sine = Math.abs(Math.sin(vehicle.heading));
  return {
    x: vehicle.x,
    z: vehicle.z,
    halfX: cosine * ARENA_CAR.halfX + sine * ARENA_CAR.halfZ,
    halfZ: sine * ARENA_CAR.halfX + cosine * ARENA_CAR.halfZ,
  };
}

function vehicleLocalOffset(x: number, z: number, vehicle: VehiclePose) {
  const deltaX = x - vehicle.x;
  const deltaZ = z - vehicle.z;
  const cosine = Math.cos(vehicle.heading);
  const sine = Math.sin(vehicle.heading);
  return {
    x: cosine * deltaX - sine * deltaZ,
    z: sine * deltaX + cosine * deltaZ,
  };
}

export function isNearVehicle(x: number, z: number, vehicle: VehiclePose) {
  const local = vehicleLocalOffset(x, z, vehicle);
  const outsideX = Math.max(0, Math.abs(local.x) - ARENA_CAR.halfX);
  const outsideZ = Math.max(0, Math.abs(local.z) - ARENA_CAR.halfZ);
  return Math.hypot(outsideX, outsideZ) <= VEHICLE_INTERACTION_REACH;
}

function hitsStaticObstacle(x: number, z: number, radius: number) {
  return OBSTACLES.some((obstacle) =>
    Math.abs(x - obstacle.x) < obstacle.halfX + radius
    && Math.abs(z - obstacle.z) < obstacle.halfZ + radius,
  );
}

export function hitsObstacle(
  x: number,
  z: number,
  radius = .28,
  vehicle: VehiclePose = STARTING_VEHICLE_POSITION,
) {
  const car = vehicleBounds(vehicle);
  return hitsStaticObstacle(x, z, radius) || (
    Math.abs(x - car.x) < car.halfX + radius
    && Math.abs(z - car.z) < car.halfZ + radius
  );
}

function segmentIntersectsObstacle(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  obstacle: { x: number; z: number; halfX: number; halfZ: number },
  radius: number,
) {
  const deltaX = endX - startX;
  const deltaZ = endZ - startZ;
  const minX = obstacle.x - obstacle.halfX - radius;
  const maxX = obstacle.x + obstacle.halfX + radius;
  const minZ = obstacle.z - obstacle.halfZ - radius;
  const maxZ = obstacle.z + obstacle.halfZ + radius;
  let entry = 0;
  let exit = 1;

  const clip = (start: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 1e-9) return start >= min && start <= max;
    const first = (min - start) / delta;
    const second = (max - start) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    return entry <= exit;
  };

  return clip(startX, deltaX, minX, maxX) && clip(startZ, deltaZ, minZ, maxZ);
}

export function segmentHitsObstacle(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  radius = .06,
  vehicle: VehiclePose = STARTING_VEHICLE_POSITION,
) {
  return OBSTACLES.some((obstacle) =>
    segmentIntersectsObstacle(startX, startZ, endX, endZ, obstacle, radius),
  ) || segmentIntersectsObstacle(startX, startZ, endX, endZ, vehicleBounds(vehicle), radius);
}

export function moveActor(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius = .28,
  vehicle: VehiclePose = STARTING_VEHICLE_POSITION,
  ignoreVehicleCollision = false,
) {
  const blocked = (targetX: number, targetZ: number) => ignoreVehicleCollision
    ? hitsStaticObstacle(targetX, targetZ, radius)
    : hitsObstacle(targetX, targetZ, radius, vehicle);
  const target = clampToArena(x + dx, z + dz);
  if (!blocked(target.x, target.z)) return target;
  const slideX = clampToArena(x + dx, z);
  const slideZ = clampToArena(x, z + dz);
  const allowX = !blocked(slideX.x, slideX.z);
  const allowZ = !blocked(slideZ.x, slideZ.z);
  if (allowX && allowZ) return Math.abs(dx) >= Math.abs(dz) ? slideX : slideZ;
  if (allowX) return slideX;
  if (allowZ) return slideZ;
  return { x, z };
}

function canPlaceVehicle(x: number, z: number, heading: number) {
  const bounds = vehicleBounds({ x, z, heading });
  const arenaClearance = Math.hypot(ARENA_CAR.halfX, ARENA_CAR.halfZ);
  if (Math.hypot(x, z) > ARENA_LIMIT - arenaClearance) return false;
  return !OBSTACLES.some((obstacle) =>
    Math.abs(x - obstacle.x) < bounds.halfX + obstacle.halfX
    && Math.abs(z - obstacle.z) < bounds.halfZ + obstacle.halfZ,
  );
}

function pushEnemiesWithVehicle(game: Engine, previousX: number, previousZ: number) {
  const vehicle = game.vehicle;
  const cosine = Math.cos(vehicle.heading);
  const sine = Math.sin(vehicle.heading);
  const movementX = vehicle.x - previousX;
  const movementZ = vehicle.z - previousZ;
  const localMovementX = cosine * movementX - sine * movementZ;
  const localMovementZ = sine * movementX + cosine * movementZ;
  const moving = Math.hypot(localMovementX, localMovementZ) > .0001;

  for (const enemy of game.enemies) {
    const radius = enemy.variant === 3 ? .42 : .23;
    const local = vehicleLocalOffset(enemy.x, enemy.z, vehicle);
    const overlapX = ARENA_CAR.halfX + radius - Math.abs(local.x);
    const overlapZ = ARENA_CAR.halfZ + radius - Math.abs(local.z);
    if (overlapX <= 0 || overlapZ <= 0) continue;

    const primaryAxis = moving
      ? Math.abs(localMovementX) > Math.abs(localMovementZ) ? 'x' : 'z'
      : overlapX < overlapZ ? 'x' : 'z';
    const axes = primaryAxis === 'x' ? ['x', 'z'] as const : ['z', 'x'] as const;
    let pushed = false;

    for (const axis of axes) {
      const localPosition = axis === 'x' ? local.x : local.z;
      const localMotion = axis === 'x' ? localMovementX : localMovementZ;
      const halfExtent = axis === 'x' ? ARENA_CAR.halfX : ARENA_CAR.halfZ;
      const sign = Math.sign(localMotion) || Math.sign(localPosition) || 1;
      const targetLocalPosition = sign * (halfExtent + radius + .045);
      const localDelta = targetLocalPosition - localPosition;
      const deltaX = axis === 'x' ? cosine * localDelta : sine * localDelta;
      const deltaZ = axis === 'x' ? -sine * localDelta : cosine * localDelta;
      const candidate = moveActor(enemy.x, enemy.z, deltaX, deltaZ, radius, vehicle, true);
      const candidateLocal = vehicleLocalOffset(candidate.x, candidate.z, vehicle);
      const clearsVehicle = Math.abs(candidateLocal.x) >= ARENA_CAR.halfX + radius
        || Math.abs(candidateLocal.z) >= ARENA_CAR.halfZ + radius;
      if (!clearsVehicle) continue;

      const pushX = candidate.x - enemy.x;
      const pushZ = candidate.z - enemy.z;
      const pushLength = Math.hypot(pushX, pushZ);
      if (pushLength < .001) continue;
      const weight = enemy.variant === 3 ? .55 : 1;
      const impulse = (2.4 + Math.min(2.6, Math.abs(vehicle.speed) * .55)) * weight;
      enemy.x = candidate.x;
      enemy.z = candidate.z;
      enemy.vx = clamp(enemy.vx + pushX / pushLength * impulse, -8, 8);
      enemy.vz = clamp(enemy.vz + pushZ / pushLength * impulse, -8, 8);
      enemy.stagger = Math.max(enemy.stagger, enemy.variant === 3 ? .12 : .18);
      enemy.moveBlend = 0;
      pushed = true;
      break;
    }
  }
}

function getVehicleExitPosition(game: Engine) {
  const vehicle = game.vehicle;
  for (let radius = Math.max(ARENA_CAR.halfX, ARENA_CAR.halfZ) + .52; radius <= 3.7; radius += .18) {
    for (let step = 0; step < 16; step += 1) {
      const angle = (step / 16) * Math.PI * 2;
      const desiredX = vehicle.x + Math.cos(angle) * radius;
      const desiredZ = vehicle.z + Math.sin(angle) * radius;
      if (Math.hypot(desiredX, desiredZ) > ARENA_LIMIT - .32) continue;
      if (hitsObstacle(desiredX, desiredZ, .31, vehicle)) continue;
      if (game.enemies.some((enemy) => Math.hypot(enemy.x - desiredX, enemy.z - desiredZ) < .62)) continue;
      return { x: desiredX, z: desiredZ };
    }
  }
  return null;
}

function interactWithVehicle(game: Engine, input: InputState) {
  const interactDown = Boolean(input.keys.KeyF);
  const pressed = interactDown && !game.vehicle.interactWasDown;
  game.vehicle.interactWasDown = interactDown;
  if (!pressed) return;

  if (game.vehicle.driving) {
    const exitPosition = getVehicleExitPosition(game);
    if (!exitPosition) return;
    game.vehicle.driving = false;
    game.vehicle.speed = 0;
    game.playerX = exitPosition.x;
    game.playerZ = exitPosition.z;
    game.playerVX = 0;
    game.playerVZ = 0;
  } else if (isNearVehicle(game.playerX, game.playerZ, game.vehicle)) {
    game.vehicle.driving = true;
    game.vehicle.speed = 0;
    game.playerX = game.vehicle.x;
    game.playerZ = game.vehicle.z;
    game.playerVX = 0;
    game.playerVZ = 0;
    input.fire = false;
  }
}

function driveVehicle(game: Engine, input: InputState, dt: number) {
  const vehicle = game.vehicle;
  const previousX = vehicle.x;
  const previousZ = vehicle.z;
  const throttle = clamp(
    (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0)
      - (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0)
      - input.touchZ,
    -1,
    1,
  );
  const steering = clamp(
    (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0)
      - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0)
      + input.touchX,
    -1,
    1,
  );
  const maxSpeed = input.keys.ShiftLeft || input.keys.ShiftRight ? 5.4 : 4.2;
  if (throttle !== 0) vehicle.speed = clamp(vehicle.speed + throttle * 8.5 * dt, -2.4, maxSpeed);
  else vehicle.speed *= Math.exp(-2.1 * dt);
  if (Math.abs(vehicle.speed) < .025) vehicle.speed = 0;

  const turnRate = .42 + Math.min(1, Math.abs(vehicle.speed) / 2.8) * 1.15;
  const reverseSign = vehicle.speed < -.08 ? -1 : 1;
  const nextHeading = vehicle.heading - steering * turnRate * reverseSign * dt;
  const nextX = vehicle.x - Math.sin(nextHeading) * vehicle.speed * dt;
  const nextZ = vehicle.z - Math.cos(nextHeading) * vehicle.speed * dt;

  if (canPlaceVehicle(nextX, nextZ, nextHeading)) {
    vehicle.x = nextX;
    vehicle.z = nextZ;
    vehicle.heading = nextHeading;
  } else {
    if (canPlaceVehicle(vehicle.x, vehicle.z, nextHeading)) vehicle.heading = nextHeading;
    vehicle.speed = 0;
  }

  game.playerX = vehicle.x;
  game.playerZ = vehicle.z;
  game.playerVX = -Math.sin(vehicle.heading) * vehicle.speed;
  game.playerVZ = -Math.cos(vehicle.heading) * vehicle.speed;
  game.playerSpeed = Math.min(1, Math.abs(vehicle.speed) / 5.4);
  pushEnemiesWithVehicle(game, previousX, previousZ);
}

function pointSegmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / lengthSquared, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function spawnParticles(
  game: Engine,
  x: number,
  y: number,
  z: number,
  count: number,
  colors: string[],
  speed: number,
  size: number,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const lift = .4 + Math.random() * 1.6;
    const velocity = speed * (.35 + Math.random() * .85);
    const duration = .22 + Math.random() * .45;
    game.particles.push({
      x,
      y,
      z,
      vx: Math.cos(angle) * velocity,
      vy: lift,
      vz: Math.sin(angle) * velocity,
      life: duration,
      duration,
      size: size * (.5 + Math.random()),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  if (game.particles.length > MAX_PARTICLES) {
    game.particles.splice(0, game.particles.length - MAX_PARTICLES);
  }
}

function addEnemy(game: Engine, x: number, z: number, variant: number, events: StepEvents) {
  const health = variant === 3 ? 64 : variant === 2 ? 4 : 2;
  game.enemies.push({
    id: game.nextId++,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: game.playerX - x,
    facingZ: game.playerZ - z,
    speed: variant === 3 ? 1.15 : variant === 1 ? 1.72 + game.wave * .08 : variant === 2 ? .96 + game.wave * .05 : 1.28 + game.wave * .07,
    variant,
    health,
    maxHealth: health,
    phase: Math.random() * Math.PI * 2,
    moveBlend: 0,
    stagger: 0,
    attackCooldown: .4 + Math.random() * .5,
    attackPulse: 0,
    hitFlash: 0,
  });
  events.enemiesChanged = true;
}

function spawnMiniBoss(game: Engine, events: StepEvents) {
  const angle = Math.random() * Math.PI * 2;
  const distance = ARENA_LIMIT * .82;
  addEnemy(game, Math.cos(angle) * distance, Math.sin(angle) * distance, 3, events);
  game.wave = 4;
  game.waveElapsed = 0;
  game.bossWavePending = false;
}

function damageEnemy(
  game: Engine,
  enemyIndex: number,
  amount: number,
  impulseX: number,
  impulseZ: number,
  events: StepEvents,
) {
  const enemy = game.enemies[enemyIndex];
  if (!enemy) return;
  enemy.health -= amount;
  enemy.hitFlash = .2;
  enemy.stagger = .22;
  enemy.vx += impulseX;
  enemy.vz += impulseZ;
  events.enemiesChanged = true;
  spawnParticles(game, enemy.x, 1.05, enemy.z, 6, ['#8ef1ff', '#47cce8', '#c6cdca'], 1.8, .055);
  if (enemy.health > 0) return;

  const wasMiniBoss = enemy.variant === 3;
  game.score += wasMiniBoss ? 400 : 25 + game.wave * 5;
  game.kills += 1;
  spawnParticles(game, enemy.x, .9, enemy.z, 20, ['#aeb9b8', '#586668', '#57d7ed', '#d9e4e2'], 3.2, .11);
  game.enemies.splice(enemyIndex, 1);
  if (wasMiniBoss) {
    game.wave = 5;
    game.waveElapsed = 0;
    game.bossWavePending = false;
    game.spawnTimer = 1.25;
    game.darts = [];
    events.dartsChanged = true;
  }
  events.enemiesChanged = true;
}

function spawnSupplyPickup(game: Engine, kind: SupplyPickup['kind'], events: StepEvents) {
  if (game.pickups.some((pickup) => pickup.kind === kind)) return;
  const anchors = kind === 'ammo'
    ? [[-4.3, -.4], [4.15, .6], [0, -5.7], [0, 5.7], [-5.3, 3.2], [5.3, -3.2]]
    : [[-5.3, -3.2], [5.3, 3.2], [0, -6], [0, 6], [-4.3, .4], [4.15, -.6]];
  const start = Math.floor(Math.random() * anchors.length);
  for (let offset = 0; offset < anchors.length; offset += 1) {
    const [x, z] = anchors[(start + offset) % anchors.length];
    const position = clampToArena(x, z);
    if (hitsObstacle(position.x, position.z, .5, game.vehicle)
      || game.pickups.some((pickup) => Math.hypot(pickup.x - x, pickup.z - z) < 1.2)) continue;
    game.pickups.push({ id: game.nextId++, kind, x: position.x, z: position.z, phase: Math.random() * Math.PI * 2 });
    events.pickupsChanged = true;
    return;
  }
}

function steerEnemy(enemy: Enemy, playerX: number, playerZ: number, dt: number, vehicle: VehiclePose) {
  const dx = playerX - enemy.x;
  const dz = playerZ - enemy.z;
  const distance = Math.hypot(dx, dz) || 1;
  const baseAngle = Math.atan2(dx, dz);
  const offsets = [0, -.55, .55, -1.05, 1.05, -1.6, 1.6];
  let bestX = dx / distance;
  let bestZ = dz / distance;
  let bestScore = -Infinity;

  for (const offset of offsets) {
    const angle = baseAngle + offset;
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);
    const candidate = moveActor(enemy.x, enemy.z, dirX * enemy.speed * dt, dirZ * enemy.speed * dt, .23, vehicle);
    if (Math.hypot(candidate.x - enemy.x, candidate.z - enemy.z) < .001) continue;
    const progress = distance - Math.hypot(playerX - candidate.x, playerZ - candidate.z);
    const score = progress - Math.abs(offset) * .012;
    if (score > bestScore) {
      bestScore = score;
      bestX = dirX;
      bestZ = dirZ;
    }
  }
  return { x: bestX, z: bestZ, distance };
}

function detonateGrenade(game: Engine, grenade: GrenadeProjectile, events: StepEvents) {
  const radius = 3.25;
  const duration = .62;
  game.explosions.push({
    id: game.nextId++,
    x: grenade.x,
    z: grenade.z,
    life: duration,
    duration,
    radius,
  });
  events.explosionsChanged = true;
  game.cameraShake = Math.max(game.cameraShake, .32);
  spawnParticles(game, grenade.x, .2, grenade.z, 52, ['#63e4fa', '#bdf8ff', '#73858a', '#d9e1df'], 5.2, .13);

  for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = game.enemies[index];
    const dx = enemy.x - grenade.x;
    const dz = enemy.z - grenade.z;
    const distance = Math.hypot(dx, dz);
    if (distance > radius) continue;
    const force = (1 - distance / radius) * 7;
    const direction = distance > .001 ? 1 / distance : 0;
    damageEnemy(game, index, enemy.variant === 3 ? 24 : enemy.variant === 2 ? 3 : 2, dx * direction * force, dz * direction * force, events);
  }
}

function stepGrenades(game: Engine, dt: number, events: StepEvents) {
  for (let index = game.grenades.length - 1; index >= 0; index -= 1) {
    const grenade = game.grenades[index];
    const next = moveActor(grenade.x, grenade.z, grenade.vx * dt, grenade.vz * dt, .11, game.vehicle);
    const blocked = Math.hypot(next.x - grenade.x, next.z - grenade.z) < Math.hypot(grenade.vx * dt, grenade.vz * dt) * .4;
    if (blocked) {
      grenade.vx *= -.46;
      grenade.vz *= -.46;
      spawnParticles(game, grenade.x, .15, grenade.z, 3, ['#5bd9f2', '#718087'], .65, .035);
    } else {
      grenade.x = next.x;
      grenade.z = next.z;
    }
    grenade.vy -= 9.8 * dt;
    grenade.y += grenade.vy * dt;
    grenade.spin += dt * (8 + Math.hypot(grenade.vx, grenade.vz));
    if (grenade.y < .12) {
      grenade.y = .12;
      if (Math.abs(grenade.vy) > .85) grenade.vy = Math.abs(grenade.vy) * .43;
      else grenade.vy = 0;
      grenade.vx *= .82;
      grenade.vz *= .82;
    }
    grenade.fuse -= dt;
    if (grenade.fuse <= 0) {
      detonateGrenade(game, grenade, events);
      game.grenades.splice(index, 1);
      events.grenadesChanged = true;
    }
  }
}

function stepBullets(game: Engine, dt: number, events: StepEvents) {
  for (let index = game.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = game.bullets[index];
    const oldX = bullet.x;
    const oldZ = bullet.z;
    bullet.x += bullet.vx * dt;
    bullet.z += bullet.vz * dt;
    bullet.life -= dt;
    let remove = bullet.life <= 0 || Math.hypot(bullet.x, bullet.z) > ARENA_LIMIT + .6;

    if (!remove && segmentHitsObstacle(oldX, oldZ, bullet.x, bullet.z, .06, game.vehicle)) {
      spawnParticles(game, bullet.x, bullet.y, bullet.z, 5, ['#a9f5ff', '#58d9f1', '#879398'], 1.45, .04);
      remove = true;
    }
    if (!remove) {
      for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = game.enemies[enemyIndex];
        if (pointSegmentDistance(enemy.x, enemy.z, oldX, oldZ, bullet.x, bullet.z) < .43) {
          const speed = Math.hypot(bullet.vx, bullet.vz) || 1;
          damageEnemy(game, enemyIndex, 1, bullet.vx / speed * 2.4, bullet.vz / speed * 2.4, events);
          remove = true;
          break;
        }
      }
    }
    if (remove) {
      game.bullets.splice(index, 1);
      events.bulletsChanged = true;
    }
  }
}

function stepDarts(game: Engine, dt: number, events: StepEvents) {
  for (let index = game.darts.length - 1; index >= 0; index -= 1) {
    const dart = game.darts[index];
    const oldX = dart.x;
    const oldZ = dart.z;
    dart.x += dart.vx * dt;
    dart.z += dart.vz * dt;
    dart.life -= dt;
    const hitWall = hitsObstacle(dart.x, dart.z, .035, game.vehicle);
    const hitPlayer = pointSegmentDistance(game.playerX, game.playerZ, oldX, oldZ, dart.x, dart.z) < .48;
    if (hitPlayer && !hitWall && !game.vehicle.driving) {
      const damage = 13;
      const absorbed = Math.min(game.shield, damage);
      game.shield -= absorbed;
      game.health -= damage - absorbed;
      game.shieldDelay = 3.4;
      game.damageFlash = .72;
      game.cameraShake = Math.max(game.cameraShake, .16);
    }
    if (dart.life <= 0 || hitWall || hitPlayer || Math.hypot(dart.x, dart.z) > ARENA_LIMIT + .8) {
      game.darts.splice(index, 1);
      events.dartsChanged = true;
    }
  }
}

export function stepGame(game: Engine, input: InputState, rawDelta: number): StepEvents {
  const events: StepEvents = {
    enemiesChanged: false,
    bulletsChanged: false,
    grenadesChanged: false,
    dartsChanged: false,
    explosionsChanged: false,
    pickupsChanged: false,
  };
  if (game.ended) return events;

  const dt = clamp(rawDelta, 0, .05);
  if (dt === 0) return events;
  game.survival += dt;
  if (game.wave !== 4 && !game.bossWavePending) {
    game.waveElapsed += dt;
    if (game.waveElapsed >= 14) {
      game.waveElapsed -= 14;
      if (game.wave === 3) game.bossWavePending = true;
      else game.wave += 1;
    }
  }
  game.playerPhase += dt;
  game.fireTimer = Math.max(0, game.fireTimer - dt);
  game.firePulse = Math.max(0, game.firePulse - dt);
  game.damageFlash = Math.max(0, game.damageFlash - dt * 1.8);
  game.cameraShake = Math.max(0, game.cameraShake - dt * 1.9);
  game.grenadeCooldown = Math.max(0, game.grenadeCooldown - dt);
  if (game.wave !== 4 && !game.bossWavePending) game.spawnTimer -= dt;
  game.pickupTimer -= dt;
  game.grenadePickupTimer -= dt;

  interactWithVehicle(game, input);
  if (game.vehicle.driving) {
    driveVehicle(game, input, dt);
  } else {
    let moveX = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0)
      - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) + input.touchX;
    let moveZ = (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0)
      - (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) + input.touchZ;
    const inputLength = Math.hypot(moveX, moveZ);
    if (inputLength > 1) {
      moveX /= inputLength;
      moveZ /= inputLength;
    }
    const maxSpeed = input.keys.ShiftLeft || input.keys.ShiftRight ? 7.2 : 5.4;
    const acceleration = inputLength > .01 ? 18 : 12;
    game.playerVX += (moveX * maxSpeed - game.playerVX) * Math.min(1, dt * acceleration);
    game.playerVZ += (moveZ * maxSpeed - game.playerVZ) * Math.min(1, dt * acceleration);
    const targetX = game.playerX + game.playerVX * dt;
    const targetZ = game.playerZ + game.playerVZ * dt;
    const movedPlayer = moveActor(game.playerX, game.playerZ, game.playerVX * dt, game.playerVZ * dt, .31, game.vehicle);
    if (Math.abs(movedPlayer.x - targetX) > .003) game.playerVX = 0;
    if (Math.abs(movedPlayer.z - targetZ) > .003) game.playerVZ = 0;
    game.playerX = movedPlayer.x;
    game.playerZ = movedPlayer.z;
    game.playerSpeed = Math.hypot(game.playerVX, game.playerVZ) / 7.2;
  }

  if (game.bossWavePending && game.enemies.length === 0) {
    spawnMiniBoss(game, events);
  } else if (game.wave !== 4 && !game.bossWavePending && game.spawnTimer <= 0 && game.enemies.length < 20) {
    const angle = Math.random() * Math.PI * 2;
    const distance = ARENA_LIMIT + .35;
    const variant = Math.floor(Math.random() * 3);
    addEnemy(game, Math.cos(angle) * distance, Math.sin(angle) * distance, variant, events);
    game.spawnTimer = Math.max(.32, 1.08 - game.wave * .045) * (.78 + Math.random() * .38);
  }

  if (!game.vehicle.driving && input.keys.KeyR && game.reloadTimer <= 0 && game.ammo < MAGAZINE_SIZE && game.reserveAmmo > 0) {
    game.reloadDuration = 1.18;
    game.reloadTimer = game.reloadDuration;
  }
  if (game.reloadTimer > 0) {
    game.reloadTimer = Math.max(0, game.reloadTimer - dt);
    if (game.reloadTimer === 0) {
      const loaded = Math.min(MAGAZINE_SIZE - game.ammo, game.reserveAmmo);
      game.ammo += loaded;
      game.reserveAmmo -= loaded;
      game.reloadDuration = 0;
    }
  }

  const grenadePressed = input.keys.KeyG && !game.grenadeWasDown;
  game.grenadeWasDown = input.keys.KeyG;
  if (!game.vehicle.driving && grenadePressed && game.grenadeCount > 0 && game.grenadeCooldown <= 0) {
    const dx = input.aimX - game.playerX;
    const dz = input.aimZ - game.playerZ;
    const distance = Math.hypot(dx, dz) || 1;
    const rangeScale = Math.min(1, Math.max(.35, distance / 5));
    game.grenades.push({
      id: game.nextId++,
      x: game.playerX,
      y: 1.22,
      z: game.playerZ,
      vx: dx / distance * 6.2 * rangeScale,
      vy: 4.35,
      vz: dz / distance * 6.2 * rangeScale,
      fuse: 1.05,
      spin: 0,
    });
    game.grenadeCount -= 1;
    game.grenadeCooldown = .3;
    events.grenadesChanged = true;
  }

  if (!game.vehicle.driving && (input.fire || input.keys.Space) && game.fireTimer <= 0 && game.reloadTimer <= 0 && game.ammo > 0) {
    const dx = input.aimX - game.playerX;
    const dz = input.aimZ - game.playerZ;
    const distance = Math.hypot(dx, dz) || 1;
    game.bullets.push({
      id: game.nextId++,
      x: game.playerX,
      y: 1.14,
      z: game.playerZ + .18,
      vx: dx / distance * 22,
      vz: dz / distance * 22,
      life: .72,
    });
    game.ammo -= 1;
    game.fireTimer = .115;
    game.firePulse = .12;
    events.bulletsChanged = true;
  }

  stepGrenades(game, dt, events);
  stepBullets(game, dt, events);
  stepDarts(game, dt, events);

  for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = game.enemies[index];
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackPulse = Math.max(0, enemy.attackPulse - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.stagger = Math.max(0, enemy.stagger - dt);
    enemy.phase += dt * (3.1 + enemy.speed);

    if (enemy.stagger > 0) {
      const pushed = moveActor(enemy.x, enemy.z, enemy.vx * dt, enemy.vz * dt, .23, game.vehicle);
      enemy.x = pushed.x;
      enemy.z = pushed.z;
      enemy.vx *= Math.pow(.035, dt);
      enemy.vz *= Math.pow(.035, dt);
      enemy.moveBlend = 0;
      continue;
    }

    if (enemy.variant === 3) {
      const dx = game.playerX - enemy.x;
      const dz = game.playerZ - enemy.z;
      const distance = Math.hypot(dx, dz) || 1;
      const dirX = dx / distance;
      const dirZ = dz / distance;
      enemy.facingX = dirX;
      enemy.facingZ = dirZ;

      const orbit = Math.sin(enemy.phase * .55) >= 0 ? 1 : -1;
      let moveX = -dirZ * orbit * .56;
      let moveZ = dirX * orbit * .56;
      if (distance > 5.3) { moveX += dirX; moveZ += dirZ; }
      if (distance < 3.5) { moveX -= dirX * .8; moveZ -= dirZ * .8; }
      const moveLength = Math.hypot(moveX, moveZ) || 1;
      const moved = moveActor(enemy.x, enemy.z, moveX / moveLength * enemy.speed * dt, moveZ / moveLength * enemy.speed * dt, .42, game.vehicle);
      const actualMovement = Math.hypot(moved.x - enemy.x, moved.z - enemy.z);
      enemy.x = moved.x;
      enemy.z = moved.z;
      enemy.moveBlend = actualMovement > .0001
        ? Math.min(1, enemy.moveBlend + dt * 4)
        : Math.max(0, enemy.moveBlend - dt * 5);

      if (enemy.attackCooldown <= 0 && game.darts.length < 8) {
        const aimX = game.playerX + game.playerVX * .24;
        const aimZ = game.playerZ + game.playerVZ * .24;
        const aimDistance = Math.hypot(aimX - enemy.x, aimZ - enemy.z) || 1;
        const speed = 8.5;
        game.darts.push({
          id: game.nextId++,
          x: enemy.x + dirX * .48,
          y: 1.3,
          z: enemy.z + dirZ * .48,
          vx: (aimX - enemy.x) / aimDistance * speed,
          vz: (aimZ - enemy.z) / aimDistance * speed,
          life: 1.65,
        });
        enemy.attackCooldown = 1.65;
        enemy.attackPulse = .35;
        events.dartsChanged = true;
      }
      continue;
    }

    const steer = steerEnemy(enemy, game.playerX, game.playerZ, dt, game.vehicle);
    enemy.facingX = steer.x;
    enemy.facingZ = steer.z;
    if (steer.distance > .78) {
      const position = moveActor(enemy.x, enemy.z, steer.x * enemy.speed * dt, steer.z * enemy.speed * dt, .23, game.vehicle);
      enemy.x = position.x;
      enemy.z = position.z;
      enemy.moveBlend = Math.min(1, enemy.moveBlend + dt * 4);
    } else {
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 5);
      if (enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.02;
        enemy.attackPulse = .42;
        if (!game.vehicle.driving) {
          const damage = 8.5 + game.wave * .45;
          const absorbed = Math.min(game.shield, damage);
          game.shield -= absorbed;
          game.health -= damage - absorbed;
          game.shieldDelay = 3.4;
          game.damageFlash = .72;
          game.cameraShake = Math.max(game.cameraShake, .13);
        }
      }
    }
  }

  if (game.pickupTimer <= 0) {
    spawnSupplyPickup(game, 'ammo', events);
    game.pickupTimer = 20;
  }
  if (game.grenadePickupTimer <= 0) {
    spawnSupplyPickup(game, 'grenade', events);
    game.grenadePickupTimer = 24;
  }
  for (let index = game.pickups.length - 1; index >= 0; index -= 1) {
    const pickup = game.pickups[index];
    pickup.phase += dt;
    if (Math.hypot(pickup.x - game.playerX, pickup.z - game.playerZ) < .82) {
      if (pickup.kind === 'ammo') game.reserveAmmo += 100;
      else game.grenadeCount += 2;
      game.score += 50;
      spawnParticles(game, pickup.x, .42, pickup.z, 16,
        pickup.kind === 'ammo' ? ['#55dff7', '#d8fbff', '#889a9e'] : ['#e8c871', '#f8eca6', '#77876a'],
        2.4, .075);
      game.pickups.splice(index, 1);
      events.pickupsChanged = true;
      if (pickup.kind === 'ammo') game.pickupTimer = Math.max(game.pickupTimer, 8);
      else game.grenadePickupTimer = Math.max(game.grenadePickupTimer, 8);
    }
  }

  for (let index = game.explosions.length - 1; index >= 0; index -= 1) {
    game.explosions[index].life -= dt;
    if (game.explosions[index].life <= 0) {
      game.explosions.splice(index, 1);
      events.explosionsChanged = true;
    }
  }
  for (let index = game.particles.length - 1; index >= 0; index -= 1) {
    const particle = game.particles[index];
    particle.life -= dt;
    particle.vy -= 5.5 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    if (particle.y < .025) {
      particle.y = .025;
      particle.vy = Math.abs(particle.vy) * .2;
      particle.vx *= .78;
      particle.vz *= .78;
    }
    if (particle.life <= 0) game.particles.splice(index, 1);
  }

  if (game.shieldDelay > 0) game.shieldDelay -= dt;
  else game.shield = Math.min(50, game.shield + dt * 8.5);
  if (game.health <= 0) {
    game.health = 0;
    game.ended = true;
  }
  return events;
}