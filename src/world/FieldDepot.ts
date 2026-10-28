import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FIELD_DEPOT_CAPACITY_RATIO,
  FIELD_DEPOT_INTERACT_RADIUS,
  MAX_FIELD_DEPOTS,
  SURFACE_DECK_Y,
  maxCarryWeight,
} from '../config';
import type { Loadout, NetworkFieldDepotState } from '../types';
import type { Inventory } from '../core/Inventory';
import type { Terrain } from './Terrain';

function buildDepotGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Contenedor principal reforzado
  const body = new THREE.BoxGeometry(1.2, 0.9, 0.9);
  body.translate(0, 0.45, 0);
  parts.push(body);

  // Marco de base / patines
  for (const sz of [-0.35, 0.35]) {
    const skid = new THREE.BoxGeometry(1.3, 0.1, 0.15);
    skid.translate(0, 0.05, sz);
    parts.push(skid);
  }

  // Tapa superior
  const lid = new THREE.BoxGeometry(1.24, 0.12, 0.94);
  lid.translate(0, 0.96, 0);
  parts.push(lid);

  // Soporte de baliza en la cima
  const mast = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
  mast.translate(0, 1.15, 0);
  parts.push(mast);

  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(1.2, 1.0, 0.9);
  for (const part of parts) {
    part.dispose();
  }
  return merged;
}

export interface FieldDepotCandidate {
  valid: boolean;
  reason: string;
  state: NetworkFieldDepotState;
}

export class FieldDepotSystem {
  readonly group = new THREE.Group();
  private readonly depots = new Map<string, NetworkFieldDepotState>();
  private readonly meshes = new Map<
    string,
    { root: THREE.Group; beaconLight: THREE.PointLight; windowMesh: THREE.Mesh }
  >();

  private readonly bodyGeometry: THREE.BufferGeometry;
  private readonly bodyMaterial: THREE.MeshStandardMaterial;
  private readonly windowMaterial: THREE.MeshStandardMaterial;
  private readonly beaconMaterial: THREE.MeshBasicMaterial;
  private readonly ghostMaterial: THREE.MeshBasicMaterial;
  private readonly ghostMesh: THREE.Mesh;

