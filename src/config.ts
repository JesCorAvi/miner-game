import type {
  EmployeeKind,
  GrenadeDefinition,
  GrenadeTierId,
  LadderOrientation,
  Loadout,
  UpgradeId,
  WeaponDefinition,
  WeaponId,
} from './types';
import { LAYERS, MINE_DEPTH, layerAtDepth } from './data/biomes';
import { MINERALS } from './data/minerals';
import { MAX_PLAYERS, baseQuotaForDay, quotaForDay } from './data/modes';
import {
  MAPS,
  MAP_ORDER,
  mapDefinition,
  mapMaxDepth,
} from './data/maps';
import {
  LEGACY_PASSIVE_IDS,
  PASSIVES,
  PASSIVE_ORDER,
  chestPassivePoints,
  createDefaultPassives,
  passiveCapPoints,
  passiveMultiplier,
  passiveOverflowPoints,
} from './data/passives';
import {
  PROFESSIONS,
  PROFESSION_ORDER,
  professionCanHire,
  professionCapacityMultiplier,
  professionCarveMultiplier,
  professionDamageMultiplier,
  professionDefinition,
  professionGrenadeCostMultiplier,
  professionGrenadeDamageMultiplier,
  professionJetpackFuelMultiplier,
} from './data/professions';
import {
  WEAPON_FAMILIES,
  WEAPON_FAMILY_ORDER,
  familyTierBuy,
  familyTierDamage,
  familyTierSell,
  familyTierCount,
  weaponFamily,
} from './data/weaponFamilies';
import {
  PICKAXE_TIERS,
  pickaxeStrength,
  pickaxeTierDefinition,
} from './data/weaponTiers';

export {
  LAYERS,
  MINE_DEPTH,
  layerAtDepth,
  MINERALS,
  MAX_PLAYERS,
  baseQuotaForDay,
  quotaForDay,
  MAPS,
  MAP_ORDER,
  mapDefinition,
  mapMaxDepth,
  PASSIVES,
  PASSIVE_ORDER,
  LEGACY_PASSIVE_IDS,
  chestPassivePoints,
  createDefaultPassives,
  passiveCapPoints,
  passiveMultiplier,
  passiveOverflowPoints,
  PROFESSIONS,
  PROFESSION_ORDER,
  professionCanHire,
  professionCapacityMultiplier,
  professionCarveMultiplier,
  professionDamageMultiplier,
  professionDefinition,
  professionGrenadeCostMultiplier,
  professionGrenadeDamageMultiplier,
  professionJetpackFuelMultiplier,
  WEAPON_FAMILIES,
  WEAPON_FAMILY_ORDER,
  familyTierBuy,
  familyTierDamage,
  familyTierSell,
  familyTierCount,
  weaponFamily,
  PICKAXE_TIERS,
  pickaxeStrength,
  pickaxeTierDefinition,
};

export const GAME_TITLE = 'CARBON MAGNATE';
export const SAVE_KEY = 'carbon-magnate.save.v9';
export const NAME_KEY = 'carbon-magnate.name';

export const HOTBAR_SLOTS = 9;
export const INVENTORY_SLOTS = 36;
export const INVENTORY_MAIN_SLOTS = INVENTORY_SLOTS - HOTBAR_SLOTS;
export const MAX_STACK = 64;
export const MAX_PELLETS = 6000;
export const LADDER_STACK_MAX = 999;
export const NETWORK_TICK_RATE = 20;
export const PIT_SIZE = 48;
export const PIT_HALF = PIT_SIZE / 2;
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
export const CARRY_WEIGHT_PER_LEVEL = 40;
export const MAX_STACK_BONUS_PER_LEVEL = 32;
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
export const PEER_ID_PREFIX = 'carbon-magnate-v18-';

export const WINCH_SPEED = 8.0;
export const MIN_WINCH_DROP = 3.0;
export const WINCH_COST = 180;
export const WINCH_INTERACT_RADIUS = 2.5;

