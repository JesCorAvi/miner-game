import { beforeEach, describe, expect, it } from 'vitest';
import { MissionSystem } from '../src/world/Missions';
import { Terrain } from '../src/world/Terrain';
import { Resources } from '../src/world/Resources';
import { makeDefaultLoadout } from '../src/config';
import type { Game } from '../src/core/Game';

describe('Encargos de galería y certificaciones', () => {
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

  function makeWorld(day = 4) {
    const terrain = new Terrain();
    terrain.generate(0x51a7e, 'standard');
    const missions = new MissionSystem();
    missions.generate(0x51a7e, day, 'standard', terrain);
    const resources = new Resources();
    resources.generate(0x51a7e, day, terrain, [], 'standard', missions.getExclusions());
    missions.bindSampleNodes(resources);
    return { terrain, missions, resources };
  }

  function fakeGame(missions: MissionSystem): Game {
    return {
      player: {
        getPosition: () => ({ x: 0, y: 0, z: 0 }),
        setLoadout: () => {},
      },
      run: { loadout: makeDefaultLoadout() },
      online: false,
      role: 'solo',
      network: null,
      ui: { notify: () => {} },
      audio: { playVictory: () => {}, playChest: () => {} },
      isAuthority: () => true,
      missions,
    } as unknown as Game;
  }

  it('genera tres módulos con recompensas únicas y vetas fuera de su volumen', () => {
    const { missions, resources } = makeWorld(4);
    expect(missions.modules).toHaveLength(3);
    const rewards = missions.modules.map((module) => module.reward);
    expect(new Set(rewards).size).toBe(3);
    for (const module of missions.modules) {
      for (const node of resources.nodes) {
        const distance = Math.hypot(node.x - module.x, node.y - module.y, node.z - module.z);
        expect(distance).toBeGreaterThanOrEqual(4.8);
      }
    }
  });

  it('completa un encargo de sellado y desbloquea su certificación', () => {
    const { missions } = makeWorld(4);
    const game = fakeGame(missions);
    const module = missions.modules.find((entry) => entry.type === 'seal');
    expect(module).toBeDefined();
    for (const objective of module!.objectives) {
      const ok = missions.interactRemote(game, module!.id, objective.id, objective);
      expect(ok).toBe(true);
    }
    expect(module!.status).toBe('complete');
    expect(game.run.loadout.certifications).toContain('dust_filter');
  });

  it('el testigo de sondeo se completa al romper el nodo marcado', () => {
    const { missions } = makeWorld(4);
    const game = fakeGame(missions);
    const module = missions.modules.find((entry) => entry.type === 'sample');
    if (!module) return;
    for (const objective of module.objectives) {
      if (!objective.nodeId) return;
      missions.onNodeBroken(objective.nodeId, game);
    }
    expect(module.status).toBe('complete');
    expect(game.run.loadout.certifications).toContain('vein_probe');
  });

  it('el rastreador muestra el encargo pendiente', () => {
    const { missions } = makeWorld(4);
    const tracker = missions.getTracker();
    expect(tracker.text).toContain('ENCARGO');
    expect(tracker.detail).toContain('OBJETIVOS');
  });
});
