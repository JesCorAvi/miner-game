import { describe, expect, it } from 'vitest';
import {
  formatDepth,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShortMoney,
  formatShortNumber,
  formatTime,
  setLedgerMode,
} from '../src/ui/format';
import { BigValue } from '../src/core/BigValue';

describe('Formato en Español y Notación Abreviada (k, M, MM, Libro Mayor)', () => {
  it('formatNumber formatea números enteros con separadores en español', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(450)).toBe('450');
    expect(formatNumber(1500)).toBe('1.500');
    expect(formatNumber(1250000)).toBe('1.250.000');
  });

  it('formatShortNumber sigue la tabla de formato corporativo español', () => {
    // < 10.000: entero con puntos
    expect(formatShortNumber(0)).toBe('0');
    expect(formatShortNumber(500)).toBe('500');
    expect(formatShortNumber(1200)).toBe('1.200');
    expect(formatShortNumber(9999)).toBe('9.999');

    // 10.000 - 999.999 en k
    expect(formatShortNumber(15000)).toBe('15 k');
    expect(formatShortNumber(999000)).toBe('999 k');

    // 1e6 - 1e9 en M
    expect(formatShortNumber(1500000)).toBe('1,50 M');
    expect(formatShortNumber(25000000)).toBe('25,0 M');

    // 1e9 - 1e12 en MM (miles de millones)
    expect(formatShortNumber(1500000000)).toBe('1,50 MM');
    expect(formatShortNumber(45000000000)).toBe('45,0 MM');

    // >= 1e12 en notación científica española (1,23×10¹²)
    expect(formatShortNumber(1.23e12)).toBe('1,23×10¹²');
  });

  it('Modo Libro Mayor muestra la cifra exacta junto a la abreviada', () => {
    setLedgerMode(false);
    expect(formatShortNumber(1500000)).toBe('1,50 M');

    setLedgerMode(true);
    expect(formatShortNumber(1500000)).toBe('1,50 M (1.500.000)');

    setLedgerMode(false);
  });

  it('formatMoney y formatShortMoney anteponen el símbolo de divisa', () => {
    expect(formatMoney(0)).toBe('$ 0');
    expect(formatMoney(1500)).toBe('$ 1.500');
    expect(formatShortMoney(1500)).toBe('$ 1.500');
    expect(formatShortMoney(15000)).toBe('$ 15 k');
    expect(formatShortMoney(25000000)).toBe('$ 25,0 M');
  });

  it('formatTime formatea segundos a MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(42)).toBe('00:42');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(125)).toBe('02:05');
  });

  it('formatDepth y formatPercent', () => {
    expect(formatDepth(18.4)).toBe('18 m');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1.25)).toBe('125%');
  });
});
