import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MIN_WINCH_DROP, WINCH_SPEED } from '../src/config';
import { WinchSystem } from '../src/world/Winch';

describe('Sistema de Cabrias (Winch) y Tiro de Servicio', () => {
  it('constantes de cabria configuradas correctamente', () => {
    expect(MIN_WINCH_DROP).toBe(3.0);
    expect(WINCH_SPEED).toBe(8.0);
  });

  it('añade y lista cabrias correctamente', () => {
    const manager = new WinchSystem();
    const winchData = {
      id: 'winch-1',
      x: 5,
      topY: 2,
      bottomY: -20,
      z: 5,
    };

    manager.add(winchData);
    const list = manager.getSnapshot();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('winch-1');
    expect(list[0].topY - list[0].bottomY).toBe(22);

    manager.remove('winch-1');
    expect(manager.getSnapshot()).toHaveLength(0);
    manager.dispose();
  });

  it('detecta interacción cercana arriba (bajada) y abajo (subida)', () => {
    const manager = new WinchSystem();
    manager.add({
      id: 'w1',
      x: 10,
      topY: 2,
      bottomY: -30,
      z: 10,
    });

    // Cerca de la cima -> detecta 'down'
    const topNear = manager.findNearestInteractive(new THREE.Vector3(10.5, 2.1, 10.2));
    expect(topNear).not.toBeNull();
    expect(topNear?.direction).toBe('down');
    expect(topNear?.targetY).toBe(-30);

    // Lejos horizontalmente -> null
    const farHorizontal = manager.findNearestInteractive(new THREE.Vector3(15, 2, 10));
    expect(farHorizontal).toBeNull();

    // Cerca de la base -> detecta 'up'
    const bottomNear = manager.findNearestInteractive(new THREE.Vector3(10.2, -29.8, 10.1));
    expect(bottomNear).not.toBeNull();
    expect(bottomNear?.direction).toBe('up');
    expect(bottomNear?.targetY).toBe(2);

    manager.dispose();
  });

  it('desplaza al jugador a 8 m/s y finaliza al llegar al destino', () => {
    const manager = new WinchSystem();
    manager.add({
      id: 'w1',
      x: 0,
      topY: 0,
      bottomY: -24,
      z: 0,
    });

    manager.startRide('w1', -24, 'down');
    expect(manager.isRiding()).toBe(true);

    // 1 segundo de descenso a 8 m/s -> y = -8
    let currentY = 0;
    currentY = manager.updateRide(currentY, 1.0) ?? currentY;
    expect(currentY).toBe(-8);
    expect(manager.isRiding()).toBe(true);

    // 2 segundos más -> y = -24 (destino)
    currentY = manager.updateRide(currentY, 2.0) ?? currentY;
    expect(currentY).toBe(-24);
    expect(manager.isRiding()).toBe(false);

    // Subida: desde -24 hacia 0 a 8 m/s
    manager.startRide('w1', 0, 'up');
    currentY = -24;
    currentY = manager.updateRide(currentY, 1.5) ?? currentY;
    expect(currentY).toBe(-12);
    expect(manager.isRiding()).toBe(true);

    // Completar subida
    currentY = manager.updateRide(currentY, 2.0) ?? currentY;
    expect(currentY).toBe(0);
    expect(manager.isRiding()).toBe(false);

    manager.dispose();
  });

  it('prolonga automáticamente el cable hacia abajo al profundizar la excavación', () => {
    const manager = new WinchSystem();
    manager.add({
      id: 'w-auto',
      x: 0,
      topY: 2,
      bottomY: -4, // 6m iniciales
      z: 0,
    });

    // Mock de terreno donde el suelo se ha excavado hasta Y = -18
    const mockTerrain = {
      isSolid: (_x: number, y: number, _z: number) => y <= -18,
    } as any;

    const changed = manager.syncBottomWithTerrain('w-auto', mockTerrain);
    expect(changed).toBe(true);

    const updated = manager.get('w-auto');
    expect(updated).toBeDefined();
    // Nuevo fondo en -17.9 (por encima del suelo a -18)
    expect(updated?.bottomY).toBeCloseTo(-17.9, 1);

    manager.dispose();
  });

  it('sincroniza cabrias, tolvas y balizas en el inventario como objetos utilizables', async () => {
    const { Inventory } = await import('../src/core/Inventory');
    const { makeDefaultLoadout } = await import('../src/config');
    const inventory = new Inventory();
    const loadout = makeDefaultLoadout();
    loadout.winches = 2;
    loadout.fieldDepots = 1;
    loadout.beacons = 4;

    inventory.syncLoadout(loadout);

    const winchSlot = inventory.slots.find((s) => s?.kind === 'winch');
    expect(winchSlot).toBeDefined();
    expect(winchSlot?.kind === 'winch' && winchSlot.count).toBe(2);

    const depotSlot = inventory.slots.find((s) => s?.kind === 'field_depot');
    expect(depotSlot).toBeDefined();
    expect(depotSlot?.kind === 'field_depot' && depotSlot.count).toBe(1);

    const beaconSlot = inventory.slots.find((s) => s?.kind === 'beacon');
    expect(beaconSlot).toBeDefined();
    expect(beaconSlot?.kind === 'beacon' && beaconSlot.count).toBe(4);
  });
});
