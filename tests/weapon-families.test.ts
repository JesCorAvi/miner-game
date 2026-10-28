import { describe, expect, it } from 'vitest';
import {
  WEAPON_FAMILIES,
  WEAPON_ORDER,
  WEAPONS,
  familyTierBuy,
  familyTierDamage,
  familyTierSell,
  makeDefaultLoadout,
  weaponDamageScale,
  weaponPassiveMultiplier,
  weaponProfessionMultiplier,
  weaponTier,
} from '../src/config';
import { applyPurchaseToRun, buildShopItems } from '../src/core/Shop';
import { defaultRun } from '../src/core/RunState';
import {
  PROFESSION_ORDER,
  professionCapacityMultiplier,
  professionDamageMultiplier,
  professionDefinition,
} from '../src/data/professions';

describe('Familias de armas y profesiones', () => {
  it('define 22 familias con tiers y estilos válidos', () => {
    expect(WEAPON_ORDER).toHaveLength(22);
    expect(Object.keys(WEAPON_FAMILIES)).toHaveLength(22);
    for (const id of WEAPON_ORDER) {
      const family = WEAPON_FAMILIES[id];
      expect(family).toBeDefined();
      expect(family.name.length).toBeGreaterThan(0);
      expect(['melee', 'chain', 'continuous', 'shotgun']).toContain(family.style);
      expect(family.tierCount).toBeGreaterThanOrEqual(1);
      expect(WEAPONS[id].id).toBe(id);
    }
  });

  it('el pico conserva la tabla exacta de 15 tiers', () => {
    expect(familyTierDamage('pickaxe', 1)).toBe(30);
    expect(familyTierDamage('pickaxe', 15)).toBe(5e24);
    expect(familyTierBuy('pickaxe', 2)).toBe(230);
    expect(familyTierSell('pickaxe', 2)).toBe(115);
    expect(familyTierBuy('tesla', 2)).toBe(1150);
  });

  it('el daño escala por familia y por tier comprado', () => {
    const loadout = makeDefaultLoadout();
    expect(weaponTier(loadout, 'pickaxe')).toBe(1);
    expect(weaponTier(loadout, 'pistol')).toBe(0);
    expect(weaponDamageScale(loadout, 'pickaxe')).toBe(1);
    loadout.weaponTiers = { ...(loadout.weaponTiers ?? {}), pistol: 3 };
    expect(weaponTier(loadout, 'pistol')).toBe(3);
    expect(weaponDamageScale(loadout, 'pistol')).toBeGreaterThan(1);
  });

  it('la tienda vende tiers de las 22 familias', () => {
    const run = defaultRun();
    run.money = 1_000_000;
    const items = buildShopItems(run);
    const ids = items.map((item) => item.id);
    expect(ids).toContain('pickaxe:2');
    expect(ids).toContain('weapon:pistol');
    expect(ids).toContain('weapon:earthquake');

    const result = applyPurchaseToRun(run, 'weapon:pistol');
    expect(result).not.toBeNull();
    expect(run.loadout.weaponTiers?.pistol).toBe(1);
    expect(run.loadout.weapons.pistol).toBe(true);
  });

  it('las 13 profesiones tienen efectos distintos y restricciones', () => {
    expect(PROFESSION_ORDER).toHaveLength(13);
    expect(professionDefinition('internship').name).toContain('Becario');
    expect(professionCapacityMultiplier('mule')).toBe(1.5);
    expect(professionDefinition('loneRanger').hireForbidden).toEqual(['miner', 'collector']);
    expect(professionDefinition('mule').hireForbidden).toEqual(['collector']);
    expect(professionDamageMultiplier('gunslinger', 'shotgun', 'pistol')).toBeGreaterThan(1);
    expect(professionDamageMultiplier('shaman', 'melee', 'pickaxe')).toBeLessThan(1);
  });

  it('el multiplicador de profesión y pasiva se integra en el arma', () => {
    const loadout = makeDefaultLoadout();
    loadout.profession = 'gunslinger';
    expect(weaponProfessionMultiplier(loadout, 'pistol')).toBeGreaterThan(1);
    loadout.passives.bulletDamage = 4;
    expect(weaponPassiveMultiplier(loadout, 'pistol')).toBeGreaterThan(1);
  });
});
