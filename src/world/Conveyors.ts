/**
 * Conveyors.ts — Cintas de retorno modulares (Sección 3.7).
 * Módulos de 3 m que atraen y transportan pellets físicos hacia la tolva principal o tolvas de campaña.
 * Detecta atascos si un desprendimiento de roca obstruye la línea.
 */

import * as THREE from 'three';
import { MINE_DEPTH, PIT_HALF } from '../config';
import type { LootField } from './Loot';
import type { Terrain } from './Terrain';

export interface ConveyorModule {
  id: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  isJammed: boolean;
}

export class ConveyorSystem {
  readonly group = new THREE.Group();
  private readonly modules: ConveyorModule[] = [];
  private static readonly MAX_MODULES = 32;
  private nextModuleId = 1;

  // Visuales procedurales
  private readonly mesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly beltMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.2,
  });
  private readonly rollerMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.8,
  });
  private readonly warningMaterial = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });

  private jamTimer = 0;
  private anyJammed = false;

  constructor() {
    // Geometría de módulo de cinta: 3 m de largo x 0.8 m de ancho x 0.2 m de alto
    const frameGeo = new THREE.BoxGeometry(0.8, 0.2, 3.0);
    this.mesh = new THREE.InstancedMesh(frameGeo, this.beltMaterial, ConveyorSystem.MAX_MODULES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.group.add(this.mesh);
  }

  getModules(): readonly ConveyorModule[] { return this.modules; }
  isAnyJammed(): boolean { return this.anyJammed; }
  fromSnapshot(modules: readonly ConveyorModule[]): void {
    this.modules.length = 0;
    for (const m of modules) this.modules.push({ ...m });
    this.updateMeshInstances();
  }
  getAvailableStock(purchasedCount: number): number {
    return Math.max(0, Math.min(ConveyorSystem.MAX_MODULES, purchasedCount) - this.modules.length);
  }

  placeModule(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
    terrain?: Terrain,
  ): ConveyorModule | null {
    if (this.modules.length >= ConveyorSystem.MAX_MODULES) return null;
    if (Math.abs(x) > PIT_HALF - 0.5 || Math.abs(z) > PIT_HALF - 0.5 || y > 1 || y < -MINE_DEPTH) {
      return false as unknown as null;
    }

    const len = Math.hypot(dirX, dirZ);
    const ndx = len > 1e-4 ? dirX / len : 0;
    const ndz = len > 1e-4 ? dirZ / len : -1;

    // Verificar si está enterrada
    if (terrain && terrain.isSolid(x, y + 0.3, z)) {
      return null;
    }

    const id = `conveyor-${this.nextModuleId++}`;
    const module: ConveyorModule = {
      id,
      x,
      y,
      z,
      dirX: ndx,
      dirZ: ndz,
      speed: 3.5,
      isJammed: false,
    };
    this.modules.push(module);
    this.updateMeshInstances();
    return module;
  }

  removeModule(id: string): boolean {
    const idx = this.modules.findIndex((m) => m.id === id);
    if (idx < 0) return false;
    this.modules.splice(idx, 1);
    this.updateMeshInstances();
    return true;
  }

  clear(): void {
    this.modules.length = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.anyJammed = false;
  }

  private updateMeshInstances(): void {
    this.mesh.count = this.modules.length;
    for (let i = 0; i < this.modules.length; i += 1) {
      const m = this.modules[i];
      this.dummy.position.set(m.x, m.y + 0.1, m.z);
      const angle = Math.atan2(m.dirX, m.dirZ);
      this.dummy.rotation.set(0, angle, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(
    dt: number,
    loot: LootField,
    terrain?: Terrain,
    hopperPos?: THREE.Vector3,
    onHopperDeposit?: (pelletId: number) => void,
  ): void {
    if (this.modules.length === 0) return;

    this.jamTimer += dt;
    if (this.jamTimer >= 0.5) {
      this.jamTimer = 0;
      let jammed = false;
      for (const m of this.modules) {
        if (terrain && terrain.isSolid(m.x, m.y + 0.3, m.z)) {
          m.isJammed = true;
          jammed = true;
        } else {
          m.isJammed = false;
        }
      }
      this.anyJammed = jammed;
    }

    // Atraer y desplazar pellets a lo largo de módulos operativos
    for (const m of this.modules) {
      if (m.isJammed) continue;

      loot.queryNear(m.x, m.y, m.z, 2.0, (pellet, pelletIndex) => {
        // Vector hacia el centro de la cinta
        const dx = m.x - pellet.x;
        const dz = m.z - pellet.z;
        const distHoriz = Math.hypot(dx, dz);

        if (distHoriz > 0.4) {
          // Centrado hacia el eje de la cinta
          pellet.vx += (dx / distHoriz) * 4.0 * dt;
          pellet.vz += (dz / distHoriz) * 4.0 * dt;
        }

        // Impulso hacia adelante en la dirección de la cinta
        pellet.vx = m.dirX * m.speed;
        pellet.vz = m.dirZ * m.speed;
        pellet.vy = Math.max(-0.5, pellet.vy);

        // Si llega cerca de la tolva principal, depositar
        if (hopperPos && onHopperDeposit) {
          const distToHopper = Math.hypot(pellet.x - hopperPos.x, pellet.z - hopperPos.z);
          if (distToHopper < 2.5 && Math.abs(pellet.y - hopperPos.y) < 2.0) {
            onHopperDeposit(pelletIndex);
          }
        }
      });
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mesh.dispose();
    this.beltMaterial.dispose();
    this.rollerMaterial.dispose();
    this.warningMaterial.dispose();
    this.modules.length = 0;
  }
}
