import type {
  CertificationDefinition,
  CertificationId,
  ClauseDefinition,
  ClauseId,
  DoctrineDefinition,
  DoctrineId,
  EmployeeKind,
  Loadout,
  PatentDefinition,
  ProfessionId,
  UpgradeId,
} from '../types';
import { professionCanHire } from '../data/professions';

export const PATENTS: Record<number, PatentDefinition> = {
  1: {
    tier: 1,
    name: 'Patente I: Temple por Inducción',
    shortName: 'PATENTE I',
    description: 'Tratamiento térmico superficial. Multiplica el daño ×2,4 y la potencia de excavación ×1,8.',
    cost: 800,
    requiredLayer: 1,
    damageMultiplier: 2.4,
    carveMultiplier: 1.8,
    emissive: 0x38bdf8,
    particleColor: 0x7dd3fc,
    soundPitch: 1.05,
  },
  2: {
    tier: 2,
    name: 'Patente II: Resonancia de Subsuelo',
    shortName: 'PATENTE II',
    description: 'Oscilador acústico integrado. Permite fracturar vetas semienterradas con mayor eficiencia.',
    cost: 3360,
    requiredLayer: 1,
    damageMultiplier: 5.76,
    carveMultiplier: 3.24,
    emissive: 0x4ade80,
    particleColor: 0x86efac,
    soundPitch: 1.1,
  },
  3: {
    tier: 3,
    name: 'Patente III: Corona de Tungsteno',
    shortName: 'PATENTE III',
    description: 'Blindaje de alta densidad para penetrar pizarra gris y estratos mineralizados.',
    cost: 14110,
    requiredLayer: 2,
    damageMultiplier: 13.82,
    carveMultiplier: 5.83,
    emissive: 0xfacc15,
    particleColor: 0xfde047,
    soundPitch: 1.15,
  },
  4: {
    tier: 4,
    name: 'Patente IV: Disipador Magmático',
    shortName: 'PATENTE IV',
    description: 'Circuito refrigerante que reduce el desgaste de broca en basalto magmático.',
    cost: 59270,
    requiredLayer: 3,
    damageMultiplier: 33.18,
    carveMultiplier: 10.5,
    emissive: 0xf97316,
    particleColor: 0xfb923c,
    soundPitch: 1.2,
  },
  5: {
    tier: 5,
    name: 'Patente V: Enlace Cuántico',
    shortName: 'PATENTE V',
    description: 'Inducción de fase para fracturar núcleos puros en el abismo cristalino.',
    cost: 248930,
    requiredLayer: 4,
    damageMultiplier: 79.63,
    carveMultiplier: 18.9,
    emissive: 0xc084fc,
    particleColor: 0xd8b4fe,
    soundPitch: 1.25,
  },
  6: {
    tier: 6,
    name: 'Patente VI: Singularidad de Estrato',
    shortName: 'PATENTE VI',
    description: 'Despliegue máximo de cargas conformadas. La cúspide de la ingeniería minera corporativa.',
    cost: 1045500,
    requiredLayer: 6,
    damageMultiplier: 191.1,
    carveMultiplier: 34.01,
    emissive: 0xe0e7ff,
    particleColor: 0xffffff,
    soundPitch: 1.3,
  },
};

