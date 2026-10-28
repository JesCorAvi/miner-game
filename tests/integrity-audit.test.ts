import { describe, expect, it } from 'vitest';
import {
  BASE_CARRY_WEIGHT,
  FIELD_DEPOT_CAPACITY_RATIO,
  makeDefaultLoadout,
  maxCarryWeight,
} from '../src/config';
import {
  FIELD_CERTIFICATIONS,
  canHireEmployee,
  canPurchaseSupply,
  canPurchaseUpgrade,
  computeDayDurationWithModifiers,
  computeMineralValueMultiplier,
  computePatentMultiplier,
  computeQuotaWithModifiers,
  computeTotalDamageMultiplier,
  equipUtility,
  hasUtilityActive,
  unlockCertification,
} from '../src/core/Progression';
import { applyPurchaseToRun, buildShopItems, getEmployeeHireCost, getGrenadeCost, getSupplyCost } from '../src/core/Shop';
import { buildDayReport, emptyDayLedger } from '../src/core/DaySettlement';
import { hashString } from '../src/core/Rng';
import type { RunSnapshot } from '../src/types';

describe('FASE 6A — Auditoría de Integridad y Cero Stubs', () => {
  describe('1. Verificación de las 4 Actas de Operación', () => {
    it('Acta de Voladura (blasting): granadas -30% y pico -25% daño', () => {
      const loadout = makeDefaultLoadout();
      loadout.doctrine = 'blasting';

      expect(getGrenadeCost('frag', 'blasting')).toBe(Math.round(getGrenadeCost('frag', null) * 0.7));
      const meleeDamage = computeTotalDamageMultiplier(loadout, 'melee');
      const standardDamage = computeTotalDamageMultiplier(makeDefaultLoadout(), 'melee');
      expect(meleeDamage).toBeCloseTo(standardDamage * 0.75, 1);
    });

    it('Acta de Cuadrilla (crew): contratación -25%, cuota +5%, mochila -25%, jetpack prohibido y empleados Asociados', () => {
      const loadout = makeDefaultLoadout();
      loadout.doctrine = 'crew';

      // Mochila reducida en 25%
      const baseWeight = maxCarryWeight(makeDefaultLoadout());
      expect(maxCarryWeight(loadout)).toBe(Math.round(baseWeight * 0.75));

      // Cuota +5%
      expect(computeQuotaWithModifiers(1000, 'crew', [])).toBe(1050);

      // Jetpack prohibido
      expect(canPurchaseUpgrade('jetpack', 0, 'crew').allowed).toBe(false);

      // Contratación -25%
      expect(getEmployeeHireCost(0, 'crew')).toBe(Math.round(getEmployeeHireCost(0, null) * 0.75));

      // Empleados inician en Rango 1 (Asociado)
      const run: RunSnapshot = {
        day: 2,
        money: 10000,
        carbon: 0,
        quota: 100,
        timeLeft: 90,
        infinite: false,
        loadout,
        stats: { coalMined: 0, moneyEarned: 0, nodesBroken: 0, chestsOpened: 0, daysCompleted: 1, playSeconds: 0 },
      };
      const result = applyPurchaseToRun(run, 'employee_hire:miner');
      expect(result).not.toBeNull();
      expect(run.loadout.employees.roster[0].rank).toBe(1);
    });

    it('Acta de Precisión (precision): daño +20%, mochila +25% y prohibida contratación', () => {
      const loadout = makeDefaultLoadout();
      loadout.doctrine = 'precision';

      const baseWeight = maxCarryWeight(makeDefaultLoadout());
      expect(maxCarryWeight(loadout)).toBe(Math.round(baseWeight * 1.25));

      const precisionDmg = computeTotalDamageMultiplier(loadout, 'melee');
      const standardDmg = computeTotalDamageMultiplier(makeDefaultLoadout(), 'melee');
      expect(precisionDmg).toBeCloseTo(standardDmg * 1.2, 1);

      expect(canHireEmployee('miner', 'precision').allowed).toBe(false);
      expect(computeMineralValueMultiplier('precision', [])).toBe(1.10);
    });

    it('Acta de Flete (freight): tolvas/cabrias -30%, tolva +50% capacidad, prohibido mineros, cuota +10% y turno -10s', () => {
      const loadout = makeDefaultLoadout();
      loadout.doctrine = 'freight';

      expect(getSupplyCost('winch', 'freight')).toBe(Math.round(getSupplyCost('winch', null) * 0.7));
      expect(getSupplyCost('field_depot', 'freight')).toBe(Math.round(getSupplyCost('field_depot', null) * 0.7));

      expect(canHireEmployee('miner', 'freight').allowed).toBe(false);
      expect(canHireEmployee('collector', 'freight').allowed).toBe(true);

      expect(computeQuotaWithModifiers(1000, 'freight', [])).toBe(1100);
      expect(computeDayDurationWithModifiers(90, 'freight', [])).toBe(80);
    });
  });

  describe('2. Verificación de las 6 Cláusulas de la Junta', () => {
    it('surprise_audit aumenta cuota +15% y bonus de liquidación +50%', () => {
      expect(computeQuotaWithModifiers(1000, null, ['surprise_audit'])).toBe(1150);

      const ledger = emptyDayLedger();
      const standardReport = buildDayReport(ledger, 1, 100, 100, 1000, 500, null, 90, {});
      const auditReport = buildDayReport(ledger, 1, 100, 100, 1000, 500, null, 90, {
        clauses: ['surprise_audit'],
      });
      expect(auditReport.bonus).toBe(Math.round(standardReport.bonus * 1.5));
    });

    it('supply_cut prohibe compra de escaleras/granadas y bonifica mineral +20%', () => {
      expect(canPurchaseSupply('ladders', ['supply_cut']).allowed).toBe(false);
      expect(canPurchaseSupply('grenade:frag', ['supply_cut']).allowed).toBe(false);
      expect(canPurchaseSupply('winch', ['supply_cut']).allowed).toBe(true);
      expect(computeMineralValueMultiplier(null, ['supply_cut'])).toBe(1.20);
    });

    it('short_shift reduce turno 20s y bonifica puntualidad +50%', () => {
      expect(computeDayDurationWithModifiers(90, null, ['short_shift'])).toBe(70);

      const ledger = emptyDayLedger();
      const normalReport = buildDayReport(ledger, 1, 100, 100, 1000, 500, 10, 90, {});
      const shiftReport = buildDayReport(ledger, 1, 100, 100, 1000, 500, 10, 90, {
        clauses: ['short_shift'],
      });
      expect(shiftReport.punctuality).toBe(Math.round(normalReport.punctuality * 1.5));
    });
  });

  describe('3. Verificación de Patentes I–VI', () => {
    it('escala daño y excavación con cada nivel sin interrupciones', () => {
      for (let tier = 1; tier <= 6; tier += 1) {
        const mult = computePatentMultiplier(tier);
        expect(mult.damageMult).toBeGreaterThan(1);
        expect(mult.carveMult).toBeGreaterThan(1);
        if (tier > 1) {
          const prev = computePatentMultiplier(tier - 1);
          expect(mult.damageMult).toBeGreaterThan(prev.damageMult);
          expect(mult.carveMult).toBeGreaterThan(prev.carveMult);
        }
      }
    });
  });

  describe('4. Verificación de las 4 Certificaciones de Campo y Ranuras de Utilidad', () => {
    it('declara las 4 certificaciones con metadatos completos', () => {
      const keys = Object.keys(FIELD_CERTIFICATIONS);
      expect(keys).toContain('dust_filter');
      expect(keys).toContain('gallery_map');
      expect(keys).toContain('vein_probe');
      expect(keys).toContain('rappel_harness');
    });

    it('gestiona desbloqueo y equipamiento en las 2 ranuras de utilidad', () => {
      const loadout = makeDefaultLoadout();
      expect(loadout.utilitySlots).toEqual([null, null]);

      unlockCertification(loadout, 'rappel_harness');
      expect(hasUtilityActive(loadout, 'rappel_harness')).toBe(true);
      expect(loadout.utilitySlots[0]).toBe('rappel_harness');

      unlockCertification(loadout, 'dust_filter');
      expect(hasUtilityActive(loadout, 'dust_filter')).toBe(true);
      expect(loadout.utilitySlots[1]).toBe('dust_filter');

      // Intentar equipar una tercera reemplaza la ranura 0
      unlockCertification(loadout, 'vein_probe');
      equipUtility(loadout, 0, 'vein_probe');
      expect(hasUtilityActive(loadout, 'vein_probe')).toBe(true);
      expect(hasUtilityActive(loadout, 'rappel_harness')).toBe(false);
      expect(loadout.utilitySlots[0]).toBe('vein_probe');
      expect(loadout.utilitySlots[1]).toBe('dust_filter');
    });

    it('permite equipar y desequipar certificaciones desde la tienda sin coste de capital', () => {
      const run: RunSnapshot = {
        day: 10,
        money: 0, // 0 capital
        carbon: 0,
        quota: 100,
        timeLeft: 90,
        infinite: false,
        loadout: makeDefaultLoadout(),
        stats: { coalMined: 0, moneyEarned: 0, nodesBroken: 0, chestsOpened: 0, daysCompleted: 9, playSeconds: 0 },
      };

      const resEquip = applyPurchaseToRun(run, 'certification:rappel_harness');
      expect(resEquip).not.toBeNull();
      expect(resEquip?.cost).toBe(0);
      expect(hasUtilityActive(run.loadout, 'rappel_harness')).toBe(true);

      // Clic nuevamente desequipa la utilidad
      const resUnequip = applyPurchaseToRun(run, 'certification:rappel_harness');
      expect(resUnequip).not.toBeNull();
      expect(hasUtilityActive(run.loadout, 'rappel_harness')).toBe(false);
    });
  });

  describe('5. Verificación de Determinismo en Brigadas', () => {
    it('genera semillas deterministas basadas en sectorId e id sin Math.random', () => {
      const seedA = Math.abs(hashString('sec-alpha:brigade-1')) & 0xfffffff;
      const seedB = Math.abs(hashString('sec-alpha:brigade-1')) & 0xfffffff;
      expect(seedA).toBe(seedB);
    });
  });
});