  constructor() {
    this.group.name = 'field-depots';
    this.bodyGeometry = buildDepotGeometry();

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a6234, // Tono industrial de campaña
      metalness: 0.6,
      roughness: 0.4,
    });

    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x4fd1c5,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
    });

    this.beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
    });

    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });

    this.ghostMesh = new THREE.Mesh(this.bodyGeometry, this.ghostMaterial);
    this.ghostMesh.visible = false;
    this.group.add(this.ghostMesh);
  }

  clear(): void {
    for (const entry of this.meshes.values()) {
      this.group.remove(entry.root);
    }
    this.meshes.clear();
    this.depots.clear();
    this.clearGhost();
  }

  dispose(): void {
    this.clear();
    this.bodyGeometry.dispose();
    this.bodyMaterial.dispose();
    this.windowMaterial.dispose();
    this.beaconMaterial.dispose();
    this.ghostMaterial.dispose();
  }

  showGhost(candidate: FieldDepotCandidate | null): void {
    if (!candidate) {
      this.clearGhost();
      return;
    }
    const color = candidate.valid ? 0x22c55e : 0xef4444;
    this.ghostMaterial.color.setHex(color);
    this.ghostMesh.position.set(candidate.state.x, candidate.state.y, candidate.state.z);
    this.ghostMesh.visible = true;
  }

  clearGhost(): void {
    this.ghostMesh.visible = false;
  }

  add(depot: NetworkFieldDepotState): boolean {
    if (this.depots.size >= MAX_FIELD_DEPOTS && !this.depots.has(depot.id)) {
      return false;
    }
    this.remove(depot.id);
    this.depots.set(depot.id, depot);

    const root = new THREE.Group();
    root.name = `depot-${depot.id}`;
    root.position.set(depot.x, depot.y, depot.z);

    const container = new THREE.Mesh(this.bodyGeometry, this.bodyMaterial);
    root.add(container);

    // Ventana de inspección del nivel de carga
    const windowGeo = new THREE.PlaneGeometry(0.7, 0.4);
    windowGeo.translate(0, 0.5, 0.46);
    const windowMesh = new THREE.Mesh(windowGeo, this.windowMaterial);
    root.add(windowMesh);

    // Baliza luminosa superior
    const beaconBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      this.beaconMaterial,
    );
    beaconBulb.position.set(0, 1.35, 0);
    root.add(beaconBulb);

    const beaconLight = new THREE.PointLight(0xffaa00, 1.2, 5, 2);
    beaconLight.position.set(0, 1.45, 0);
    root.add(beaconLight);

    this.group.add(root);
    this.meshes.set(depot.id, { root, beaconLight, windowMesh });
    this.updateVisualLoad(depot.id);
    return true;
  }

  remove(id: string): void {
    const existing = this.meshes.get(id);
    if (existing) {
      existing.windowMesh.geometry.dispose();
      this.group.remove(existing.root);
      this.meshes.delete(id);
    }
    this.depots.delete(id);
  }

  get(id: string): NetworkFieldDepotState | undefined {
    return this.depots.get(id);
  }

  getSnapshot(): NetworkFieldDepotState[] {
    return Array.from(this.depots.values());
  }

  fromSnapshot(states: NetworkFieldDepotState[]): void {
    this.clear();
    for (const state of states) {
      this.add(state);
    }
  }

  validatePlacement(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    terrain: Terrain,
    loadout: Loadout,
  ): FieldDepotCandidate | null {
    if (this.depots.size >= MAX_FIELD_DEPOTS) {
      return {
        valid: false,
        reason: `LÍMITE ALCANZADO · Máximo ${MAX_FIELD_DEPOTS} tolvas de campaña por turno.`,
        state: { id: '', x: origin.x, y: origin.y, z: origin.z, stored: [], totalWeight: 0, maxCapacity: 0 },
      };
    }

    const hit = terrain.raycast(origin, direction, 5.0);
    if (!hit) {
      return null;
    }

    const x = Number(hit.x.toFixed(2));
    const y = Number(hit.y.toFixed(2));
    const z = Number(hit.z.toFixed(2));

    // Debe ser suelo relativamente plano
    if (hit.normal.y < 0.6) {
      return {
        valid: false,
        reason: 'SUPERFICIE INCLINADA · Requiere suelo firme y nivelado.',
        state: { id: '', x, y, z, stored: [], totalWeight: 0, maxCapacity: 0 },
      };
    }

    // No colocar en la plataforma inicial (esa zona ya tiene la tolva principal)
    if (y >= SURFACE_DECK_Y - 0.5 && Math.hypot(x, z) < 16) {
      return {
        valid: false,
        reason: 'ZONA DE TOLVA PRINCIPAL · Instálala en las galerías de extracción.',
        state: { id: '', x, y, z, stored: [], totalWeight: 0, maxCapacity: 0 },
      };
    }

    const freightBonus = loadout.doctrine === 'freight' ? 1.5 : 1.0;
    const capacity = Math.round(maxCarryWeight(loadout) * FIELD_DEPOT_CAPACITY_RATIO * freightBonus);
    return {
      valid: true,
      reason: `TOLVA DE CAMPAÑA · Capacidad de acopio temporal: ${capacity} kg.${
        loadout.doctrine === 'freight' ? ' (+50% Acta de Flete)' : ''
      }`,
      state: {
        id: '',
        x,
        y,
        z,
        stored: [],
        totalWeight: 0,
        maxCapacity: capacity,
      },
    };
  }

  findNearestInteractive(
    playerPos: THREE.Vector3,
    radius = FIELD_DEPOT_INTERACT_RADIUS,
  ): NetworkFieldDepotState | null {
    let nearest: NetworkFieldDepotState | null = null;
    let minDistance = radius;

    for (const depot of this.depots.values()) {
      const dist = Math.hypot(playerPos.x - depot.x, playerPos.y - depot.y, playerPos.z - depot.z);
      if (dist <= minDistance) {
        minDistance = dist;
        nearest = depot;
      }
    }
    return nearest;
  }

  /**
   * Deposita minerales de la mochila del jugador en la tolva de campaña.
   * INVARIANTE ABSOLUTA: NUNCA acredita cuota de carbono ni capital monetario.
   * Actúa estrictamente como depósito temporal intermedio.
   */
  depositFromInventory(
    depotId: string,
    inventory: Inventory,
  ): { transferredWeight: number; transferredItems: number } {
    const depot = this.depots.get(depotId);
    if (!depot) {
      return { transferredWeight: 0, transferredItems: 0 };
    }

    const availableSpace = Math.max(0, depot.maxCapacity - depot.totalWeight);
    if (availableSpace <= 0.05) {
      return { transferredWeight: 0, transferredItems: 0 };
    }

    let transferredWeight = 0;
    let transferredItems = 0;

    // Recorrer los slots de inventario buscando minerales
    const slots = inventory.getSlots();
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const slot = slots[slotIndex];
      if (!slot || slot.kind !== 'mineral') {
        continue;
      }
      const count = slot.count;
      if (count <= 0) continue;

      const itemUnitWeight = slot.weight / count;
      const itemCarbonPerUnit = slot.carbon / count;
      const itemMoneyPerUnit = slot.money / count;

      // Calcular cuántas piezas caben en el espacio restante de la tolva
      const spaceForItems = Math.floor((availableSpace - transferredWeight) / Math.max(0.01, itemUnitWeight));
      const transferCount = Math.min(count, Math.max(0, spaceForItems));

      if (transferCount <= 0) {
        continue;
      }

      const weightToTransfer = transferCount * itemUnitWeight;
      const carbonToTransfer = Math.floor(transferCount * itemCarbonPerUnit);
      const moneyToTransfer = Math.floor(transferCount * itemMoneyPerUnit);

      // Añadir al registro de la tolva
      const existingEntry = depot.stored.find((entry) => entry.mineral === slot.mineral);
      if (existingEntry) {
        existingEntry.count += transferCount;
        existingEntry.weight += weightToTransfer;
        existingEntry.carbon += carbonToTransfer;
        existingEntry.money += moneyToTransfer;
      } else {
        depot.stored.push({
          mineral: slot.mineral,
          count: transferCount,
          carbon: carbonToTransfer,
          money: moneyToTransfer,
          weight: weightToTransfer,
        });
      }

      transferredWeight += weightToTransfer;
      transferredItems += transferCount;

      // Retirar del inventario del jugador
      inventory.removeOreFromSlot(slotIndex, transferCount);

      if (availableSpace - transferredWeight <= 0.05) {
        break;
      }
    }

    depot.totalWeight = Number((depot.totalWeight + transferredWeight).toFixed(2));
    this.updateVisualLoad(depotId);

    return { transferredWeight, transferredItems };
  }

  /**
   * Retira minerales de la tolva de campaña de vuelta al inventario del jugador.
   */
  withdrawToInventory(
    depotId: string,
    inventory: Inventory,
    maxPlayerCapacity: number,
  ): { transferredWeight: number; transferredItems: number } {
    const depot = this.depots.get(depotId);
    if (!depot || depot.stored.length === 0) {
      return { transferredWeight: 0, transferredItems: 0 };
    }

    const currentInventoryWeight = inventory.totals().weight;
    const availablePlayerSpace = Math.max(0, maxPlayerCapacity - currentInventoryWeight);
    if (availablePlayerSpace <= 0.05) {
      return { transferredWeight: 0, transferredItems: 0 };
    }

    let transferredWeight = 0;
    let transferredItems = 0;

    for (let index = depot.stored.length - 1; index >= 0; index -= 1) {
      const entry = depot.stored[index];
      if (entry.count <= 0) {
        depot.stored.splice(index, 1);
        continue;
      }

      const unitWeight = entry.weight / entry.count;
      const unitCarbon = entry.carbon / entry.count;
      const unitMoney = entry.money / entry.count;

      const spaceForItems = Math.floor((availablePlayerSpace - transferredWeight) / Math.max(0.01, unitWeight));
      const transferCount = Math.min(entry.count, Math.max(0, spaceForItems));

      if (transferCount <= 0) continue;

      let actualAdded = 0;
      for (let c = 0; c < transferCount; c += 1) {
        const addResult = inventory.addMineral(
          entry.mineral,
          unitCarbon,
          unitMoney,
          unitWeight,
        );
        if (addResult.accepted) {
          actualAdded += 1;
        } else {
          break;
        }
      }

      if (actualAdded > 0) {
        const weightAdded = actualAdded * unitWeight;
        const carbonAdded = actualAdded * unitCarbon;
        const moneyAdded = actualAdded * unitMoney;

        entry.count -= actualAdded;
        entry.weight = Math.max(0, entry.weight - weightAdded);
        entry.carbon = Math.max(0, entry.carbon - carbonAdded);
        entry.money = Math.max(0, entry.money - moneyAdded);

        transferredWeight += weightAdded;
        transferredItems += actualAdded;

        if (entry.count <= 0) {
          depot.stored.splice(index, 1);
        }
      }

      if (availablePlayerSpace - transferredWeight <= 0.05) {
        break;
      }
    }

    depot.totalWeight = Number(Math.max(0, depot.totalWeight - transferredWeight).toFixed(2));
    this.updateVisualLoad(depotId);

    return { transferredWeight, transferredItems };
  }

  private updateVisualLoad(depotId: string): void {
    const depot = this.depots.get(depotId);
    const mesh = this.meshes.get(depotId);
    if (!depot || !mesh) return;

    const fillRatio = depot.maxCapacity > 0 ? depot.totalWeight / depot.maxCapacity : 0;
    if (fillRatio > 0.8) {
      mesh.beaconLight.color.setHex(0xef4444); // Rojo (casi llena)
    } else if (fillRatio > 0.3) {
      mesh.beaconLight.color.setHex(0xeab308); // Ámbar
    } else {
      mesh.beaconLight.color.setHex(0x22c55e); // Verde
    }
  }
}