export const DOCTRINES: Record<DoctrineId, DoctrineDefinition> = {
  blasting: {
    id: 'blasting',
    name: 'Acta de Voladura',
    motto: 'La roca cede ante el fuego químico.',
    description: 'Apertura de cámaras y túneles con explosivos industriales.',
    perks: ['Granadas −30 % de coste', '+20 % de volumen de explosión', 'Cargas conformadas direccionales'],
    prohibitions: ['Pico −25 % de daño', 'Minerales −10 % de valor por rotura explosiva'],
  },
  crew: {
    id: 'crew',
    name: 'Acta de Cuadrilla',
    motto: 'Nadie desciende solo al pozo.',
    description: 'Coordinación intensiva de empleados y logística colectiva.',
    perks: ['Empleados inician en Rango 1 (Asociado)', 'Contratación −25 % de coste'],
    prohibitions: ['Sin jetpack corporativo', 'Capacidad de mochila −25 %', 'Cuota diaria +5 %'],
  },
  precision: {
    id: 'precision',
    name: 'Acta de Precisión',
    motto: 'Extracción limpia, pureza absoluta.',
    description: 'Prospección individual y extracción selectiva de alta pureza.',
    perks: ['Pico y taladro +20 % de daño', 'Capacidad de mochila +25 %', 'Minerales +10 % de valor'],
    prohibitions: ['Prohibida la contratación de personal (operación en solitario)'],
  },
  freight: {
    id: 'freight',
    name: 'Acta de Flete',
    motto: 'La red de transporte es la verdadera mina.',
    description: 'Eliminación del acarreo mediante tolvas de campaña y cabrias.',
    perks: ['Tolvas de campaña y cabrias −30 % de coste', 'Capacidad de tolva de campaña +50 %'],
    prohibitions: ['Sin mineros automatizados (solo recolectores)', 'Pico −15 % de daño', 'Cuota diaria +10 %', 'Turno −10 s'],
  },
};

export const CLAUSES: Record<ClauseId, ClauseDefinition> = {
  surprise_audit: {
    id: 'surprise_audit',
    name: 'Auditoría Sorpresa',
    shortName: 'AUDITORÍA',
    description: 'Cuota diaria +15 %; prima de rendimiento y liquidación +50 %.',
  },
  supply_cut: {
    id: 'supply_cut',
    name: 'Corte de Suministros',
    shortName: 'CORTE SUMINISTROS',
    description: 'Prohibida la venta de escaleras y granadas en tienda; mineral +20 % de valor.',
  },
  sealed_stratum: {
    id: 'sealed_stratum',
    name: 'Estrato Sellado',
    shortName: 'ESTRATO SELLADO',
    description: 'La capa intermedia no contiene carbón útil; la cuota del día se mantiene.',
  },
  suspended_dust: {
    id: 'suspended_dust',
    name: 'Polvo en Suspensión',
    shortName: 'POLVO',
    description: 'Visibilidad en galerías −30 %; las vetas minerales emiten +40 % de brillo.',
  },
  short_shift: {
    id: 'short_shift',
    name: 'Turno Corto',
    shortName: 'TURNO CORTO',
    description: 'Temporizador de turno −20 s; prima de puntualidad +50 % si se asegura temprano.',
  },
  mirror_mine: {
    id: 'mirror_mine',
    name: 'Mina Espejo',
    shortName: 'ESPEJO',
    description: 'Inversión de estratos: minerales preciosos en superficie y carbón denso en profundidad.',
  },
};

export const PASSIVE_CAP = 6.0;

export function getPassiveOverflowLabel(passiveId: string): string {
  switch (passiveId) {
    case 'nodeDamage':
      return 'EXCEDENTE → FRACTURA';
    case 'digRadius':
      return 'EXCEDENTE → FRACTURA DIRIGIDA';
    case 'magnet':
      return 'EXCEDENTE → AUTO-RECOGIDA';
    case 'employeeSpeed':
      return 'EXCEDENTE → RENDIMIENTO';
    case 'jetpackFuel':
      return 'EXCEDENTE → RECARGA SUELO';
    default:
      return 'EXCEDENTE → DAÑO';
  }
}

export function computePassiveMultiplier(level: number): {
  raw: number;
  effective: number;
  overflow: number;
} {
  const safeLevel = Math.max(0, Math.floor(level));
  const raw = 1 + 0.06 * safeLevel + 0.004 * safeLevel * safeLevel;
  const effective = Math.min(PASSIVE_CAP, raw);
  const overflow = Math.max(0, raw - PASSIVE_CAP);
  return {
    raw: Number(raw.toFixed(4)),
    effective: Number(effective.toFixed(4)),
    overflow: Number(overflow.toFixed(4)),
  };
}

