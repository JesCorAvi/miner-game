import { BigValue } from '../core/BigValue';

let ledgerModeActive = false;

export function setLedgerMode(active: boolean): void {
  ledgerModeActive = active;
}

export function isLedgerMode(): boolean {
  return ledgerModeActive;
}

const numberFormatter = new Intl.NumberFormat('es-ES', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

export function formatNumber(value: number | BigValue): string {
  if (value instanceof BigValue) {
    return value.formatExact();
  }
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

export function formatShortNumber(value: number | BigValue, forceLedgerMode?: boolean): string {
  const bv = value instanceof BigValue ? value : BigValue.fromNumber(value);
  const useLedger = forceLedgerMode ?? ledgerModeActive;
  return bv.formatShort(useLedger);
}

export function formatMoney(value: number | BigValue): string {
  return `$ ${formatNumber(value)}`;
}

export function formatShortMoney(value: number | BigValue, forceLedgerMode?: boolean): string {
  return `$ ${formatShortNumber(value, forceLedgerMode)}`;
}

export function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`;
}

export function formatDepth(depth: number): string {
  return `${Math.max(0, Math.round(depth))} m`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
