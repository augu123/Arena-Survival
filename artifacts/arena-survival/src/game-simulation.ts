import {
  ENEMY_STATS,
  LEVELS,
  PERKS,
  SHOP_ITEMS,
  xpForLevel,
  type EnemyKind,
  type Hazard,
  type LevelDef,
  type Obstacle,
  type PerkId,
  type ShopItemId,
} from './game-levels';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'levelup' | 'shop' | 'gameover' | 'victory';

export type InputState = {
  keys: Record<string, boolean>;
  fire: boolean;
  /** World-space point the weapon is aimed at (bullets fly toward it). */
  aimX: number;
  aimZ: number;
  /** Virtual stick, -1..1 in screen space (x = right, z = down). */
  touchX: number;
  touchZ: number;
  /** Camera heading in radians. 0 looks toward -Z; movement is relative to it. */
  cameraYaw: number;
  /** Look deltas (pixels) accumulated by mouse / touch, consumed by the camera. */
  lookDX: number;
  lookDY: number;
};

export const createInput = (): InputState => ({
  keys: {}, fire: false, aimX: 0, aimZ: -5, touchX: 0, touchZ: 0, cameraYaw: 0, lookDX: 0, lookDY: 0,
});

export type Enemy = {
  id: number;
  kind: EnemyKind;
  elite: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  speed: number;
  health: number;
  maxHealth: number;
  damage: number;
  radius: number;
  scale: number;
  xp: number;
  gold: number;
  score: number;
  phase: number;
  moveBlend: number;
  stagger: number;
  attackCooldown: number;
  attackPulse: number;
  hitFlash: number;
  /** Seconds left in the emerge-from-the-floor animation. */
  spawn: number;
  /** Ability timer: spit for spitters, slam for bosses. */
  special: number;
  /** Seconds left on a telegraphed boss slam wind-up. */
  slamCharge: number;
  volleyTimer: number;
  summonStage: number;
  /** Seconds since death; only used once the enemy becomes a corpse. */
  death: number;
};

export type Bullet = { id: number; x: number; y: number; z: number; vx: number; vz: number; life: number; damage: number; crit: boolean; pierce: number; hits: number[] };
export type HostileShot = { id: number; x: number; y: number; z: number; vx: number; vz: number; life: number; damage: number };
export type GrenadeProjectile = { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; fuse: number; spin: number };
export type ExplosionKind = 'frag' | 'nova' | 'slam' | 'acid' | 'levelup' | 'melee';
export type Explosion = { id: number; kind: ExplosionKind; x: number; z: number; life: number; duration: number; radius: number };
export type Telegraph = { id: number; x: number; z: number; radius: number; life: number; duration: number };
export type LootKind = 'gold' | 'health' | 'ammo' | 'energy';
export type Loot = { id: number; kind: LootKind; x: number; y: number; z: number; vx: number; vy: number; vz: number; value: number; phase: number; life: number };
export type Floater = { id: number; x: number; y: number; z: number; text: string; tone: 'hit' | 'crit' | 'player' | 'heal' | 'gold' | 'xp'; life: number };
export type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; duration: number; size: number; color: string };

export type PlayerStats = {
  maxHealth: number;
  maxShield: number;
  maxEnergy: number;
  energyRegen: number;
  shieldRegen: number;
  damageMult: number;
  fireRateMult: number;
  crit: number;
  moveMult: number;
  leech: number;
  pierce: number;
  magSize: number;
  fragMult: number;
  novaMult: number;
  dashLevel: number;
  meleeMult: number;
};

export type LevelPhase = 'intro' | 'wave' | 'intermission' | 'bossIntro' | 'boss' | 'cleared';
export type Banner = { id: number; title: string; sub: string; tone: 'info' | 'boss' | 'level' | 'good' };

export type Engine = {
  epoch: number;
  levelIndex: number;
  phase: LevelPhase;
  phaseTimer: number;
  waveIndex: number;
  waveSpawned: number;
  bossId: number;
  time: number;
  levelTime: number;
  survival: number;

  playerX: number;
  playerZ: number;
  playerVX: number;
  playerVZ: number;
  playerSpeed: number;
  playerPhase: number;
  facing: number;
  cameraYaw: number;
  firePulse: number;
  fireTimer: number;
  reloadTimer: number;
  reloadDuration: number;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirZ: number;
  invulnerable: number;
  meleeTimer: number;
  meleeCooldown: number;
  novaCooldown: number;
  castTimer: number;
  grenadeCount: number;
  grenadeCooldown: number;
  health: number;
  shield: number;
  energy: number;
  shieldDelay: number;
  damageFlash: number;
  cameraShake: number;
  hitMarker: number;
  levelUpFx: number;
  hazardTag: string | null;
  dying: number;

  charLevel: number;
  xp: number;
  xpNext: number;
  pendingLevelUps: number;
  perkChoices: PerkId[];
  perks: Partial<Record<PerkId, number>>;
  shopBuys: Partial<Record<ShopItemId, number>>;
  stats: PlayerStats;
  gold: number;
  score: number;
  kills: number;
  ammo: number;
  reserveAmmo: number;
  supplyTimer: number;
  spawnTimer: number;

  prevKeys: Record<string, boolean>;
  nextId: number;
  ended: boolean;
  levelComplete: boolean;
  victory: boolean;
  banner: Banner | null;

  enemies: Enemy[];
  corpses: Enemy[];
  bullets: Bullet[];
  hostileShots: HostileShot[];
  grenades: GrenadeProjectile[];
  explosions: Explosion[];
  telegraphs: Telegraph[];
  loot: Loot[];
  floaters: Floater[];
  particles: Particle[];
};

export type StepEvents = {
  enemiesChanged: boolean;
  corpsesChanged: boolean;
  bulletsChanged: boolean;
  shotsChanged: boolean;
  grenadesChanged: boolean;
  explosionsChanged: boolean;
  telegraphsChanged: boolean;
  lootChanged: boolean;
  floatersChanged: boolean;
};

export type AbilityHud = { cooldown: number; ready: boolean };

export type HudStats = {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  ammo: number;
  magSize: number;
  reserveAmmo: number;
  grenades: number;
  reload: number;
  score: number;
  gold: number;
  kills: number;
  survival: number;
  charLevel: number;
  xp: number;
  xpNext: number;
  pendingLevelUps: number;
  perkChoices: PerkId[];
  perks: Partial<Record<PerkId, number>>;
  levelIndex: number;
  levelName: string;
  waveIndex: number;
  waveCount: number;
  phase: LevelPhase;
  enemies: number;
  objective: string;
  boss: { name: string; title: string; health: number; maxHealth: number } | null;
  radar: Array<[number, number, number]>;
  abilities: { dash: AbilityHud; nova: AbilityHud; melee: AbilityHud; grenade: AbilityHud };
  damageFlash: number;
  hitMarker: number;
  banner: Banner | null;
  hazard: string | null;
  levelComplete: boolean;
  victory: boolean;
};

export const MAX_PARTICLES = 420;
const BASE_MAGAZINE = 45;
const MAX_RESERVE_AMMO = 360;
const NOVA_COST = 40;
const NOVA_COOLDOWN = 7;
const VENT_PERIOD = 4.5;

let epochSeed = 1;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const currentLevel = (game: Engine): LevelDef => LEVELS[clamp(game.levelIndex, 0, LEVELS.length - 1)];

const baseStats = (): PlayerStats => ({
  maxHealth: 100,
  maxShield: 50,
  maxEnergy: 100,
  energyRegen: 11,
  shieldRegen: 9,
  damageMult: 1,
  fireRateMult: 1,
  crit: .05,
  moveMult: 1,
  leech: 0,
  pierce: 0,
  magSize: BASE_MAGAZINE,
  fragMult: 1,
  novaMult: 1,
  dashLevel: 0,
  meleeMult: 1,
});

function recomputeStats(game: Engine) {
  const perk = (id: PerkId) => game.perks[id] ?? 0;
  const buys = (id: ShopItemId) => game.shopBuys[id] ?? 0;
  const stats = baseStats();
  stats.maxHealth += perk('vitality') * 25 + buys('armor') * 20 + (game.charLevel - 1) * 6;
  stats.maxShield += perk('plating') * 20;
  stats.shieldRegen += perk('plating') * 3;
  stats.maxEnergy += perk('focus') * 30 + buys('cell') * 15;
  stats.energyRegen += perk('focus') * 3;
  stats.damageMult += perk('firepower') * .18 + buys('tuning') * .1;
  stats.fireRateMult += perk('rapid') * .14;
  stats.crit += perk('crit') * .08;
  stats.moveMult += perk('fleet') * .08;
  stats.leech = perk('leech') * 3;
  stats.pierce = perk('pierce');
  stats.magSize += perk('mag') * 15;
  stats.fragMult += perk('frag') * .25;
  stats.novaMult += perk('nova') * .3;
  stats.dashLevel = perk('dash');
  stats.meleeMult += perk('brawler') * .4;
  game.stats = stats;
  game.health = Math.min(game.health, stats.maxHealth);
  game.shield = Math.min(game.shield, stats.maxShield);
  game.energy = Math.min(game.energy, stats.maxEnergy);
}

