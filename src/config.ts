import type {
  ChestReward,
  EmployeeKind,
  GrenadeDefinition,
  GrenadeTierId,
  LadderOrientation,
  LayerDefinition,
  Loadout,
  MineralDefinition,
  MineralId,
  PassiveId,
  UpgradeId,
  WeaponDefinition,
  WeaponId,
} from './types';

export const GAME_TITLE = 'CARBON MAGNATE';
export const SAVE_KEY = 'carbon-magnate.save.v5';
export const NAME_KEY = 'carbon-magnate.name';
export const MAX_PLAYERS = 4;
export const MAX_PELLETS = 6000;
export const HOTBAR_SLOTS = 9;
export const INVENTORY_SLOTS = 36;
export const INVENTORY_MAIN_SLOTS = INVENTORY_SLOTS - HOTBAR_SLOTS;
export const MAX_STACK = 64;
export const LADDER_STACK_MAX = 999;
export const NETWORK_TICK_RATE = 20;
export const PIT_SIZE = 48;
export const PIT_HALF = PIT_SIZE / 2;
export const MINE_DEPTH = 120;
export const SURFACE_Y = 0;
export const PLAYER_RADIUS = 0.34;
export const PLAYER_HEIGHT = 1.78;
export const EYE_HEIGHT = 1.64;
export const BASE_DAY_TIME = 90;
export const DAY_TIME_PER_LEVEL = 15;
export const MAX_EMPLOYEES = 6;
export const MAX_EMPLOYEE_RANK = 3;
export const STARTING_MONEY = 0;
export const SAFE_ZONE_HALF = 30.5;
export const SURFACE_DECK_Y = 0.01;
export const SURFACE_DECK_HALF = 37;
export const SURFACE_SPAWN = { x: 0, z: 29 } as const;
export const HOPPER_POSITION = { x: 14, z: 28.5 } as const;
export const HOPPER_INTERACT_RADIUS = 3.5;
export const BASE_CARRY_WEIGHT = 40;
export const CARRY_WEIGHT_PER_LEVEL = 20;
export const COLLECTOR_CARRY_WEIGHT = BASE_CARRY_WEIGHT / 2;
export const STARTING_LADDERS = 8;
export const LADDER_PACK_SIZE = 4;
export const LADDER_COST = 30;
export const LADDER_HEIGHT = 4.4;
export const LADDER_REACH = 5.5;
export const LADDER_ORIENTATION_ORDER: readonly LadderOrientation[] = [
  'vertical',
  'diagonal-up',
  'horizontal',
  'diagonal-down',
];
export const LADDER_ORIENTATION_LABELS: Record<LadderOrientation, string> = {
  vertical: 'ESCALERA',
  'diagonal-up': 'RAMPA ASCENDENTE',
  horizontal: 'PUENTE',
  'diagonal-down': 'RAMPA DESCENDENTE',
};
export const COLLECTOR_CONVERSION_COST = 150;
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PEER_ID_PREFIX = 'carbon-magnate-v11-';

export const LAYERS: readonly LayerDefinition[] = [
  {
    index: 1,
    name: 'ARCILLA OCRE',
    subtitle: 'Capa superficial · terreno blando',
    from: 0,
    to: 25,
    hardness: 1,
    rock: 0x8e5636,
    highlight: 0xc9844b,
    accent: '#d79353',
  },
  {
    index: 2,
    name: 'PIZARRA GRIS',
    subtitle: 'Dureza media · carbón denso',
    from: 25,
    to: 55,
    hardness: 1.7,
    rock: 0x535b5b,
    highlight: 0x7d8987,
    accent: '#9aa8a3',
  },
  {
    index: 3,
    name: 'BASALTO MAGMÁTICO',
    subtitle: 'Roca dura · vetas presurizadas',
    from: 55,
    to: 85,
    hardness: 2.8,
    rock: 0x552921,
    highlight: 0x9b4932,
    accent: '#df7150',
  },
  {
    index: 4,
    name: 'ABISMO CRISTALINO',
    subtitle: 'Dureza extrema · núcleos puros',
    from: 85,
    to: 120,
    hardness: 4.5,
    rock: 0x263d51,
    highlight: 0x476e8d,
    accent: '#82c8e0',
  },
] as const;