export const MAX_FIELD_DEPOTS = 2;
export const FIELD_DEPOT_COST = 240;
export const FIELD_DEPOT_CAPACITY_RATIO = 0.30;
export const FIELD_DEPOT_INTERACT_RADIUS = 2.8;

export const MAX_BEACONS = 8;
export const BEACON_COST = 40;
export const BEACON_PACK_SIZE = 2;
export const BEACON_COLORS: readonly number[] = [0xffaa00, 0x00e5ff, 0x76ff03, 0xff007f, 0xff6d00];

export const MAX_CONVEYORS = 32;
export const CONVEYOR_PACK_SIZE = 4;
export const CONVEYOR_COST = 120;

export const CRITICAL_LOAD_RATIO = 0.80;
export const CRITICAL_LOAD_PENALTY = 0.10;
export const MIN_FALL_SPILL_DISTANCE = 6.0;
export const FALL_SPILL_RATIO_MIN = 0.05;
export const FALL_SPILL_RATIO_MAX = 0.10;

export const PLATFORM_DEPTH_STEP = 25;
export const MAX_PLATFORM_DEPTH = 75;
export const CLOSURE_ACT_COST = 450;

export const LAYER_HEIGHT = 12;

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
    maxLayer: 3,
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
    maxLayer: 6,
    carveStrength: 1.15,
    damage: 140,
    color: 0xf2b44e,
    glow: 0xffde8c,
  },
  breach: {
    id: 'breach',
    name: 'Carga de Penetración',
    shortName: 'PENETRACIÓN',
    description: 'Perfora el basalto magmático (55–85 m). Carga conformada en cápsula perforante.',
    cost: 980,
    packSize: 2,
    maxLayer: 9,
    carveStrength: 1.55,
    damage: 175,
    color: 0xdc6d4b,
    glow: 0xff9b6b,
    shape: 'capsule',
    length: 5.5,
  },
  seismic: {
    id: 'seismic',
    name: 'Carga Sísmica',
    shortName: 'SÍSMICA',
    description: 'Fractura el abismo cristalino (85–120 m). Carga conformada en embudo cónico.',
    cost: 2200,
    packSize: 1,
    maxLayer: 12,
    carveStrength: 2.1,
    damage: 220,
    color: 0xb66cff,
    glow: 0xe0b4ff,
    shape: 'cone',
    length: 7.0,
  },
};

export const GRENADE_ORDER: readonly GrenadeTierId[] = [
  'frag',
  'charge',
  'breach',
  'seismic',
];

export const WEAPON_ORDER: readonly WeaponId[] = WEAPON_FAMILY_ORDER;

export const WEAPONS: Record<WeaponId, WeaponDefinition> = Object.fromEntries(
  WEAPON_FAMILY_ORDER.map((id, index) => {
    const family = weaponFamily(id);
    return [
      id,
      {
        id,
        slot: index + 1,
        name: family.name,
        shortName: family.shortName,
        description: family.description,
        style: family.style,
        damage: familyTierDamage(id, 1),
        cooldown: family.cooldown,
        range: family.range,
        carveRadius: family.carveRadius,
        carveStrength: family.carveStrength,
        chainCount: family.chainCount,
        chainRange: family.chainRange,
        pellets: family.pellets,
        spread: family.spread,
        blastRadius: family.blastRadius,
        unlockCost: familyTierBuy(id, 1),
      } satisfies WeaponDefinition,
    ];
  }),
) as Record<WeaponId, WeaponDefinition>;

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
    description: '+40 kg de capacidad de mochila por nivel.',
    baseCost: 160,
    growth: 1.55,
    max: 12,
  },
  stack: {
    id: 'stack',
    name: 'Compactador de Carga',
    description: '+32 unidades por stack de mineral.',
    baseCost: 500,
    growth: 3.2,
    max: 12,
  },
};

export const PASSIVE_LEGACY_NOTE =
  'Las pasivas de cofre viven en src/data/passives.ts (31 pasivas de referencia).';

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

