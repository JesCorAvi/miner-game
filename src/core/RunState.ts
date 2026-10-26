import { dayDuration, makeDefaultLoadout, quotaForDay } from '../config';
import type { Loadout, RunSnapshot, RunStats, WeaponId } from '../types';

export function emptyStats(): RunStats {
  return {
    coalMined: 0,
    moneyEarned: 0,
    nodesBroken: 0,
    chestsOpened: 0,
    daysCompleted: 0,
    playSeconds: 0,
  };
}

export function cloneStats(stats: RunStats): RunStats {
  return {
    coalMined: Math.max(0, Number(stats.coalMined) || 0),
    moneyEarned: Math.max(0, Number(stats.moneyEarned) || 0),
    nodesBroken: Math.max(0, Number(stats.nodesBroken) || 0),
    chestsOpened: Math.max(0, Number(stats.chestsOpened) || 0),
    daysCompleted: Math.max(0, Number(stats.daysCompleted) || 0),
    playSeconds: Math.max(0, Number(stats.playSeconds) || 0),
  };
}

export function cloneLoadout(loadout: Loadout): Loadout {
  return {
    weapons: { ...loadout.weapons },
    upgrades: { ...loadout.upgrades },
    passives: { ...loadout.passives },
    employees: {
      roster: loadout.employees.roster.map((employee) => ({ ...employee })),
      nextId: loadout.employees.nextId,
    },
    ladders: loadout.ladders,
    grenades: { ...loadout.grenades },
  };
}

export function defaultRun(): RunSnapshot {
  const loadout = makeDefaultLoadout();
  return {
    day: 1,
    money: 0,
    carbon: 0,
    quota: quotaForDay(1, 1),
    timeLeft: dayDuration(loadout),
    infinite: false,
    loadout,
    stats: emptyStats(),
  };
}

export function roundCoordinate(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function sameWeapon(a: WeaponId, b: WeaponId): boolean {
  return a === b;
}
