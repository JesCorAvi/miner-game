import { describe, expect, it } from 'vitest';
import { BigValue } from '../src/core/BigValue';
import { defaultRun } from '../src/core/RunState';
import {
  addMoney,
  canAfford,
  moneyOf,
  moneyWire,
  setMoney,
  spendMoney,
} from '../src/core/Economy';
import { applyPurchaseToRun } from '../src/core/Shop';

describe('Monedero BigValue de capital', () => {
  it('mantiene el capital exacto por encima de 2^53', () => {
    const run = defaultRun();
    const start = BigValue.fromString('1e30');
    setMoney(run, start);
    addMoney(run, '1e20');
    expect(moneyOf(run).eq('1.0000000001e30')).toBe(true);
    expect(run.money).toBe(1.0000000001e30);
  });

  it('compra y descuenta sin perder el exponente', () => {
    const run = defaultRun();
    setMoney(run, BigValue.fromString('5e25'));
    expect(canAfford(run, 1.65e25)).toBe(true);
    expect(spendMoney(run, 1.65e25)).toBe(true);
    expect(moneyOf(run).gte('3.35e25')).toBe(true);
    expect(canAfford(run, '1e26')).toBe(false);
  });

  it('serializa el monedero para red y guardado', () => {
    const run = defaultRun();
    setMoney(run, BigValue.fromString('1.25e18'));
    expect(moneyWire(run)).toBe('1.25e18');
    expect(BigValue.fromWire(moneyWire(run)).eq('1.25e18')).toBe(true);
  });

  it('la tienda compra el pico de Ónice con capital BigValue', () => {
    const run = defaultRun();
    setMoney(run, BigValue.fromString('1e30'));
    run.loadout.pickaxeTier = 14;
    if (run.loadout.weaponTiers) run.loadout.weaponTiers.pickaxe = 14;
    const result = applyPurchaseToRun(run, 'pickaxe:15');
    expect(result).not.toBeNull();
    expect(run.loadout.pickaxeTier).toBe(15);
    expect(moneyOf(run).lt('1e30')).toBe(true);
    expect(moneyOf(run).gt(0)).toBe(true);
  });
});