export const MINERALS: Record<MineralId, MineralDefinition> = {
  coal: {
    id: 'coal',
    name: 'Carbón Común',
    shortName: 'CARBÓN',
    family: 'coal',
    layer: 1,
    color: 0x20282b,
    emissive: 0x22383d,
    roughness: 0.7,
    metalness: 0.12,
    hp: 26,
    radius: 0.62,
    carbonYield: 8,
    moneyYield: 8,
    pelletCount: 8,
    weight: 0.12,
    glow: 0x4f9aa1,
  },
  coalDense: {
    id: 'coalDense',
    name: 'Carbón Denso',
    shortName: 'DENSO',
    family: 'coal',
    layer: 2,
    color: 0x101617,
    emissive: 0x3e6c73,
    roughness: 0.58,
    metalness: 0.2,
    hp: 54,
    radius: 0.75,
    carbonYield: 24,
    moneyYield: 24,
    pelletCount: 8,
    weight: 0.14,
    glow: 0x69d8df,
  },
  coalPressure: {
    id: 'coalPressure',
    name: 'Carbón Presurizado',
    shortName: 'PRESURIZADO',
    family: 'coal',
    layer: 3,
    color: 0x22140f,
    emissive: 0xe05c24,
    roughness: 0.44,
    metalness: 0.32,
    hp: 104,
    radius: 0.88,
    carbonYield: 72,
    moneyYield: 72,
    pelletCount: 9,
    weight: 0.16,
    glow: 0xff8b45,
  },
  coalPure: {
    id: 'coalPure',
    name: 'Carbón Puro',
    shortName: 'PURO',
    family: 'coal',
    layer: 4,
    color: 0x1d1730,
    emissive: 0xc58cff,
    roughness: 0.32,
    metalness: 0.48,
    hp: 178,
    radius: 1.02,
    carbonYield: 300,
    moneyYield: 300,
    pelletCount: 10,
    weight: 0.2,
    glow: 0xd8a8ff,
  },
  copper: {
    id: 'copper',
    name: 'Cobre',
    shortName: 'COBRE',
    family: 'ore',
    layer: 1,
    color: 0xa96131,
    emissive: 0x6a250b,
    roughness: 0.5,
    metalness: 0.62,
    hp: 32,
    radius: 0.55,
    carbonYield: 0,
    moneyYield: 14,
    pelletCount: 7,
    weight: 0.14,
    glow: 0xe8894e,
  },
  iron: {
    id: 'iron',
    name: 'Hierro',
    shortName: 'HIERRO',
    family: 'ore',
    layer: 2,
    color: 0x9fa6a4,
    emissive: 0x293232,
    roughness: 0.38,
    metalness: 0.78,
    hp: 60,
    radius: 0.64,
    carbonYield: 0,
    moneyYield: 32,
    pelletCount: 8,
    weight: 0.16,
    glow: 0xc3d0cf,
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amatista',
    shortName: 'AMATISTA',
    family: 'ore',
    layer: 2,
    color: 0x8a53db,
    emissive: 0x5e27b3,
    roughness: 0.2,
    metalness: 0.3,
    hp: 76,
    radius: 0.7,
    carbonYield: 0,
    moneyYield: 64,
    pelletCount: 8,
    weight: 0.14,
    glow: 0xba8cff,
  },
  gold: {
    id: 'gold',
    name: 'Oro',
    shortName: 'ORO',
    family: 'ore',
    layer: 3,
    color: 0xd9ac3e,
    emissive: 0x7a4b05,
    roughness: 0.22,
    metalness: 0.92,
    hp: 112,
    radius: 0.76,
    carbonYield: 0,
    moneyYield: 135,
    pelletCount: 9,
    weight: 0.18,
    glow: 0xffda73,
  },
  ruby: {
    id: 'ruby',
    name: 'Rubí',
    shortName: 'RUBÍ',
    family: 'ore',
    layer: 3,
    color: 0xc62e48,
    emissive: 0x8e0d2c,
    roughness: 0.16,
    metalness: 0.24,
    hp: 140,
    radius: 0.82,
    carbonYield: 0,
    moneyYield: 225,
    pelletCount: 9,
    weight: 0.16,
    glow: 0xff6a7d,
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    shortName: 'ESMERALDA',
    family: 'ore',
    layer: 4,
    color: 0x1eb86b,
    emissive: 0x08713a,
    roughness: 0.18,
    metalness: 0.28,
    hp: 174,
    radius: 0.88,
    carbonYield: 0,
    moneyYield: 360,
    pelletCount: 10,
    weight: 0.2,
    glow: 0x63ffc2,
  },
  diamond: {
    id: 'diamond',
    name: 'Diamante Rosa',
    shortName: 'DIAMANTE',
    family: 'ore',
    layer: 4,
    color: 0xff8fcf,
    emissive: 0xc52b86,
    roughness: 0.08,
    metalness: 0.36,
    hp: 250,
    radius: 1.02,
    carbonYield: 0,
    moneyYield: 1000,
    pelletCount: 10,
    weight: 0.24,
    glow: 0xffbde4,
  },
};

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pickaxe: {
    id: 'pickaxe',
    slot: 1,
    name: 'Pico Industrial',
    shortName: 'PICO',
    description: 'Golpe fiable. Esculpe cráteres pequeños y fractura vetas; la roca profunda ofrece más resistencia.',
    style: 'melee',
    damage: 34,
    cooldown: 0.34,
    range: 5,
    carveRadius: 0.15,
    carveStrength: 0.9,
    chainCount: 0,
    chainRange: 0,
    pellets: 1,
    spread: 0,
    blastRadius: 0,
    unlockCost: 0,
  },
  tesla: {
    id: 'tesla',
    slot: 2,
    name: 'Pico Eléctrico',
    shortName: 'TESLA',
    description: 'Una descarga salta entre los nodos del mismo racimo, incluso si siguen semienterrados.',
    style: 'chain',
    damage: 30,
    cooldown: 0.88,
    range: 5.9,
    carveRadius: 0.35,
    carveStrength: 0.5,
    chainCount: 7,
    chainRange: 7.5,
    pellets: 1,
    spread: 0,
    blastRadius: 0,
    unlockCost: 380,
  },
  drill: {
    id: 'drill',
    slot: 3,
    name: 'Taladro de Plasma',
    shortName: 'TALADRO',
    description: 'Mantén el disparo para perforar un túnel continuo. La herramienta más eficaz para descender.',
    style: 'continuous',
    damage: 24,
    cooldown: 0.085,
    range: 5.2,
    carveRadius: 1.12,
    carveStrength: 1.25,
    chainCount: 0,
    chainRange: 0,
    pellets: 1,
    spread: 0.015,
    blastRadius: 0,
    unlockCost: 820,
  },
  shotgun: {
    id: 'shotgun',
    slot: 4,
    name: 'Escopeta Minera',
    shortName: 'ESCOPETA',
    description: 'Abre un cráter cónico. Disparar hacia abajo en el aire impulsa al operario hacia arriba.',
    style: 'shotgun',
    damage: 17,
    cooldown: 0.82,
    range: 10,
    carveRadius: 0.55,
    carveStrength: 0.75,
    chainCount: 0,
    chainRange: 0,
    pellets: 9,
    spread: 0.095,
    blastRadius: 0,
    unlockCost: 1250,
  },
};

