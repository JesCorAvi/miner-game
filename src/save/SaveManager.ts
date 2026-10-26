import {
  GRENADE_ORDER,
  MAX_EMPLOYEES,
  NAME_KEY,
  PASSIVE_ORDER,
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
  'carbon-magnate.save.v4',
  'carbon-magnate.save.v3',
  'carbon-magnate.save.v2',
];
const SAVE_VERSION = 5;

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
  for (const id of WEAPON_ORDER) {
    weapons[id] = id === 'pickaxe' ? true : Boolean(weaponsRecord[id]);
  }
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
    upgrades,
    passives,
    employees,
    ladders: Math.floor(num(record.ladders, STARTING_LADDERS, 0, 999)),
    grenades,
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
    coalMined: Math.floor(num(record.coalMined, 0, 0, 1e12)),
    moneyEarned: Math.floor(num(record.moneyEarned, 0, 0, 1e12)),
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
        record.version !== SAVE_VERSION
      ) {
        return null;
      }
      return {
        version: 5,
        savedAt: num(record.savedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
        day: Math.floor(num(record.day, 1, 1, 9999)),
        money: Math.floor(num(record.money, 0, 0, 1e12)),
        infinite: Boolean(record.infinite),
        loadout: normalizeLoadout(record.loadout),
        stats: normalizeStats(record.stats),
        playerName:
          typeof record.playerName === 'string'
            ? record.playerName.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) || 'Operario'
            : 'Operario',
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
        version: 5,
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
}
