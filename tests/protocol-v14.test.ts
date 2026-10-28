import { describe, expect, it } from 'vitest';
import { PEER_ID_PREFIX } from '../src/config';
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  parseHostMessage,
} from '../src/network/Protocol';

describe('Protocolo de Red v16 (P2P WebRTC)', () => {
  it('versión del protocolo y prefijo de PeerJS sincronizados a v16', () => {
    expect(PROTOCOL_VERSION).toBe(16);
    expect(PEER_ID_PREFIX).toContain('v16');
  });

  it('rechaza mensajes con versión de protocolo incompatible', () => {
    const rawOldClient = JSON.stringify({
      v: 11, // versión antigua
      t: 'winch_place',
      winch: { id: 'w1', x: 0, topY: 0, bottomY: -20, z: 0 },
    });
    expect(parseClientMessage(rawOldClient)).toBeNull();

    const rawOldHost = JSON.stringify({
      v: 11,
      t: 'winch_placed',
      winch: { id: 'w1', x: 0, topY: 0, bottomY: -20, z: 0 },
    });
    expect(parseHostMessage(rawOldHost)).toBeNull();
  });

  it('valida y procesa mensajes de cabria del cliente (winch_place)', () => {
    const validClientMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'winch_place',
      winch: {
        id: 'w-valid-1',
        x: 5.5,
        topY: 2.0,
        bottomY: -25.0,
        z: 10.2,
      },
    });
    const parsed = parseClientMessage(validClientMsg);
    expect(parsed).not.toBeNull();
    expect(parsed?.t).toBe('winch_place');
    if (parsed && parsed.t === 'winch_place') {
      expect(parsed.winch.x).toBe(5.5);
      expect(parsed.winch.topY).toBe(2.0);
      expect(parsed.winch.bottomY).toBe(-25.0);
    }

    // Desnivel invertido o id inválido debe ser rechazado
    const invalidDropMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'winch_place',
      winch: {
        id: 'w-invalid',
        x: 0,
        topY: -25.0,
        bottomY: 2.0, // topY <= bottomY es inválido
        z: 0,
      },
    });
    expect(parseClientMessage(invalidDropMsg)).toBeNull();
  });

  it('valida y procesa interacción con tolva de campaña (depot_interact)', () => {
    const depositMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'depot_interact',
      depotId: 'depot-123',
      action: 'deposit',
    });
    const parsedDeposit = parseClientMessage(depositMsg);
    expect(parsedDeposit).not.toBeNull();
    if (parsedDeposit && parsedDeposit.t === 'depot_interact') {
      expect(parsedDeposit.depotId).toBe('depot-123');
      expect(parsedDeposit.action).toBe('deposit');
    }

    const withdrawMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'depot_interact',
      depotId: 'depot-123',
      action: 'withdraw',
    });
    const parsedWithdraw = parseClientMessage(withdrawMsg);
    expect(parsedWithdraw).not.toBeNull();
    if (parsedWithdraw && parsedWithdraw.t === 'depot_interact') {
      expect(parsedWithdraw.action).toBe('withdraw');
    }

    // Acción desconocida rechazada
    const invalidAction = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'depot_interact',
      depotId: 'depot-123',
      action: 'steal',
    });
    expect(parseClientMessage(invalidAction)).toBeNull();
  });

  it('valida mensajes de balizas y sincronización del host', () => {
    const beaconPlaceMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'beacon_place',
      beacon: {
        id: 'beacon-1',
        x: -12.4,
        y: -30.0,
        z: 8.5,
        color: 0x3b82f6,
        label: 'Cueva Este',
      },
    });
    const parsedBeacon = parseClientMessage(beaconPlaceMsg);
    expect(parsedBeacon).not.toBeNull();
    if (parsedBeacon && parsedBeacon.t === 'beacon_place') {
      expect(parsedBeacon.beacon.color).toBe(0x3b82f6);
      expect(parsedBeacon.beacon.label).toBe('Cueva Este');
    }

    const hostSyncMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'beacon_sync',
      beacons: [
        { id: 'b1', x: 0, y: -10, z: 0, color: 0x22c55e },
      ],
    });
    const parsedHostSync = parseHostMessage(hostSyncMsg);
    expect(parsedHostSync).not.toBeNull();
    if (parsedHostSync && parsedHostSync.t === 'beacon_sync') {
      expect(parsedHostSync.beacons).toHaveLength(1);
      expect(parsedHostSync.beacons[0].id).toBe('b1');
    }
  });

  it('valida mensajes de cintas y brigadas en v14', () => {
    const beltPlaceMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'belt_place',
      module: { id: 'belt-1', x: 10, y: -15, z: 5, dirX: 1, dirZ: 0, jammed: false },
    });
    const parsedBelt = parseClientMessage(beltPlaceMsg);
    expect(parsedBelt).not.toBeNull();
    if (parsedBelt && parsedBelt.t === 'belt_place') {
      expect(parsedBelt.module.id).toBe('belt-1');
      expect(parsedBelt.module.dirX).toBe(1);
    }

    const sectorPlaceMsg = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'sector_place',
      beacon: { id: 'sec-1', name: 'Veta Norte', x: 2, y: -20, z: 4, radius: 8, layer: 2, density: 1.5 },
    });
    const parsedSector = parseClientMessage(sectorPlaceMsg);
    expect(parsedSector).not.toBeNull();
    if (parsedSector && parsedSector.t === 'sector_place') {
      expect(parsedSector.beacon.name).toBe('Veta Norte');
      expect(parsedSector.beacon.radius).toBe(8);
    }

    const hostBrigadeState = JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'brigade_state',
      brigades: [
        { id: 'b-1', sectorId: 'sec-1', headcount: 8, kind: 'miner', rank: 2, seed: 12345 },
      ],
      sectors: [
        { id: 'sec-1', name: 'Veta Norte', x: 2, y: -20, z: 4, radius: 8, layer: 2, density: 1.5 },
      ],
    });
    const parsedBrigades = parseHostMessage(hostBrigadeState);
    expect(parsedBrigades).not.toBeNull();
    if (parsedBrigades && parsedBrigades.t === 'brigade_state') {
      expect(parsedBrigades.brigades).toHaveLength(1);
      expect(parsedBrigades.brigades[0].headcount).toBe(8);
      expect(parsedBrigades.sectors).toHaveLength(1);
    }
  });
});
