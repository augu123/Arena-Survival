// Campaign data: arenas, their waves and bosses, plus the RPG perk and shop tables.
// Everything here is plain data so the simulation, the 3D scene and the 2D
// fallback renderer all read the same source of truth.

export type EnemyKind = 'walker' | 'runner' | 'brute' | 'spitter' | 'teowerine' | 'boss';

export type ObstacleKind = 'barrier' | 'crate' | 'pillar' | 'arc' | 'device';

/**
 * Axis-aligned collision box. Curved `arc` walls and level devices are built
 * from several of these; `render` carries the info needed to draw the one
 * model that stands for the whole group (pieces without it are collision only).
 */
export type Obstacle = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  kind: ObstacleKind;
  render?: { x: number; z: number; yaw: number; length: number };
};

/**
 * Interactive set pieces placed in a level.
 * - arcTrap: tesla coil that charges on a cycle, then arcs lightning into every actor in range.
 * - pressureStack: shoot or blast it to overload it into an explosion; it vents, then re-arms.
 * - rechargePad: stand on it to refill shield and energy (it has its own charge).
 */
export type DeviceKind = 'arcTrap' | 'pressureStack' | 'rechargePad';
export type DeviceDef = { kind: DeviceKind; x: number; z: number; offset?: number };

export type HazardKind = 'toxic' | 'vent';
export type Hazard = { x: number; z: number; radius: number; kind: HazardKind; offset: number };

export type Wave = { count: number; mix: Partial<Record<Exclude<EnemyKind, 'boss'>, number>>; concurrent: number };

export type BossSpec = {
  name: string;
  title: string;
  health: number;
  speed: number;
  slamEvery: number;
  volley: number;
  summonAt: number;
  tint: string;
};

export type LevelTheme = {
  floor: string;
  wall: string;
  accent: string;
  accentSoft: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sky: string;
  hemiSky: string;
  hemiGround: string;
  keyLight: string;
  rimLight: string;
};

export type LevelDef = {
  id: number;
  name: string;
  subtitle: string;
  briefing: string;
  radius: number;
  friction: number;
  theme: LevelTheme;
  obstacles: Obstacle[];
  hazards: Hazard[];
  devices: DeviceDef[];
  /** Angles (radians) of the spawn gates set into the perimeter wall. */
  gates: number[];
  roundZeroMiniBoss?: 'teowerine';
  waves: Wave[];
  boss: BossSpec;
};

/**
 * A curved cover wall (one `wall_arc` model) centred at (x, z), its hollow
 * facing `yaw` (radians, 0 = +x). Collision is a row of small boxes along it.
 */
export function arcWall(x: number, z: number, yaw: number, length = 3.2): Obstacle[] {
  const pieces = 4;
  const tangentX = -Math.sin(yaw);
  const tangentZ = Math.cos(yaw);
  return Array.from({ length: pieces }, (_, index) => {
    const along = (index / (pieces - 1) - .5) * (length - .5);
    // The model bows away from its hollow side; follow that bow so cover matches the mesh.
    const bow = .14 * (1 - Math.pow((index / (pieces - 1)) * 2 - 1, 2));
    return {
      x: x + tangentX * along - Math.cos(yaw) * bow,
      z: z + tangentZ * along - Math.sin(yaw) * bow,
      halfX: .32,
      halfZ: .32,
      kind: 'arc' as const,
      render: index === 0 ? { x, z, yaw, length } : undefined,
    };
  });
}

/** Collision for static devices, so actors walk around them instead of through. */
export function deviceBlockers(devices: DeviceDef[]): Obstacle[] {
  return devices
    .filter((device) => device.kind !== 'rechargePad')
    .map((device) => ({ x: device.x, z: device.z, halfX: .55, halfZ: .55, kind: 'device' as const }));
}

const evenGates = (count: number, phase = 0) => Array.from({ length: count }, (_, index) => phase + (index / count) * Math.PI * 2);

const ring = (count: number, radius: number, halfX: number, halfZ: number, kind: Obstacle['kind'], phase = 0): Obstacle[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = phase + (index / count) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, halfX, halfZ, kind };
  });

const PI = Math.PI;