export const RADIUS_CAPS: Record<string, number> = {
  pickaxe: 1.0,
  drill: 1.6,
  shotgun: 2.5,
  grenade: 4.0,
};

export function computeEffectiveRadius(
  tool: 'pickaxe' | 'drill' | 'shotgun' | 'grenade',
  baseRadius: number,
  bonusRatio: number,
): { effectiveRadius: number; excess: number; extraFracture: number } {
  const maxRadius = RADIUS_CAPS[tool] ?? 4.0;
  const safeBase = Math.max(0.01, baseRadius);
  const cubicScale = Math.cbrt(Math.max(0.01, 1 + bonusRatio));
  const candidateRadius = safeBase * cubicScale;
  const effectiveRadius = Number(Math.min(maxRadius, candidateRadius).toFixed(2));
  const excess = Math.max(0, cubicScale - maxRadius / safeBase);
  const extraFracture = Number((1 + 0.8 * Math.log2(1 + excess)).toFixed(3));
  return { effectiveRadius, excess, extraFracture };
}

export function computePatentMultiplier(tier: number): {
  damageMult: number;
  carveMult: number;
} {
  const safeTier = Math.max(0, Math.min(6, Math.floor(tier)));
  if (safeTier === 0) return { damageMult: 1, carveMult: 1 };
  const damageMult = Number(Math.pow(2.4, safeTier).toFixed(2));
  const carveMult = Number(Math.pow(1.8, safeTier).toFixed(2));
  return { damageMult, carveMult };
}

export interface OverflowBonuses {
  extraDamageRatio: number;
  extraNodeFractureRatio: number;
  autoPickupRadius: number;
  employeeYieldRatio: number;
  ballastSpeedBonus: number;
  groundRechargeBonus: number;
}

export function computeOverflowBonuses(loadout: Loadout): OverflowBonuses {
  // Cadencia (speed upgrade): si speed supera 8, 1 % de cadencia -> 0.5 % daño
  const speedOverflow = Math.max(0, loadout.upgrades.speed - 8);
  const extraDamageRatio = speedOverflow * 0.06 * 0.5;

  // Radio de excavación (digRadius passive con curva cuadrática)
  const digPassive = computePassiveMultiplier(loadout.passives.digRadius);
  const extraNodeFractureRatio = digPassive.overflow * 0.8;

  // Imán (magnet passive o upgrade): 1 m de imán excedente -> 0.25 m auto-recogida
  const magnetPassive = computePassiveMultiplier(loadout.passives.magnet);
  const autoPickupRadius = magnetPassive.overflow * 0.25;

  // Velocidad de empleados: 10 % velocidad -> 4 % rendimiento
  const empPassive = computePassiveMultiplier(loadout.passives.employeeSpeed);
  const employeeYieldRatio = empPassive.overflow * 0.4;

  // Capacidad de mochila: cada 20 kg sobre 100 kg -> +3 % velocidad con carga
  const capacityOverflow = Math.max(0, loadout.upgrades.capacity - 5);
  const ballastSpeedBonus = capacityOverflow * 0.03;

  // Combustible de jetpack: 20 combustible excedente -> +8 % recarga
  const jetpackPassive = computePassiveMultiplier(loadout.passives.jetpackFuel);
  const groundRechargeBonus = jetpackPassive.overflow * 0.08;

  return {
    extraDamageRatio: Number(extraDamageRatio.toFixed(3)),
    extraNodeFractureRatio: Number(extraNodeFractureRatio.toFixed(3)),
    autoPickupRadius: Number(autoPickupRadius.toFixed(2)),
    employeeYieldRatio: Number(employeeYieldRatio.toFixed(3)),
    ballastSpeedBonus: Number(ballastSpeedBonus.toFixed(3)),
    groundRechargeBonus: Number(groundRechargeBonus.toFixed(3)),
  };
}