function blankLevelState(game: Engine) {
  game.epoch = epochSeed++;
  game.phase = 'intro';
  game.phaseTimer = 3.2;
  game.waveIndex = 0;
  game.waveSpawned = 0;
  game.bossId = 0;
  game.levelTime = 0;
  const spawn = findFreeSpot(game, 0, 4.5);
  game.playerX = spawn.x;
  game.playerZ = spawn.z;
  game.playerVX = 0;
  game.playerVZ = 0;
  game.facing = Math.PI;
  game.dashTimer = 0;
  game.dashCooldown = 0;
  game.invulnerable = 0;
  game.meleeTimer = 0;
  game.meleeCooldown = 0;
  game.castTimer = 0;
  game.reloadTimer = 0;
  game.reloadDuration = 0;
  game.levelComplete = false;
  game.supplyTimer = 14;
  game.spawnTimer = 0;
  game.enemies = [];
  game.corpses = [];
  game.bullets = [];
  game.hostileShots = [];
  game.grenades = [];
  game.explosions = [];
  game.telegraphs = [];
  game.loot = [];
  game.floaters = [];
  game.particles = [];
  const level = currentLevel(game);
  game.banner = { id: game.nextId++, title: `Level ${level.id} // ${level.name}`, sub: level.subtitle, tone: 'level' };
}

export const freshEngine = (): Engine => {
  const game = {
    time: 0,
    survival: 0,
    playerSpeed: 0,
    playerPhase: 0,
    cameraYaw: 0,
    firePulse: 0,
    fireTimer: 0,
    dashDirX: 0,
    dashDirZ: -1,
    novaCooldown: 0,
    grenadeCount: 3,
    grenadeCooldown: 0,
    health: 100,
    shield: 50,
    energy: 100,
    shieldDelay: 0,
    damageFlash: 0,
    cameraShake: 0,
    hitMarker: 0,
    levelUpFx: 0,
    hazardTag: null,
    dying: 0,
    charLevel: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    pendingLevelUps: 0,
    perkChoices: [],
    perks: {},
    shopBuys: {},
    stats: baseStats(),
    gold: 0,
    score: 0,
    kills: 0,
    ammo: BASE_MAGAZINE,
    reserveAmmo: 180,
    prevKeys: {},
    nextId: 1,
    ended: false,
    victory: false,
    levelIndex: 0,
  } as Partial<Engine> as Engine;
  blankLevelState(game);
  return game;
};

/** Advance to a campaign level, keeping the character's progression. */
export function startLevel(game: Engine, levelIndex: number) {
  game.levelIndex = clamp(levelIndex, 0, LEVELS.length - 1);
  blankLevelState(game);
  game.health = Math.min(game.stats.maxHealth, game.health + game.stats.maxHealth * .35);
  game.shield = game.stats.maxShield;
  game.energy = game.stats.maxEnergy;
  game.grenadeCount = Math.max(game.grenadeCount, 2);
  game.reserveAmmo = Math.max(game.reserveAmmo, game.stats.magSize * 3);
  if (game.ammo < game.stats.magSize) {
    const loaded = Math.min(game.stats.magSize - game.ammo, game.reserveAmmo);
    game.ammo += loaded;
    game.reserveAmmo -= loaded;
  }
}

// ── Geometry helpers ────────────────────────────────────────────────────────

export function clampToArena(game: Engine, x: number, z: number, margin = 0) {
  const limit = currentLevel(game).radius - margin;
  const distance = Math.hypot(x, z);
  if (distance <= limit) return { x, z };
  const scale = limit / distance;
  return { x: x * scale, z: z * scale };
}

export function hitsObstacle(obstacles: Obstacle[], x: number, z: number, radius = .3) {
  for (const obstacle of obstacles) {
    if (Math.abs(x - obstacle.x) < obstacle.halfX + radius && Math.abs(z - obstacle.z) < obstacle.halfZ + radius) return true;
  }
  return false;
}

export function moveActor(game: Engine, x: number, z: number, dx: number, dz: number, radius = .3) {
  const obstacles = currentLevel(game).obstacles;
  const target = clampToArena(game, x + dx, z + dz, radius);
  if (!hitsObstacle(obstacles, target.x, target.z, radius)) return target;
  const slideX = clampToArena(game, x + dx, z, radius);
  const slideZ = clampToArena(game, x, z + dz, radius);
  const allowX = !hitsObstacle(obstacles, slideX.x, slideX.z, radius);
  const allowZ = !hitsObstacle(obstacles, slideZ.x, slideZ.z, radius);
  if (allowX && allowZ) return Math.abs(dx) >= Math.abs(dz) ? slideX : slideZ;
  if (allowX) return slideX;
  if (allowZ) return slideZ;
  return { x, z };
}

/** Nearest point to (x, z), searched in rings, that an actor can stand on. */
function findFreeSpot(game: Engine, x: number, z: number, radius = .6) {
  const level = currentLevel(game);
  for (let ring = 0; ring < 12; ring += 1) {
    const samples = ring === 0 ? 1 : ring * 8;
    for (let sample = 0; sample < samples; sample += 1) {
      const angle = (sample / samples) * Math.PI * 2;
      const px = x + Math.cos(angle) * ring * .5;
      const pz = z + Math.sin(angle) * ring * .5;
      if (Math.hypot(px, pz) < level.radius - 1 && !hitsObstacle(level.obstacles, px, pz, radius)) return { x: px, z: pz };
    }
  }
  return { x: 0, z: 0 };
}

function pointSegmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / lengthSquared, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/** 'idle' | 'warn' | 'active' plus a 0..1 intensity, shared by every renderer. */
export function ventState(hazard: Hazard, time: number) {
  const t = (time + hazard.offset) % VENT_PERIOD;
  if (t > 3.85) return { state: 'active' as const, intensity: 1 };
  if (t > 2.6) return { state: 'warn' as const, intensity: (t - 2.6) / 1.25 };
  return { state: 'idle' as const, intensity: 0 };
}

// ── Effects ─────────────────────────────────────────────────────────────────

function spawnParticles(game: Engine, x: number, y: number, z: number, count: number, colors: string[], speed: number, size: number, lift = 1) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (.35 + Math.random() * .85);
    const duration = .25 + Math.random() * .5;
    game.particles.push({
      x, y, z,
      vx: Math.cos(angle) * velocity,
      vy: (.4 + Math.random() * 1.8) * lift,
      vz: Math.sin(angle) * velocity,
      life: duration,
      duration,
      size: size * (.5 + Math.random()),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  if (game.particles.length > MAX_PARTICLES) game.particles.splice(0, game.particles.length - MAX_PARTICLES);
}

function addFloater(game: Engine, x: number, y: number, z: number, text: string, tone: Floater['tone'], events: StepEvents) {
  game.floaters.push({ id: game.nextId++, x: x + rand(-.25, .25), y, z: z + rand(-.25, .25), text, tone, life: .95 });
  if (game.floaters.length > 28) game.floaters.splice(0, game.floaters.length - 28);
  events.floatersChanged = true;
}

function addExplosion(game: Engine, kind: ExplosionKind, x: number, z: number, radius: number, duration: number, events: StepEvents) {
  game.explosions.push({ id: game.nextId++, kind, x, z, radius, life: duration, duration });
  events.explosionsChanged = true;
}

function setBanner(game: Engine, title: string, sub: string, tone: Banner['tone']) {
  game.banner = { id: game.nextId++, title, sub, tone };
}

// ── Progression ─────────────────────────────────────────────────────────────

export function rollPerks(game: Engine): PerkId[] {
  const available = PERKS.filter((perk) => (game.perks[perk.id] ?? 0) < perk.max).map((perk) => perk.id);
  for (let index = available.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [available[index], available[swap]] = [available[swap], available[index]];
  }
  return available.slice(0, 3);
}

function gainXp(game: Engine, amount: number) {
  game.xp += amount;
  while (game.xp >= game.xpNext) {
    game.xp -= game.xpNext;
    game.charLevel += 1;
    game.xpNext = xpForLevel(game.charLevel);
    game.pendingLevelUps += 1;
    game.levelUpFx = 1.4;
    recomputeStats(game);
    game.health = Math.min(game.stats.maxHealth, game.health + game.stats.maxHealth * .25);
    spawnParticles(game, game.playerX, 1, game.playerZ, 36, ['#fff2b0', '#ffd45e', '#8ef1ff'], 3, .09, 1.6);
  }
  if (game.pendingLevelUps > 0 && game.perkChoices.length === 0) game.perkChoices = rollPerks(game);
}

export function applyPerk(game: Engine, perkId: PerkId) {
  if (game.pendingLevelUps <= 0 || !game.perkChoices.includes(perkId)) return;
  game.perks[perkId] = (game.perks[perkId] ?? 0) + 1;
  game.pendingLevelUps -= 1;
  recomputeStats(game);
  if (perkId === 'vitality') game.health = Math.min(game.stats.maxHealth, game.health + 25);
  if (perkId === 'plating') game.shield = game.stats.maxShield;
  if (perkId === 'frag') game.grenadeCount += 1;
  if (perkId === 'focus') game.energy = game.stats.maxEnergy;
  game.perkChoices = game.pendingLevelUps > 0 ? rollPerks(game) : [];
}

export const shopPrice = (game: Engine, itemId: ShopItemId) => {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId)!;
  return item.basePrice + item.scaling * (game.shopBuys[itemId] ?? 0);
};

