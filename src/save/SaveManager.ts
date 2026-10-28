import {
  GRENADE_ORDER,
  MAX_EMPLOYEES,
  NAME_KEY,
  PASSIVE_ORDER,
  LEGACY_PASSIVE_IDS,
  familyTierCount,
  SAVE_KEY,
  STARTING_LADDERS,
  UPGRADES,
  WEAPON_ORDER,
  makeDefaultLoadout,
} from '../config';
import type {
  EmployeeRecord,
  GrenadeTierId,
  Loadout,
  PassiveLevels,
  RunStats,
  SaveData,
  SaveSummary,
  UpgradeLevels,
  WeaponUnlocks,
} from '../types';

const LEGACY_SAVE_KEYS = [
  'carbon-magnate.save.v8',
  'carbon-magnate.save.v7',
  'carbon-magnate.save.v6',
  'carbon-magnate.save.v5',
  'carbon-magnate.save.v4',
  'carbon-magnate.save.v3',
  'carbon-magnate.save.v2',
];
const SAVE_VERSION = 9;
const SHAKE_KEY = 'carbon-magnate.shake';
const FOV_KEY = 'carbon-magnate.fov';
const BULK_LOOT_KEY = 'carbon-magnate.bulk-loot';

function num(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function normalizeLoadout(value: unknown): Loadout {
  const fallback = makeDefaultLoadout();
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const weaponsRecord =
    typeof record.weapons === 'object' && record.weapons !== null
      ? (record.weapons as Record<string, unknown>)
      : {};
  const weapons = { ...fallback.weapons } as WeaponUnlocks;
  const tiersRecord =
    typeof record.weaponTiers === 'object' && record.weaponTiers !== null
      ? (record.weaponTiers as Record<string, unknown>)
      : {};
  const weaponTiers = { ...(fallback.weaponTiers ?? {}) } as Record<string, number>;
  for (const id of WEAPON_ORDER) {
    const maxTier = familyTierCount(id);
    const fallbackTier = id === 'pickaxe' ? 1 : 0;
    const requested = Math.floor(
      num(tiersRecord[id], fallbackTier, 0, maxTier),
    );
    const ownedByLegacy = id === 'pickaxe' || Boolean(weaponsRecord[id]);
    const tier = Math.max(requested, ownedByLegacy ? Math.max(1, fallbackTier) : 0);
    weaponTiers[id] = Math.max(0, Math.min(maxTier, tier));
    weapons[id] = id === 'pickaxe' ? true : weaponTiers[id] > 0;
  }
  const savedPickaxeTier = Math.floor(num(record.pickaxeTier, 1, 1, 15));
  weaponTiers.pickaxe = Math.max(weaponTiers.pickaxe ?? 1, savedPickaxeTier);
  weapons.pickaxe = true;
  const upgradesRecord =
    typeof record.upgrades === 'object' && record.upgrades !== null
      ? (record.upgrades as Record<string, unknown>)
      : {};
  const upgrades = { ...fallback.upgrades } as UpgradeLevels;
  for (const key of Object.keys(upgrades) as (keyof UpgradeLevels)[]) {
    upgrades[key] = Math.floor(num(upgradesRecord[key], fallback.upgrades[key], 0, UPGRADES[key].max));
  }
  const passiveRecord =
    typeof record.passives === 'object' && record.passives !== null
      ? (record.passives as Record<string, unknown>)
      : {};
  const passives = { ...fallback.passives } as PassiveLevels;
  for (const key of PASSIVE_ORDER) {
    passives[key] = Math.floor(num(passiveRecord[key], 0, 0, 99));
  }
  for (const key of LEGACY_PASSIVE_IDS) {
    passives[key] = Math.floor(
      num(passiveRecord[key], fallback.passives[key] ?? 0, 0, 99),
    );
  }
  const employeesRecord =
    typeof record.employees === 'object' && record.employees !== null
      ? (record.employees as Record<string, unknown>)
      : {};
  const employees = normalizeEmployees(employeesRecord);
  const grenadesRecord =
    typeof record.grenades === 'object' && record.grenades !== null
      ? (record.grenades as Record<string, unknown>)
      : {};
  const grenades = { ...fallback.grenades };
  for (const tier of GRENADE_ORDER) {
    grenades[tier as GrenadeTierId] = Math.floor(
      num(grenadesRecord[tier], fallback.grenades[tier], 0, 999),
    );
  }
  return {
    weapons,
    weaponTiers,
    upgrades,
    passives,
    employees,
    ladders: Math.floor(num(record.ladders, STARTING_LADDERS, 0, 999)),
    grenades,
    winches: Math.floor(num(record.winches, fallback.winches, 0, 999)),
    fieldDepots: Math.floor(num(record.fieldDepots, fallback.fieldDepots, 0, 999)),
    beacons: Math.floor(num(record.beacons, fallback.beacons, 0, 999)),
    conveyors: Math.floor(num(record.conveyors, fallback.conveyors ?? 0, 0, 32)),
    patent: Math.floor(num(record.patent, fallback.patent ?? 0, 0, 6)),
    pickaxeTier: weaponTiers.pickaxe ?? 1,
    profession:
      typeof record.profession === 'string'
        ? record.profession.slice(0, 32)
        : 'internship',
    doctrine: typeof record.doctrine === 'string' ? (record.doctrine as any) : null,
    clauses: Array.isArray(record.clauses) ? record.clauses.filter((c): c is any => typeof c === 'string') : [],
    reserveCarbon: Math.floor(num(record.reserveCarbon, 0, 0, 1e100)),
    maxLayerReached: Math.floor(num(record.maxLayerReached, 1, 1, 12)),
    certifications: Array.isArray(record.certifications)
      ? record.certifications.filter((c): c is any => typeof c === 'string')
      : [],
    utilitySlots: Array.isArray(record.utilitySlots) && record.utilitySlots.length === 2
      ? [record.utilitySlots[0] as any ?? null, record.utilitySlots[1] as any ?? null]
      : [null, null],
  };
}

function normalizeEmployees(record: Record<string, unknown>): Loadout['employees'] {
  const roster: EmployeeRecord[] = [];
  const usedIds = new Set<string>();
  let generatedId = 1;

  if (Array.isArray(record.roster)) {
    for (const value of record.roster.slice(0, MAX_EMPLOYEES)) {
      if (typeof value !== 'object' || value === null) {
        continue;
      }
      const entry = value as Record<string, unknown>;
      const kind = entry.kind === 'collector' ? 'collector' : 'miner';
      let id =
        typeof entry.id === 'string'
          ? entry.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
          : '';
      while (!id || usedIds.has(id)) {
        id = `emp-${generatedId}`;
        generatedId += 1;
      }
      usedIds.add(id);
      roster.push({
        id,
        kind,
        rank: Math.floor(num(entry.rank, 0, 0, 3)),
      });
    }
  } else {
    const legacyRank = Math.floor(num(record.rank, 0, 0, 3));
    const minerCount = Math.floor(num(record.miners, 0, 0, MAX_EMPLOYEES));
    const collectorCount = Math.floor(
      num(record.collectors, 0, 0, Math.max(0, MAX_EMPLOYEES - minerCount)),
    );
    for (let index = 0; index < minerCount + collectorCount; index += 1) {
      const id = `emp-${generatedId}`;
      generatedId += 1;
      usedIds.add(id);
      roster.push({
        id,
        kind: index < minerCount ? 'miner' : 'collector',
        rank: legacyRank,
      });
    }
  }

  let maxNumericId = 0;
  for (const employee of roster) {
    const match = /^emp-(\d+)$/.exec(employee.id);
    if (match) {
      maxNumericId = Math.max(maxNumericId, Number(match[1]));
    }
  }
  const nextId = Math.max(
    maxNumericId + 1,
    Math.floor(num(record.nextId, generatedId, 1, 999999)),
  );
  return { roster, nextId };
}

function normalizeStats(value: unknown): RunStats {
  const fallback: RunStats = {
    coalMined: 0,
    moneyEarned: 0,
    nodesBroken: 0,
    chestsOpened: 0,
    daysCompleted: 0,
    playSeconds: 0,
  };
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  return {
    coalMined: Math.floor(num(record.coalMined, 0, 0, 1e100)),
    moneyEarned: Math.floor(num(record.moneyEarned, 0, 0, 1e100)),
    nodesBroken: Math.floor(num(record.nodesBroken, 0, 0, 1e9)),
    chestsOpened: Math.floor(num(record.chestsOpened, 0, 0, 1e6)),
    daysCompleted: Math.floor(num(record.daysCompleted, 0, 0, 9999)),
    playSeconds: num(record.playSeconds, 0, 0, 1e9),
  };
}

export class SaveManager {
  load(): SaveData | null {
    try {
      const raw =
        [SAVE_KEY, ...LEGACY_SAVE_KEYS]
          .map((key) => window.localStorage.getItem(key))
          .find((value) => Boolean(value)) ?? null;
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const record = parsed as Record<string, unknown>;
      if (
        record.version !== 2 &&
        record.version !== 3 &&
        record.version !== 4 &&
        record.version !== 5 &&
        record.version !== 6 &&
        record.version !== 7 &&
        record.version !== 8 &&
        record.version !== SAVE_VERSION
      ) {
        return null;
      }
      return {
        version: 9,
        savedAt: num(record.savedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
        day: Math.floor(num(record.day, 1, 1, 9999)),
        money: Math.floor(num(record.money, 0, 0, 1e100)),
        moneyWire: typeof record.moneyWire === 'string' ? record.moneyWire : undefined,
        infinite: Boolean(record.infinite),
        mode:
          record.mode === 'tough' || record.mode === 'peaceful'
            ? record.mode
            : 'normal',
        map:
          typeof record.map === 'string'
            ? record.map.slice(0, 32)
            : 'standard',
        modifiers: Array.isArray(record.modifiers)
          ? record.modifiers.filter(
              (m): m is any =>
                m === 'no_chests' ||
                m === 'only_coal' ||
                m === 'coal_worthless' ||
                m === 'no_bonus_cash' ||
                m === 'no_time_upgrades' ||
                m === 'only_clay',
            )
          : [],
        loadout: normalizeLoadout(record.loadout),
        stats: normalizeStats(record.stats),
        playerName:
          typeof record.playerName === 'string'
            ? record.playerName.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) || 'Operario'
            : 'Operario',
        brigades: Array.isArray(record.brigades) ? (record.brigades as any) : undefined,
        sectors: Array.isArray(record.sectors) ? (record.sectors as any) : undefined,
        nextBrigadeId: typeof record.nextBrigadeId === 'number' ? record.nextBrigadeId : undefined,
        conveyors: typeof record.conveyors === 'object' && record.conveyors !== null ? (record.conveyors as any) : undefined,
        accessibility: typeof record.accessibility === 'object' && record.accessibility !== null ? (record.accessibility as any) : undefined,
        platformDepth: typeof record.platformDepth === 'number' ? Math.max(0, record.platformDepth) : undefined,
      };
    } catch {
      return null;
    }
  }

  summary(): SaveSummary | null {
    const save = this.load();
    if (!save) {
      return null;
    }
    return {
      day: save.day,
      money: save.money,
      savedAt: save.savedAt,
      daysCompleted: save.stats.daysCompleted,
    };
  }

  save(data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
    try {
      const payload: SaveData = {
        ...data,
        version: 9,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      for (const key of LEGACY_SAVE_KEYS) {
        window.localStorage.removeItem(key);
      }
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(SAVE_KEY);
      for (const key of LEGACY_SAVE_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage might be unavailable in hardened contexts.
    }
  }

  loadName(): string {
    try {
      return window.localStorage.getItem(NAME_KEY) || 'Operario';
    } catch {
      return 'Operario';
    }
  }

  saveName(name: string): void {
    try {
      window.localStorage.setItem(NAME_KEY, name);
    } catch {
      // Name persistence is a convenience.
    }
  }

  loadSettings(): { shake: number; fov: number; bulkLoot: boolean } {
    try {
      const shakeStr = window.localStorage.getItem(SHAKE_KEY);
      const fovStr = window.localStorage.getItem(FOV_KEY);
      const bulkStr = window.localStorage.getItem(BULK_LOOT_KEY);
      return {
        shake: shakeStr !== null ? parseFloat(shakeStr) : 1.0,
        fov: fovStr !== null ? parseInt(fovStr, 10) : 75,
        bulkLoot: bulkStr === 'true',
      };
    } catch {
      return { shake: 1.0, fov: 75, bulkLoot: false };
    }
  }

  saveShake(shake: number): void {
    try {
      window.localStorage.setItem(SHAKE_KEY, String(shake));
    } catch {
      // ignore
    }
  }

  saveFov(fov: number): void {
    try {
      window.localStorage.setItem(FOV_KEY, String(fov));
    } catch {
      // ignore
    }
  }

  saveBulkLoot(bulk: boolean): void {
    try {
      window.localStorage.setItem(BULK_LOOT_KEY, String(bulk));
    } catch {
      // ignore
    }
  }
}
