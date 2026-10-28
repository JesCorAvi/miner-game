import { describe, expect, it } from 'vitest';
import {
  CRITICAL_LOAD_PENALTY,
  CRITICAL_LOAD_RATIO,
  FALL_SPILL_RATIO_MAX,
  FALL_SPILL_RATIO_MIN,
  MIN_FALL_SPILL_DISTANCE,
} from '../src/config';
import { Inventory } from '../src/core/Inventory';

describe('Carga Crítica y Sistema de Derrame de Carga (Spillage)', () => {
  it('constantes de carga crítica y derrame', () => {
    expect(CRITICAL_LOAD_RATIO).toBe(0.80);
    expect(CRITICAL_LOAD_PENALTY).toBe(0.10);
    expect(MIN_FALL_SPILL_DISTANCE).toBe(6.0);
    expect(FALL_SPILL_RATIO_MIN).toBe(0.05);
    expect(FALL_SPILL_RATIO_MAX).toBe(0.10);
  });

  it('determina correctamente cuándo se alcanza la carga crítica (> 80%)', () => {
    const maxCapacity = 100;
    const isCritical = (currentWeight: number) => currentWeight / maxCapacity > CRITICAL_LOAD_RATIO;

    expect(isCritical(70)).toBe(false);
    expect(isCritical(80)).toBe(false);
    expect(isCritical(80.1)).toBe(true);
    expect(isCritical(95)).toBe(true);
  });

  it('el derrame por caída solo se activa si la caída es >= 6.0 m y hay carga crítica', () => {
    const shouldSpill = (fallDist: number, loadRatio: number) =>
      fallDist >= MIN_FALL_SPILL_DISTANCE && loadRatio > CRITICAL_LOAD_RATIO;

    // Caída corta con carga crítica -> no derrama
    expect(shouldSpill(4.0, 0.9)).toBe(false);
    // Caída larga sin carga crítica -> no derrama
    expect(shouldSpill(8.0, 0.7)).toBe(false);
    // Caída larga con carga crítica -> SÍ derrama
    expect(shouldSpill(6.5, 0.85)).toBe(true);
  });

  it('el derrame retira entre el 5% y 10% de las piezas del inventario para dejarlas en el suelo', () => {
    const inventory = new Inventory();
    // Añadimos 20 pepitas de carbón
    for (let i = 0; i < 20; i++) {
      inventory.addMineral('coal', 8, 0, 2.5);
    }
    expect(inventory.totals().count).toBe(20);

    // Supongamos un derrame del 10%
    const spillRatio = 0.10;
    const slots = inventory.getSlots();
    let spilledCount = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot && slot.kind === 'mineral') {
        const toSpill = Math.max(1, Math.round(slot.count * spillRatio));
        inventory.removeOreFromSlot(i, toSpill);
        spilledCount += toSpill;
      }
    }

    // Se han derramado 2 pepitas (el 10% de 20)
    expect(spilledCount).toBe(2);
    expect(inventory.totals().count).toBe(18);
  });
});