export function canBuy(game: Engine, itemId: ShopItemId) {
  if (game.gold < shopPrice(game, itemId)) return false;
  if (itemId === 'medkit' && game.health >= game.stats.maxHealth) return false;
  if (itemId === 'ammo' && game.reserveAmmo >= MAX_RESERVE_AMMO) return false;
  return true;
}

export function buyItem(game: Engine, itemId: ShopItemId) {
  if (!canBuy(game, itemId)) return false;
  const price = shopPrice(game, itemId);
  game.gold -= price;
  game.shopBuys[itemId] = (game.shopBuys[itemId] ?? 0) + 1;
  recomputeStats(game);
  if (itemId === 'medkit') game.health = game.stats.maxHealth;
  if (itemId === 'ammo') game.reserveAmmo = Math.min(MAX_RESERVE_AMMO, game.reserveAmmo + 120);
  if (itemId === 'grenades') game.grenadeCount += 2;
  if (itemId === 'armor') game.health += 20;
  if (itemId === 'cell') game.energy = game.stats.maxEnergy;
  return true;
}

// ── HUD ─────────────────────────────────────────────────────────────────────

function objectiveText(game: Engine) {
  const level = currentLevel(game);
  switch (game.phase) {
    case 'intro': return 'Get ready';
    case 'wave': {
      const wave = level.waves[game.waveIndex];
      const remaining = wave.count - game.waveSpawned + game.enemies.length;
      return `Eliminate hostiles // ${remaining} left`;
    }
    case 'intermission': return 'Next wave incoming';
    case 'bossIntro': return 'Something is coming';
    case 'boss': return `Defeat ${level.boss.name}`;
    case 'cleared': return 'Arena cleared // collect the spoils';
  }
}

export const toHud = (game: Engine): HudStats => {
  const level = currentLevel(game);
  const boss = game.enemies.find((enemy) => enemy.id === game.bossId);
  const sin = Math.sin(game.cameraYaw);
  const cos = Math.cos(game.cameraYaw);
  const dashCooldownMax = .95 - game.stats.dashLevel * .15;
  return {
    health: game.health,
    maxHealth: game.stats.maxHealth,
    shield: game.shield,
    maxShield: game.stats.maxShield,
    energy: game.energy,
    maxEnergy: game.stats.maxEnergy,
    ammo: game.ammo,
    magSize: game.stats.magSize,
    reserveAmmo: game.reserveAmmo,
    grenades: game.grenadeCount,
    reload: game.reloadDuration > 0 ? clamp(1 - game.reloadTimer / game.reloadDuration, 0, 1) : 0,
    score: game.score,
    gold: game.gold,
    kills: game.kills,
    survival: game.survival,
    charLevel: game.charLevel,
    xp: game.xp,
    xpNext: game.xpNext,
    pendingLevelUps: game.pendingLevelUps,
    perkChoices: game.perkChoices,
    perks: game.perks,
    levelIndex: game.levelIndex,
    levelName: level.name,
    waveIndex: game.waveIndex,
    waveCount: level.waves.length,
    phase: game.phase,
    enemies: game.enemies.length,
    objective: objectiveText(game),
    boss: boss ? { name: level.boss.name, title: level.boss.title, health: boss.health, maxHealth: boss.maxHealth } : null,
    // Rotate into camera space so "up" on the radar is always where you're looking.
    radar: game.enemies.slice(0, 32).map((enemy) => {
      const dx = enemy.x - game.playerX;
      const dz = enemy.z - game.playerZ;
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return [clamp(rx / 14, -1, 1), clamp(rz / 14, -1, 1), enemy.kind === 'boss' ? 2 : enemy.elite ? 1 : 0];
    }),
    abilities: {
      dash: { cooldown: clamp(game.dashCooldown / dashCooldownMax, 0, 1), ready: game.dashCooldown <= 0 && game.energy >= dashCost(game) },
      nova: { cooldown: clamp(game.novaCooldown / NOVA_COOLDOWN, 0, 1), ready: game.novaCooldown <= 0 && game.energy >= NOVA_COST },
      melee: { cooldown: clamp(game.meleeCooldown / .6, 0, 1), ready: game.meleeCooldown <= 0 },
      grenade: { cooldown: clamp(game.grenadeCooldown / .5, 0, 1), ready: game.grenadeCount > 0 && game.grenadeCooldown <= 0 },
    },
    damageFlash: clamp(game.damageFlash, 0, 1),
    hitMarker: clamp(game.hitMarker, 0, 1),
    banner: game.banner,
    hazard: game.hazardTag,
    levelComplete: game.levelComplete,
    victory: game.victory,
  };
};

const dashCost = (game: Engine) => 22 - game.stats.dashLevel * 5;

// ── Combat ──────────────────────────────────────────────────────────────────

function hurtPlayer(game: Engine, amount: number, events: StepEvents, shake = .15) {
  if (game.invulnerable > 0 || game.dying > 0 || amount <= 0) return;
  const absorbed = Math.min(game.shield, amount);
  game.shield -= absorbed;
  game.health -= amount - absorbed;
  game.shieldDelay = 3.2;
  game.damageFlash = Math.max(game.damageFlash, .75);
  game.cameraShake = Math.max(game.cameraShake, shake);
  if (amount >= 4) addFloater(game, game.playerX, 2.1, game.playerZ, `-${Math.round(amount)}`, 'player', events);
}

function makeEnemy(game: Engine, kind: EnemyKind, x: number, z: number): Enemy {
  const base = ENEMY_STATS[kind];
  const level = currentLevel(game);
  const levelScale = 1 + game.levelIndex * .32 + game.waveIndex * .08;
  const elite = kind !== 'boss' && Math.random() < .05 + game.levelIndex * .025;
  const eliteHealth = elite ? 2.3 : 1;
  const health = kind === 'boss' ? level.boss.health : base.health * levelScale * eliteHealth;
  const speed = kind === 'boss' ? level.boss.speed : base.speed * (1 + game.levelIndex * .045) * rand(.92, 1.1);
  return {
    id: game.nextId++,
    kind,
    elite,
    x, z, vx: 0, vz: 0,
    facingX: game.playerX - x,
    facingZ: game.playerZ - z,
    speed,
    health,
    maxHealth: health,
    damage: base.damage * (1 + game.levelIndex * .2) * (elite ? 1.3 : 1),
    radius: base.radius * (elite ? 1.12 : 1),
    scale: base.scale * (elite ? 1.14 : 1),
    xp: Math.round(base.xp * (1 + game.levelIndex * .25) * (elite ? 2.5 : 1)),
    gold: Math.round(base.gold * (1 + game.levelIndex * .2) * (elite ? 3 : 1)),
    score: base.score * (elite ? 3 : 1),
    phase: Math.random() * Math.PI * 2,
    moveBlend: 0,
    stagger: 0,
    attackCooldown: .6 + Math.random() * .5,
    attackPulse: 0,
    hitFlash: 0,
    spawn: kind === 'boss' ? 1.8 : .9,
    special: kind === 'boss' ? level.boss.slamEvery : rand(1.4, 2.8),
    slamCharge: 0,
    volleyTimer: 3.5,
    summonStage: 0,
    death: 0,
  };
}

function findSpawnPoint(game: Engine, minPlayerDistance: number, clearance = .6) {
  const level = currentLevel(game);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = level.radius - rand(.9, 2.6);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if (hitsObstacle(level.obstacles, x, z, clearance)) continue;
    if (Math.hypot(x - game.playerX, z - game.playerZ) < minPlayerDistance) continue;
    return { x, z };
  }
  const angle = Math.atan2(-game.playerZ, -game.playerX);
  return findFreeSpot(game, Math.cos(angle) * (level.radius - 2.5), Math.sin(angle) * (level.radius - 2.5), clearance);
}