export const GRENADE_AREA_RADIUS = 3.4;
export const GRENADE_BLAST_RADIUS = 5.6;
export const GRENADE_FUSE = 1.65;
export const GRENADE_COOLDOWN = 0.8;
export const GRENADE_STACK_MAX = 64;

export const GRENADE_TIERS: Record<GrenadeTierId, GrenadeDefinition> = {
  frag: {
    id: 'frag',
    name: 'Granada de Fragmentación',
    shortName: 'FRAG',
    description: 'Barata y ligera. Misma área de explosión, pero solo fractura la capa de arcilla (0–25 m).',
    cost: 120,
    packSize: 3,
    maxLayer: 1,
    carveStrength: 0.75,
    damage: 110,
    color: 0xff8a52,
    glow: 0xffc27a,
  },
  charge: {
    id: 'charge',
    name: 'Carga de Demolición',
    shortName: 'DEMOLICIÓN',
    description: 'Rompe hasta la pizarra gris (25–55 m). La potencia sube, el radio de explosión no cambia.',
    cost: 420,
    packSize: 2,
    maxLayer: 2,
    carveStrength: 1.15,
    damage: 140,
    color: 0xf2b44e,
    glow: 0xffde8c,
  },
  breach: {
    id: 'breach',
    name: 'Carga de Penetración',
    shortName: 'PENETRACIÓN',
    description: 'Perfora el basalto magmático (55–85 m). Potencia alta, misma área que el resto de granadas.',
    cost: 980,
    packSize: 2,
    maxLayer: 3,
    carveStrength: 1.55,
    damage: 175,
    color: 0xdc6d4b,
    glow: 0xff9b6b,
  },
  seismic: {
    id: 'seismic',
    name: 'Carga Sísmica',
    shortName: 'SÍSMICA',
    description: 'La única que fractura el abismo cristalino (85–120 m). Potencia máxima, misma área.',
    cost: 2200,
    packSize: 1,
    maxLayer: 4,
    carveStrength: 2.1,
    damage: 220,
    color: 0xb66cff,
    glow: 0xe0b4ff,
  },
};

export const GRENADE_ORDER: readonly GrenadeTierId[] = [
  'frag',
  'charge',
  'breach',
  'seismic',
];

