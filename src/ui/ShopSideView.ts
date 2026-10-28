import {
  PASSIVES,
  PASSIVE_ORDER,
  magnetRadius,
  maxCarryWeight,
  maxJetpackFuel,
  passiveCapPoints,
  passiveMultiplier,
  passiveOverflowPoints,
  professionAllowsJetpack,
  professionDefinition,
  professionPassiveAffinity,
} from '../config';
import {
  CLAUSES,
  DOCTRINES,
  FIELD_CERTIFICATIONS,
  PATENTS,
  computeDayDurationWithModifiers,
  getPassiveOverflowLabel,
} from '../core/Progression';
import type { Loadout } from '../types';

export function renderShopPassives(container: HTMLElement, loadout: Loadout): void {
  container.replaceChildren();
  const affinity = new Set(professionPassiveAffinity(loadout.profession));
  for (const passive of PASSIVE_ORDER) {
    const level = loadout.passives[passive] ?? 0;
    const multiplier = passiveMultiplier(passive, level);
    const cap = passiveCapPoints(passive);
    const overflow = passiveOverflowPoints(passive, level);
    const row = document.createElement('div');
    row.className = 'passive-entry';
    row.style.setProperty('--passive-color', PASSIVES[passive].color);

    const name = document.createElement('strong');
    name.textContent = affinity.has(passive)
      ? `${PASSIVES[passive].name} · AFÍN`
      : PASSIVES[passive].name;

    const value = document.createElement('span');
    if (level <= 0) {
      value.textContent = '—';
    } else if (overflow > 0) {
      value.textContent = `PUNTOS ${level} · MÁX (${getPassiveOverflowLabel(passive)})`;
      value.title = `Tope de ${cap} puntos alcanzado. Excedente (+${overflow}) convertido.`;
      value.classList.add('overflow-active');
    } else {
      value.textContent = `PUNTOS ${level} (×${multiplier.toFixed(2)})`;
    }

    row.append(name, value);
    container.appendChild(row);
  }
}

export function renderShopLoadoutSummary(container: HTMLElement, loadout: Loadout): void {
  container.replaceChildren();
  const summaryLines = [
    `PROFESIÓN: ${professionDefinition(loadout.profession).name}`,
    `DAÑO VETAS: +${Math.round(loadout.upgrades.damage * 12)}%`,
    `CADENCIA: +${Math.round(loadout.upgrades.speed * 6)}%`,
    `IMÁN: ${magnetRadius(loadout).toFixed(1)} m`,
    `JETPACK: ${
      loadout.doctrine === 'crew'
        ? 'PROHIBIDO POR ACTA'
        : !professionAllowsJetpack(loadout.profession)
          ? 'PROHIBIDO POR PROFESIÓN'
          : loadout.upgrades.jetpack > 0
            ? `${Math.round(maxJetpackFuel(loadout))} u.`
            : 'BLOQUEADO'
    }`,
    `CAPACIDAD: ${maxCarryWeight(loadout)} kg${loadout.doctrine === 'freight' ? ' (+40% FLETE)' : ''}`,
    `ESCALERAS: ${loadout.ladders}`,
    `TURNO BASE: ${computeDayDurationWithModifiers(
      90 + loadout.upgrades.dayTime * 15,
      loadout.doctrine,
      loadout.clauses,
    )} s`,
    `EMPLEADOS: ${loadout.employees.roster.length} en plantilla${
      loadout.doctrine === 'precision' ? ' (BLOQUEADOS)' : ''
    }`,
    `PATENTE: ${PATENTS[loadout.patent ?? 0]?.shortName ?? 'ESTÁNDAR (NV 0)'}`,
    `ACTA: ${loadout.doctrine ? DOCTRINES[loadout.doctrine]?.name : 'SIN RATIFICAR'}`,
    `CLÁUSULAS: ${
      loadout.clauses && loadout.clauses.length > 0
        ? loadout.clauses.map((c) => CLAUSES[c]?.shortName).join(', ')
        : 'NINGUNA'
    }`,
    `RANURAS DE UTILIDAD: ${
      loadout.utilitySlots && (loadout.utilitySlots[0] || loadout.utilitySlots[1])
        ? [
            loadout.utilitySlots[0] ? FIELD_CERTIFICATIONS[loadout.utilitySlots[0]]?.shortName : 'VACÍA',
            loadout.utilitySlots[1] ? FIELD_CERTIFICATIONS[loadout.utilitySlots[1]]?.shortName : 'VACÍA',
          ].join(' | ')
        : '2 DISPONIBLES'
    }`,
    `FONDO RESERVA: ${loadout.reserveCarbon ?? 0} t`,
  ];

  for (const line of summaryLines) {
    const span = document.createElement('span');
    span.textContent = line;
    container.appendChild(span);
  }
}