function spawnEnemy(game: Engine, kind: EnemyKind, events: StepEvents, near?: { x: number; z: number }) {
  const point = near ?? findSpawnPoint(game, kind === 'boss' ? 7 : 5.5, ENEMY_STATS[kind].radius * 1.2 + .15);
  const enemy = makeEnemy(game, kind, point.x, point.z);
  game.enemies.push(enemy);
  spawnParticles(game, point.x, .1, point.z, kind === 'boss' ? 40 : 10, ['#2a3134', '#545d60', currentLevel(game).theme.accent], 2.2, .09, 1.2);
  events.enemiesChanged = true;
  return enemy;
}

function pickKind(mix: Partial<Record<EnemyKind, number>>): EnemyKind {
  const entries = Object.entries(mix) as Array<[EnemyKind, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return entries[0][0];
}

function dropLoot(game: Engine, enemy: Enemy, events: StepEvents) {
  const spawn = (kind: LootKind, value: number) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(1, 2.6);
    game.loot.push({
      id: game.nextId++, kind, value,
      x: enemy.x, y: .6, z: enemy.z,
      vx: Math.cos(angle) * speed, vy: rand(2.6, 4), vz: Math.sin(angle) * speed,
      phase: Math.random() * 6, life: 26,
    });
  };
  const coins = enemy.kind === 'boss' ? 10 : enemy.elite ? 3 : 1;
  for (let index = 0; index < coins; index += 1) spawn('gold', Math.max(1, Math.round(enemy.gold / coins)));
  const bonus = enemy.kind === 'boss' ? 3 : 1;
  for (let index = 0; index < bonus; index += 1) {
    const roll = Math.random();
    if (roll < .13 || enemy.kind === 'boss') spawn('health', 20);
    else if (roll < .33) spawn('ammo', 30);
    else if (roll < .41) spawn('energy', 35);
  }
  if (enemy.kind === 'brute' || enemy.kind === 'boss' || enemy.elite) spawn('ammo', 45);
  events.lootChanged = true;
}

function killEnemy(game: Engine, index: number, events: StepEvents) {
  const enemy = game.enemies[index];
  game.enemies.splice(index, 1);
  enemy.death = 0.0001;
  enemy.hitFlash = .2;
  game.corpses.push(enemy);
  if (game.corpses.length > 14) game.corpses.shift();
  game.kills += 1;
  game.score += enemy.score + game.levelIndex * 10;
  gainXp(game, enemy.xp);
  addFloater(game, enemy.x, 2.4 * enemy.scale, enemy.z, `+${enemy.xp} XP`, 'xp', events);
  if (game.stats.leech > 0) {
    const healed = Math.min(game.stats.maxHealth - game.health, game.stats.leech);
    if (healed > 0) game.health += healed;
  }
  dropLoot(game, enemy, events);
  const accent = currentLevel(game).theme.accent;
  spawnParticles(game, enemy.x, .9 * enemy.scale, enemy.z, enemy.kind === 'boss' ? 90 : 22, ['#aeb9b8', '#586668', accent, '#d9e4e2'], 3.4 * Math.sqrt(enemy.scale), .11 * enemy.scale);
  events.enemiesChanged = true;
  events.corpsesChanged = true;

  if (enemy.id === game.bossId) {
    game.phase = 'cleared';
    game.phaseTimer = 4.2;
    game.cameraShake = .6;
    game.score += 500 * (game.levelIndex + 1);
    setBanner(game, `${currentLevel(game).boss.name} has fallen`, 'Arena cleared', 'good');
    // The boss's death also collapses its brood.
    for (let other = game.enemies.length - 1; other >= 0; other -= 1) killEnemy(game, other, events);
    game.hostileShots = [];
    events.shotsChanged = true;
  }
}

function damageEnemy(game: Engine, enemy: Enemy, amount: number, impulseX: number, impulseZ: number, crit: boolean, events: StepEvents) {
  if (enemy.spawn > .35) amount *= .5;
  enemy.health -= amount;
  enemy.hitFlash = .16;
  const isBoss = enemy.kind === 'boss';
  const resist = isBoss ? .12 : enemy.kind === 'brute' ? .45 : 1;
  enemy.stagger = Math.max(enemy.stagger, (isBoss ? .05 : .2) * resist + (crit ? .05 : 0));
  enemy.vx += impulseX * resist;
  enemy.vz += impulseZ * resist;
  game.hitMarker = crit ? 1 : Math.max(game.hitMarker, .7);
  addFloater(game, enemy.x, 1.9 * enemy.scale, enemy.z, `${Math.round(amount)}${crit ? '!' : ''}`, crit ? 'crit' : 'hit', events);
  spawnParticles(game, enemy.x, 1.05 * enemy.scale, enemy.z, crit ? 9 : 5, ['#8ef1ff', '#47cce8', '#c6cdca'], 1.8, .055);
  if (enemy.health <= 0) {
    const index = game.enemies.indexOf(enemy);
    if (index >= 0) killEnemy(game, index, events);
  }
}

function rollDamage(game: Engine, base: number) {
  const crit = Math.random() < game.stats.crit;
  return { amount: base * game.stats.damageMult * rand(.9, 1.1) * (crit ? 2 : 1), crit };
}

function areaDamage(game: Engine, x: number, z: number, radius: number, amount: number, force: number, events: StepEvents) {
  for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = game.enemies[index];
    if (!enemy) continue;
    const dx = enemy.x - x;
    const dz = enemy.z - z;
    const distance = Math.hypot(dx, dz);
    if (distance > radius + enemy.radius) continue;
    const falloff = 1 - clamp(distance / (radius + enemy.radius), 0, 1) * .5;
    const direction = distance > .001 ? 1 / distance : 0;
    const crit = Math.random() < game.stats.crit;
    damageEnemy(game, enemy, amount * falloff * (crit ? 2 : 1), dx * direction * force, dz * direction * force, crit, events);
  }
}

// ── Sub-steps ───────────────────────────────────────────────────────────────

function stepGrenades(game: Engine, dt: number, events: StepEvents) {
  for (let index = game.grenades.length - 1; index >= 0; index -= 1) {
    const grenade = game.grenades[index];
    const next = moveActor(game, grenade.x, grenade.z, grenade.vx * dt, grenade.vz * dt, .11);
    const blocked = Math.hypot(next.x - grenade.x, next.z - grenade.z) < Math.hypot(grenade.vx * dt, grenade.vz * dt) * .4;
    if (blocked) {
      grenade.vx *= -.46;
      grenade.vz *= -.46;
    } else {
      grenade.x = next.x;
      grenade.z = next.z;
    }
    grenade.vy -= 9.8 * dt;
    grenade.y += grenade.vy * dt;
    grenade.spin += dt * (8 + Math.hypot(grenade.vx, grenade.vz));
    if (grenade.y < .12) {
      grenade.y = .12;
      grenade.vy = Math.abs(grenade.vy) > .85 ? Math.abs(grenade.vy) * .43 : 0;
      grenade.vx *= .82;
      grenade.vz *= .82;
    }
    grenade.fuse -= dt;
    if (grenade.fuse <= 0) {
      const radius = 3.6;
      addExplosion(game, 'frag', grenade.x, grenade.z, radius, .7, events);
      game.cameraShake = Math.max(game.cameraShake, .35);
      spawnParticles(game, grenade.x, .2, grenade.z, 56, ['#ffd38a', '#ff9340', '#73858a', '#d9e1df'], 5.4, .13);
      areaDamage(game, grenade.x, grenade.z, radius, 75 * game.stats.fragMult * game.stats.damageMult, 8, events);
      game.grenades.splice(index, 1);
      events.grenadesChanged = true;
    }
  }
}

function stepBullets(game: Engine, dt: number, events: StepEvents) {
  const obstacles = currentLevel(game).obstacles;
  const limit = currentLevel(game).radius + .8;
  for (let index = game.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = game.bullets[index];
    const oldX = bullet.x;
    const oldZ = bullet.z;
    bullet.x += bullet.vx * dt;
    bullet.z += bullet.vz * dt;
    bullet.life -= dt;
    let remove = bullet.life <= 0 || Math.hypot(bullet.x, bullet.z) > limit;
    if (!remove && hitsObstacle(obstacles, bullet.x, bullet.z, .05)) {
      spawnParticles(game, bullet.x, bullet.y, bullet.z, 5, ['#a9f5ff', '#58d9f1', '#879398'], 1.45, .04);
      remove = true;
    }
    if (!remove) {
      for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = game.enemies[enemyIndex];
        if (!enemy || bullet.hits.includes(enemy.id)) continue;
        if (pointSegmentDistance(enemy.x, enemy.z, oldX, oldZ, bullet.x, bullet.z) < enemy.radius + .14) {
          const speed = Math.hypot(bullet.vx, bullet.vz) || 1;
          bullet.hits.push(enemy.id);
          damageEnemy(game, enemy, bullet.damage, bullet.vx / speed * 2.2, bullet.vz / speed * 2.2, bullet.crit, events);
          if (bullet.pierce <= 0) {
            remove = true;
            break;
          }
          bullet.pierce -= 1;
          bullet.damage *= .8;
        }
      }
    }
    if (remove) {
      game.bullets.splice(index, 1);
      events.bulletsChanged = true;
    }
  }
}

