export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';

export type InputState = {
  keys: Record<string, boolean>;
  fire: boolean;
  aimX: number;
  aimZ: number;
  touchX: number;
  touchZ: number;
};

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
  reload: number;
  damageFlash: number;
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
  vx: number;
  vz: number;
  life: number;
};

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

export type Explosion = {
  id: number;
  x: number;
  z: number;
  life: number;
  duration: number;
  radius: number;
};

export type AmmoPickup = { id: number; x: number; z: number; phase: number };
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
  survival: number;
  spawnTimer: number;
  pickupTimer: number;
  fireTimer: number;
  nextId: number;
  ended: boolean;
  enemies: Enemy[];
  bullets: Bullet[];
  grenades: GrenadeProjectile[];
  explosions: Explosion[];
  pickups: AmmoPickup[];
  particles: Particle[];
};

export type StepEvents = {
  enemiesChanged: boolean;
  bulletsChanged: boolean;
  grenadesChanged: boolean;
  explosionsChanged: boolean;
  pickupsChanged: boolean;
};

export const ARENA_LIMIT = 8.15;
export const MAGAZINE_SIZE = 60;
export const MAX_RESERVE_AMMO = 240;
export const MAX_PARTICLES = 320;
export const OBSTACLES: Array<{ x: number; z: number; halfX: number; halfZ: number }> = [
  { x: -3.05, z: -2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: -2.35, halfX: 1.12, halfZ: .27 },
  { x: -3.05, z: 2.35, halfX: 1.1, halfZ: .27 },
  { x: 2.95, z: 2.35, halfX: 1.12, halfZ: .27 },
  { x: 0, z: -4.35, halfX: .65, halfZ: .4 },
  { x: 0, z: 4.35, halfX: .65, halfZ: .4 },
];