const DEVICES_1: DeviceDef[] = [
  { kind: 'rechargePad', x: -9, z: -5.5 },
  { kind: 'rechargePad', x: 9, z: 5.5 },
  { kind: 'pressureStack', x: -4.6, z: -6.2 },
  { kind: 'pressureStack', x: 4.6, z: 6.4 },
  { kind: 'arcTrap', x: -8.5, z: 5, offset: 0 },
  { kind: 'arcTrap', x: 8.5, z: -5, offset: 3 },
];
const DEVICES_2: DeviceDef[] = [
  { kind: 'rechargePad', x: -11.2, z: 3.2 },
  { kind: 'rechargePad', x: 4.5, z: 10.5 },
  { kind: 'pressureStack', x: 3.5, z: -3.2 },
  { kind: 'pressureStack', x: -3.5, z: 3.2 },
  { kind: 'pressureStack', x: 0, z: 9.6 },
  { kind: 'arcTrap', x: -2.8, z: -8.8, offset: 0 },
  { kind: 'arcTrap', x: 5.5, z: -7.8, offset: 2.5 },
];
const DEVICES_3: DeviceDef[] = [
  { kind: 'rechargePad', x: -10.5, z: -3 },
  { kind: 'rechargePad', x: 10.5, z: 3 },
  { kind: 'pressureStack', x: 0, z: -5.5 },
  { kind: 'pressureStack', x: -5.6, z: -2.4 },
  { kind: 'arcTrap', x: -7, z: 0, offset: 0 },
  { kind: 'arcTrap', x: 7, z: 0, offset: 2.8 },
];
const DEVICES_4: DeviceDef[] = [
  { kind: 'rechargePad', x: 0, z: -6 },
  { kind: 'rechargePad', x: 11.5, z: -2.5 },
  { kind: 'pressureStack', x: -6.5, z: 2.5 },
  { kind: 'pressureStack', x: 6.5, z: 2.5 },
  { kind: 'arcTrap', x: 10.6, z: 4.4, offset: 0 },
  { kind: 'arcTrap', x: -4.4, z: 10.6, offset: 1.4 },
  { kind: 'arcTrap', x: -10.6, z: -4.4, offset: 2.8 },
  { kind: 'arcTrap', x: 4.4, z: -10.6, offset: 4.2 },
];
const DEVICES_5: DeviceDef[] = [
  { kind: 'rechargePad', x: -7, z: 0 },
  { kind: 'rechargePad', x: 3, z: -13 },
  { kind: 'pressureStack', x: 7, z: 0 },
  { kind: 'pressureStack', x: -3.5, z: 6.06 },
  { kind: 'pressureStack', x: -3.5, z: -6.06 },
  { kind: 'arcTrap', x: 6.25, z: 10.8, offset: 0 },
  { kind: 'arcTrap', x: -6.25, z: 10.8, offset: 1.5 },
  { kind: 'arcTrap', x: -6.25, z: -10.8, offset: 3 },
  { kind: 'arcTrap', x: 6.25, z: -10.8, offset: 4.5 },
];

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'The Concrete Ring',
    subtitle: 'Sector 07 // Holding pen',
    briefing: 'Learn the ring: shoot the pressure stacks to blow up crowds, lure sleepers into the arc traps, and stand on a recharge pad to refill shield and energy.',
    radius: 13,
    friction: 1,
    theme: {
      floor: '#aab5ba', wall: '#8894a0', accent: '#3bc9ed', accentSoft: '#165e72', fog: '#0c1017', fogNear: 16, fogFar: 44,
      sky: '#0c1017', hemiSky: '#7f929e', hemiGround: '#141b22', keyLight: '#bfd0da', rimLight: '#5fb8d6',
    },
    obstacles: [
      { x: -4.6, z: -3.6, halfX: 1.5, halfZ: .32, kind: 'barrier' },
      { x: 4.6, z: -3.6, halfX: 1.5, halfZ: .32, kind: 'barrier' },
      { x: -4.6, z: 3.6, halfX: 1.5, halfZ: .32, kind: 'barrier' },
      { x: 4.6, z: 3.6, halfX: 1.5, halfZ: .32, kind: 'barrier' },
      { x: 0, z: -7, halfX: .45, halfZ: .45, kind: 'crate' },
      { x: 0, z: 7, halfX: .45, halfZ: .45, kind: 'crate' },
      { x: -8, z: 0, halfX: .45, halfZ: .45, kind: 'crate' },
      { x: 8, z: 0, halfX: .45, halfZ: .45, kind: 'crate' },
      ...deviceBlockers(DEVICES_1),
    ],
    hazards: [],
    devices: DEVICES_1,
    gates: evenGates(4),
    roundZeroMiniBoss: 'teowerine',
    waves: [
      { count: 8, mix: { walker: 1 }, concurrent: 6 },
      { count: 12, mix: { walker: 3, runner: 1 }, concurrent: 8 },
      { count: 16, mix: { walker: 2, runner: 2 }, concurrent: 10 },
    ],
    boss: { name: 'The Warden', title: 'Keeper of the Ring', health: 700, speed: 1.35, slamEvery: 6.5, volley: 0, summonAt: 0, tint: '#3bc9ed' },
  },
  {
    id: 2,
    name: 'Flooded Yards',
    subtitle: 'Sector 11 // Drainage basin',
    briefing: 'Toxic runoff pools slow and burn anything that wades in. Spitters lob acid from range - use the curved walls as cover and keep moving.',
    radius: 14,
    friction: 1,
    theme: {
      floor: '#8fa39a', wall: '#6f837c', accent: '#7cf0a4', accentSoft: '#1f6b47', fog: '#0a1511', fogNear: 12, fogFar: 38,
      sky: '#0a1511', hemiSky: '#7fa08e', hemiGround: '#0f1d17', keyLight: '#c9e6d4', rimLight: '#5fd69a',
    },
    obstacles: [
      ...ring(6, 7.2, .5, .5, 'pillar', Math.PI / 6),
      { x: 0, z: 0, halfX: 1.1, halfZ: .32, kind: 'barrier' },
      { x: -10, z: -4, halfX: .45, halfZ: .45, kind: 'crate' },
      { x: 10, z: 4, halfX: .45, halfZ: .45, kind: 'crate' },
      ...arcWall(10.5, 0, PI),
      ...arcWall(-10.5, 0, 0),
      ...arcWall(0, -10.8, PI / 2),
      ...deviceBlockers(DEVICES_2),
    ],
    hazards: [
      { x: -5.5, z: -6.5, radius: 2.1, kind: 'toxic', offset: 0 },
      { x: 6.2, z: 5.8, radius: 2.4, kind: 'toxic', offset: 0 },
      { x: 7.4, z: -5, radius: 1.6, kind: 'toxic', offset: 0 },
      { x: -7.2, z: 5.2, radius: 1.8, kind: 'toxic', offset: 0 },
    ],
    devices: DEVICES_2,
    gates: evenGates(4, PI / 4),
    waves: [
      { count: 12, mix: { walker: 3, spitter: 1 }, concurrent: 8 },
      { count: 16, mix: { walker: 2, runner: 1, spitter: 1 }, concurrent: 10 },
      { count: 20, mix: { walker: 2, runner: 2, spitter: 2 }, concurrent: 11 },
    ],
    boss: { name: 'Mire Mother', title: 'Queen of the Runoff', health: 1100, speed: 1.2, slamEvery: 7, volley: 5, summonAt: .5, tint: '#7cf0a4' },
  },
  {
    id: 3,
    name: 'Ember Foundry',
    subtitle: 'Sector 19 // Smelting floor',
    briefing: 'Floor vents erupt and arc traps fire on a cycle. Watch for the glow, lure brutes into both, and never stand still on a vent.',
    radius: 14.5,
    friction: 1,
    theme: {
      floor: '#9b8c83', wall: '#7c6a62', accent: '#ff8a3d', accentSoft: '#7a2c0d', fog: '#140b07', fogNear: 12, fogFar: 40,
      sky: '#140b07', hemiSky: '#a08477', hemiGround: '#1b0f0a', keyLight: '#ffd2b0', rimLight: '#ff7a36',
    },
    obstacles: [
      { x: -3.4, z: 0, halfX: .32, halfZ: 2.2, kind: 'barrier' },
      { x: 3.4, z: 0, halfX: .32, halfZ: 2.2, kind: 'barrier' },
      { x: 0, z: -8.4, halfX: 2, halfZ: .32, kind: 'barrier' },
      { x: 0, z: 8.4, halfX: 2, halfZ: .32, kind: 'barrier' },
      ...ring(4, 10, .45, .45, 'crate', Math.PI / 4),
      ...arcWall(0, -11.6, PI / 2),
      ...arcWall(0, 11.6, -PI / 2),
      ...deviceBlockers(DEVICES_3),
    ],
    hazards: [
      { x: 0, z: 0, radius: 1.7, kind: 'vent', offset: 0 },
      { x: -7, z: -5, radius: 1.5, kind: 'vent', offset: 1.4 },
      { x: 7, z: 5, radius: 1.5, kind: 'vent', offset: 2.2 },
      { x: 7, z: -5, radius: 1.5, kind: 'vent', offset: .7 },
      { x: -7, z: 5, radius: 1.5, kind: 'vent', offset: 2.9 },
    ],
    devices: DEVICES_3,
    gates: evenGates(4, PI / 4),
    waves: [
      { count: 14, mix: { walker: 2, brute: 1 }, concurrent: 9 },
      { count: 18, mix: { walker: 2, runner: 1, brute: 1, spitter: 1 }, concurrent: 11 },
      { count: 22, mix: { walker: 1, runner: 2, brute: 2, spitter: 1 }, concurrent: 12 },
    ],
    boss: { name: 'Slag Colossus', title: 'Forged in the Crucible', health: 1600, speed: 1.1, slamEvery: 5.2, volley: 0, summonAt: .45, tint: '#ff8a3d' },
  },
  {
    id: 4,
    name: 'Frost Vault',
    subtitle: 'Sector 23 // Cold storage',
    briefing: 'The floor is glazed with ice and ringed with arc traps - momentum carries you further than you think. Runners hunt in packs here.',
    radius: 15,
    friction: .32,
    theme: {
      floor: '#c4d6e2', wall: '#96abba', accent: '#9fd8ff', accentSoft: '#2d5c80', fog: '#0d1520', fogNear: 10, fogFar: 36,
      sky: '#0d1520', hemiSky: '#b4cde0', hemiGround: '#172333', keyLight: '#e8f4ff', rimLight: '#8cc8ff',
    },
    obstacles: [
      ...ring(8, 8.6, .55, .55, 'pillar'),
      ...ring(3, 4, 1.1, .32, 'barrier', Math.PI / 2),
      ...arcWall(Math.cos(PI * .375) * 12, Math.sin(PI * .375) * 12, PI * 1.375),
      ...arcWall(Math.cos(PI * 1.375) * 12, Math.sin(PI * 1.375) * 12, PI * .375),
      ...deviceBlockers(DEVICES_4),
    ],
    hazards: [],
    devices: DEVICES_4,
    gates: evenGates(4),
    waves: [
      { count: 16, mix: { runner: 3, walker: 1 }, concurrent: 10 },
      { count: 20, mix: { runner: 3, spitter: 1, brute: 1 }, concurrent: 12 },
      { count: 26, mix: { runner: 4, walker: 1, spitter: 1, brute: 1 }, concurrent: 13 },
    ],
    boss: { name: 'Rime Stalker', title: 'The Cold That Hunts', health: 2000, speed: 2.1, slamEvery: 6, volley: 7, summonAt: .6, tint: '#9fd8ff' },
  },
  {
    id: 5,
    name: 'The Core',
    subtitle: 'Sector 00 // Origin chamber',
    briefing: 'Everything that ever crawled out of the ring started here. Toxic seepage, live vents, four arc traps and the Hollow King.',
    radius: 16,
    friction: .9,
    theme: {
      floor: '#8c8698', wall: '#6a6078', accent: '#c07cff', accentSoft: '#4a1f73', fog: '#0e0914', fogNear: 11, fogFar: 40,
      sky: '#0e0914', hemiSky: '#9384ab', hemiGround: '#140d1c', keyLight: '#e2d4ff', rimLight: '#ff5fa2',
    },
    obstacles: [
      ...ring(6, 9.5, .6, .6, 'pillar', Math.PI / 6),
      ...ring(4, 5.2, 1.2, .32, 'barrier', Math.PI / 4),
      ...arcWall(Math.cos(PI * 5 / 6) * 13.2, Math.sin(PI * 5 / 6) * 13.2, -PI / 6),
      ...arcWall(Math.cos(-PI / 6) * 13.2, Math.sin(-PI / 6) * 13.2, PI * 5 / 6),
      ...deviceBlockers(DEVICES_5),
    ],
    hazards: [
      { x: 0, z: 0, radius: 1.8, kind: 'vent', offset: 0 },
      { x: -11, z: 0, radius: 1.8, kind: 'toxic', offset: 0 },
      { x: 11, z: 0, radius: 1.8, kind: 'toxic', offset: 0 },
      { x: 0, z: -11.5, radius: 1.5, kind: 'vent', offset: 1.6 },
      { x: 0, z: 11.5, radius: 1.5, kind: 'vent', offset: 3.1 },
    ],
    devices: DEVICES_5,
    gates: evenGates(4),
    waves: [
      { count: 18, mix: { walker: 2, runner: 2, spitter: 1, brute: 1 }, concurrent: 12 },
      { count: 24, mix: { walker: 1, runner: 2, spitter: 2, brute: 2 }, concurrent: 13 },
      { count: 30, mix: { walker: 1, runner: 3, spitter: 2, brute: 2 }, concurrent: 14 },
    ],
    boss: { name: 'The Hollow King', title: 'First of the Sleepers', health: 2800, speed: 1.5, slamEvery: 4.6, volley: 9, summonAt: .7, tint: '#c07cff' },
  },
];

