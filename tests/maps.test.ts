import { beforeEach, describe, expect, it } from 'vitest';
import { MAPS, MAP_ORDER, mapDefinition, mapMaxDepth } from '../src/data/maps';
import { Terrain } from '../src/world/Terrain';
import { Resources } from '../src/world/Resources';

describe('Topologías de pozo', () => {
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

  it('define las 7 topologías del GDD', () => {
    expect(MAP_ORDER).toHaveLength(7);
    expect(MAPS.map((map) => map.id)).toEqual([
      'standard',
      'funnel',
      'tightFunnel',
      'skyMine',
      'shallow',
      'sparse',
      'sparseSky',
    ]);
    expect(mapDefinition('shallow').maxDepth).toBe(120);
    expect(mapMaxDepth('shallow')).toBe(120);
    expect(mapMaxDepth('standard')).toBe(240);
  });

  it('el embudo abre un vacío central que el pozo estándar no tiene', () => {
    const standard = new Terrain();
    const funnel = new Terrain();
    standard.generate(0xabc123, 'standard');
    funnel.generate(0xabc123, 'funnel');
    expect(standard.getDensityAt(0, -20, 0)).toBeGreaterThan(0.5);
    expect(funnel.getDensityAt(0, -20, 0)).toBeLessThan(0.5);
    expect(funnel.getSolidCount()).toBeLessThan(standard.getSolidCount());
  });

  it('la mina dispersa tiene menos roca que el cubo estándar', () => {
    const standard = new Terrain();
    const sparse = new Terrain();
    standard.generate(0x51a7e, 'standard');
    sparse.generate(0x51a7e, 'sparse');
    expect(sparse.getSolidCount()).toBeLessThan(standard.getSolidCount());
  });

  it('el estrato superficial sella el fondo y no permite excavar por debajo de 120 m', () => {
    const shallow = new Terrain();
    shallow.generate(0x51a7e, 'shallow');
    expect(shallow.getDensityAt(0, -180, 0)).toBeGreaterThan(0.5);
    expect(shallow.carve({ x: 0, y: -180, z: 0, r: 2, s: 1 })).toBe(false);
  });

  it('los recursos de la mina superficial no aparecen por debajo de 120 m', () => {
    const terrain = new Terrain();
    terrain.generate(0x51a7e, 'shallow');
    const resources = new Resources();
    resources.generate(0x51a7e, 2, terrain, [], 'shallow');
    expect(resources.nodes.length).toBeGreaterThan(50);
    for (const node of resources.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(-120);
    }
  });
});