export const freshEngine = (): Engine => ({
  playerX: 0,
  playerZ: 0,
  playerVX: 0,
  playerVZ: 0,
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
  survival: 0,
  spawnTimer: .65,
  pickupTimer: 15,
  fireTimer: 0,
  nextId: 1,
  ended: false,
  enemies: [],
  bullets: [],
  grenades: [],
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
  survival: game.survival,
  enemies: game.enemies.length,
  radar: game.enemies.slice(0, 28).map((enemy) => [
    clamp((enemy.x - game.playerX) / 7, -1, 1),
    clamp((enemy.z - game.playerZ) / 7, -1, 1),
  ]),
  reload: game.reloadDuration > 0 ? clamp(1 - game.reloadTimer / game.reloadDuration, 0, 1) : 0,
  damageFlash: clamp(game.damageFlash, 0, 1),
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

export function hitsObstacle(x: number, z: number, radius = .28) {
  return OBSTACLES.some((obstacle) =>
    Math.abs(x - obstacle.x) < obstacle.halfX + radius
    && Math.abs(z - obstacle.z) < obstacle.halfZ + radius,
  );
}

export function moveActor(x: number, z: number, dx: number, dz: number, radius = .28) {
  const target = clampToArena(x + dx, z + dz);
  if (!hitsObstacle(target.x, target.z, radius)) return target;
  const slideX = clampToArena(x + dx, z);
  const slideZ = clampToArena(x, z + dz);
  const allowX = !hitsObstacle(slideX.x, slideX.z, radius);
  const allowZ = !hitsObstacle(slideZ.x, slideZ.z, radius);
  if (allowX && allowZ) return Math.abs(dx) >= Math.abs(dz) ? slideX : slideZ;
  if (allowX) return slideX;
  if (allowZ) return slideZ;
  return { x, z };
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
  const health = variant === 2 ? 4 : 2;
  game.enemies.push({
    id: game.nextId++,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: game.playerX - x,
    facingZ: game.playerZ - z,
    speed: variant === 1 ? 1.72 + game.wave * .08 : variant === 2 ? .96 + game.wave * .05 : 1.28 + game.wave * .07,
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

  game.score += 25 + game.wave * 5;
  game.kills += 1;
  spawnParticles(game, enemy.x, .9, enemy.z, 20, ['#aeb9b8', '#586668', '#57d7ed', '#d9e4e2'], 3.2, .11);
  game.enemies.splice(enemyIndex, 1);
  events.enemiesChanged = true;
}

function spawnAmmoPickup(game: Engine, events: StepEvents) {
  if (game.pickups.length > 0) return;
  const anchors = [
    [-4.3, -.4], [4.15, .6], [0, -5.7], [0, 5.7], [-5.3, 3.2], [5.3, -3.2],
  ] as const;
  const anchor = anchors[Math.floor(Math.random() * anchors.length)];
  const position = clampToArena(anchor[0], anchor[1]);
  if (hitsObstacle(position.x, position.z, .5)) return;
  game.pickups.push({ id: game.nextId++, x: position.x, z: position.z, phase: Math.random() * Math.PI * 2 });
  events.pickupsChanged = true;
}

function steerEnemy(enemy: Enemy, playerX: number, playerZ: number, dt: number) {
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
    const candidate = moveActor(enemy.x, enemy.z, dirX * enemy.speed * dt, dirZ * enemy.speed * dt, .23);
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
    damageEnemy(game, index, enemy.variant === 2 ? 3 : 2, dx * direction * force, dz * direction * force, events);
  }
}

function stepGrenades(game: Engine, dt: number, events: StepEvents) {
  for (let index = game.grenades.length - 1; index >= 0; index -= 1) {
    const grenade = game.grenades[index];
    const next = moveActor(grenade.x, grenade.z, grenade.vx * dt, grenade.vz * dt, .11);
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

    if (!remove && hitsObstacle(bullet.x, bullet.z, .06)) {
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

export function stepGame(game: Engine, input: InputState, rawDelta: number): StepEvents {
  const events: StepEvents = {
    enemiesChanged: false,
    bulletsChanged: false,
    grenadesChanged: false,
    explosionsChanged: false,
    pickupsChanged: false,
  };
  if (game.ended) return events;

  const dt = clamp(rawDelta, 0, .05);
  if (dt === 0) return events;
  game.survival += dt;
  game.wave = Math.floor(game.survival / 14) + 1;
  game.playerPhase += dt;
  game.fireTimer = Math.max(0, game.fireTimer - dt);
  game.firePulse = Math.max(0, game.firePulse - dt);
  game.damageFlash = Math.max(0, game.damageFlash - dt * 1.8);
  game.cameraShake = Math.max(0, game.cameraShake - dt * 1.9);
  game.grenadeCooldown = Math.max(0, game.grenadeCooldown - dt);
  game.spawnTimer -= dt;
  game.pickupTimer -= dt;

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
  const movedPlayer = moveActor(game.playerX, game.playerZ, game.playerVX * dt, game.playerVZ * dt, .31);
  if (Math.abs(movedPlayer.x - targetX) > .003) game.playerVX = 0;
  if (Math.abs(movedPlayer.z - targetZ) > .003) game.playerVZ = 0;
  game.playerX = movedPlayer.x;
  game.playerZ = movedPlayer.z;
  game.playerSpeed = Math.hypot(game.playerVX, game.playerVZ) / 7.2;

  if (game.spawnTimer <= 0 && game.enemies.length < 20) {
    const angle = Math.random() * Math.PI * 2;
    const distance = ARENA_LIMIT + .35;
    const variant = Math.floor(Math.random() * 3);
    addEnemy(game, Math.cos(angle) * distance, Math.sin(angle) * distance, variant, events);
    game.spawnTimer = Math.max(.32, 1.08 - game.wave * .045) * (.78 + Math.random() * .38);
  }

  if (input.keys.KeyR && game.reloadTimer <= 0 && game.ammo < MAGAZINE_SIZE && game.reserveAmmo > 0) {
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
  if (grenadePressed && game.grenadeCount > 0 && game.grenadeCooldown <= 0) {
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

  if ((input.fire || input.keys.Space) && game.fireTimer <= 0 && game.reloadTimer <= 0 && game.ammo > 0) {
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

  for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = game.enemies[index];
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackPulse = Math.max(0, enemy.attackPulse - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.stagger = Math.max(0, enemy.stagger - dt);
    enemy.phase += dt * (3.1 + enemy.speed);

    if (enemy.stagger > 0) {
      const pushed = moveActor(enemy.x, enemy.z, enemy.vx * dt, enemy.vz * dt, .23);
      enemy.x = pushed.x;
      enemy.z = pushed.z;
      enemy.vx *= Math.pow(.035, dt);
      enemy.vz *= Math.pow(.035, dt);
      enemy.moveBlend = 0;
      continue;
    }

    const steer = steerEnemy(enemy, game.playerX, game.playerZ, dt);
    enemy.facingX = steer.x;
    enemy.facingZ = steer.z;
    if (steer.distance > .78) {
      const position = moveActor(enemy.x, enemy.z, steer.x * enemy.speed * dt, steer.z * enemy.speed * dt, .23);
      enemy.x = position.x;
      enemy.z = position.z;
      enemy.moveBlend = Math.min(1, enemy.moveBlend + dt * 4);
    } else {
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 5);
      if (enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.02;
        enemy.attackPulse = .42;
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

  if (game.pickupTimer <= 0) {
    spawnAmmoPickup(game, events);
    game.pickupTimer = 22;
  }
  for (let index = game.pickups.length - 1; index >= 0; index -= 1) {
    const pickup = game.pickups[index];
    pickup.phase += dt;
    if (Math.hypot(pickup.x - game.playerX, pickup.z - game.playerZ) < .82) {
      game.reserveAmmo = Math.min(MAX_RESERVE_AMMO, game.reserveAmmo + 36);
      game.score += 50;
      spawnParticles(game, pickup.x, .42, pickup.z, 16, ['#55dff7', '#d8fbff', '#889a9e'], 2.4, .075);
      game.pickups.splice(index, 1);
      events.pickupsChanged = true;
      game.pickupTimer = Math.max(game.pickupTimer, 8);
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