export type PerkId =
  | 'firepower' | 'rapid' | 'vitality' | 'plating' | 'fleet' | 'leech' | 'crit'
  | 'pierce' | 'mag' | 'frag' | 'nova' | 'dash' | 'focus' | 'brawler';

export type PerkDef = { id: PerkId; name: string; blurb: string; icon: string; max: number };

export const PERKS: PerkDef[] = [
  { id: 'firepower', name: 'Hollow Points', blurb: '+18% weapon damage', icon: '✦', max: 6 },
  { id: 'rapid', name: 'Hair Trigger', blurb: '+14% fire rate', icon: '≫', max: 5 },
  { id: 'vitality', name: 'Iron Constitution', blurb: '+25 max health, heal 25', icon: '+', max: 6 },
  { id: 'plating', name: 'Reactive Plating', blurb: '+20 max shield, faster recharge', icon: '◇', max: 4 },
  { id: 'fleet', name: 'Fleet Footed', blurb: '+8% move speed', icon: '»', max: 4 },
  { id: 'leech', name: 'Blood Pact', blurb: 'Kills restore 3 health', icon: '♥', max: 3 },
  { id: 'crit', name: 'Marksman', blurb: '+8% critical hit chance', icon: '◎', max: 5 },
  { id: 'pierce', name: 'Penetrator Rounds', blurb: 'Bullets pierce +1 enemy', icon: '⟶', max: 3 },
  { id: 'mag', name: 'Extended Mag', blurb: '+15 magazine size', icon: '▮', max: 4 },
  { id: 'frag', name: 'Demolitionist', blurb: '+1 grenade, +25% blast damage', icon: '●', max: 4 },
  { id: 'nova', name: 'Overcharge', blurb: 'Shock Nova +30% radius & damage', icon: '✺', max: 4 },
  { id: 'dash', name: 'Phase Step', blurb: 'Dash costs less and recovers faster', icon: '↯', max: 3 },
  { id: 'focus', name: 'Deep Focus', blurb: '+30 max energy, faster regen', icon: '◆', max: 4 },
  { id: 'brawler', name: 'Brawler', blurb: 'Melee strike +40% damage & reach', icon: '✊', max: 4 },
];