function stepHostileShots(game: Engine, dt: number, events: StepEvents) {
  const obstacles = currentLevel(game).obstacles;
  for (let index = game.hostileShots.length - 1; index >= 0; index -= 1) {
    const shot = game.hostileShots[index];
    shot.x += shot.vx * dt;
    shot.z += shot.vz * dt;
    shot.life -= dt;
    let remove = shot.life <= 0;
    if (!remove && Math.hypot(shot.x - game.playerX, shot.z - game.playerZ) < .55) {
      hurtPlayer(game, shot.damage, events, .12);
      remove = true;
    }
    if (!remove && (hitsObstacle(obstacles, shot.x, shot.z, .08) || Math.hypot(shot.x, shot.z) > currentLevel(game).radius + .5)) remove = true;
    if (remove) {
      addExplosion(game, 'acid', shot.x, shot.z, .9, .45, events);
      spawnParticles(game, shot.x, .5, shot.z, 7, ['#9dff8a', '#4fd65e', '#d6ffbf'], 1.6, .06);
      game.hostileShots.splice(index, 1);
      events.shotsChanged = true;
    }
  }
}

function fireHostileShot(game: Engine, x: number, z: number, angle: number, speed: number, damage: number, events: StepEvents) {
  game.hostileShots.push({
    id: game.nextId++, x, y: 1.25, z,
    vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed,
    life: 3.2, damage,
  });
  events.shotsChanged = true;
}

function steerEnemy(game: Engine, enemy: Enemy, targetX: number, targetZ: number, dt: number) {
  const dx = targetX - enemy.x;
  const dz = targetZ - enemy.z;
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
    const candidate = moveActor(game, enemy.x, enemy.z, dirX * enemy.speed * dt * 4, dirZ * enemy.speed * dt * 4, enemy.radius);
    if (Math.hypot(candidate.x - enemy.x, candidate.z - enemy.z) < .001) continue;
    const progress = distance - Math.hypot(targetX - candidate.x, targetZ - candidate.z);
    const score = progress - Math.abs(offset) * .012;
    if (score > bestScore) {
      bestScore = score;
      bestX = dirX;
      bestZ = dirZ;
    }
  }
  return { x: bestX, z: bestZ, distance };
}

// ── Navigation ──────────────────────────────────────────────────────────────
// A coarse flow field (BFS out from the player) so the horde paths around
// pillars and barriers instead of grinding against them.

const NAV_CELL = .5;
type NavField = { levelIndex: number; cells: number; blocked: Uint8Array; dist: Int32Array; queue: Int32Array; timer: number };
const navCache = new WeakMap<Engine, NavField>();

function getNav(game: Engine) {
  let nav = navCache.get(game);
  if (nav && nav.levelIndex === game.levelIndex) return nav;
  const level = currentLevel(game);
  const cells = Math.ceil((level.radius * 2) / NAV_CELL) + 2;
  const blocked = new Uint8Array(cells * cells);
  for (let iz = 0; iz < cells; iz += 1) {
    for (let ix = 0; ix < cells; ix += 1) {
      const x = (ix + .5) * NAV_CELL - (cells * NAV_CELL) / 2;
      const z = (iz + .5) * NAV_CELL - (cells * NAV_CELL) / 2;
      if (Math.hypot(x, z) > level.radius - .3 || hitsObstacle(level.obstacles, x, z, .38)) blocked[iz * cells + ix] = 1;
    }
  }
  nav = { levelIndex: game.levelIndex, cells, blocked, dist: new Int32Array(cells * cells), queue: new Int32Array(cells * cells), timer: 0 };
  navCache.set(game, nav);
  return nav;
}

const navCell = (nav: NavField, x: number, z: number) => {
  const offset = (nav.cells * NAV_CELL) / 2;
  const ix = clamp(Math.floor((x + offset) / NAV_CELL), 0, nav.cells - 1);
  const iz = clamp(Math.floor((z + offset) / NAV_CELL), 0, nav.cells - 1);
  return { ix, iz };
};

function updateNav(game: Engine, dt: number) {
  const nav = getNav(game);
  nav.timer -= dt;
  if (nav.timer > 0) return;
  nav.timer = .25;
  const { cells, blocked, dist, queue } = nav;
  dist.fill(-1);
  const start = navCell(nav, game.playerX, game.playerZ);
  let head = 0;
  let tail = 0;
  const startIndex = start.iz * cells + start.ix;
  dist[startIndex] = 0;
  queue[tail++] = startIndex;
  while (head < tail) {
    const index = queue[head++];
    const ix = index % cells;
    const iz = (index - ix) / cells;
    const next = dist[index] + 1;
    if (ix > 0 && !blocked[index - 1] && dist[index - 1] < 0) { dist[index - 1] = next; queue[tail++] = index - 1; }
    if (ix < cells - 1 && !blocked[index + 1] && dist[index + 1] < 0) { dist[index + 1] = next; queue[tail++] = index + 1; }
    if (iz > 0 && !blocked[index - cells] && dist[index - cells] < 0) { dist[index - cells] = next; queue[tail++] = index - cells; }
    if (iz < cells - 1 && !blocked[index + cells] && dist[index + cells] < 0) { dist[index + cells] = next; queue[tail++] = index + cells; }
  }
}

function clearPath(game: Engine, ax: number, az: number, bx: number, bz: number, radius: number) {
  const obstacles = currentLevel(game).obstacles;
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(length / .35);
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    if (hitsObstacle(obstacles, ax + (bx - ax) * t, az + (bz - az) * t, radius)) return false;
  }
  return true;
}

/** Direction an enemy should walk to reach the player. */
function seekPlayer(game: Engine, enemy: Enemy) {
  const dx = game.playerX - enemy.x;
  const dz = game.playerZ - enemy.z;
  const distance = Math.hypot(dx, dz) || 1;
  if (clearPath(game, enemy.x, enemy.z, game.playerX, game.playerZ, enemy.radius * .9)) return { x: dx / distance, z: dz / distance };
  const nav = getNav(game);
  const { cells, blocked, dist } = nav;
  const offset = (cells * NAV_CELL) / 2;
  const here = navCell(nav, enemy.x, enemy.z);
  let best = Infinity;
  let targetX = game.playerX;
  let targetZ = game.playerZ;
  for (let oz = -1; oz <= 1; oz += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (!ox && !oz) continue;
      const ix = here.ix + ox;
      const iz = here.iz + oz;
      if (ix < 0 || iz < 0 || ix >= cells || iz >= cells) continue;
      const index = iz * cells + ix;
      if (blocked[index] || dist[index] < 0) continue;
      // No corner cutting: diagonals need both orthogonal neighbours open.
      if (ox && oz && (blocked[here.iz * cells + ix] || blocked[iz * cells + here.ix])) continue;
      const score = dist[index] + (ox && oz ? .4 : 0);
      if (score < best) {
        best = score;
        targetX = (ix + .5) * NAV_CELL - offset;
        targetZ = (iz + .5) * NAV_CELL - offset;
      }
    }
  }
  const tx = targetX - enemy.x;
  const tz = targetZ - enemy.z;
  const length = Math.hypot(tx, tz) || 1;
  return { x: tx / length, z: tz / length };
}

function stepBoss(game: Engine, enemy: Enemy, distance: number, dt: number, events: StepEvents) {
  const spec = currentLevel(game).boss;
  const toPlayer = Math.atan2(game.playerX - enemy.x, game.playerZ - enemy.z);
  if (enemy.slamCharge > 0) {
    enemy.slamCharge -= dt;
    enemy.attackPulse = Math.max(enemy.attackPulse, .5);
    if (enemy.slamCharge <= 0) {
      const radius = 4.4;
      addExplosion(game, 'slam', enemy.x, enemy.z, radius, .8, events);
      spawnParticles(game, enemy.x, .2, enemy.z, 60, ['#3a4144', '#6d7477', spec.tint], 6, .15);
      game.cameraShake = Math.max(game.cameraShake, .55);
      if (Math.hypot(game.playerX - enemy.x, game.playerZ - enemy.z) < radius) {
        hurtPlayer(game, enemy.damage * 1.5, events, .5);
        const push = 1 / Math.max(.2, distance);
        game.playerVX += (game.playerX - enemy.x) * push * 12;
        game.playerVZ += (game.playerZ - enemy.z) * push * 12;
      }
      enemy.special = spec.slamEvery;
    }
    return true;
  }
  enemy.special -= dt;
  if (enemy.special <= 0 && distance < 9) {
    enemy.slamCharge = 1.15;
    game.telegraphs.push({ id: game.nextId++, x: enemy.x, z: enemy.z, radius: 4.4, life: 1.15, duration: 1.15 });
    events.telegraphsChanged = true;
    return true;
  }
  if (spec.volley > 0) {
    enemy.volleyTimer -= dt;
    if (enemy.volleyTimer <= 0) {
      const spread = .9;
      for (let index = 0; index < spec.volley; index += 1) {
        const angle = toPlayer - spread / 2 + (spread * index) / Math.max(1, spec.volley - 1);
        fireHostileShot(game, enemy.x, enemy.z, angle, 8.5, enemy.damage * .5, events);
      }
      enemy.volleyTimer = 4.8;
      enemy.attackPulse = .5;
    }
  }
  const ratio = enemy.health / enemy.maxHealth;
  const thresholds = spec.summonAt > 0 ? [spec.summonAt, spec.summonAt / 2] : [];
  if (enemy.summonStage < thresholds.length && ratio < thresholds[enemy.summonStage]) {
    enemy.summonStage += 1;
    setBanner(game, `${spec.name} calls the brood`, 'Reinforcements inbound', 'boss');
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.random();
      const point = clampToArena(game, enemy.x + Math.cos(angle) * 2.8, enemy.z + Math.sin(angle) * 2.8, 1);
      if (hitsObstacle(currentLevel(game).obstacles, point.x, point.z, .5)) continue;
      spawnEnemy(game, index % 2 ? 'runner' : 'walker', events, point);
    }
  }
  return false;
}