export const WEAPON_ORDER: readonly WeaponId[] = [
  'pickaxe',
  'tesla',
  'drill',
  'shotgun',
];

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  growth: number;
  max: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  damage: {
    id: 'damage',
    name: 'Filo Corporativo',
    description: '+12% de daño contra vetas por nivel.',
    baseCost: 120,
    growth: 1.55,
    max: 10,
  },
  speed: {
    id: 'speed',
    name: 'Servo de Extracción',
    description: '+6% de cadencia por nivel.',
    baseCost: 150,
    growth: 1.55,
    max: 8,
  },
  magnet: {
    id: 'magnet',
    name: 'Imán de Pepitas',
    description: '+0.55 m de radio de recolección por nivel.',
    baseCost: 110,
    growth: 1.5,
    max: 6,
  },
  jetpack: {
    id: 'jetpack',
    name: 'Jetpack Industrial',
    description: 'Desbloquea el jetpack. Los niveles posteriores amplían el depósito (+20 de combustible).',
    baseCost: 3000,
    growth: 1.55,
    max: 6,
  },
  dayTime: {
    id: 'dayTime',
    name: 'Turno Ampliado',
    description: '+15 s al límite diario por nivel.',
    baseCost: 280,
    growth: 1.7,
    max: 5,
  },
  capacity: {
    id: 'capacity',
    name: 'Bahía de Carga',
    description: '+20 kg de capacidad de mochila por nivel.',
    baseCost: 160,
    growth: 1.55,
    max: 6,
  },
};

export const PASSIVES: Record<
  PassiveId,
  { name: string; description: string; color: string }
> = {
  digRadius: {
    name: 'Frenesí de Taladro',
    description: '+8% de radio de excavación.',
    color: '#ffd27b',
  },
  nodeDamage: {
    name: 'Fractura Dirigida',
    description: '+10% de daño a nodos.',
    color: '#ff9a76',
  },
  magnet: {
    name: 'Campo Magnético',
    description: '+0.4 m de imán de pepitas.',
    color: '#7be5d8',
  },
  employeeSpeed: {
    name: 'Productividad Ejecutiva',
    description: '+12% de velocidad de empleados.',
    color: '#c5aaff',
  },
  jetpackFuel: {
    name: 'Inyector Auxiliar',
    description: '+20 de combustible de jetpack.',
    color: '#7ab7ff',
  },
};

export const PASSIVE_ORDER: readonly PassiveId[] = [
  'digRadius',
  'nodeDamage',
  'magnet',
  'employeeSpeed',
  'jetpackFuel',
];

export const CHEST_REWARDS: readonly ChestReward[] = PASSIVE_ORDER.map((passive) => ({
  passive,
  title: PASSIVES[passive].name,
  description: PASSIVES[passive].description,
}));

export const EMPLOYEE_KINDS: readonly EmployeeKind[] = ['miner', 'collector'];

export const EMPLOYEE_LABELS: Record<EmployeeKind, { name: string; description: string; baseCost: number }> = {
  miner: {
    name: 'Minero Corporativo',
    description: 'Taladra hacia las vetas más cercanas y las fractura automáticamente.',
    baseCost: 260,
  },
  collector: {
    name: 'Recolector de Activos',
    description: 'Rastrea pepitas valiosas, carga media mochila y las entrega volando en la tolva.',
    baseCost: 190,
  },
};

export const EMPLOYEE_RANKS = [
  { name: 'Becario', short: 'BEC', multiplier: 0.8, cost: 0 },
  { name: 'Asociado', short: 'ASC', multiplier: 1.2, cost: 340 },
  { name: 'Senior', short: 'SR', multiplier: 1.7, cost: 860 },
  { name: 'Vicepresidente', short: 'VP', multiplier: 2.35, cost: 1880 },
] as const;

export const HIRE_GROWTH = 1.52;

const QUOTAS: readonly number[] = [
  40, 90, 170, 320, 580, 950, 1600, 2600, 3900, 5000, 7200, 10600, 16500, 25800, 40000,
];

export const VICTORY_DAY = 15;

export function baseQuotaForDay(day: number): number {
  if (day <= QUOTAS.length) {
    return QUOTAS[Math.max(0, day - 1)];
  }
  const last = QUOTAS[QUOTAS.length - 1];
  return Math.round((last * Math.pow(1.38, day - QUOTAS.length)) / 10) * 10;
}

export function quotaForDay(day: number, playerCount: number): number {
  const extraPlayers = Math.max(0, Math.min(MAX_PLAYERS, playerCount) - 1);
  return Math.round(baseQuotaForDay(day) * (1 + extraPlayers * 0.6));
}

