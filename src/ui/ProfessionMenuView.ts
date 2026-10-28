import {
  WEAPONS,
  professionDefinition,
  professionStartingWeapon,
  professionWeaponPool,
} from '../config';

const ALL_FAMILIES = 20;

/**
 * Muestra bajo el selector de profesión el arsenal comprable de la clase.
 * La tienda oculta lo que no pertenece al pool; esta línea evita que el
 * jugador tenga que adivinarlo antes de empezar.
 */
export function bindProfessionMenu(
  select: HTMLSelectElement,
  info: HTMLElement,
): void {
  const update = (): void => {
    const definition = professionDefinition(select.value);
    const pool = professionWeaponPool(select.value);
    const weaponNames =
      pool.length >= ALL_FAMILIES
        ? `TODAS LAS FAMILIAS (${pool.length})`
        : pool.map((id) => WEAPONS[id]?.shortName ?? id).join(' · ');
    const starting = WEAPONS[professionStartingWeapon(select.value)]?.shortName ?? '—';
    info.textContent = `INICIAL: ${starting} · COMPRABLES: ${weaponNames}`;
    info.title = `${definition.name}: ${definition.description}`;
  };
  select.addEventListener('change', update);
  update();
}