function stepEnemies(game: Engine, dt: number, events: StepEvents) {
  const level = currentLevel(game);
  if (game.enemies.length > 0) updateNav(game, dt);
  for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = game.enemies[index];
    if (!enemy) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackPulse = Math.max(0, enemy.attackPulse - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.stagger = Math.max(0, enemy.stagger - dt);
    enemy.phase += dt * (2.6 + enemy.speed);
    const dx = game.playerX - enemy.x;
    const dz = game.playerZ - enemy.z;
    const distance = Math.hypot(dx, dz);

    if (enemy.spawn > 0) {
      enemy.spawn = Math.max(0, enemy.spawn - dt);
      enemy.facingX = dx;
      enemy.facingZ = dz;
      continue;
    }

    // Hazards hurt the horde too - luring them through vents is a real tactic.
    let hazardSlow = 1;
    for (const hazard of level.hazards) {
      if (Math.hypot(enemy.x - hazard.x, enemy.z - hazard.z) > hazard.radius) continue;
      if (hazard.kind === 'toxic') hazardSlow = .6;
      else if (ventState(hazard, game.time).state === 'active') {
        enemy.health -= 55 * dt;
        enemy.hitFlash = .1;
        if (enemy.health <= 0) {
          killEnemy(game, index, events);
          break;
        }
      }
    }
    if (!game.enemies.includes(enemy)) continue;

    if (enemy.stagger > 0 || Math.hypot(enemy.vx, enemy.vz) > 1.2) {
      const pushed = moveActor(game, enemy.x, enemy.z, enemy.vx * dt, enemy.vz * dt, enemy.radius);
      enemy.x = pushed.x;
      enemy.z = pushed.z;
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 4);
    }
    enemy.vx *= Math.pow(.02, dt);
    enemy.vz *= Math.pow(.02, dt);
    if (enemy.stagger > 0) continue;

    if (game.dying > 0) {
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 3);
      continue;
    }

    if (enemy.kind === 'boss' && stepBoss(game, enemy, distance, dt, events)) {
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 5);
      continue;
    }

    let retreat = false;
    let wantsMove = distance > enemy.radius + .55;
    if (enemy.kind === 'spitter') {
      enemy.special -= dt;
      if (distance < 5.5) retreat = true;
      else if (distance < 9 && clearPath(game, enemy.x, enemy.z, game.playerX, game.playerZ, .1)) wantsMove = false;
      if (enemy.special <= 0 && distance < 13) {
        const lead = distance / 9;
        const angle = Math.atan2(game.playerX + game.playerVX * lead * .5 - enemy.x, game.playerZ + game.playerVZ * lead * .5 - enemy.z);
        fireHostileShot(game, enemy.x, enemy.z, angle, 9, enemy.damage, events);
        enemy.special = rand(2.2, 3);
        enemy.attackPulse = .45;
      }
    }

    // Retreating spitters back off with local steering, everyone else follows the flow field.
    const steer = retreat
      ? steerEnemy(game, enemy, enemy.x - dx + dz * .4, enemy.z - dz - dx * .4, dt)
      : seekPlayer(game, enemy);
    enemy.facingX = dx;
    enemy.facingZ = dz;
    if (wantsMove) {
      if (!retreat) {
        enemy.facingX = steer.x;
        enemy.facingZ = steer.z;
      }
      const speed = enemy.speed * hazardSlow;
      const position = moveActor(game, enemy.x, enemy.z, steer.x * speed * dt, steer.z * speed * dt, enemy.radius);
      enemy.x = position.x;
      enemy.z = position.z;
      enemy.moveBlend = Math.min(1, enemy.moveBlend + dt * 4);
    } else {
      enemy.moveBlend = Math.max(0, enemy.moveBlend - dt * 5);
    }

    if (enemy.kind !== 'spitter' && distance < enemy.radius + .75 && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = enemy.kind === 'runner' ? .8 : enemy.kind === 'boss' ? 1.4 : 1.05;
      enemy.attackPulse = .42;
      hurtPlayer(game, enemy.damage, events);
    }
  }

  // Soft separation so the horde reads as a crowd instead of one stacked blob.
  for (let a = 0; a < game.enemies.length; a += 1) {
    const first = game.enemies[a];
    for (let b = a + 1; b < game.enemies.length; b += 1) {
      const second = game.enemies[b];
      const dx = second.x - first.x;
      const dz = second.z - first.z;
      const minimum = first.radius + second.radius;
      const distance = Math.hypot(dx, dz);
      if (distance >= minimum || distance < .0001) continue;
      const push = (minimum - distance) * .5;
      const nx = dx / distance;
      const nz = dz / distance;
      const firstWeight = first.kind === 'boss' ? .1 : 1;
      const secondWeight = second.kind === 'boss' ? .1 : 1;
      const moveFirst = moveActor(game, first.x, first.z, -nx * push * firstWeight, -nz * push * firstWeight, first.radius);
      const moveSecond = moveActor(game, second.x, second.z, nx * push * secondWeight, nz * push * secondWeight, second.radius);
      first.x = moveFirst.x; first.z = moveFirst.z;
      second.x = moveSecond.x; second.z = moveSecond.z;
    }
  }
}

function stepLevelFlow(game: Engine, dt: number, events: StepEvents) {
  const level = currentLevel(game);
  game.phaseTimer -= dt;
  switch (game.phase) {
    case 'intro':
      if (game.phaseTimer <= 0) {
        game.phase = 'wave';
        game.waveIndex = 0;
        game.waveSpawned = 0;
        setBanner(game, `Wave 1 / ${level.waves.length}`, level.briefing, 'info');
      }
      break;
    case 'wave': {
      const wave = level.waves[game.waveIndex];
      game.spawnTimer -= dt;
      if (game.waveSpawned < wave.count && game.enemies.length < wave.concurrent && game.spawnTimer <= 0) {
        spawnEnemy(game, pickKind(wave.mix), events);
        game.waveSpawned += 1;
        game.spawnTimer = rand(.35, .9) * Math.max(.5, 1 - game.levelIndex * .08);
      }
      if (game.waveSpawned >= wave.count && game.enemies.length === 0) {
        if (game.waveIndex >= level.waves.length - 1) {
          game.phase = 'bossIntro';
          game.phaseTimer = 3;
          setBanner(game, `${level.boss.name}`, level.boss.title, 'boss');
        } else {
          game.phase = 'intermission';
          game.phaseTimer = 3.5;
          game.score += 150 * (game.waveIndex + 1);
          setBanner(game, `Wave ${game.waveIndex + 1} cleared`, 'Catch your breath - grab the loot', 'good');
        }
      }
      break;
    }
    case 'intermission':
      if (game.phaseTimer <= 0) {
        game.waveIndex += 1;
        game.waveSpawned = 0;
        game.phase = 'wave';
        setBanner(game, `Wave ${game.waveIndex + 1} / ${level.waves.length}`, 'They are getting braver', 'info');
      }
      break;
    case 'bossIntro':
      if (game.phaseTimer <= 0) {
        const boss = spawnEnemy(game, 'boss', events);
        game.bossId = boss.id;
        game.phase = 'boss';
        game.cameraShake = .5;
      }
      break;
    case 'boss':
      break;
    case 'cleared':
      // Vacuum up the remaining loot so nothing is lost when the level ends.
      if (game.phaseTimer <= 2.2) for (const loot of game.loot) loot.phase = -1;
      if (game.phaseTimer <= 0 && !game.levelComplete) {
        game.levelComplete = true;
        game.victory = game.levelIndex >= LEVELS.length - 1;
        game.score += Math.max(0, Math.round(600 - game.levelTime * 2));
      }
      break;
  }
}

