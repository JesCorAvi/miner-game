import {
  MINERALS,
  calculatePunctualityBonus,
  calculateSurplusTrade,
  dayBonusFor,
  dayPerformance,
} from '../config';
import { BigValue } from './BigValue';
import type {
  ClauseId,
  DayReport,
  DaySaleLine,
  DifficultyModifier,
  DoctrineId,
  MineralId,
} from '../types';

export interface DayLedger {
  lines: Partial<Record<MineralId, DaySaleLine>>;
  otherValue: number;
}

export function emptyDayLedger(): DayLedger {
  return { lines: {}, otherValue: 0 };
}

function validMineral(value: string): value is MineralId {
  return Object.prototype.hasOwnProperty.call(MINERALS, value);
}

/**
 * Acumula la composición de un depósito para poder desglosar la liquidación.
 * `fallbackMoney` cubre depósitos antiguos/agregados sin líneas de mineral.
 */
export function recordDeposit(
  ledger: DayLedger,
  lines: readonly DaySaleLine[],
  fallbackMoney: number,
): void {
  let itemizedMoney = 0;
  for (const raw of lines) {
    if (!raw || !validMineral(raw.mineral)) {
      continue;
    }
    const count = Math.max(0, Math.floor(raw.count));
    const carbon = Math.max(0, Math.floor(raw.carbon));
    const money = Math.max(0, Math.floor(raw.money));
    if (count <= 0 && carbon <= 0 && money <= 0) {
      continue;
    }
    const line = ledger.lines[raw.mineral];
    if (line) {
      line.count += count;
      line.carbon += carbon;
      line.money += money;
    } else {
      ledger.lines[raw.mineral] = { mineral: raw.mineral, count, carbon, money };
    }
    itemizedMoney += money;
  }
  const cleanFallback = Math.max(0, Math.floor(fallbackMoney));
  ledger.otherValue += Math.max(0, cleanFallback - itemizedMoney);
}

export function computeFootprintStage(day: number): number {
  if (day <= 3) return 0;
  if (day <= 7) return 1;
  if (day <= 12) return 2;
  if (day <= 15) return 3;
  return 4;
}

export function buildDayReport(
  ledger: DayLedger,
  day: number,
  carbon: number,
  quota: number,
  oreValue: number,
  currentMoney: number,
  securedAt: number | null = null,
  duration = 0,
  options?: {
    depositToReserve?: boolean;
    nextQuota?: number;
    clauses?: ClauseId[];
    modifiers?: DifficultyModifier[];
    doctrine?: DoctrineId | null;
  },
): DayReport {
  const ordered: DaySaleLine[] = [];
  for (const mineral of Object.keys(MINERALS) as MineralId[]) {
    const line = ledger.lines[mineral];
    if (line && (line.count > 0 || line.carbon > 0 || line.money > 0)) {
      ordered.push({ ...line });
    }
  }
  const cleanCarbon = Math.max(0, Math.floor(carbon));
  const cleanQuota = Math.max(0, Math.floor(quota));
  const cleanOreValue = Math.max(0, Math.floor(oreValue));
  const success = cleanCarbon >= cleanQuota;
  let bonus = success ? dayBonusFor(day, cleanCarbon, cleanQuota) : 0;
  if (bonus > 0 && options?.modifiers?.includes('no_bonus_cash')) {
    bonus = 0;
  }
  if (bonus > 0 && options?.clauses?.includes('surprise_audit')) {
    bonus = Math.round(bonus * 1.5);
  }
  let punctuality = success
    ? calculatePunctualityBonus(cleanOreValue, securedAt, duration)
    : 0;
  if (punctuality > 0 && options?.clauses?.includes('short_shift')) {
    punctuality = Math.round(punctuality * 1.5);
  }

  let surplusCarbon = 0;
  let surplusCapital = 0;
  let reserveDeposited = 0;

  if (success) {
    const trade = calculateSurplusTrade(cleanCarbon, cleanQuota, cleanOreValue);
    surplusCarbon = trade.surplusCarbon;
    if (options?.depositToReserve && surplusCarbon > 0) {
      const maxCover = options.nextQuota ? Math.floor(options.nextQuota * 0.2) : surplusCarbon;
      reserveDeposited = Math.min(surplusCarbon, maxCover);
      const remainingForCapital = surplusCarbon - reserveDeposited;
      surplusCapital = Math.min(
        Math.round(remainingForCapital * 0.2),
        Math.floor(cleanOreValue * 0.2),
      );
    } else {
      surplusCapital = trade.surplusCapital;
    }
  }

  const total = cleanOreValue + bonus + punctuality + surplusCapital;
  return {
    day,
    carbon: cleanCarbon,
    quota: cleanQuota,
    performance: dayPerformance(cleanCarbon, cleanQuota),
    lines: ordered,
    oreValue: cleanOreValue,
    otherValue: Math.max(0, Math.floor(ledger.otherValue)),
    bonus,
    punctuality,
    surplusCarbon,
    surplusCapital,
    reserveDeposited,
    securedAt,
    total,
    money: Math.max(0, Math.floor(currentMoney)),
    carbonWire: BigValue.fromNumber(carbon).toWire(),
    quotaWire: BigValue.fromNumber(quota).toWire(),
    moneyWire: BigValue.fromNumber(currentMoney).toWire(),
    footprintStage: computeFootprintStage(day),
  };
}