export const VICTORY_DAY = 15;
export const TRUE_VICTORY_DAY = 25;

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

export const SURPLUS_CARBON_RATE = 0.20;
export const SURPLUS_CARBON_CAP_RATIO = 0.20;
export const PUNCTUALITY_BONUS_MAX_RATIO = 0.12;

/**
 * Prima de puntualidad por asegurar la cuota temprano.
 * Si se cubre en el primer 25 % del turno, otorga hasta el 12 % del valor de minerales.
 * Entre el 25 % y el 75 %, decae linealmente hasta 0.
 * En el último 25 %, no otorga prima.
 */
export function calculatePunctualityBonus(
  oreValue: number,
  securedAt: number | null,
  duration: number,
): number {
  if (securedAt === null || duration <= 0 || oreValue <= 0) {
    return 0;
  }
  const elapsedRatio = Math.max(0, Math.min(1, securedAt / duration));
  if (elapsedRatio >= 0.75) {
    return 0;
  }
  const factor = elapsedRatio <= 0.25
    ? 1.0
    : (0.75 - elapsedRatio) / 0.5;
  return Math.max(0, Math.round(oreValue * PUNCTUALITY_BONUS_MAX_RATIO * factor));
}

/**
 * Canje de excedente de carbón (Fase 1 / MVP).
 * Cada tonelada sobre la cuota se convierte a 0,20 $/t de capital,
 * con un tope del 20 % del valor de minerales del día.
 */