function collectLoot(game: Engine, loot: Loot, events: StepEvents) {
  switch (loot.kind) {
    case 'gold':
      game.gold += loot.value;
      addFloater(game, game.playerX, 2.2, game.playerZ, `+${loot.value}g`, 'gold', events);
      break;
    case 'health': {
      const healed = Math.min(game.stats.maxHealth - game.health, loot.value);
      game.health += healed;
      addFloater(game, game.playerX, 2.2, game.playerZ, `+${Math.round(Math.max(healed, 0))} HP`, 'heal', events);
      break;
    }
    case 'ammo':
      game.reserveAmmo = Math.min(MAX_RESERVE_AMMO, game.reserveAmmo + loot.value);
      addFloater(game, game.playerX, 2.2, game.playerZ, `+${loot.value} ammo`, 'hit', events);
      break;
    case 'energy':
      game.energy = Math.min(game.stats.maxEnergy, game.energy + loot.value);
      addFloater(game, game.playerX, 2.2, game.playerZ, `+${loot.value} EN`, 'xp', events);
      break;
  }
  game.score += 5;
}

function stepLoot(game: Engine, dt: number, events: StepEvents) {
  game.supplyTimer -= dt;
  if (game.supplyTimer <= 0) {
    game.supplyTimer = 10;
    const hasAmmo = game.loot.some((loot) => loot.kind === 'ammo');
    if (!hasAmmo && game.reserveAmmo < game.stats.magSize * 2 && game.phase !== 'cleared') {
      const point = findSpawnPoint(game, 3);
      const inward = clampToArena(game, point.x * .55, point.z * .55);
      game.loot.push({ id: game.nextId++, kind: 'ammo', value: 60, x: inward.x, y: 4, z: inward.z, vx: 0, vy: 0, vz: 0, phase: 0, life: 30 });
      events.lootChanged = true;
    }
  }
  for (let index = game.loot.length - 1; index >= 0; index -= 1) {
    const loot = game.loot[index];
    loot.life -= dt;
    if (loot.phase >= 0) loot.phase += dt;
    loot.vy -= 12 * dt;
    loot.y += loot.vy * dt;
    if (loot.y < .35) {
      loot.y = .35;
      loot.vy = Math.abs(loot.vy) > 1.2 ? Math.abs(loot.vy) * .35 : 0;
      loot.vx *= .6;
      loot.vz *= .6;
    }
    const dx = game.playerX - loot.x;
    const dz = game.playerZ - loot.z;
    const distance = Math.hypot(dx, dz);
    const magnet = loot.phase < 0 ? 99 : loot.kind === 'gold' ? 3.2 : 2.2;
    if (distance < magnet && game.dying <= 0) {
      const pull = (loot.phase < 0 ? 26 : 7) / Math.max(distance, .01);
      loot.vx = dx * pull;
      loot.vz = dz * pull;
    }
    const moved = clampToArena(game, loot.x + loot.vx * dt, loot.z + loot.vz * dt, .3);
    loot.x = moved.x;
    loot.z = moved.z;
    if (distance < .75 && game.dying <= 0) {
      collectLoot(game, loot, events);
      spawnParticles(game, loot.x, loot.y, loot.z, 6, loot.kind === 'gold' ? ['#ffe07a', '#ffc53d'] : loot.kind === 'health' ? ['#8dff9b', '#e0ffe4'] : ['#8ef1ff', '#d8fbff'], 1.4, .05);
      game.loot.splice(index, 1);
      events.lootChanged = true;
    } else if (loot.life <= 0) {
      game.loot.splice(index, 1);
      events.lootChanged = true;
    }
  }
}

function stepHazards(game: Engine, dt: number, events: StepEvents) {
  game.hazardTag = null;
  let slow = 1;
  for (const hazard of currentLevel(game).hazards) {
    const inside = Math.hypot(game.playerX - hazard.x, game.playerZ - hazard.z) < hazard.radius;
    if (hazard.kind === 'toxic') {
      if (Math.random() < dt * 5) spawnParticles(game, hazard.x + rand(-hazard.radius, hazard.radius) * .6, .05, hazard.z + rand(-hazard.radius, hazard.radius) * .6, 1, ['#7cf0a4', '#c7ffd6'], .2, .05, .6);
      if (inside) {
        slow = .55;
        game.hazardTag = 'TOXIC RUNOFF';
        if (game.invulnerable <= 0) {
          game.health -= 7 * dt;
          game.shieldDelay = Math.max(game.shieldDelay, 1);
          game.damageFlash = Math.max(game.damageFlash, .25);
        }
      }
    } else {
      const vent = ventState(hazard, game.time);
      if (vent.state === 'active') {
        if (Math.random() < dt * 40) spawnParticles(game, hazard.x + rand(-.6, .6), .2, hazard.z + rand(-.6, .6), 2, ['#ffb347', '#ff6a1a', '#ffe0a0'], .8, .09, 3.2);
        if (inside) {
          game.hazardTag = 'VENT ERUPTION';
          hurtPlayer(game, 32 * dt, events, .06);
        }
      } else if (inside && vent.state === 'warn') {
        game.hazardTag = 'VENT PRIMING';
      }
    }
  }
  return slow;
}

// ── Main step ───────────────────────────────────────────────────────────────

