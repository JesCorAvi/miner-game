import { beforeEach, describe, expect, it } from 'vitest';
import { Terrain } from '../src/world/Terrain';
import { Resources } from '../src/world/Resources';
import {
  PASSIVES,
  PASSIVE_ORDER,
  chestPassivePoints,
  createDefaultPassives,
  passiveCapPoints,
  passiveMultiplier,
  passiveOverflowPoints,
} from '../src/data/passives';
import {
  DIFFICULTY_MODIFIERS,
  GAME_MODES,
  baseQuotaForDay,
  quotaForDay,
} from '../src/data/modes';
import { makeDefaultLoadout, damageMultiplier, weaponDamageScale } from '../src/config';

describe('Sistemas de referencia — pasivas, cofres, modos y modificadores', () => {
  beforeEach(() => {
    const mockCanvas = {
      width: 64,
      height: 64,
      getContext: () => ({
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        fillStyle: '',
      }),
    };
    (globalThis as any).document = {
      createElement: () => mockCanvas,
    };
  });

  it('define las 31 pasivas y conserva las claves heredadas del motor 3D', () => {
    expect(PASSIVE_ORDER).toHaveLength(31);
    expect(new Set(PASSIVE_ORDER).size).toBe(31);
    const defaults = createDefaultPassives();
    for (const id of PASSIVE_ORDER) {
      expect(PASSIVES[id]).toBeDefined();
      expect(defaults[id]).toBe(0);
    }
    for (const legacy of ['digRadius', 'nodeDamage', 'magnet', 'employeeSpeed', 'jetpackFuel']) {
      expect(defaults[legacy]).toBe(0);
    }
  });

  it('la curva de cofre es L en 1–4 y L² en 5–12, hasta ×144', () => {
    expect([1, 2, 3, 4].map(chestPassivePoints)).toEqual([1, 2, 3, 4]);
    expect(chestPassivePoints(5)).toBe(25);
    expect(chestPassivePoints(10)).toBe(100);
    expect(chestPassivePoints(12)).toBe(144);
  });

  it('aplica topes y excedente a las pasivas', () => {
    expect(passiveMultiplier('pickaxeDamage', 144)).toBeCloseTo(8.2, 3);
    const cap = passiveCapPoints('pickaxeSpeed');
    expect(cap).toBe(480);
    expect(passiveMultiplier('pickaxeSpeed', cap)).toBeCloseTo(25, 3);
    expect(passiveOverflowPoints('pickaxeSpeed', cap + 20)).toBe(20);
    expect(passiveCapPoints('minerSpeed')).toBe(180);
    expect(passiveCapPoints('collectorSpeed')).toBe(350);
  });

  it('el daño del pico integra patentes, pasivas y tier de pico', () => {
    const base = makeDefaultLoadout();
    const upgraded = makeDefaultLoadout();
    upgraded.patent = 2;
    upgraded.passives.pickaxeDamage = 4;
    upgraded.pickaxeTier = 3;
    const baseDamage = damageMultiplier(base) * weaponDamageScale(base);
    const upgradedDamage = damageMultiplier(upgraded) * weaponDamageScale(upgraded);
    expect(upgradedDamage).toBeGreaterThan(baseDamage * 5);
  });

  it('quota aplica Normal, Tough Start, Peaceful y cooperativo', () => {
    expect(GAME_MODES).toHaveLength(3);
    expect(DIFFICULTY_MODIFIERS).toHaveLength(6);
    expect(quotaForDay(10, 1, 'normal')).toBe(5_000);
    expect(quotaForDay(10, 1, 'tough')).toBe(2_500);
    expect(quotaForDay(10, 1, 'peaceful')).toBe(0);
    expect(quotaForDay(10, 2, 'normal')).toBe(8_000);
    expect(baseQuotaForDay(25)).toBeGreaterThan(50_000_000_000);
  });

  it('los modificadores controlan la generación de vetas y cofres', () => {
    const terrain = new Terrain();
    terrain.generate(0x51a7e);
    const normal = new Resources();
    normal.generate(0x51a7e, 3, terrain, []);
    expect(normal.nodes.some((node) => node.type === 'chest')).toBe(true);

    const onlyCoal = new Resources();
    onlyCoal.generate(0x51a7e, 3, terrain, ['only_coal']);
    expect(onlyCoal.nodes.some((node) => node.type === 'chest')).toBe(true);
    for (const node of onlyCoal.nodes) {
      if (node.mineral) expect(node.mineral.family).toBe('coal');
    }

    const noChests = new Resources();
    noChests.generate(0x51a7e, 3, terrain, ['no_chests']);
    expect(noChests.nodes.some((node) => node.type === 'chest')).toBe(false);

    const onlyClay = new Resources();
    onlyClay.generate(0x51a7e, 3, terrain, ['only_clay']);
    for (const node of onlyClay.nodes) {
      if (node.mineral) expect(node.mineral.layer).toBe(1);
    }
  });
});
