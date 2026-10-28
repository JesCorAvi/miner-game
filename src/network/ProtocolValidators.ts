import { GRENADE_ORDER, MINE_DEPTH, MINERALS } from '../config';

/** Tope de validación compartido con Protocol; evita un import circular. */
const MAX_ECONOMY_VALUE = 1e100;
import type {
  DayReport,
  DaySaleLine,
  FieldDepotStoredItem,
  GrenadeTierId,
  MineralId,
  NetworkBeaconState,
  NetworkFieldDepotState,
  NetworkWinchState,
  WeaponId,
} from '../types';
import type { FxWire, PlayerWireState } from './Protocol';

export function parsePlayerWire(
  value: unknown,
  worldBound: number,
  isWeapon: (w: unknown) => w is WeaponId,
): PlayerWireState | null {
  if (!isRecord(value)) {
    return null;
  }
  const x = bounded(value.x, -worldBound, worldBound);
  const y = bounded(value.y, -125, 10);
  const z = bounded(value.z, -worldBound, worldBound);
  const yaw = finite(value.yaw);
  const pitch = bounded(value.pitch, -1.6, 1.6);
  if (!isWeapon(value.weapon) || x === null || y === null || z === null || yaw === null || pitch === null) {
    return null;
  }
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    yaw,
    pitch,
    weapon: value.weapon,
    jetpack: Boolean(value.jetpack),
    mining: Boolean(value.mining),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function bounded(value: unknown, min: number, max: number): number | null {
  const number = finite(value);
  return number === null ? null : Math.max(min, Math.min(max, number));
}

export function parseGrenadeCounts(value: unknown): Record<GrenadeTierId, number> | null {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<GrenadeTierId, number> = {
    frag: 0,
    charge: 0,
    breach: 0,
    seismic: 0,
  };
  for (const tier of GRENADE_ORDER) {
    const count = bounded(value[tier] ?? 0, 0, 999);
    if (count === null) {
      return null;
    }
    result[tier] = Math.floor(count);
  }
  return result;
}

export function parseSaleLines(value: unknown): DaySaleLine[] | null {
  if (!Array.isArray(value) || value.length > 32) {
    return null;
  }
  const lines: DaySaleLine[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.mineral !== 'string') {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(MINERALS, raw.mineral)) {
      return null;
    }
    const count = bounded(raw.count, 0, 1000000);
    const carbon = bounded(raw.carbon, 0, MAX_ECONOMY_VALUE);
    const money = bounded(raw.money, 0, MAX_ECONOMY_VALUE);
    if (count === null || carbon === null || money === null) {
      return null;
    }
    lines.push({
      mineral: raw.mineral as MineralId,
      count: Math.floor(count),
      carbon: Math.floor(carbon),
      money: Math.floor(money),
    });
  }
  return lines;
}

export function parseDayReport(value: unknown): DayReport | null {
  if (!isRecord(value)) {
    return null;
  }
  const day = bounded(value.day, 1, 9999);
  const carbon = bounded(value.carbon, 0, MAX_ECONOMY_VALUE);
  const quota = bounded(value.quota, 0, MAX_ECONOMY_VALUE);
  const performance = bounded(value.performance, 0, 1e9);
  const oreValue = bounded(value.oreValue, 0, MAX_ECONOMY_VALUE);
  const otherValue = bounded(value.otherValue, 0, MAX_ECONOMY_VALUE);
  const bonus = bounded(value.bonus, 0, MAX_ECONOMY_VALUE);
  const punctuality = bounded(value.punctuality, 0, MAX_ECONOMY_VALUE) ?? 0;
  const surplusCarbon = bounded(value.surplusCarbon, 0, MAX_ECONOMY_VALUE) ?? 0;
  const surplusCapital = bounded(value.surplusCapital, 0, MAX_ECONOMY_VALUE) ?? 0;
  const securedAt =
    value.securedAt === null || value.securedAt === undefined
      ? null
      : bounded(value.securedAt, 0, 1e5);
  const total = bounded(value.total, 0, MAX_ECONOMY_VALUE);
  const money = bounded(value.money, 0, MAX_ECONOMY_VALUE);
  const lines = parseSaleLines(value.lines);
  if (
    day === null ||
    carbon === null ||
    quota === null ||
    performance === null ||
    oreValue === null ||
    otherValue === null ||
    bonus === null ||
    total === null ||
    money === null ||
    lines === null
  ) {
    return null;
  }
  return {
    day,
    carbon: Math.floor(carbon),
    quota: Math.floor(quota),
    performance,
    lines,
    oreValue: Math.floor(oreValue),
    otherValue: Math.floor(otherValue),
    bonus: Math.floor(bonus),
    punctuality: Math.floor(punctuality),
    surplusCarbon: Math.floor(surplusCarbon),
    surplusCapital: Math.floor(surplusCapital),
    securedAt,
    total: Math.floor(total),
    money: Math.floor(money),
  };
}