export function computeTotalDamageMultiplier(
  loadout: Loadout,
  weaponStyle: 'melee' | 'chain' | 'continuous' | 'shotgun' | 'grenade' = 'melee',
): number {
  const baseDamage = 1 + loadout.upgrades.damage * 0.12;
  const nodePassive = computePassiveMultiplier(loadout.passives.nodeDamage);
  const overflow = computeOverflowBonuses(loadout);
  const patent = computePatentMultiplier(loadout.patent ?? 0);

  let total = baseDamage * nodePassive.effective * (1 + overflow.extraDamageRatio) * patent.damageMult;

  // Modificadores de doctrina
  const doc = loadout.doctrine;
  if (doc === 'blasting') {
    if (weaponStyle === 'melee') total *= 0.75;
  } else if (doc === 'precision') {
    if (weaponStyle === 'melee' || weaponStyle === 'continuous') total *= 1.2;
  } else if (doc === 'freight') {
    if (weaponStyle === 'melee') total *= 0.85;
  }

  return Number(total.toFixed(2));
}

export function computeTotalCarveMultiplier(loadout: Loadout): number {
  const patent = computePatentMultiplier(loadout.patent ?? 0);
  return patent.carveMult;
}

export function computeQuotaWithModifiers(
  baseQuota: number,
  doctrine: DoctrineId | null | undefined,
  clauses: ClauseId[] | undefined,
): number {
  let multiplier = 1.0;
  if (doctrine === 'crew') {
    multiplier += 0.05;
  } else if (doctrine === 'freight') {
    multiplier += 0.1;
  }
  if (clauses?.includes('surprise_audit')) {
    multiplier += 0.15;
  }
  return Math.round(baseQuota * multiplier);
}

export function computeDayDurationWithModifiers(
  baseDuration: number,
  doctrine: DoctrineId | null | undefined,
  clauses: ClauseId[] | undefined,
): number {
  let duration = baseDuration;
  if (doctrine === 'freight') {
    duration -= 10;
  }
  if (clauses?.includes('short_shift')) {
    duration -= 20;
  }
  return Math.max(30, duration);
}

export function computeReserveApplication(
  quota: number,
  reserveCarbon: number,
): { applied: number; effectiveQuota: number; remainingReserve: number } {
  const cleanReserve = Math.max(0, Math.floor(reserveCarbon));
  if (cleanReserve <= 0 || quota <= 0) {
    return { applied: 0, effectiveQuota: quota, remainingReserve: cleanReserve };
  }
  const maxCover = Math.floor(quota * 0.2);
  const applied = Math.min(cleanReserve, maxCover);
  const remainingReserve = cleanReserve - applied;
  const effectiveQuota = Math.max(1, quota - applied);
  return { applied, effectiveQuota, remainingReserve };
}

export function canPurchaseUpgrade(
  upgradeId: UpgradeId,
  _currentLevel: number,
  doctrine: DoctrineId | null | undefined,
): { allowed: boolean; reason?: string } {
  if (doctrine === 'crew' && upgradeId === 'jetpack') {
    return {
      allowed: false,
      reason: 'PROHIBIDO POR ACTA DE CUADRILLA · Sin jetpack corporativo.',
    };
  }
  return { allowed: true };
}

export function canHireEmployee(
  kind: EmployeeKind,
  doctrine: DoctrineId | null | undefined,
  profession?: ProfessionId | null,
): { allowed: boolean; reason?: string } {
  if (profession && !professionCanHire(profession, kind)) {
    return {
      allowed: false,
      reason: 'PROHIBIDO POR PROFESIÓN · Esta operación no contrata ese rol.',
    };
  }
  if (doctrine === 'precision') {
    return {
      allowed: false,
      reason: 'PROHIBIDO POR ACTA DE PRECISIÓN · Operación individual sin plantilla.',
    };
  }
  if (doctrine === 'freight' && kind === 'miner') {
    return {
      allowed: false,
      reason: 'PROHIBIDO POR ACTA DE FLETE · Prohibido contratar mineros.',
    };
  }
  return { allowed: true };
}