export function stepGame(game: Engine, input: InputState, rawDelta: number): StepEvents {
  const events: StepEvents = {
    enemiesChanged: false,
    corpsesChanged: false,
    bulletsChanged: false,
    shotsChanged: false,
    grenadesChanged: false,
    explosionsChanged: false,
    telegraphsChanged: false,
    lootChanged: false,
    floatersChanged: false,
  };
  if (game.ended) return events;
  const dt = clamp(rawDelta, 0, .05);
  if (dt === 0) return events;
  const level = currentLevel(game);
  const keys = input.keys;
  const pressed = (...codes: string[]) => codes.some((code) => keys[code] && !game.prevKeys[code]);
  game.cameraYaw = input.cameraYaw;

  game.time += dt;
  game.levelTime += dt;
  if (game.dying <= 0) game.survival += dt;
  game.playerPhase += dt;
  game.fireTimer = Math.max(0, game.fireTimer - dt);
  game.firePulse = Math.max(0, game.firePulse - dt);
  game.damageFlash = Math.max(0, game.damageFlash - dt * 1.8);
  game.cameraShake = Math.max(0, game.cameraShake - dt * 1.9);
  game.hitMarker = Math.max(0, game.hitMarker - dt * 5);
  game.levelUpFx = Math.max(0, game.levelUpFx - dt);
  game.grenadeCooldown = Math.max(0, game.grenadeCooldown - dt);
  game.dashCooldown = Math.max(0, game.dashCooldown - dt);
  game.dashTimer = Math.max(0, game.dashTimer - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.meleeCooldown = Math.max(0, game.meleeCooldown - dt);
  game.meleeTimer = Math.max(0, game.meleeTimer - dt);
  game.novaCooldown = Math.max(0, game.novaCooldown - dt);
  game.castTimer = Math.max(0, game.castTimer - dt);

  const alive = game.dying <= 0;
  const hazardSlow = stepHazards(game, dt, events);

  // ── Movement (camera-relative) ──
  let inputX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + input.touchX;
  let inputZ = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + input.touchZ;
  const inputLength = Math.hypot(inputX, inputZ);
  if (inputLength > 1) {
    inputX /= inputLength;
    inputZ /= inputLength;
  }
  if (!alive) { inputX = 0; inputZ = 0; }
  const sin = Math.sin(input.cameraYaw);
  const cos = Math.cos(input.cameraYaw);
  // forward = (-sin, -cos), right = (cos, -sin)
  const moveX = inputX * cos + inputZ * sin;
  const moveZ = -inputX * sin + inputZ * cos;
  const sprinting = Boolean(keys.ShiftLeft || keys.ShiftRight) && inputLength > .1 && game.energy > 2;
  if (sprinting) game.energy = Math.max(0, game.energy - 7 * dt);
  const maxSpeed = (sprinting ? 7.4 : 5.4) * game.stats.moveMult * hazardSlow * (game.castTimer > 0 ? .5 : 1);

  if (alive && pressed('KeyQ', 'Space') && game.dashCooldown <= 0 && game.energy >= dashCost(game)) {
    const length = Math.hypot(moveX, moveZ);
    game.dashDirX = length > .1 ? moveX / length : -sin;
    game.dashDirZ = length > .1 ? moveZ / length : -cos;
    game.dashTimer = .26;
    game.invulnerable = .34;
    game.dashCooldown = .95 - game.stats.dashLevel * .15;
    game.energy -= dashCost(game);
    spawnParticles(game, game.playerX, .2, game.playerZ, 12, ['#8ef1ff', '#d8fbff', '#3bc9ed'], 2.2, .06);
  }

  if (game.dashTimer > 0) {
    game.playerVX = game.dashDirX * 17;
    game.playerVZ = game.dashDirZ * 17;
    if (Math.random() < .6) spawnParticles(game, game.playerX, .5 + Math.random(), game.playerZ, 1, ['#8ef1ff', '#bdf8ff'], .3, .06, .2);
  } else {
    const acceleration = (inputLength > .01 ? 16 : 11) * level.friction;
    const blend = Math.min(1, dt * acceleration);
    game.playerVX += (moveX * maxSpeed - game.playerVX) * blend;
    game.playerVZ += (moveZ * maxSpeed - game.playerVZ) * blend;
  }
  const targetX = game.playerX + game.playerVX * dt;
  const targetZ = game.playerZ + game.playerVZ * dt;
  const movedPlayer = moveActor(game, game.playerX, game.playerZ, game.playerVX * dt, game.playerVZ * dt, .34);
  if (Math.abs(movedPlayer.x - targetX) > .003) game.playerVX *= level.friction < .5 ? -.4 : 0;
  if (Math.abs(movedPlayer.z - targetZ) > .003) game.playerVZ *= level.friction < .5 ? -.4 : 0;
  game.playerX = movedPlayer.x;
  game.playerZ = movedPlayer.z;
  game.playerSpeed = Math.hypot(game.playerVX, game.playerVZ) / 7.4;

  const aimDX = input.aimX - game.playerX;
  const aimDZ = input.aimZ - game.playerZ;
  const aimDistance = Math.hypot(aimDX, aimDZ) || 1;
  const aimNX = aimDX / aimDistance;
  const aimNZ = aimDZ / aimDistance;
  if (alive) game.facing = Math.atan2(aimNX, aimNZ);

  // ── Weapons & abilities ──
  const dry = game.ammo === 0 && game.reserveAmmo === 0;
  if (alive && (keys.KeyR || game.ammo === 0) && game.reloadTimer <= 0 && game.ammo < game.stats.magSize && (game.reserveAmmo > 0 || dry)) {
    // Completely dry: the carbine's emergency cell slowly prints a short clip so a fight never soft-locks.
    game.reloadDuration = dry ? 2.4 : 1.15 / Math.sqrt(game.stats.fireRateMult);
    game.reloadTimer = game.reloadDuration;
  }
  if (game.reloadTimer > 0) {
    game.reloadTimer = Math.max(0, game.reloadTimer - dt);
    if (game.reloadTimer === 0) {
      if (game.reserveAmmo === 0) {
        game.ammo = Math.max(game.ammo, 12);
      } else {
        const loaded = Math.min(game.stats.magSize - game.ammo, game.reserveAmmo);
        game.ammo += loaded;
        game.reserveAmmo -= loaded;
      }
      game.reloadDuration = 0;
    }
  }

  if (alive && pressed('KeyG') && game.grenadeCount > 0 && game.grenadeCooldown <= 0) {
    const rangeScale = clamp(aimDistance / 9, .35, 1);
    game.grenades.push({
      id: game.nextId++, x: game.playerX + aimNX * .4, y: 1.5, z: game.playerZ + aimNZ * .4,
      vx: aimNX * 10 * rangeScale, vy: 5, vz: aimNZ * 10 * rangeScale,
      fuse: 1.15, spin: 0,
    });
    game.grenadeCount -= 1;
    game.grenadeCooldown = .5;
    game.castTimer = Math.max(game.castTimer, .2);
    events.grenadesChanged = true;
  }

  if (alive && pressed('KeyE') && game.novaCooldown <= 0 && game.energy >= NOVA_COST) {
    const radius = 4.2 * (1 + (game.stats.novaMult - 1) * .5);
    game.energy -= NOVA_COST;
    game.novaCooldown = NOVA_COOLDOWN;
    game.castTimer = .55;
    game.cameraShake = Math.max(game.cameraShake, .3);
    addExplosion(game, 'nova', game.playerX, game.playerZ, radius, .75, events);
    spawnParticles(game, game.playerX, .8, game.playerZ, 50, ['#8ef1ff', '#d3a6ff', '#ffffff'], 7, .08, .7);
    areaDamage(game, game.playerX, game.playerZ, radius, 48 * game.stats.novaMult * game.stats.damageMult, 11, events);
    for (let index = game.hostileShots.length - 1; index >= 0; index -= 1) {
      const shot = game.hostileShots[index];
      if (Math.hypot(shot.x - game.playerX, shot.z - game.playerZ) < radius) {
        game.hostileShots.splice(index, 1);
        events.shotsChanged = true;
      }
    }
  }

  if (alive && pressed('KeyF', 'MouseRight') && game.meleeCooldown <= 0) {
    game.meleeCooldown = .6;
    game.meleeTimer = .38;
    const reach = 2 * (1 + (game.stats.meleeMult - 1) * .25);
    let connected = false;
    for (let index = game.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = game.enemies[index];
      if (!enemy) continue;
      const dx = enemy.x - game.playerX;
      const dz = enemy.z - game.playerZ;
      const distance = Math.hypot(dx, dz);
      if (distance > reach + enemy.radius) continue;
      const dot = (dx * aimNX + dz * aimNZ) / Math.max(distance, .001);
      if (dot < .35 && distance > enemy.radius + .3) continue;
      const hit = rollDamage(game, 32 * game.stats.meleeMult);
      damageEnemy(game, enemy, hit.amount, aimNX * 9, aimNZ * 9, hit.crit, events);
      connected = true;
    }
    addExplosion(game, 'melee', game.playerX + aimNX * 1.1, game.playerZ + aimNZ * 1.1, reach, .28, events);
    if (connected) game.cameraShake = Math.max(game.cameraShake, .18);
  }

  const fireInterval = .11 / game.stats.fireRateMult;
  const canShoot = alive && game.dashTimer <= 0 && game.meleeTimer <= .1 && game.reloadTimer <= 0;
  if (canShoot && input.fire && game.fireTimer <= 0 && game.ammo > 0) {
    const spread = rand(-.025, .025) * (game.playerSpeed > .6 ? 2 : 1);
    const angle = Math.atan2(aimNX, aimNZ) + spread;
    const hit = rollDamage(game, 11);
    const rightX = aimNZ;
    const rightZ = -aimNX;
    game.bullets.push({
      id: game.nextId++,
      x: game.playerX + aimNX * .55 - rightX * .12,
      y: 1.3,
      z: game.playerZ + aimNZ * .55 - rightZ * .12,
      vx: Math.sin(angle) * 34,
      vz: Math.cos(angle) * 34,
      life: .9,
      damage: hit.amount,
      crit: hit.crit,
      pierce: game.stats.pierce,
      hits: [],
    });
    game.ammo -= 1;
    game.fireTimer = fireInterval;
    game.firePulse = .1;
    events.bulletsChanged = true;
  }

  stepGrenades(game, dt, events);
  stepBullets(game, dt, events);
  stepHostileShots(game, dt, events);
  stepEnemies(game, dt, events);
  stepLevelFlow(game, dt, events);
  stepLoot(game, dt, events);

  for (let index = game.corpses.length - 1; index >= 0; index -= 1) {
    const corpse = game.corpses[index];
    corpse.death += dt;
    corpse.hitFlash = Math.max(0, corpse.hitFlash - dt);
    if (corpse.death > (corpse.kind === 'boss' ? 4 : 2.2)) {
      game.corpses.splice(index, 1);
      events.corpsesChanged = true;
    }
  }
  for (let index = game.telegraphs.length - 1; index >= 0; index -= 1) {
    game.telegraphs[index].life -= dt;
    if (game.telegraphs[index].life <= 0) {
      game.telegraphs.splice(index, 1);
      events.telegraphsChanged = true;
    }
  }
  for (let index = game.explosions.length - 1; index >= 0; index -= 1) {
    game.explosions[index].life -= dt;
    if (game.explosions[index].life <= 0) {
      game.explosions.splice(index, 1);
      events.explosionsChanged = true;
    }
  }
  for (let index = game.floaters.length - 1; index >= 0; index -= 1) {
    game.floaters[index].life -= dt;
    if (game.floaters[index].life <= 0) {
      game.floaters.splice(index, 1);
      events.floatersChanged = true;
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

  if (alive) {
    game.energy = Math.min(game.stats.maxEnergy, game.energy + game.stats.energyRegen * dt * (sprinting ? 0 : 1));
    if (game.shieldDelay > 0) game.shieldDelay -= dt;
    else game.shield = Math.min(game.stats.maxShield, game.shield + dt * game.stats.shieldRegen);
  }
  if (game.health <= 0 && alive) {
    game.health = 0;
    game.dying = .0001;
    game.cameraShake = .5;
    setBanner(game, 'You have fallen', 'The ring claims another', 'boss');
  }
  if (game.dying > 0) {
    game.dying += dt;
    if (game.dying > 2.2) game.ended = true;
  }

  game.prevKeys = { ...keys };
  return events;
}