export function parseFxWire(value: unknown, fxBound: number): FxWire | null {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return null;
  }
  if (value.kind === 'shot') {
    const x = bounded(value.x, -fxBound, fxBound);
    const y = bounded(value.y, -125, 10);
    const z = bounded(value.z, -fxBound, fxBound);
    const dx = bounded(value.dx, -1, 1);
    const dy = bounded(value.dy, -1, 1);
    const dz = bounded(value.dz, -1, 1);
    if (x === null || y === null || z === null || dx === null || dy === null || dz === null) {
      return null;
    }
    if (
      value.weapon !== 'pickaxe' &&
      value.weapon !== 'tesla' &&
      value.weapon !== 'drill' &&
      value.weapon !== 'shotgun'
    ) {
      return null;
    }
    return {
      kind: 'shot',
      weapon: value.weapon,
      x,
      y,
      z,
      dx,
      dy,
      dz,
    };
  }
  if (value.kind === 'explosion') {
    const x = bounded(value.x, -fxBound, fxBound);
    const y = bounded(value.y, -125, 10);
    const z = bounded(value.z, -fxBound, fxBound);
    const radius = bounded(value.radius, 0.2, 7);
    if (x === null || y === null || z === null || radius === null) {
      return null;
    }
    return { kind: 'explosion', x, y, z, radius };
  }
  if (value.kind === 'lightning') {
    if (!Array.isArray(value.points) || value.points.length < 6 || value.points.length > 48) {
      return null;
    }
    const points: number[] = [];
    for (const point of value.points) {
      const coordinate = bounded(point, -fxBound, fxBound);
      if (coordinate === null) {
        return null;
      }
      points.push(coordinate);
    }
    return { kind: 'lightning', points };
  }
  if (value.kind === 'hit') {
    const x = bounded(value.x, -fxBound, fxBound);
    const y = bounded(value.y, -125, 10);
    const z = bounded(value.z, -fxBound, fxBound);
    const color = bounded(value.color, 0, 0xffffff);
    if (x === null || y === null || z === null || color === null) {
      return null;
    }
    return { kind: 'hit', x, y, z, color, strong: Boolean(value.strong) };
  }
  return null;
}

export function parseWinch(value: unknown): NetworkWinchState | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = typeof value.id === 'string' ? value.id.slice(0, 64) : null;
  const x = bounded(value.x, -35, 35);
  const topY = bounded(value.topY, -MINE_DEPTH, 10);
  const bottomY = bounded(value.bottomY, -MINE_DEPTH - 5, 10);
  const z = bounded(value.z, -35, 35);
  if (!id || x === null || topY === null || bottomY === null || z === null || topY <= bottomY) {
    return null;
  }
  const ownerId = typeof value.ownerId === 'string' ? value.ownerId.slice(0, 64) : undefined;
  return { id, x, topY, bottomY, z, ownerId };
}

export function parseFieldDepot(value: unknown): NetworkFieldDepotState | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = typeof value.id === 'string' ? value.id.slice(0, 64) : null;
  const x = bounded(value.x, -35, 35);
  const y = bounded(value.y, -125, 10);
  const z = bounded(value.z, -35, 35);
  const maxCapacity = bounded(value.maxCapacity, 1, 200) ?? 30;
  const totalWeight = bounded(value.totalWeight, 0, 200) ?? 0;
  if (!id || x === null || y === null || z === null) {
    return null;
  }
  const stored: FieldDepotStoredItem[] = [];
  if (Array.isArray(value.stored)) {
    for (const item of value.stored.slice(0, 64)) {
      if (
        isRecord(item) &&
        typeof item.mineral === 'string' &&
        Object.prototype.hasOwnProperty.call(MINERALS, item.mineral)
      ) {
        const count = bounded(item.count, 0, 1000) ?? 0;
        const carbon = bounded(item.carbon, 0, MAX_ECONOMY_VALUE) ?? 0;
        const money = bounded(item.money, 0, MAX_ECONOMY_VALUE) ?? 0;
        const weight = bounded(item.weight, 0, 200) ?? 0;
        stored.push({
          mineral: item.mineral as MineralId,
          count: Math.floor(count),
          carbon: Math.floor(carbon),
          money: Math.floor(money),
          weight,
        });
      }
    }
  }
  const ownerId = typeof value.ownerId === 'string' ? value.ownerId.slice(0, 64) : undefined;
  return { id, x, y, z, stored, totalWeight, maxCapacity, ownerId };
}

export function parseBeacon(value: unknown): NetworkBeaconState | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = typeof value.id === 'string' ? value.id.slice(0, 64) : null;
  const x = bounded(value.x, -35, 35);
  const y = bounded(value.y, -125, 10);
  const z = bounded(value.z, -35, 35);
  const color = bounded(value.color, 0, 0xffffff) ?? 0xffaa00;
  const label = typeof value.label === 'string' ? value.label.slice(0, 32) : undefined;
  const ownerId = typeof value.ownerId === 'string' ? value.ownerId.slice(0, 64) : undefined;
  if (!id || x === null || y === null || z === null) {
    return null;
  }
  return { id, x, y, z, color, label, ownerId };
}
