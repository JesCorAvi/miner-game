import { MINERALS, dayBonusFor, dayPerformance } from '../config';
import type { DayReport, DaySaleLine, MineralId } from '../types';

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

export function buildDayReport(
  ledger: DayLedger,
  day: number,
  carbon: number,
  quota: number,
  oreValue: number,
  currentMoney: number,
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
  const bonus = success ? dayBonusFor(day, cleanCarbon, cleanQuota) : 0;
  return {
    day,
    carbon: cleanCarbon,
    quota: cleanQuota,
    performance: dayPerformance(cleanCarbon, cleanQuota),
    lines: ordered,
    oreValue: cleanOreValue,
    otherValue: Math.max(0, Math.floor(ledger.otherValue)),
    bonus,
    total: cleanOreValue + bonus,
    money: Math.max(0, Math.floor(currentMoney)),
  };
}
