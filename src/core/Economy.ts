import { BigValue } from './BigValue';
import type { RunSnapshot } from '../types';

/**
 * Monedero autoritativo de capital. `RunSnapshot.money` sigue existiendo como
 * caché numérica para HUD, guardado y compatibilidad, pero toda decisión
 * económica usa `moneyBig`. Así los valores por encima de 2^53 no pierden
 * precisión al comprar, vender o liquidar.
 */
export function moneyOf(run: RunSnapshot): BigValue {
  if (!run.moneyBig) {
    return BigValue.fromNumber(run.money);
  }
  // Compatibilidad con código/tests antiguos que escriben `run.money`
  // directamente sin pasar por `setMoney`.
  if (run.moneyBig.mantissa === 0 && run.money > 0) {
    return BigValue.fromNumber(run.money);
  }
  return run.moneyBig;
}

export function setMoney(run: RunSnapshot, value: BigValue): void {
  run.moneyBig = value;
  run.money = value.toNumber();
}

export function addMoney(run: RunSnapshot, amount: number | BigValue | string): void {
  setMoney(run, moneyOf(run).add(amount));
}

export function canAfford(run: RunSnapshot, amount: number | BigValue | string): boolean {
  return moneyOf(run).gte(amount);
}

export function spendMoney(run: RunSnapshot, amount: number | BigValue | string): boolean {
  const wallet = moneyOf(run);
  const cost = BigValue.from(amount);
  if (wallet.lt(cost)) {
    return false;
  }
  setMoney(run, wallet.sub(cost));
  return true;
}

export function moneyWire(run: RunSnapshot): string {
  return moneyOf(run).toWire();
}