export function canPurchaseSupply(
  itemKey: string,
  clauses: ClauseId[] | undefined,
): { allowed: boolean; reason?: string } {
  if (clauses?.includes('supply_cut')) {
    if (itemKey === 'ladder' || itemKey === 'ladders' || itemKey.startsWith('grenade:')) {
      return {
        allowed: false,
        reason: 'CLÁUSULA DE CORTE DE SUMINISTROS · Prohibida la venta de escaleras y granadas.',
      };
    }
  }
  return { allowed: true };
}

export const FIELD_CERTIFICATIONS: Record<CertificationId, CertificationDefinition> = {
  dust_filter: {
    id: 'dust_filter',
    name: 'Filtro de Polvo',
    shortName: 'FILTRO POLVO',
    description: 'Purificador de atmósfera respirable. Anula la penalización de visibilidad en galerías por polvo o estrato.',
    perk: 'Inmunidad a visibilidad reducida por polvo',
    requiredDays: 3,
  },
  gallery_map: {
    id: 'gallery_map',
    name: 'Plano de Galerías',
    shortName: 'PLANO GALERÍAS',
    description: 'Cartografía geológica avanzada. Revela balizas, cabrias y depósitos en el mapa topográfico con marcadores directos.',
    perk: 'Detección cartográfica en plano [C]',
    requiredDays: 5,
  },
  vein_probe: {
    id: 'vein_probe',
    name: 'Sonda de Vetas',
    shortName: 'SONDA VETAS',
    description: 'Sensor espectrométrico de impulsos. Amplía el escaneo de vetas a 7,5 m y desglosa el estrato sin picarlo.',
    perk: '+50 % de alcance de escaneo e identificación de veta',
    requiredDays: 7,
  },
  rappel_harness: {
    id: 'rappel_harness',
    name: 'Arnés de Rappel',
    shortName: 'ARNÉS RAPPEL',
    description: 'Sistema de sujeción vertical y mosquetones reforzados. Elimina el riesgo de derrame de carga en caídas y la lentitud por lastre.',
    perk: '0 % derrame en caídas y 0 % lentitud por carga crítica',
    requiredDays: 9,
  },
};

export function hasUtilityActive(loadout: Loadout | null | undefined, id: CertificationId): boolean {
  if (!loadout?.utilitySlots) return false;
  return loadout.utilitySlots[0] === id || loadout.utilitySlots[1] === id;
}

export function equipUtility(
  loadout: Loadout,
  slot: 0 | 1,
  id: CertificationId | null,
): boolean {
  if (!loadout.utilitySlots) {
    loadout.utilitySlots = [null, null];
  }
  if (id !== null && (!loadout.certifications || !loadout.certifications.includes(id))) {
    return false;
  }
  const otherSlot = slot === 0 ? 1 : 0;
  if (id !== null && loadout.utilitySlots[otherSlot] === id) {
    loadout.utilitySlots[otherSlot] = null;
  }
  loadout.utilitySlots[slot] = id;
  return true;
}

export function unlockCertification(loadout: Loadout, id: CertificationId): boolean {
  if (!loadout.certifications) {
    loadout.certifications = [];
  }
  if (loadout.certifications.includes(id)) {
    return false;
  }
  loadout.certifications.push(id);
  if (!loadout.utilitySlots) {
    loadout.utilitySlots = [null, null];
  }
  if (loadout.utilitySlots[0] === null) {
    loadout.utilitySlots[0] = id;
  } else if (loadout.utilitySlots[1] === null) {
    loadout.utilitySlots[1] = id;
  }
  return true;
}

export function computeMineralValueMultiplier(
  doctrine: DoctrineId | null | undefined,
  clauses: ClauseId[] | undefined,
  fromExplosion = false,
): number {
  let multiplier = 1.0;
  if (doctrine === 'precision') {
    multiplier += 0.10;
  } else if (doctrine === 'blasting' && fromExplosion) {
    multiplier -= 0.10;
  }
  if (clauses?.includes('supply_cut')) {
    multiplier += 0.20;
  }
  return Number(multiplier.toFixed(2));
}
