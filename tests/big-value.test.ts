import { describe, expect, it } from 'vitest';
import { BigValue } from '../src/core/BigValue';

describe('BigValue — Aritmética y Números Grandes', () => {
  it('inicializa y normaliza mantisa (1 <= |m| < 10) y exponente', () => {
    const zero = BigValue.fromNumber(0);
    expect(zero.mantissa).toBe(0);
    expect(zero.exponent).toBe(0);

    const v1 = BigValue.fromNumber(100);
    expect(v1.mantissa).toBe(1);
    expect(v1.exponent).toBe(2);

    const v2 = BigValue.fromNumber(1250);
    expect(v2.mantissa).toBe(1.25);
    expect(v2.exponent).toBe(3);

    const v3 = BigValue.fromNumber(0.045);
    expect(v3.mantissa).toBe(4.5);
    expect(v3.exponent).toBe(-2);
  });

  it('suma y resta alineando exponentes', () => {
    const a = BigValue.fromNumber(1500); // 1.5e3
    const b = BigValue.fromNumber(500);  // 5.0e2
    const sum = a.add(b);
    expect(sum.toNumber()).toBe(2000);
    expect(sum.mantissa).toBe(2);
    expect(sum.exponent).toBe(3);

    const diff = a.sub(b);
    expect(diff.toNumber()).toBe(1000);
    expect(diff.mantissa).toBe(1);
    expect(diff.exponent).toBe(3);
  });

  it('multiplica y divide correctamente', () => {
    const a = BigValue.fromNumber(2000); // 2e3
    const b = BigValue.fromNumber(400);  // 4e2

    const prod = a.mul(b); // 8e5 = 800.000
    expect(prod.toNumber()).toBe(800000);
    expect(prod.mantissa).toBe(8);
    expect(prod.exponent).toBe(5);

    const quot = a.div(b); // 5
    expect(quot.toNumber()).toBe(5);
    expect(quot.mantissa).toBe(5);
    expect(quot.exponent).toBe(0);
  });

  it('compara valores con precisión (cmp, eq, gt, gte, lt, lte)', () => {
    const a = BigValue.fromNumber(1000);
    const b = BigValue.fromNumber(2000);
    const c = BigValue.fromNumber(1000);

    expect(a.cmp(b)).toBe(-1);
    expect(b.cmp(a)).toBe(1);
    expect(a.cmp(c)).toBe(0);

    expect(a.lt(b)).toBe(true);
    expect(a.lte(c)).toBe(true);
    expect(b.gt(a)).toBe(true);
    expect(a.eq(c)).toBe(true);
  });

  it('maneja números gigantes con toWire y fromWire (1e15, 1e18, 1e30)', () => {
    const huge = BigValue.fromString('1.25e18');
    expect(huge.mantissa).toBe(1.25);
    expect(huge.exponent).toBe(18);

    const wire = huge.toWire();
    const restored = BigValue.fromWire(wire);
    expect(restored.mantissa).toBe(1.25);
    expect(restored.exponent).toBe(18);
    expect(restored.eq(huge)).toBe(true);
  });

  it('formatea números grandes en formato corto y exacto', () => {
    const vK = BigValue.fromNumber(25000);
    expect(vK.formatShort()).toBe('25 k');

    const vM = BigValue.fromNumber(4500000);
    expect(vM.formatShort()).toBe('4,50 M');

    const vMM = BigValue.fromNumber(3200000000);
    expect(vMM.formatShort()).toBe('3,20 MM');

    const vSci = BigValue.fromString('5.67e14');
    expect(vSci.formatShort()).toBe('5,67×10¹⁴');

    // Modo Libro Mayor
    expect(vM.formatShort(true)).toBe('4,50 M (4.500.000)');
  });

  it('clampMin y clampMax restringen rangos', () => {
    const val = BigValue.fromNumber(50);
    expect(val.clampMin(100).toNumber()).toBe(100);
    expect(val.clampMin(20).toNumber()).toBe(50);

    expect(val.clampMax(30).toNumber()).toBe(30);
    expect(val.clampMax(80).toNumber()).toBe(50);
  });
});