export type ShopItemId = 'medkit' | 'ammo' | 'grenades' | 'tuning' | 'armor' | 'cell';
export type ShopItemDef = { id: ShopItemId; name: string; blurb: string; basePrice: number; scaling: number };

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'medkit', name: 'Field Medkit', blurb: 'Restore to full health', basePrice: 40, scaling: 0 },
  { id: 'ammo', name: 'Ammo Crate', blurb: '+120 reserve rounds', basePrice: 25, scaling: 0 },
  { id: 'grenades', name: 'Frag Bundle', blurb: '+2 grenades', basePrice: 35, scaling: 0 },
  { id: 'tuning', name: 'Weapon Tuning', blurb: 'Permanent +10% damage', basePrice: 90, scaling: 45 },
  { id: 'armor', name: 'Armor Weave', blurb: 'Permanent +20 max health', basePrice: 80, scaling: 40 },
  { id: 'cell', name: 'Power Cell', blurb: 'Permanent +15 energy', basePrice: 70, scaling: 35 },
];

export const ENEMY_STATS: Record<EnemyKind, { health: number; speed: number; damage: number; xp: number; gold: number; radius: number; scale: number; score: number }> = {
  walker: { health: 34, speed: 1.55, damage: 9, xp: 10, gold: 3, radius: .32, scale: 1, score: 25 },
  runner: { health: 22, speed: 2.75, damage: 7, xp: 9, gold: 3, radius: .28, scale: .92, score: 30 },
  brute: { health: 110, speed: 1.15, damage: 18, xp: 26, gold: 7, radius: .5, scale: 1.42, score: 60 },
  spitter: { health: 40, speed: 1.35, damage: 10, xp: 16, gold: 5, radius: .32, scale: 1, score: 40 },
  teowerine: { health: 420, speed: 1.12, damage: 20, xp: 120, gold: 45, radius: .54, scale: 1.35, score: 400 },
  boss: { health: 1000, speed: 1.3, damage: 26, xp: 220, gold: 90, radius: 1.05, scale: 2.35, score: 1000 },
};

export const xpForLevel = (level: number) => Math.round(45 + level * 38 + level * level * 6);
