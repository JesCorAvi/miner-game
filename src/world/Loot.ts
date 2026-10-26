import * as THREE from 'three';
import { MAX_PELLETS, PIT_HALF } from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import type { DaySaleLine, MineralId } from '../types';
import type { ResourceNode } from './Resources';
import type { Terrain } from './Terrain';
interface Pellet {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  age: number;
  carbon: number;
  money: number;
  weight: number;
  mineral: MineralId;
  color: THREE.Color;
  blockedUntil: number;
}

export interface CollectedLoot {
  carbon: number;
  money: number;
  weight: number;
  mineral: MineralId;
  lines: DaySaleLine[];
  position: THREE.Vector3;
}

export type LootCollectFn = (loot: CollectedLoot) => boolean;

const PELLET_LIFETIME = 86;
const GRAVITY = 17.5;
const MAX_SPEED = 14;
const MAGNET_DELAY = 0.25;
const MAX_HIT_CHIPS_PER_NODE = 8;

interface ChipLedger {
  carbon: number;
  money: number;
  count: number;
}

function makePelletGeometry(): THREE.OctahedronGeometry {
  const geometry = new THREE.OctahedronGeometry(0.13, 0);
  geometry.scale(1, 1.35, 1);
  return geometry;
}

export class LootField {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly pellets: Pellet[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly normal = new THREE.Vector3();
  private cursor = 0;
  private totalCollected = 0;
  private readonly chipLedger = new Map<string, ChipLedger>();

  constructor() {
    this.group.name = 'loot-field';
    this.geometry = makePelletGeometry();
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PELLETS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'loot-pellets';
    const hidden = new THREE.Color(0x000000);
    this.pellets.length = MAX_PELLETS;
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      this.pellets[index] = {
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        age: 0,
        carbon: 0,
        money: 0,
        weight: 0,
        mineral: 'coal',
        color: hidden,
        blockedUntil: 0,
      };
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
      this.mesh.setColorAt(index, hidden);
    }
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.mesh);
  }

  spawnFromNode(node: ResourceNode, terrain: Terrain, dropSeed: number): number {
    if (!node.mineral) {
      return 0;
    }
    const random = mulberry32(dropSeed ^ hashString(node.id));
    const mineral = node.mineral;
    const ledger = this.chipLedger.get(node.id);
    this.chipLedger.delete(node.id);
    const totalCarbon = Math.max(0, mineral.carbonYield - (ledger?.carbon ?? 0));
    const totalMoney = Math.max(0, mineral.moneyYield - (ledger?.money ?? 0));
    const availableYield = Math.max(totalCarbon, totalMoney);
    const count = Math.max(1, Math.min(mineral.pelletCount, availableYield));
    const baseCarbon = count > 0 ? Math.floor(totalCarbon / count) : 0;
    const baseMoney = count > 0 ? Math.floor(totalMoney / count) : 0;
    const carbonRemainder = totalCarbon - baseCarbon * count;
    const moneyRemainder = totalMoney - baseMoney * count;
    terrain.getNormal(node.x, node.y, node.z, this.normal);
    const normal = this.normal.clone();
    let spawned = 0;
    for (let index = 0; index < count; index += 1) {
      const slot = this.findSlot();
      const pellet = this.pellets[slot];
      const angle = random() * Math.PI * 2;
      const spread = 0.22 + random() * 0.62;
      let x = node.x + normal.x * 0.25 + Math.cos(angle) * spread;
      let y = node.y + normal.y * 0.25 + (random() - 0.22) * 0.5;
      let z = node.z + normal.z * 0.25 + Math.sin(angle) * spread;
      x = Math.max(-PIT_HALF + 0.35, Math.min(PIT_HALF - 0.35, x));
      z = Math.max(-PIT_HALF + 0.35, Math.min(PIT_HALF - 0.35, z));
      let outsideAttempt = 0;
      while (terrain.isSolid(x, y, z) && outsideAttempt < 18) {
        x += normal.x * 0.16;
        y += normal.y * 0.16 + 0.04;
        z += normal.z * 0.16;
        outsideAttempt += 1;
      }
      const outward = 1.6 + random() * 2.6;
      const upward = 1.2 + random() * 2.8;
      pellet.active = true;
      pellet.x = x;
      pellet.y = y;
      pellet.z = z;
      pellet.vx = normal.x * outward + Math.cos(angle) * (0.7 + random() * 1.3);
      pellet.vy = upward + Math.max(0, normal.y) * outward * 0.6;
      pellet.vz = normal.z * outward + Math.sin(angle) * (0.7 + random() * 1.3);
      pellet.spinX = (random() - 0.5) * 12;
      pellet.spinY = (random() - 0.5) * 12;
      pellet.spinZ = (random() - 0.5) * 12;
      pellet.rotationX = random() * Math.PI;
      pellet.rotationY = random() * Math.PI;
      pellet.rotationZ = random() * Math.PI;
      pellet.scale = 0.8 + random() * 0.7;
      pellet.age = 0;
      pellet.carbon = baseCarbon + (index < carbonRemainder ? 1 : 0);
      pellet.money = baseMoney + (index < moneyRemainder ? 1 : 0);
      pellet.weight = mineral.weight;
      pellet.mineral = mineral.id;
      pellet.blockedUntil = 0;
      pellet.color.setHex(mineral.glow);
      pellet.color.multiplyScalar(0.8 + random() * 0.5);
      this.mesh.setColorAt(slot, pellet.color);
      spawned += 1;
    }
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    return spawned;
  }

  /**
   * Fragmentos que salen al golpear (no romper) una veta. Su valor se descuenta
   * del lote de rotura local para no duplicar el yield del nodo.
   */
  spawnNodeHitChips(node: ResourceNode, terrain: Terrain, color: number): number {
    if (!node.mineral || node.broken) {
      return 0;
    }
    const ledger = this.chipLedger.get(node.id) ?? { carbon: 0, money: 0, count: 0 };
    const allowed = Math.min(
      1 + (Math.random() < 0.5 ? 1 : 0),
      Math.max(0, MAX_HIT_CHIPS_PER_NODE - ledger.count),
    );
    if (allowed <= 0) {
      return 0;
    }
    const carbonEach = node.mineral.carbonYield > 0 ? 1 : 0;
    const moneyEach = node.mineral.moneyYield > 0 ? 1 : 0;
    const spawned = this.spawnChipBurst(
      new THREE.Vector3(node.x, node.y, node.z),
      terrain.getNormal(node.x, node.y, node.z),
      terrain,
      node.mineral.id,
      allowed,
      carbonEach,
      moneyEach,
      0.06,
      color,
    );
    if (spawned > 0) {
      ledger.carbon = Math.min(node.mineral.carbonYield, ledger.carbon + carbonEach * spawned);
      ledger.money = Math.min(node.mineral.moneyYield, ledger.money + moneyEach * spawned);
      ledger.count += spawned;
      this.chipLedger.set(node.id, ledger);
    }
    return spawned;
  }

  private spawnChipBurst(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    terrain: Terrain,
    mineral: MineralId,
    count: number,
    carbonEach: number,
    moneyEach: number,
    weightEach: number,
    color: number,
  ): number {
    const direction = normal.clone().normalize();
    const baseColor = new THREE.Color(color);
    let spawned = 0;
    for (let index = 0; index < count; index += 1) {
      const slot = this.findSlot();
      const pellet = this.pellets[slot];
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.12 + Math.random() * 0.32;
      let x = position.x + direction.x * 0.18 + Math.cos(angle) * spread;
      let y = position.y + direction.y * 0.18 + (Math.random() - 0.3) * 0.28;
      let z = position.z + direction.z * 0.18 + Math.sin(angle) * spread;
      x = Math.max(-PIT_HALF + 0.35, Math.min(PIT_HALF - 0.35, x));
      z = Math.max(-PIT_HALF + 0.35, Math.min(PIT_HALF - 0.35, z));
      let outsideAttempt = 0;
      while (terrain.isSolid(x, y, z) && outsideAttempt < 12) {
        x += direction.x * 0.12;
        y += direction.y * 0.12 + 0.03;
        z += direction.z * 0.12;
        outsideAttempt += 1;
      }
      const outward = 1.0 + Math.random() * 1.8;
      pellet.active = true;
      pellet.x = x;
      pellet.y = y;
      pellet.z = z;
      pellet.vx = direction.x * outward + Math.cos(angle) * (0.4 + Math.random() * 0.9);
      pellet.vy = 1.4 + Math.random() * 2.2 + Math.max(0, direction.y) * outward;
      pellet.vz = direction.z * outward + Math.sin(angle) * (0.4 + Math.random() * 0.9);
      pellet.spinX = (Math.random() - 0.5) * 14;
      pellet.spinY = (Math.random() - 0.5) * 14;
      pellet.spinZ = (Math.random() - 0.5) * 14;
      pellet.rotationX = Math.random() * Math.PI;
      pellet.rotationY = Math.random() * Math.PI;
      pellet.rotationZ = Math.random() * Math.PI;
      pellet.scale = 0.55 + Math.random() * 0.45;
      pellet.age = 0;
      pellet.carbon = carbonEach;
      pellet.money = moneyEach;
      pellet.weight = weightEach;
      pellet.mineral = mineral;
      pellet.blockedUntil = 0;
      pellet.color.copy(baseColor).multiplyScalar(0.85 + Math.random() * 0.45);
      this.mesh.setColorAt(slot, pellet.color);
      spawned += 1;
    }
    if (spawned > 0 && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    return spawned;
  }

  private findSlot(): number {
    for (let offset = 0; offset < MAX_PELLETS; offset += 1) {
      const index = (this.cursor + offset) % MAX_PELLETS;
      if (!this.pellets[index].active) {
        this.cursor = (index + 1) % MAX_PELLETS;
        return index;
      }
    }
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PELLETS;
    return index;
  }

  update(
    dt: number,
    terrain: Terrain,
    playerPosition: THREE.Vector3,
    magnetRange: number,
    onCollect: LootCollectFn,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    let matricesChanged = false;
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      const pellet = this.pellets[index];
      if (!pellet.active) {
        continue;
      }
      pellet.age += safeDt;
      if (pellet.age > PELLET_LIFETIME) {
        this.deactivate(index);
        matricesChanged = true;
        continue;
      }

      const dx = playerPosition.x - pellet.x;
      const dy = playerPosition.y - pellet.y;
      const dz = playerPosition.z - pellet.z;
      const distance = Math.hypot(dx, dy, dz);
      if (pellet.age > MAGNET_DELAY && distance < magnetRange) {
        const pull = 12 + (magnetRange - distance) * 9;
        const inverse = 1 / Math.max(0.3, distance);
        pellet.vx += dx * inverse * pull * safeDt;
        pellet.vy += dy * inverse * pull * safeDt;
        pellet.vz += dz * inverse * pull * safeDt;
        pellet.vx *= 0.93;
        pellet.vy *= 0.93;
        pellet.vz *= 0.93;
      } else {
        pellet.vy -= GRAVITY * safeDt;
      }

      const speed = Math.hypot(pellet.vx, pellet.vy, pellet.vz);
      if (speed > MAX_SPEED) {
        const factor = MAX_SPEED / speed;
        pellet.vx *= factor;
        pellet.vy *= factor;
        pellet.vz *= factor;
      }

      const rawX = pellet.x + pellet.vx * safeDt;
      const rawY = pellet.y + pellet.vy * safeDt;
      const rawZ = pellet.z + pellet.vz * safeDt;
      const nextX = Math.max(-PIT_HALF + 0.18, Math.min(PIT_HALF - 0.18, rawX));
      const nextY = Math.min(4.8, rawY);
      const nextZ = Math.max(-PIT_HALF + 0.18, Math.min(PIT_HALF - 0.18, rawZ));
      if (nextX !== rawX) {
        pellet.vx *= -0.24;
      }
      if (nextZ !== rawZ) {
        pellet.vz *= -0.24;
      }
      if (nextY !== rawY) {
        pellet.vy = Math.min(0, pellet.vy) * 0.4;
      }

      if (terrain.isSolid(nextX, nextY, nextZ)) {
        terrain.getNormal(nextX, nextY, nextZ, this.normal);
        const dot =
          pellet.vx * this.normal.x + pellet.vy * this.normal.y + pellet.vz * this.normal.z;
        const restitution = 0.12;
        pellet.vx = (pellet.vx - (1 + restitution) * dot * this.normal.x) * 0.78;
        pellet.vy = (pellet.vy - (1 + restitution) * dot * this.normal.y) * 0.78 + 0.12;
        pellet.vz = (pellet.vz - (1 + restitution) * dot * this.normal.z) * 0.78;
        pellet.x += this.normal.x * 0.05;
        pellet.y += this.normal.y * 0.05;
        pellet.z += this.normal.z * 0.05;
      } else {
        pellet.x = nextX;
        pellet.y = nextY;
        pellet.z = nextZ;
      }

      const postDx = playerPosition.x - pellet.x;
      const postDy = playerPosition.y - pellet.y;
      const postDz = playerPosition.z - pellet.z;
      if (
        pellet.age > MAGNET_DELAY &&
        performance.now() >= pellet.blockedUntil &&
        postDx * postDx + postDy * postDy + postDz * postDz < 0.9 * 0.9
      ) {
        this.collect(index, onCollect);
        matricesChanged = true;
        continue;
      }

      pellet.rotationX += pellet.spinX * safeDt;
      pellet.rotationY += pellet.spinY * safeDt;
      pellet.rotationZ += pellet.spinZ * safeDt;
      this.dummy.position.set(pellet.x, pellet.y, pellet.z);
      this.dummy.rotation.set(pellet.rotationX, pellet.rotationY, pellet.rotationZ);
      this.dummy.scale.setScalar(pellet.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
      matricesChanged = true;
    }

    if (matricesChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private collect(index: number, onCollect: LootCollectFn): void {
    const pellet = this.pellets[index];
    if (!pellet.active) {
      return;
    }
    const accepted = onCollect({
      carbon: pellet.carbon,
      money: pellet.money,
      weight: pellet.weight,
      mineral: pellet.mineral,
      lines: [
        {
          mineral: pellet.mineral,
          count: 1,
          carbon: pellet.carbon,
          money: pellet.money,
        },
      ],
      position: new THREE.Vector3(pellet.x, pellet.y, pellet.z),
    });
    if (!accepted) {
      pellet.blockedUntil = performance.now() + 350;
      return;
    }
    this.totalCollected += 1;
    this.deactivate(index);
  }

  private deactivate(index: number): void {
    const pellet = this.pellets[index];
    pellet.active = false;
    pellet.y = -999;
    this.dummy.position.set(0, -999, 0);
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Recoge un único fragmento cercano que quepa en el peso restante del
   * recolector. El recolector debe volar hasta la pepita: no hay succión a
   * distancia ni depósito inmediato.
   */
  collectNearestWithin(
    position: THREE.Vector3,
    radius: number,
    remainingWeight: number,
  ): CollectedLoot | null {
    const radiusSq = radius * radius;
    let bestIndex = -1;
    let bestDistanceSq = radiusSq;
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      const pellet = this.pellets[index];
      if (!pellet.active || pellet.weight > remainingWeight + 1e-6) {
        continue;
      }
      const dx = pellet.x - position.x;
      const dy = pellet.y - position.y;
      const dz = pellet.z - position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq <= bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) {
      return null;
    }
    const pellet = this.pellets[bestIndex];
    const collected: CollectedLoot = {
      carbon: pellet.carbon,
      money: pellet.money,
      weight: pellet.weight,
      mineral: pellet.mineral,
      lines: [
        {
          mineral: pellet.mineral,
          count: 1,
          carbon: pellet.carbon,
          money: pellet.money,
        },
      ],
      position: new THREE.Vector3(pellet.x, pellet.y, pellet.z),
    };
    this.totalCollected += 1;
    this.deactivate(bestIndex);
    return collected;
  }

  getNearestPellet(position: THREE.Vector3, maxDistance: number): THREE.Vector3 | null {
    let bestDistance = maxDistance * maxDistance;
    let result: THREE.Vector3 | null = null;
    for (const pellet of this.pellets) {
      if (!pellet.active) {
        continue;
      }
      const dx = pellet.x - position.x;
      const dy = pellet.y - position.y;
      const dz = pellet.z - position.z;
      const distance = dx * dx + dy * dy + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        result = new THREE.Vector3(pellet.x, pellet.y, pellet.z);
      }
    }
    return result;
  }

  getActiveCount(): number {
    let count = 0;
    for (const pellet of this.pellets) {
      if (pellet.active) {
        count += 1;
      }
    }
    return count;
  }

  getTotalCollected(): number {
    return this.totalCollected;
  }

  clear(): void {
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      const pellet = this.pellets[index];
      if (pellet.active) {
        pellet.active = false;
        pellet.y = -999;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(index, this.dummy.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.totalCollected = 0;
    this.cursor = 0;
    this.chipLedger.clear();
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