export function dayDuration(loadout: Loadout): number {
  return BASE_DAY_TIME + loadout.upgrades.dayTime * DAY_TIME_PER_LEVEL;
}

export const DAY_BONUS_BASE = 150;
export const DAY_BONUS_DAY_STEP = 50;
export const DAY_BONUS_MAX_SURPLUS = 1;
export const DAY_BONUS_ROUNDING = 5;

/**
 * Bonus de cierre por rendimiento. La base crece con el día y se multiplica
 * hasta x2 cuando se entrega el doble de la cuota. No se paga si se fracasa.
 */
export function dayBonusFor(day: number, carbon: number, quota: number): number {
  if (quota <= 0) {
    return 0;
  }
  const coverage = carbon / quota;
  const surplus = Math.min(DAY_BONUS_MAX_SURPLUS, Math.max(0, coverage - 1));
  const base = DAY_BONUS_BASE + Math.max(0, day - 1) * DAY_BONUS_DAY_STEP;
  const raw = base * (1 + surplus);
  return Math.max(0, Math.round(raw / DAY_BONUS_ROUNDING) * DAY_BONUS_ROUNDING);
}

export function dayPerformance(carbon: number, quota: number): number {
  return quota > 0 ? Math.max(0, carbon / quota) : 0;
}

export function layerAtDepth(depth: number): LayerDefinition {
  const clamped = Math.max(0, depth);
  for (let index = LAYERS.length - 1; index >= 0; index -= 1) {
    if (clamped >= LAYERS[index].from) {
      return LAYERS[index];
    }
  }
  return LAYERS[0];
}

export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  const definition = UPGRADES[id];
  return Math.round((definition.baseCost * Math.pow(definition.growth, currentLevel)) / 5) * 5;
}

export function hireCost(kind: EmployeeKind, currentCount: number): number {
  return Math.round(
    (EMPLOYEE_LABELS[kind].baseCost * Math.pow(HIRE_GROWTH, currentCount)) / 5,
  ) * 5;
}

export function rankCost(rank: number): number {
  const next = Math.min(EMPLOYEE_RANKS.length - 1, rank + 1);
  return Math.round(EMPLOYEE_RANKS[next].cost / 5) * 5;
}

export function damageMultiplier(loadout: Loadout): number {
  return (1 + loadout.upgrades.damage * 0.12) * (1 + loadout.passives.nodeDamage * 0.1);
}

export function cooldownMultiplier(loadout: Loadout): number {
  return Math.max(0.36, 1 - loadout.upgrades.speed * 0.06);
}

export function carveRadiusMultiplier(loadout: Loadout): number {
  return 1 + loadout.passives.digRadius * 0.08;
}

export function magnetRadius(loadout: Loadout): number {
  return 2.2 + loadout.upgrades.magnet * 0.55 + loadout.passives.magnet * 0.4;
}

export function maxCarryWeight(loadout: Loadout): number {
  return BASE_CARRY_WEIGHT + loadout.upgrades.capacity * CARRY_WEIGHT_PER_LEVEL;
}

export function maxJetpackFuel(loadout: Loadout): number {
  if (loadout.upgrades.jetpack <= 0) {
    return 0;
  }
  return 100 + (loadout.upgrades.jetpack - 1) * 20 + loadout.passives.jetpackFuel * 20;
}

export function employeeRankMultiplier(rank: number, employeeSpeedPassive: number): number {
  const entry = EMPLOYEE_RANKS[Math.max(0, Math.min(EMPLOYEE_RANKS.length - 1, rank))];
  return entry.multiplier * (1 + employeeSpeedPassive * 0.12);
}

export function makeDefaultLoadout(): Loadout {
  return {
    weapons: {
      pickaxe: true,
      tesla: false,
      drill: false,
      shotgun: false,
    },
    upgrades: {
      damage: 0,
      speed: 0,
      magnet: 0,
      jetpack: 0,
      dayTime: 0,
      capacity: 0,
    },
    passives: {
      digRadius: 0,
      nodeDamage: 0,
      magnet: 0,
      employeeSpeed: 0,
      jetpackFuel: 0,
    },
    employees: {
      roster: [],
      nextId: 1,
    },
    ladders: STARTING_LADDERS,
    grenades: {
      frag: 0,
      charge: 0,
      breach: 0,
      seismic: 0,
    },
  };
}

export const PLAYER_COLORS = ['#e6a449', '#6fdcd2', '#c8a8ff', '#ff8065'] as const;
export const PLAYER_NAME_DEFAULT = 'Operario';
export const ROOM_CODE_LENGTH = 6;
