import { describe, expect, it } from 'vitest';
import {
  PASSIVE_ORDER,
  WEAPON_FAMILIES,
  WEAPON_ORDER,
  WEAPONS,
  cooldownMultiplier,
  familyTierBuy,
  familyTierDamage,
  familyTierSell,
  makeDefaultLoadout,
  maxJetpackFuel,
  weaponDamageScale,
  weaponPassiveMultiplier,
  weaponProfessionMultiplier,
  weaponTier,
} from '../src/config';
import { applyPurchaseToRun, buildShopItems, weaponUpgradeCost } from '../src/core/Shop';
import { defaultRun } from '../src/core/RunState';
import {
  PROFESSION_ORDER,
  applyProfessionStartingKit,
  professionAllowsJetpack,
  professionCanUseWeapon,
  professionCapacityMultiplier,
  professionDamageMultiplier,
  professionDefinition,
  professionJumpMultiplier,
  professionMoveSpeedMultiplier,
  professionPassiveAffinity,
  professionStartingWeapon,
  professionWeaponDiscount,
} from '../src/data/professions';
import { resolveChestReward } from '../src/world/ChestRewards';

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
    run.loadout.profession = 'generalist';
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

  it('cada profesión limita su catálogo de armas', () => {
    expect(professionCanUseWeapon('shaman', 'poisonGun')).toBe(true);
    expect(professionCanUseWeapon('shaman', 'pistol')).toBe(false);
    expect(professionCanUseWeapon('gunslinger', 'rifle')).toBe(true);
    expect(professionCanUseWeapon('gunslinger', 'magicStaff')).toBe(false);
    expect(professionCanUseWeapon('generalist', 'earthquake')).toBe(true);
    const run = defaultRun();
    run.loadout.profession = 'shaman';
    run.money = 1_000_000;
    const pistol = buildShopItems(run).find((item) => item.id === 'weapon:pistol');
    expect(pistol?.level).toContain('BLOQUEADA');
    expect(applyPurchaseToRun(run, 'weapon:pistol')).toBeNull();
    expect(applyPurchaseToRun(run, 'weapon:poisonGun')).not.toBeNull();
  });

  it('las 15 profesiones tienen efectos distintos y restricciones', () => {
    expect(PROFESSION_ORDER).toHaveLength(15);
    expect(professionDefinition('internship').name).toContain('Becario');
    expect(professionCapacityMultiplier('mule')).toBe(1.5);
    expect(professionDefinition('loneRanger').hireForbidden).toEqual(['miner', 'collector']);
    expect(professionDefinition('mule').hireForbidden).toEqual(['collector']);
    expect(professionDefinition('shotgunner').hireForbidden).toEqual(['miner', 'collector']);
    expect(professionDamageMultiplier('gunslinger', 'shotgun', 'pistol')).toBeGreaterThan(1);
    expect(professionDamageMultiplier('shaman', 'melee', 'pickaxe')).toBeLessThan(1);
  });

  it('Escopetero y Artista Marcial tienen identidad cerrada', () => {
    expect(professionCanUseWeapon('shotgunner', 'shotgun')).toBe(true);
    expect(professionCanUseWeapon('shotgunner', 'pistol')).toBe(false);
    expect(professionCanUseWeapon('shotgunner', 'minigun')).toBe(false);
    expect(professionCanUseWeapon('martialArtist', 'boxingGlove')).toBe(true);
    expect(professionCanUseWeapon('martialArtist', 'roundhouseKick')).toBe(true);
    expect(professionCanUseWeapon('martialArtist', 'axe')).toBe(false);
    expect(professionAllowsJetpack('shotgunner')).toBe(false);
    expect(professionAllowsJetpack('gunslinger')).toBe(true);
    expect(professionMoveSpeedMultiplier('martialArtist')).toBeGreaterThan(1);
    expect(professionJumpMultiplier('martialArtist')).toBeGreaterThan(1);
  });

  it('cada clase entrega solo su arma inicial y el jetpack de serie', () => {
    for (const profession of PROFESSION_ORDER) {
      const loadout = makeDefaultLoadout();
      loadout.profession = profession;
      applyProfessionStartingKit(loadout);
      const owned = WEAPON_ORDER.filter((weapon) => loadout.weapons[weapon]);
      expect(owned).toEqual([professionStartingWeapon(profession)]);
      expect(professionCanUseWeapon(profession, professionStartingWeapon(profession))).toBe(true);
    }
    const shotgunner = makeDefaultLoadout();
    shotgunner.profession = 'shotgunner';
    applyProfessionStartingKit(shotgunner);
    expect(shotgunner.weapons.shotgun).toBe(true);
    expect(shotgunner.weaponTiers?.shotgun).toBe(1);
    expect(shotgunner.weapons.pickaxe).toBe(false);
    expect(shotgunner.weaponTiers?.pickaxe).toBe(0);
    expect(shotgunner.pickaxeTier).toBe(0);

    const internship = makeDefaultLoadout();
    internship.profession = 'internship';
    applyProfessionStartingKit(internship);
    expect(internship.weapons.pickaxe).toBe(true);
    expect(internship.weapons.shotgun).toBe(false);

    const maverick = makeDefaultLoadout();
    maverick.profession = 'maverick';
    applyProfessionStartingKit(maverick);
    expect(maverick.weapons.jet).toBe(true);
    expect(maverick.upgrades.jetpack).toBe(1);
    expect(maxJetpackFuel(maverick)).toBeGreaterThan(0);

    const shotgunnerFuel = makeDefaultLoadout();
    shotgunnerFuel.profession = 'shotgunner';
    shotgunnerFuel.upgrades.jetpack = 6;
    expect(maxJetpackFuel(shotgunnerFuel)).toBe(0);
  });

  it('la tienda aplica descuentos y bloqueos de clase', () => {
    const shotgunner = defaultRun();
    shotgunner.loadout.profession = 'shotgunner';
    applyProfessionStartingKit(shotgunner.loadout);
    shotgunner.money = 1_000_000;
    const shotgunnerItems = buildShopItems(shotgunner);
    expect(shotgunnerItems.find((item) => item.id === 'upgrade:jetpack')?.level).toContain(
      'BLOQUEADA',
    );
    expect(shotgunnerItems.find((item) => item.id === 'employee_hire:miner')?.level).toContain(
      'BLOQUEADA',
    );
    expect(applyPurchaseToRun(shotgunner, 'upgrade:jetpack')).toBeNull();
    expect(applyPurchaseToRun(shotgunner, 'employee_hire:miner')).toBeNull();

    const generalist = defaultRun();
    generalist.loadout.profession = 'generalist';
    generalist.money = 1_000_000;
    expect(professionWeaponDiscount('shotgunner', 'shotgun')).toBeGreaterThan(0);
    expect(weaponUpgradeCost('shotgun', 0, 'shotgunner')).toBeLessThan(
      weaponUpgradeCost('shotgun', 0, 'generalist'),
    );
    expect(applyPurchaseToRun(shotgunner, 'weapon:shotgun')).not.toBeNull();
    expect(shotgunner.loadout.weaponTiers?.shotgun).toBe(2);

    const pickaxeCard = shotgunnerItems.find((item) => item.id === 'pickaxe:1');
    expect(pickaxeCard).toBeDefined();
    expect(applyPurchaseToRun(shotgunner, 'pickaxe:1')).not.toBeNull();
    expect(shotgunner.loadout.weapons.pickaxe).toBe(true);
    expect(shotgunner.loadout.pickaxeTier).toBe(1);

    const martial = defaultRun();
    martial.loadout.profession = 'martialArtist';
    martial.money = 1_000_000;
    const martialItems = buildShopItems(martial);
    expect(martialItems.find((item) => item.id === 'grenade:frag')?.level).toContain(
      'BLOQUEADA',
    );
    expect(applyPurchaseToRun(martial, 'grenade:frag')).toBeNull();
  });

  it('todas las afinidades de clase apuntan a pasivas existentes', () => {
    for (const profession of PROFESSION_ORDER) {
      for (const passive of professionPassiveAffinity(profession)) {
        expect(PASSIVE_ORDER).toContain(passive);
      }
    }
  });

  it('los cofres sesgan las pasivas hacia la afinidad de clase', () => {
    const affinity = new Set(professionPassiveAffinity('shotgunner'));
    let affinityHits = 0;
    for (let index = 0; index < 60; index += 1) {
      const reward = resolveChestReward(
        1234 + index,
        { id: `chest-${index}`, y: -200 },
        'shotgunner',
      );
      if (reward.kind === 'passive' && reward.passive && affinity.has(reward.passive)) {
        affinityHits += 1;
      }
    }
    expect(affinityHits).toBeGreaterThan(0);
    expect(
      resolveChestReward(99, { id: 'same-chest', y: -200 }, 'shotgunner'),
    ).toEqual(resolveChestReward(99, { id: 'same-chest', y: -200 }, 'shotgunner'));
  });

  it('el multiplicador de profesión y pasiva se integra en el arma', () => {
    const loadout = makeDefaultLoadout();
    loadout.profession = 'gunslinger';
    expect(weaponProfessionMultiplier(loadout, 'pistol')).toBeGreaterThan(1);
    loadout.passives.bulletDamage = 4;
    expect(weaponPassiveMultiplier(loadout, 'pistol')).toBeGreaterThan(1);
  });

  it('las pasivas de cadencia reducen el enfriamiento de su familia', () => {
    const loadout = makeDefaultLoadout();
    const baseTank = cooldownMultiplier(loadout, 'tank');
    const baseMortar = cooldownMultiplier(loadout, 'mortar');
    loadout.passives.tankRate = 4;
    loadout.passives.mortarRate = 2;
    expect(cooldownMultiplier(loadout, 'tank')).toBeLessThan(baseTank);
    expect(cooldownMultiplier(loadout, 'mortar')).toBeLessThan(baseMortar);
    expect(cooldownMultiplier(loadout, 'pistol')).toBe(
      cooldownMultiplier(makeDefaultLoadout(), 'pistol'),
    );
  });
});
