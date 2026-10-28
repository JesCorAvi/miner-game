import * as THREE from 'three';
import { MAX_PELLETS, MINERALS, PIT_HALF } from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import type { MineralDefinition, MineralId } from '../types';
import type { ResourceNode } from './Resources';
import type { Terrain } from './Terrain';
import {
  ACTIVE_PELLET_BUDGET,
  FUSION_DISTANCE,
  MAX_FUSED_PILES,
  MAX_PILE_SCALE,
  VISIBLE_PELLET_BUDGET,
  type CollectedLoot,
  type LootCollectFn,
  type OverflowEntry,
  type Pellet,
} from './LootTypes';
import { LootSpatialHash } from './LootSpatialHash';

export type { CollectedLoot, LootCollectFn, OverflowEntry } from './LootTypes';

import { makeGlowTexture, makePelletGeometry } from './LootAssets';

const PELLET_LIFETIME = 86;
const GRAVITY = 17.5;
const MAX_SPEED = 14;
const MAGNET_DELAY = 0.25;
const MAX_HIT_CHIPS_PER_NODE = 8;
const FUSION_INTERVAL = 0.5;

interface ChipLedger {
  carbon: number;
  money: number;
  count: number;
}

export class LootField {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly emissiveAttribute: THREE.InstancedBufferAttribute;
  private readonly glowGeometry = new THREE.BufferGeometry();
  private readonly glowMaterial: THREE.PointsMaterial;
  private readonly glowTexture: THREE.CanvasTexture;
  private readonly glowPositions: Float32Array;
  private readonly glowColors: Float32Array;
  private readonly glowPositionAttribute: THREE.BufferAttribute;
  private readonly glowColorAttribute: THREE.BufferAttribute;
  private readonly pellets: Pellet[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly normal = new THREE.Vector3();
  private cursor = 0;
  private totalCollected = 0;
  private activeCount = 0;
  private fusedPilesCount = 0;
  private fusionTimer = 0;
  private bulkMode = false;
  private degraded = false;
  private readonly spatialHash = new LootSpatialHash(2.0);
  private readonly overflowLedger: OverflowEntry[] = [];
  private readonly chipLedger = new Map<string, ChipLedger>();
  private tickCounter = 0;

  constructor() {
    this.group.name = 'loot-field';
    this.geometry = makePelletGeometry();
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.28,
      metalness: 0.18,
      flatShading: true,
      toneMapped: false,
    });
    this.emissiveAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PELLETS * 3),
      3,
    );
    this.geometry.setAttribute('instanceEmissive', this.emissiveAttribute);
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute vec3 instanceEmissive;
           varying vec3 vInstanceEmissive;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vInstanceEmissive = instanceEmissive;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vInstanceEmissive;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           totalEmissiveRadiance += vInstanceEmissive;`,
        );
    };

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PELLETS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
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
        count: 1,
        mineral: 'coal',
        color: new THREE.Color(),
        blockedUntil: 0,
      };
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
      this.mesh.setColorAt(index, new THREE.Color(0x000000));
      this.setPelletEmissive(index, new THREE.Color(0x000000));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.emissiveAttribute.needsUpdate = true;
    this.group.add(this.mesh);

    this.glowTexture = makeGlowTexture();
    this.glowPositions = new Float32Array(MAX_PELLETS * 3);
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      this.glowPositions[index * 3 + 1] = -999;
    }
    this.glowColors = new Float32Array(MAX_PELLETS * 3);
    this.glowPositionAttribute = new THREE.BufferAttribute(this.glowPositions, 3);
    this.glowPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.glowColorAttribute = new THREE.BufferAttribute(this.glowColors, 3);
    this.glowColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.glowGeometry.setAttribute('position', this.glowPositionAttribute);
    this.glowGeometry.setAttribute('color', this.glowColorAttribute);
    this.glowMaterial = new THREE.PointsMaterial({
      size: 0.62,
      map: this.glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    const glowPoints = new THREE.Points(this.glowGeometry, this.glowMaterial);
    glowPoints.frustumCulled = false;
    this.group.add(glowPoints);
  }

  setBulkMode(enabled: boolean): void { this.bulkMode = enabled; }
  isBulkMode(): boolean { return this.bulkMode; }
  getOverflowLedger(): readonly OverflowEntry[] { return this.overflowLedger; }

  private setPelletEmissive(index: number, color: THREE.Color): void {
    this.emissiveAttribute.setXYZ(index, color.r, color.g, color.b);
  }

  spawnFromNode(
    node: ResourceNode,
    terrain: Terrain,
    dropSeed: number,
  ): number {
    if (!node.mineral) {
      return 0;
    }
    const mineral = node.mineral;
    const ledger = this.chipLedger.get(node.id);
    const hash = hashString(`${node.id}:${dropSeed}`);
    const random = mulberry32(hash);
    const totalCarbon = Math.max(0, mineral.carbonYield - (ledger?.carbon ?? 0));
    const totalMoney = Math.max(0, mineral.moneyYield - (ledger?.money ?? 0));
    const availableYield = Math.max(totalCarbon, totalMoney);
    const count = Math.max(1, Math.min(mineral.pelletCount, availableYield));
    if (this.bulkMode) {
      this.addToOverflow(
        new THREE.Vector3(node.x, node.y, node.z),
        mineral.id,
        totalCarbon,
        totalMoney,
        mineral.weight * count,
        count,
      );
      return count;
    }
    const baseCarbon = count > 0 ? Math.floor(totalCarbon / count) : 0;
    const baseMoney = count > 0 ? Math.floor(totalMoney / count) : 0;
    const carbonRemainder = totalCarbon - baseCarbon * count;
    const moneyRemainder = totalMoney - baseMoney * count;
    terrain.getNormal(node.x, node.y, node.z, this.normal);
    const normal = this.normal.clone();
    const baseColor = new THREE.Color(mineral.color);
    const emissiveColor = new THREE.Color(mineral.emissive).multiplyScalar(
      mineral.family === 'coal' ? 1.35 : 1.65,
    );
    const glowColor = new THREE.Color(mineral.glow);
    let spawned = 0;

    for (let index = 0; index < count; index += 1) {
      const carbon = baseCarbon + (index < carbonRemainder ? 1 : 0);
      const money = baseMoney + (index < moneyRemainder ? 1 : 0);
      const slot = this.findSlot();

      if (slot < 0) {
        this.addToOverflow(
          new THREE.Vector3(node.x, node.y, node.z),
          mineral.id,
          carbon,
          money,
          mineral.weight,
          1,
        );
        spawned += 1;
        continue;
      }

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
      pellet.carbon = carbon;
      pellet.money = money;
      pellet.weight = mineral.weight;
      pellet.count = 1;
      pellet.mineral = mineral.id;
      pellet.blockedUntil = 0;
      pellet.isPile = false;
      pellet.color.copy(baseColor).multiplyScalar(0.84 + random() * 0.32);
      this.mesh.setColorAt(slot, pellet.color);
      this.setPelletEmissive(slot, emissiveColor);
      this.glowColorAttribute.setXYZ(slot, glowColor.r, glowColor.g, glowColor.b);
      this.glowPositionAttribute.setXYZ(slot, pellet.x, pellet.y, pellet.z);
      this.activeCount += 1;
      this.spatialHash.insert(slot, x, y, z);
      spawned += 1;
    }
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (spawned > 0) {
      this.emissiveAttribute.needsUpdate = true;
      this.glowColorAttribute.needsUpdate = true;
      this.glowPositionAttribute.needsUpdate = true;
    }
    return spawned;
  }

  spawnNodeHitChips(node: ResourceNode, terrain: Terrain): number {
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
      node.mineral,
      allowed,
      carbonEach,
      moneyEach,
      0.06,
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
    mineral: MineralDefinition,
    count: number,
    carbonEach: number,
    moneyEach: number,
    weightEach: number,
  ): number {
    const direction = normal.clone().normalize();
    const baseColor = new THREE.Color(mineral.color);
    const emissiveColor = new THREE.Color(mineral.emissive).multiplyScalar(
      mineral.family === 'coal' ? 1.35 : 1.65,
    );
    const glowColor = new THREE.Color(mineral.glow);
    let spawned = 0;

    for (let index = 0; index < count; index += 1) {
      const slot = this.findSlot();
      if (slot < 0) {
        this.addToOverflow(position, mineral.id, carbonEach, moneyEach, weightEach, 1);
        spawned += 1;
        continue;
      }
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
      pellet.scale = 0.7 + Math.random() * 0.45;
      pellet.age = 0;
      pellet.carbon = carbonEach;
      pellet.money = moneyEach;
      pellet.weight = weightEach;
      pellet.count = 1;
      pellet.mineral = mineral.id;
      pellet.blockedUntil = 0;
      pellet.isPile = false;
      pellet.color.copy(baseColor).multiplyScalar(0.86 + Math.random() * 0.3);
      this.mesh.setColorAt(slot, pellet.color);
      this.setPelletEmissive(slot, emissiveColor);
      this.glowColorAttribute.setXYZ(slot, glowColor.r, glowColor.g, glowColor.b);
      this.glowPositionAttribute.setXYZ(slot, pellet.x, pellet.y, pellet.z);
      this.activeCount += 1;
      this.spatialHash.insert(slot, x, y, z);
      spawned += 1;
    }
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (spawned > 0) {
      this.emissiveAttribute.needsUpdate = true;
      this.glowColorAttribute.needsUpdate = true;
      this.glowPositionAttribute.needsUpdate = true;
    }
    return spawned;
  }

  spawnDrop(
    position: THREE.Vector3,
    mineralId: MineralId,
    carbon: number,
    money: number,
    weight: number,
  ): boolean {
    const mineral = MINERALS[mineralId];
    if (!mineral) return false;
    const slot = this.findSlot();
    if (slot < 0) {
      this.addToOverflow(position, mineralId, carbon, money, weight, 1);
      return true;
    }
    const pellet = this.pellets[slot];
    pellet.active = true;
    pellet.x = position.x;
    pellet.y = position.y;
    pellet.z = position.z;
    pellet.vx = Math.sin(slot * 2.39996) * 1.5;
    pellet.vy = 2.0;
    pellet.vz = Math.cos(slot * 2.39996) * 1.5;
    pellet.spinX = 1.0;
    pellet.spinY = 1.0;
    pellet.spinZ = 1.0;
    pellet.rotationX = 0;
    pellet.rotationY = 0;
    pellet.rotationZ = 0;
    pellet.scale = 1.0;
    pellet.age = 0;
    pellet.carbon = carbon;
    pellet.money = money;
    pellet.weight = weight;
    pellet.count = 1;
    pellet.mineral = mineralId;
    pellet.blockedUntil = 0;
    pellet.isPile = false;
    pellet.color.setHex(mineral.color);
    this.mesh.setColorAt(slot, pellet.color);
    this.setPelletEmissive(slot, new THREE.Color(mineral.emissive));
    this.glowColorAttribute.setXYZ(slot, 1, 1, 1);
    this.glowPositionAttribute.setXYZ(slot, pellet.x, pellet.y, pellet.z);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.emissiveAttribute.needsUpdate = true;
    this.glowColorAttribute.needsUpdate = true;
    this.glowPositionAttribute.needsUpdate = true;
    this.activeCount += 1;
    this.spatialHash.insert(slot, pellet.x, pellet.y, pellet.z);
    return true;
  }

  addToOverflow(
    position: THREE.Vector3,
    mineralId: MineralId,
    carbon: number,
    money: number,
    weight: number,
    count = 1,
  ): void {
    for (const entry of this.overflowLedger) {
      if (entry.mineral === mineralId) {
        const dx = entry.x - position.x;
        const dy = entry.y - position.y;
        const dz = entry.z - position.z;
        if (dx * dx + dy * dy + dz * dz < 4.0) {
          entry.carbon += carbon;
          entry.money += money;
          entry.weight += weight;
          entry.count += count;
          return;
        }
      }
    }
    this.overflowLedger.push({
      mineral: mineralId,
      x: position.x,
      y: position.y,
      z: position.z,
      carbon,
      money,
      weight,
      count,
    });
  }

  private findSlot(): number {
    if (this.activeCount >= ACTIVE_PELLET_BUDGET) {
      return -1;
    }
    for (let offset = 0; offset < MAX_PELLETS; offset += 1) {
      const index = (this.cursor + offset) % MAX_PELLETS;
      if (!this.pellets[index].active) {
        this.cursor = (index + 1) % MAX_PELLETS;
        return index;
      }
    }
    return -1;
  }

  update(
    dt: number,
    terrain: Terrain,
    playerPosition: THREE.Vector3,
    magnetRange: number,
    onCollect: LootCollectFn,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.tickCounter += 1;
    this.fusionTimer += safeDt;

    // Fusión dinámica periódica o por alta densidad (>1.200 activos)
    if (this.fusionTimer >= FUSION_INTERVAL || this.activeCount > 1200) {
      this.fusionTimer = 0;
      this.fusePellets();
    }

    // Comprobación de recogida de montones en libro de exceso
    if (this.overflowLedger.length > 0) {
      for (let i = this.overflowLedger.length - 1; i >= 0; i -= 1) {
        const entry = this.overflowLedger[i];
        const dx = playerPosition.x - entry.x;
        const dy = playerPosition.y - entry.y;
        const dz = playerPosition.z - entry.z;
        if (dx * dx + dy * dy + dz * dz < 2.8 * 2.8) {
          const accepted = onCollect({
            carbon: entry.carbon,
            money: entry.money,
            weight: entry.weight,
            mineral: entry.mineral,
            lines: [
              {
                mineral: entry.mineral,
                count: entry.count,
                carbon: entry.carbon,
                money: entry.money,
              },
            ],
            position: new THREE.Vector3(entry.x, entry.y, entry.z),
          });
          if (accepted) {
            this.totalCollected += entry.count;
            this.overflowLedger.splice(i, 1);
          }
        }
      }
    }

    let matricesChanged = false;
    let visibleUpdates = 0;

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
      const distSq = dx * dx + dy * dy + dz * dz;

      // LOD de física por distancia (degradación dinámica compacta radios)
      const farLimit = this.degraded ? 1024 : 2304;
      const nearLimit = this.degraded ? 256 : 576;
      if (distSq > farLimit) continue;
      if (distSq > nearLimit && this.tickCounter % 6 !== 0) continue;

      const distance = Math.sqrt(distSq);
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

      if (visibleUpdates < VISIBLE_PELLET_BUDGET) {
        this.dummy.position.set(pellet.x, pellet.y, pellet.z);
        this.dummy.rotation.set(pellet.rotationX, pellet.rotationY, pellet.rotationZ);
        this.dummy.scale.setScalar(pellet.scale);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(index, this.dummy.matrix);
        this.glowPositionAttribute.setXYZ(index, pellet.x, pellet.y, pellet.z);
        visibleUpdates += 1;
        matricesChanged = true;
      }
    }

    if (matricesChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.glowPositionAttribute.needsUpdate = true;
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
          count: pellet.count || 1,
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
    this.totalCollected += pellet.count || 1;
    this.deactivate(index);
  }

  private deactivate(index: number): void {
    const pellet = this.pellets[index];
    if (pellet.active) {
      this.activeCount = Math.max(0, this.activeCount - 1);
      if (pellet.isPile) {
        this.fusedPilesCount = Math.max(0, this.fusedPilesCount - 1);
      }
    }
    pellet.active = false;
    pellet.y = -999;
    this.dummy.position.set(0, -999, 0);
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.emissiveAttribute.setXYZ(index, 0, 0, 0);
    this.emissiveAttribute.needsUpdate = true;
    this.glowColorAttribute.setXYZ(index, 0, 0, 0);
    this.glowColorAttribute.needsUpdate = true;
    this.glowPositionAttribute.setXYZ(index, 0, -999, 0);
    this.glowPositionAttribute.needsUpdate = true;
  }

  /**
   * Fusiona dinámicamente pellets cercanos del mismo mineral conservando el 100% del yield.
   */
  fusePellets(): void {
    if (this.fusedPilesCount >= MAX_FUSED_PILES) return;
    this.rebuildSpatialHash();
    const fusionDistSq = FUSION_DISTANCE * FUSION_DISTANCE;

    for (let i = 0; i < MAX_PELLETS; i += 1) {
      const a = this.pellets[i];
      if (!a.active) continue;
      const mineral = MINERALS[a.mineral];
      if (!mineral) continue;

      this.spatialHash.queryNeighbors(a.x, a.y, a.z, (j) => {
        if (i === j) return;
        const b = this.pellets[j];
        if (!b.active || b.mineral !== a.mineral) return;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        if (dx * dx + dy * dy + dz * dz <= fusionDistSq) {
          a.carbon += b.carbon;
          a.money += b.money;
          a.weight += b.weight;
          a.count = (a.count || 1) + (b.count || 1);
          if (!a.isPile) {
            a.isPile = true;
            this.fusedPilesCount += 1;
          }
          const ratio = a.weight / Math.max(0.01, mineral.weight);
          a.scale = Math.min(MAX_PILE_SCALE, Math.cbrt(ratio));
          this.deactivate(j);
        }
      });
    }
  }

  private rebuildSpatialHash(): void {
    this.spatialHash.clear();
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      const p = this.pellets[index];
      if (p.active) {
        this.spatialHash.insert(index, p.x, p.y, p.z);
      }
    }
  }

  collectNearestWithin(
    position: THREE.Vector3,
    radius: number,
    remainingWeight: number,
  ): CollectedLoot | null {
    const radiusSq = radius * radius;
    let bestIndex = -1;
    let bestDistanceSq = radiusSq;

    this.spatialHash.queryRadius(position.x, position.y, position.z, radius, (index) => {
      const pellet = this.pellets[index];
      if (!pellet.active || pellet.weight > remainingWeight + 1e-6) {
        return;
      }
      const dx = pellet.x - position.x;
      const dy = pellet.y - position.y;
      const dz = pellet.z - position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq <= bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestIndex = index;
      }
    });

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
          count: pellet.count || 1,
          carbon: pellet.carbon,
          money: pellet.money,
        },
      ],
      position: new THREE.Vector3(pellet.x, pellet.y, pellet.z),
    };
    this.totalCollected += pellet.count || 1;
    this.deactivate(bestIndex);
    return collected;
  }

  getNearestPellet(
    position: THREE.Vector3,
    maxDistance: number,
    maxWeight = Number.POSITIVE_INFINITY,
  ): THREE.Vector3 | null {
    let bestDistanceSq = maxDistance * maxDistance;
    let result: THREE.Vector3 | null = null;

    this.spatialHash.queryRadius(position.x, position.y, position.z, maxDistance, (index) => {
      const pellet = this.pellets[index];
      if (!pellet.active || pellet.weight > maxWeight + 1e-6) {
        return;
      }
      const dx = pellet.x - position.x;
      const dy = pellet.y - position.y;
      const dz = pellet.z - position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        result = new THREE.Vector3(pellet.x, pellet.y, pellet.z);
      }
    });

    return result;
  }

  getActiveCount(): number { return this.activeCount; }
  getFusedPilesCount(): number { return this.fusedPilesCount; }
  getTotalCollected(): number { return this.totalCollected; }
  setDegraded(degraded: boolean): void { this.degraded = degraded; }
  isDegraded(): boolean { return this.degraded; }

  queryNear(x: number, y: number, z: number, r: number, cb: (p: Pellet, idx: number) => void): void {
    this.spatialHash.queryRadius(x, y, z, r, (i) => {
      const p = this.pellets[i];
      if (p?.active) cb(p, i);
    });
  }

  clear(): void {
    for (let index = 0; index < MAX_PELLETS; index += 1) {
      if (this.pellets[index].active) this.deactivate(index);
    }
    this.totalCollected = 0;
    this.activeCount = 0;
    this.fusedPilesCount = 0;
    this.cursor = 0;
    this.overflowLedger.length = 0;
    this.chipLedger.clear();
    this.spatialHash.clear();
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.glowGeometry.dispose();
    this.glowMaterial.dispose();
    this.glowTexture.dispose();
  }
}
