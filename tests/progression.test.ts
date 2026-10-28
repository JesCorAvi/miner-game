import { describe, expect, it } from 'vitest';
import {
  CLAUSES,
  DOCTRINES,
  PASSIVE_CAP,
  PATENTS,
  RADIUS_CAPS,
  canHireEmployee,
  canPurchaseSupply,
  canPurchaseUpgrade,
  computeDayDurationWithModifiers,
  computeEffectiveRadius,
  computeOverflowBonuses,
  computePassiveMultiplier,
  computePatentMultiplier,
  computeQuotaWithModifiers,
  computeReserveApplication,
  computeTotalCarveMultiplier,
  computeTotalDamageMultiplier,
  getPassiveOverflowLabel,
} from '../src/core/Progression';
import { makeDefaultLoadout } from '../src/config';

describe('Motor Matemático y Progresión (Fase 3A)', () => {
  describe('Curva Cuadrática de Pasivas y Techo con Desbordamiento', () => {
    it('nivel 0 devuelve multiplicador base 1.0 sin desbordamiento', () => {
      const result = computePassiveMultiplier(0);
      expect(result.raw).toBe(1.0);
      expect(result.effective).toBe(1.0);
      expect(result.overflow).toBe(0.0);
    });

    it('niveles intermedios siguen la fórmula 1 + 0.06*L + 0.004*L²', () => {
      // L = 5: 1 + 0.06(5) + 0.004(25) = 1 + 0.3 + 0.1 = 1.40
      const lvl5 = computePassiveMultiplier(5);
      expect(lvl5.raw).toBeCloseTo(1.4, 3);
      expect(lvl5.effective).toBeCloseTo(1.4, 3);
      expect(lvl5.overflow).toBe(0);

      // L = 10: 1 + 0.06(10) + 0.004(100) = 1 + 0.6 + 0.4 = 2.00
      const lvl10 = computePassiveMultiplier(10);
      expect(lvl10.raw).toBeCloseTo(2.0, 3);
      expect(lvl10.effective).toBeCloseTo(2.0, 3);
      expect(lvl10.overflow).toBe(0);

      // L = 20: 1 + 0.06(20) + 0.004(400) = 1 + 1.2 + 1.6 = 3.80
      const lvl20 = computePassiveMultiplier(20);
      expect(lvl20.raw).toBeCloseTo(3.8, 3);
      expect(lvl20.effective).toBeCloseTo(3.8, 3);
      expect(lvl20.overflow).toBe(0);
    });

    it('alcanza el tope de 6.0 y el excedente se desborda limpiamente', () => {
      // Para bruto = 6.0: 0.004 L² + 0.06 L - 5 = 0 -> L ≈ 28.6
      // En L = 30: bruto = 1 + 0.06(30) + 0.004(900) = 1 + 1.8 + 3.6 = 6.40
      const lvl30 = computePassiveMultiplier(30);
      expect(lvl30.raw).toBeCloseTo(6.4, 3);
      expect(lvl30.effective).toBe(PASSIVE_CAP);
      expect(lvl30.overflow).toBeCloseTo(0.4, 3);
    });

    it('asigna etiquetas claras de conversión para cada pasiva desbordada', () => {
      expect(getPassiveOverflowLabel('nodeDamage')).toContain('FRACTURA');
      expect(getPassiveOverflowLabel('digRadius')).toContain('FRACTURA DIRIGIDA');
      expect(getPassiveOverflowLabel('magnet')).toContain('AUTO-RECOGIDA');
      expect(getPassiveOverflowLabel('employeeSpeed')).toContain('RENDIMIENTO');
      expect(getPassiveOverflowLabel('jetpackFuel')).toContain('RECARGA SUELO');
    });
  });

  describe('Radio Cúbico y Fractura Excedente', () => {
    it('respeta los topes duros por herramienta', () => {
      expect(RADIUS_CAPS.pickaxe).toBe(1.0);
      expect(RADIUS_CAPS.drill).toBe(1.6);
      expect(RADIUS_CAPS.shotgun).toBe(2.5);
      expect(RADIUS_CAPS.grenade).toBe(4.0);
    });

    it('escala con raíz cúbica y no supera el tope aunque el bonus sea inmenso', () => {
      // Taladro: radio base 0.8, cap 1.6
      const drill = computeEffectiveRadius('drill', 0.8, 20);
      expect(drill.effectiveRadius).toBe(1.6);
      expect(drill.excess).toBeGreaterThan(0);
      expect(drill.extraFracture).toBeGreaterThan(1.0);

      // Granada: radio base 2.6
      const grenade = computeEffectiveRadius('grenade', 2.6, 50);
      expect(grenade.effectiveRadius).toBe(4.0);
      expect(grenade.extraFracture).toBeGreaterThan(1.0);
    });

    it('la fractura extra sigue la ley logarítmica cuando hay exceso', () => {
      const normal = computeEffectiveRadius('drill', 0.8, 0.5);
      expect(normal.effectiveRadius).toBeCloseTo(0.8 * Math.cbrt(1.5), 2);
      expect(normal.excess).toBe(0);
      expect(normal.extraFracture).toBe(1.0);
    });
  });

  describe('Patentes Corporativas I a VI', () => {
    it('existen las 6 patentes con orden creciente de coste y capa', () => {
      for (let tier = 1; tier <= 6; tier++) {
        const patent = PATENTS[tier];
        expect(patent).toBeDefined();
        expect(patent.tier).toBe(tier);
        expect(patent.damageMultiplier).toBeGreaterThan(1);
        expect(patent.carveMultiplier).toBeGreaterThan(1);
        if (tier > 1) {
          expect(patent.cost).toBeGreaterThan(PATENTS[tier - 1].cost);
          expect(patent.requiredLayer).toBeGreaterThanOrEqual(PATENTS[tier - 1].requiredLayer);
        }
      }
    });

    it('calcula multiplicadores de daño y excavación basados en potencias de 2.4 y 1.8', () => {
      const p1 = computePatentMultiplier(1);
      expect(p1.damageMult).toBeCloseTo(2.4, 1);
      expect(p1.carveMult).toBeCloseTo(1.8, 1);

      const p2 = computePatentMultiplier(2);
      expect(p2.damageMult).toBeCloseTo(2.4 * 2.4, 1);
      expect(p2.carveMult).toBeCloseTo(1.8 * 1.8, 1);

      const p0 = computePatentMultiplier(0);
      expect(p0.damageMult).toBe(1);
      expect(p0.carveMult).toBe(1);
    });
  });

  describe('Conversiones de Desbordamiento (OVERFLOW)', () => {
    it('convierte mejoras y pasivas excedentes en beneficios secundarios', () => {
      const loadout = makeDefaultLoadout();
      // Cadencia por encima de 8
      loadout.upgrades.speed = 10;
      // Pasiva con desbordamiento
      loadout.passives.digRadius = 35;
      loadout.passives.magnet = 35;
      loadout.passives.employeeSpeed = 35;
      loadout.passives.jetpackFuel = 35;
      loadout.upgrades.capacity = 8;

      const bonuses = computeOverflowBonuses(loadout);
      expect(bonuses.extraDamageRatio).toBeGreaterThan(0);
      expect(bonuses.extraNodeFractureRatio).toBeGreaterThan(0);
      expect(bonuses.autoPickupRadius).toBeGreaterThan(0);
      expect(bonuses.employeeYieldRatio).toBeGreaterThan(0);
      expect(bonuses.ballastSpeedBonus).toBeGreaterThan(0);
      expect(bonuses.groundRechargeBonus).toBeGreaterThan(0);
    });
  });

  describe('Actas de Operación (Doctrinas) y Cláusulas de la Junta', () => {
    it('las 4 Actas están definidas con ventajas y prohibiciones asimétricas', () => {
      const doctrineIds = ['blasting', 'crew', 'precision', 'freight'] as const;
      for (const id of doctrineIds) {
        const doc = DOCTRINES[id];
        expect(doc).toBeDefined();
        expect(doc.perks.length).toBeGreaterThan(0);
        expect(doc.prohibitions.length).toBeGreaterThan(0);
      }
    });

    it('las 6 Cláusulas están definidas', () => {
      const clauseIds = [
        'surprise_audit',
        'supply_cut',
        'sealed_stratum',
        'suspended_dust',
        'short_shift',
        'mirror_mine',
      ] as const;
      for (const id of clauseIds) {
        expect(CLAUSES[id]).toBeDefined();
      }
    });

    it('Acta de Cuadrilla prohíbe el jetpack', () => {
      const check = canPurchaseUpgrade('jetpack', 0, 'crew');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('ACTA DE CUADRILLA');
    });

    it('Acta de Precisión prohíbe contratar empleados', () => {
      const check = canHireEmployee('miner', 'precision');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('ACTA DE PRECISIÓN');
    });

    it('Acta de Flete prohíbe contratar mineros', () => {
      const check = canHireEmployee('miner', 'freight');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('ACTA DE FLETE');
    });

    it('Cláusula de Corte de Suministros prohíbe compra de escaleras y granadas', () => {
      const ladderCheck = canPurchaseSupply('ladders', ['supply_cut']);
      expect(ladderCheck.allowed).toBe(false);
      const grenadeCheck = canPurchaseSupply('grenade:light', ['supply_cut']);
      expect(grenadeCheck.allowed).toBe(false);
      const winchCheck = canPurchaseSupply('winch', ['supply_cut']);
      expect(winchCheck.allowed).toBe(true);
    });

    it('calcula cuota y duración con modificadores de doctrina y cláusula', () => {
      // Cuota con cuadrilla (+5%) y auditoría sorpresa (+15%)
      const modifiedQuota = computeQuotaWithModifiers(100, 'crew', ['surprise_audit']);
      expect(modifiedQuota).toBe(120);

      // Duración con flete (-10 s) y turno corto (-20 s)
      const modifiedDuration = computeDayDurationWithModifiers(90, 'freight', ['short_shift']);
      expect(modifiedDuration).toBe(60);
    });
  });

  describe('Fondo de Reserva Corporativo', () => {
    it('amortiza hasta el 20 % de la cuota del día siguiente', () => {
      // Cuota 100 t, 20% máximo = 20 t
      // Reserva: 30 t
      const result = computeReserveApplication(100, 30);
      expect(result.applied).toBe(20);
      expect(result.effectiveQuota).toBe(80);
      expect(result.remainingReserve).toBe(10);
    });

    it('amortiza todo lo acumulado si es menor al 20 %', () => {
      // Cuota 100 t, 20% máximo = 20 t
      // Reserva: 8 t
      const result = computeReserveApplication(100, 8);
      expect(result.applied).toBe(8);
      expect(result.effectiveQuota).toBe(92);
      expect(result.remainingReserve).toBe(0);
    });
  });

  describe('Multiplicadores Globales Integrados', () => {
    it('aplica patentes a daño total y potencia de excavación', () => {
      const loadout = makeDefaultLoadout();
      const baseDmg = computeTotalDamageMultiplier(loadout);
      const baseCarve = computeTotalCarveMultiplier(loadout);

      loadout.patent = 1;
      const p1Dmg = computeTotalDamageMultiplier(loadout);
      const p1Carve = computeTotalCarveMultiplier(loadout);

      expect(p1Dmg).toBeCloseTo(baseDmg * 2.4, 1);
      expect(p1Carve).toBeCloseTo(baseCarve * 1.8, 1);
    });
  });
});
