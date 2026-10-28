/**
 * Brigades.ts — Simulación híbrida de plantilla por brigadas y sectores (Sección 3.3).
 * Maneja hasta 4 sectores delimitados y brigadas con simulación estadística en host.
 */

import * as THREE from 'three';
import { MINE_DEPTH, PIT_HALF } from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import type { Terrain } from '../world/Terrain';

export interface SectorBeacon {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  layer: number;
  density: number;
}

export interface BrigadeRecord {
  id: string;
  name: string;
  sectorId: string;
  headcount: number;
  kind: 'miners' | 'gatherers';
  rank: number;
  seed: number;
}

export const MAX_BRIGADE_HEADCOUNT = 7_000_000_000;

export function brigadeUpgradeCost(brigade: BrigadeRecord): number {
  const scale = Math.max(1, Math.log10(Math.max(10, brigade.headcount) / 10) + 1);
  return Math.round((450 * Math.pow(3, scale)) / 5) * 5;
}

export class BrigadeManager {
  readonly group = new THREE.Group();
  private readonly sectors: SectorBeacon[] = [];
  private readonly brigades: BrigadeRecord[] = [];
  private nextBrigadeId = 1;

  // Visuales procedurales
  private readonly beaconMeshes = new Map<string, THREE.Group>();
  private readonly crowdMesh: THREE.InstancedMesh;
  private readonly crowdDummy = new THREE.Object3D();
  private readonly beaconMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  private readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  private readonly crowdMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.7,
  });

  private statAccumulator = 0;
  private elapsed = 0;

  constructor() {
    // 64 siluetas de multitud instanciadas para LOD medio/lejos
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.9, 5);
    bodyGeo.translate(0, 0.45, 0);
    this.crowdMesh = new THREE.InstancedMesh(bodyGeo, this.crowdMaterial, 64);
    this.crowdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.crowdMesh.count = 0;
    this.group.add(this.crowdMesh);
  }

  getSectors(): readonly SectorBeacon[] { return this.sectors; }
  getBrigades(): readonly BrigadeRecord[] { return this.brigades; }
  getCrowdCount(): number { return this.crowdMesh.count; }

  fromSnapshot(brigades: readonly BrigadeRecord[], sectors: readonly SectorBeacon[]): void {
    this.brigades.length = 0;
    for (const b of brigades) this.brigades.push({ ...b });
    for (const g of this.beaconMeshes.values()) g.removeFromParent();
    this.beaconMeshes.clear();
    this.sectors.length = 0;
    for (const s of sectors) {
      this.sectors.push({ ...s });
      this.createBeaconVisual(s);
    }
    this.updateCrowdInstances();
  }

  addSector(beacon: SectorBeacon, terrain?: Terrain): boolean {
    if (this.sectors.length >= 4) return false;
    // Validar dentro del pozo
    if (Math.abs(beacon.x) > PIT_HALF - 1 || Math.abs(beacon.z) > PIT_HALF - 1 || beacon.y > 0 || beacon.y < -MINE_DEPTH) {
      return false;
    }
    // Determinar bioma por cota vertical (12 biomas de 20 m).
    const depth = Math.abs(beacon.y);
    const layer = Math.max(1, Math.min(12, Math.ceil(depth / 20))) as number;
    beacon.layer = layer;
    beacon.radius = 8.0;

    // Calcular densidad aproximada si hay terreno
    if (terrain && !beacon.density) {
      let solidSamples = 0;
      for (let ox = -4; ox <= 4; ox += 4) {
        for (let oy = -4; oy <= 4; oy += 4) {
          for (let oz = -4; oz <= 4; oz += 4) {
            if (terrain.isSolid(beacon.x + ox, beacon.y + oy, beacon.z + oz)) solidSamples += 1;
          }
        }
      }
      beacon.density = Math.max(0.6, Math.min(1.4, solidSamples / 27));
    } else if (!beacon.density) {
      beacon.density = 1.0;
    }

    this.sectors.push(beacon);
    this.createBeaconVisual(beacon);
    this.updateCrowdInstances();
    return true;
  }

  removeSector(id: string): boolean {
    const idx = this.sectors.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    this.sectors.splice(idx, 1);

    const visual = this.beaconMeshes.get(id);
    if (visual) {
      visual.removeFromParent();
      this.beaconMeshes.delete(id);
    }
    // Desasignar brigadas de este sector
    for (const b of this.brigades) {
      if (b.sectorId === id) b.sectorId = '';
    }
    this.updateCrowdInstances();
    return true;
  }

  hireBrigade(kind: 'miners' | 'gatherers', sectorId: string, seed: number): BrigadeRecord | null {
    if (this.brigades.length >= 8) return null;
    const id = `brigade-${this.nextBrigadeId++}`;
    const name = `BRIGADA ${kind === 'miners' ? 'MINERA' : 'FLETE'} ${this.brigades.length + 1}`;
    const brigade: BrigadeRecord = {
      id,
      name,
      sectorId,
      headcount: 10,
      kind,
      rank: 1,
      seed: seed || (Math.abs(hashString(`${sectorId}:${this.nextBrigadeId}`)) & 0xfffffff),
    };
    this.brigades.push(brigade);
    this.updateCrowdInstances();
    return brigade;
  }

  promoteBrigade(id: string): boolean {
    const brigade = this.brigades.find((b) => b.id === id);
    if (!brigade || brigade.rank >= 5) return false;
    brigade.rank += 1;
    brigade.headcount += 5; // Aumento de efectivos
    this.updateCrowdInstances();
    return true;
  }

  upgradeBrigade(id: string): boolean {
    const brigade = this.brigades.find((b) => b.id === id);
    if (!brigade || brigade.headcount >= MAX_BRIGADE_HEADCOUNT) return false;
    brigade.headcount = Math.min(
      MAX_BRIGADE_HEADCOUNT,
      Math.max(10, brigade.headcount * 10),
    );
    this.updateCrowdInstances();
    return true;
  }

  assignSector(brigadeId: string, sectorId: string): boolean {
    const brigade = this.brigades.find((b) => b.id === brigadeId);
    if (!brigade) return false;
    brigade.sectorId = sectorId;
    this.updateCrowdInstances();
    return true;
  }

  private createBeaconVisual(beacon: SectorBeacon): void {
    const g = new THREE.Group();
    g.position.set(beacon.x, beacon.y, beacon.z);

    // Poste de baliza
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.4, 6), this.beaconMaterial);
    pole.position.y = 1.2;
    g.add(pole);

    // Anillo de radio delimitador (8 m)
    const ring = new THREE.Mesh(new THREE.RingGeometry(beacon.radius - 0.2, beacon.radius + 0.2, 24), this.ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);

    this.group.add(g);
    this.beaconMeshes.set(beacon.id, g);
  }

  private updateCrowdInstances(): void {
    let count = 0;
    for (const sector of this.sectors) {
      const assigned = this.brigades.filter((b) => b.sectorId === sector.id);
      const totalHeadcount = assigned.reduce((sum, b) => sum + b.headcount, 0);
      const silhouettes = Math.min(16, Math.ceil(totalHeadcount / 2));

      for (let i = 0; i < silhouettes && count < 64; i += 1) {
        const angle = (i / silhouettes) * Math.PI * 2;
        const rad = 2.0 + (i % 3) * 1.8;
        const sx = sector.x + Math.cos(angle) * rad;
        const sz = sector.z + Math.sin(angle) * rad;
        const sy = sector.y;

        this.crowdDummy.position.set(sx, sy, sz);
        this.crowdDummy.rotation.y = -angle + Math.PI / 2;
        this.crowdDummy.scale.setScalar(0.9 + (i % 2) * 0.2);
        this.crowdDummy.updateMatrix();
        this.crowdMesh.setMatrixAt(count, this.crowdDummy.matrix);
        count += 1;
      }
    }
    this.crowdMesh.count = count;
    this.crowdMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt: number, isHost: boolean, runSeed: number): { carbon: number; money: number } {
    this.elapsed += dt;
    this.statAccumulator += dt;

    // Pulso visual en balizas
    const pulse = 0.8 + Math.sin(this.elapsed * 3) * 0.2;
    this.beaconMaterial.emissiveIntensity = pulse;

    if (!isHost || this.statAccumulator < 1.0) {
      return { carbon: 0, money: 0 };
    }

    const interval = this.statAccumulator;
    this.statAccumulator = 0;
    let totalCarbon = 0;
    let totalMoney = 0;

    const layerFactors: Record<number, number> = {
      1: 1,
      2: 1.4,
      3: 1.9,
      4: 2.6,
      5: 3.4,
      6: 4.4,
      7: 5.8,
      8: 7.6,
      9: 10,
      10: 13,
      11: 17,
      12: 22,
    };

    for (const brigade of this.brigades) {
      if (!brigade.sectorId) continue;
      const sector = this.sectors.find((s) => s.id === brigade.sectorId);
      if (!sector) continue;

      const baseRate = brigade.kind === 'miners' ? 0.22 : 0.28;
      const rankMult = 1 + (brigade.rank - 1) * 0.35;
      const layerMult = layerFactors[sector.layer] ?? 1.0;
      const density = sector.density;

      const rng = mulberry32(brigade.seed ^ runSeed ^ Math.floor(this.elapsed));
      const detNoise = 0.85 + rng() * 0.3; // [0.85, 1.15]

      const yieldAmount = brigade.headcount * baseRate * rankMult * layerMult * density * detNoise * interval;

      if (brigade.kind === 'miners') {
        totalCarbon += Math.round(yieldAmount);
      } else {
        totalMoney += Math.round(yieldAmount * 0.75);
      }
    }

    return { carbon: totalCarbon, money: totalMoney };
  }

  dispose(): void {
    this.group.removeFromParent();
    this.crowdMesh.dispose();
    this.crowdMaterial.dispose();
    this.beaconMaterial.dispose();
    this.ringMaterial.dispose();
    for (const g of this.beaconMeshes.values()) {
      g.removeFromParent();
    }
    this.beaconMeshes.clear();
    this.sectors.length = 0;
    this.brigades.length = 0;
  }
}