export function calculateSurplusTrade(
  carbon: number,
  quota: number,
  oreValue: number,
): { surplusCarbon: number; surplusCapital: number } {
  const surplusCarbon = Math.max(0, Math.floor(carbon - quota));
  if (surplusCarbon <= 0 || oreValue <= 0) {
    return { surplusCarbon, surplusCapital: 0 };
  }
  const maxCap = Math.max(0, Math.floor(oreValue * SURPLUS_CARBON_CAP_RATIO));
  const surplusCapital = Math.min(
    Math.round(surplusCarbon * SURPLUS_CARBON_RATE),
    maxCap,
  );
  return { surplusCarbon, surplusCapital };
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

export type DamageStyle = 'melee' | 'chain' | 'continuous' | 'shotgun' | 'grenade';

export function damageMultiplier(
  loadout: Loadout,
  style: DamageStyle = 'melee',
): number {
  const speedOverflow = passiveOverflowPoints(
    'pickaxeSpeed',
    loadout.passives.pickaxeSpeed ?? 0,
  );
  const patent = Math.pow(2.4, Math.max(0, loadout.patent ?? 0));
  let doctrine = 1;
  if (loadout.doctrine === 'blasting') {
    doctrine = style === 'grenade' ? 1.6 : style === 'melee' ? 0.75 : 1;
  } else if (loadout.doctrine === 'precision') {
    doctrine = style === 'melee' || style === 'continuous' ? 1.2 : 1;
  } else if (loadout.doctrine === 'freight') {
    doctrine = style === 'melee' ? 0.85 : 1;
  }
  return (
    (1 + loadout.upgrades.damage * 0.12) *
    (1 + 0.05 * speedOverflow) *
    patent *
    doctrine
  );
}

/** Multiplicador de la pasiva propia de la familia de arma. */
export function weaponPassiveMultiplier(
  loadout: Loadout,
  weaponId: WeaponId,
): number {
  const family = weaponFamily(weaponId);
  return passiveMultiplier(
    family.passive,
    loadout.passives[family.passive] ?? 0,
  );
}

/** Multiplicador de daño de la profesión para un arma concreta. */
export function weaponProfessionMultiplier(
  loadout: Loadout,
  weaponId: WeaponId,
): number {
  const weapon = WEAPONS[weaponId];
  return professionDamageMultiplier(
    loadout.profession,
    weapon?.style ?? 'melee',
    weaponId,
  );
}

/**
 * Escala global del equipo según el tier comprado de cada familia. Las armas
 * conservan su daño relativo y acompañan la escalera de tiers del GDD.
 */
export function weaponTier(loadout: Loadout, weaponId: WeaponId = 'pickaxe'): number {
  if (weaponId === 'pickaxe') {
    return Math.max(
      1,
      Math.floor(loadout.weaponTiers?.pickaxe ?? 0),
      Math.floor(loadout.pickaxeTier ?? 1),
    );
  }
  const raw =
    loadout.weaponTiers?.[weaponId] ??
    (loadout.weapons?.[weaponId] ? 1 : 0);
  return Math.max(0, Math.floor(raw));
}

export function weaponDamageScale(
  loadout: Loadout,
  weaponId: WeaponId = 'pickaxe',
): number {
  const tier = Math.max(1, weaponTier(loadout, weaponId));
  return familyTierDamage(weaponId, tier) / Math.max(1, familyTierDamage(weaponId, 1));
}

export function cooldownMultiplier(loadout: Loadout): number {
  const base = Math.max(0.36, 1 - loadout.upgrades.speed * 0.06);
  const speed = passiveMultiplier('pickaxeSpeed', loadout.passives.pickaxeSpeed ?? 0);
  return Math.max(0.08, base / speed);
}

export function carveRadiusMultiplier(loadout: Loadout): number {
  return 1 + loadout.passives.digRadius * 0.08;
}

export function magnetRadius(loadout: Loadout): number {
  return 2.2 + loadout.upgrades.magnet * 0.55 + loadout.passives.magnet * 0.4;
}

export function maxCarryWeight(loadout: Loadout): number {
  const base = BASE_CARRY_WEIGHT + loadout.upgrades.capacity * CARRY_WEIGHT_PER_LEVEL;
  let multiplier = professionCapacityMultiplier(loadout.profession);
  if (loadout.doctrine === 'crew') {
    multiplier *= 0.75;
  } else if (loadout.doctrine === 'precision') {
    multiplier *= 1.25;
  }
  return Math.round(base * multiplier);
}

export function maxStackFor(loadout: Loadout): number {
  return MAX_STACK + loadout.upgrades.stack * MAX_STACK_BONUS_PER_LEVEL;
}

export function maxJetpackFuel(loadout: Loadout): number {
  if (loadout.upgrades.jetpack <= 0) {
    return 0;
  }
  return (
    (100 + (loadout.upgrades.jetpack - 1) * 20 + loadout.passives.jetpackFuel * 20) *
    professionJetpackFuelMultiplier(loadout.profession)
  );
}

export function employeeRankMultiplier(rank: number, speedMultiplier = 1): number {
  const entry = EMPLOYEE_RANKS[Math.max(0, Math.min(EMPLOYEE_RANKS.length - 1, rank))];
  return entry.multiplier * speedMultiplier;
}

export function makeDefaultLoadout(): Loadout {
  const weapons = Object.fromEntries(
    WEAPON_ORDER.map((id) => [id, id === 'pickaxe']),
  ) as Record<string, boolean>;
  const weaponTiers = Object.fromEntries(
    WEAPON_ORDER.map((id) => [id, id === 'pickaxe' ? 1 : 0]),
  ) as Record<string, number>;
  return {
    weapons,
    weaponTiers,
    upgrades: {
      damage: 0,
      speed: 0,
      magnet: 0,
      jetpack: 0,
      dayTime: 0,
      capacity: 0,
      stack: 0,
    },
    passives: createDefaultPassives(),
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
    winches: 0,
    fieldDepots: 0,
    beacons: 0,
    conveyors: 0,
    patent: 0,
    pickaxeTier: 1,
    profession: 'internship',
    doctrine: null,
    clauses: [],
    reserveCarbon: 0,
    maxLayerReached: 1,
    certifications: [],
    utilitySlots: [null, null],
  };
}

export const PLAYER_COLORS = ['#e6a449', '#6fdcd2', '#c8a8ff', '#ff8065'] as const;
export const PLAYER_NAME_DEFAULT = 'Operario';
export const ROOM_CODE_LENGTH = 6;
