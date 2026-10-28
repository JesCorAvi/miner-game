import * as THREE from 'three';
import {
  LAYERS,
  MINE_DEPTH,
  PIT_HALF,
  PIT_SIZE,
  layerAtDepth,
  mapDefinition,
  mapMaxDepth,
} from '../config';
import { clamp, fbm3, hash3, smoothstep, valueNoise3 } from '../core/Rng';
import {
  buildChunkGeometry,
  createTerrainMaterial,
  geometryFromChunk,
  type DensityGrid,
} from './MarchingCubes';
import type { CarveEvent, MapId } from '../types';

export const GRID_CELL = 1;
export const GRID_X = PIT_SIZE + 1;
export const GRID_Y = MINE_DEPTH + 9;
export const GRID_Z = PIT_SIZE + 1;
export const GRID_ORIGIN_X = -PIT_HALF;
export const GRID_ORIGIN_Y = -MINE_DEPTH;
export const GRID_ORIGIN_Z = -PIT_HALF;
export const CHUNK_CELLS_X = 12;
export const CHUNK_CELLS_Y = 8;
export const CHUNK_CELLS_Z = 12;
export const CHUNK_X = Math.ceil(PIT_SIZE / CHUNK_CELLS_X);
export const CHUNK_Y = Math.ceil(GRID_Y / CHUNK_CELLS_Y);
export const CHUNK_Z = Math.ceil(PIT_SIZE / CHUNK_CELLS_Z);

export interface TerrainRayHit {
  x: number;
  y: number;
  z: number;
  distance: number;
  normal: THREE.Vector3;
  depth: number;
}

interface ChunkSlot {
  cx: number;
  cy: number;
  cz: number;
  mesh: THREE.Mesh | null;
}

function chunkKey(cx: number, cy: number, cz: number): number {
  return cx + cz * CHUNK_X + cy * CHUNK_X * CHUNK_Z;
}

export class Terrain {
  readonly group = new THREE.Group();
  readonly grid: DensityGrid;
  private material: THREE.MeshStandardMaterial;
  private readonly boundaryMaterial: THREE.MeshStandardMaterial;
  private readonly boundaryMeshes: THREE.Mesh[] = [];
  private chunks: ChunkSlot[] = [];
  private readonly dirty = new Set<number>();
  private seed = 0;
  private mapId: MapId = 'standard';
  private solidCount = 0;
  private readonly layerColors = LAYERS.map((layer) => ({
    rock: new THREE.Color(layer.rock),
    highlight: new THREE.Color(layer.highlight),
  }));
  private readonly scratchColor = new THREE.Color();

  constructor() {
    this.group.name = 'terrain';
    this.material = createTerrainMaterial();
    this.boundaryMaterial = new THREE.MeshStandardMaterial({
      color: 0x332a22,
      emissive: 0x0b0806,
      emissiveIntensity: 0.3,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
    });
    this.buildBoundary();
    this.grid = {
      data: new Float32Array(GRID_X * GRID_Y * GRID_Z),
      sizeX: GRID_X,
      sizeY: GRID_Y,
      sizeZ: GRID_Z,
      originX: GRID_ORIGIN_X,
      originY: GRID_ORIGIN_Y,
      originZ: GRID_ORIGIN_Z,
      cellSize: GRID_CELL,
    };
    for (let cy = 0; cy < CHUNK_Y; cy += 1) {
      for (let cz = 0; cz < CHUNK_Z; cz += 1) {
        for (let cx = 0; cx < CHUNK_X; cx += 1) {
          this.chunks[chunkKey(cx, cy, cz)] = { cx, cy, cz, mesh: null };
        }
      }
    }
  }

  private buildBoundary(): void {
    const size = PIT_SIZE + 0.8;
    const thickness = 0.4;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(size, thickness, size),
      this.boundaryMaterial,
    );
    floor.position.set(0, -MINE_DEPTH - thickness * 0.5 - 0.04, 0);
    this.addBoundaryMesh(floor, 'bedrock-floor');

    const wallHeight = MINE_DEPTH - 0.08;
    const wallY = -MINE_DEPTH * 0.5 - 0.04;
    const offset = 0.04;
    for (const side of [-1, 1]) {
      const xWall = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, wallHeight, size),
        this.boundaryMaterial,
      );
      xWall.position.set(side * (PIT_HALF + thickness * 0.5 + offset), wallY, 0);
      this.addBoundaryMesh(xWall, `bedrock-wall-x-${side}`);

      const zWall = new THREE.Mesh(
        new THREE.BoxGeometry(size, wallHeight, thickness),
        this.boundaryMaterial,
      );
      zWall.position.set(0, wallY, side * (PIT_HALF + thickness * 0.5 + offset));
      this.addBoundaryMesh(zWall, `bedrock-wall-z-${side}`);
    }
  }

  private addBoundaryMesh(mesh: THREE.Mesh, name: string): void {
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.group.add(mesh);
    this.boundaryMeshes.push(mesh);
  }

  generate(seed: number, mapId: MapId = 'standard'): void {
    this.seed = seed >>> 0;
    this.mapId = mapId;
    this.clearMeshes();
    const data = this.grid.data;
    const phase = (seed % 6283) / 1000;
    const map = mapDefinition(mapId);
    const depthLimit = mapMaxDepth(mapId);

    for (let iy = 0; iy < GRID_Y; iy += 1) {
      const worldY = GRID_ORIGIN_Y + iy * GRID_CELL;
      const depth = -worldY;
      for (let iz = 0; iz < GRID_Z; iz += 1) {
        const worldZ = GRID_ORIGIN_Z + iz * GRID_CELL;
        for (let ix = 0; ix < GRID_X; ix += 1) {
          const worldX = GRID_ORIGIN_X + ix * GRID_CELL;
          const index = this.gridIndex(ix, iy, iz);
          if (depth < 0 || depth > MINE_DEPTH + 0.1) {
            data[index] = 0;
            continue;
          }

          const broad = fbm3(worldX * 0.075, worldY * 0.07, worldZ * 0.075, seed, 3);
          const detail = fbm3(
            worldX * 0.19 + 4.4,
            worldY * 0.15 - 3.1,
            worldZ * 0.19 + 8.2,
            seed ^ 0x9e3779b9,
            2,
          );
          const strata = Math.sin(depth * 0.53 + phase + detail * 3.8) * 0.025;
          let density = 0.74 + broad * 0.28 + strata;
          density += (1 - clamp(depth / 7, 0, 1)) * 0.08;
          if (depth === 0) {
            density = 0.5;
          }
          if (depth > depthLimit) {
            data[index] = 1;
            continue;
          }
          const radial = Math.hypot(worldX, worldZ);
          if (map.funnelFactor) {
            const funnelRadius =
              PIT_HALF * map.funnelFactor * (1 - depth / MINE_DEPTH) + 1;
            if (radial < funnelRadius) {
              density = 0.12;
            }
          }
          if (map.openShaftRadius && radial < map.openShaftRadius) {
            density = 0.12;
          }
          if (map.sparseThreshold) {
            const cave = fbm3(
              worldX * 0.085,
              worldY * 0.085,
              worldZ * 0.085,
              seed ^ 0x51ed270b,
              3,
            );
            if (cave > map.sparseThreshold) {
              density = 0.12;
            }
          }

          const edge = Math.min(ix, GRID_X - 1 - ix, iz, GRID_Z - 1 - iz);
          if (depth > 0) {
            if (edge === 0) {
              density = 1;
            } else if (edge === 1) {
              density = Math.max(density, 0.82);
            }
          }
          if (iy === 0) {
            density = 1;
          }

          data[index] = clamp(density, 0, 1);
        }
      }
    }

    this.countSolids();
    this.markAllDirty();
    this.rebuildDirty(Number.MAX_SAFE_INTEGER);
  }

  private countSolids(): void {
    let count = 0;
    for (let index = 0; index < this.grid.data.length; index += 1) {
      if (this.grid.data[index] > 0.5) {
        count += 1;
      }
    }
    this.solidCount = count;
  }

  getSolidCount(): number {
    return this.solidCount;
  }

  getSolidFraction(): number {
    return this.solidCount / this.grid.data.length;
  }

  private gridIndex(ix: number, iy: number, iz: number): number {
    return ix + iz * GRID_X + iy * GRID_X * GRID_Z;
  }

  getDensityAt(x: number, y: number, z: number): number {
    const gx = (x - GRID_ORIGIN_X) / GRID_CELL;
    const gy = (y - GRID_ORIGIN_Y) / GRID_CELL;
    const gz = (z - GRID_ORIGIN_Z) / GRID_CELL;
    if (gx < 0 || gz < 0 || gx > GRID_X - 1 || gz > GRID_Z - 1) {
      return 0;
    }
    if (gy > GRID_Y - 1) {
      return 0;
    }
    if (gy < 0) {
      return 1;
    }
    const ix = Math.min(GRID_X - 2, Math.floor(gx));
    const iy = Math.min(GRID_Y - 2, Math.floor(gy));
    const iz = Math.min(GRID_Z - 2, Math.floor(gz));
    const fx = gx - ix;
    const fy = gy - iy;
    const fz = gz - iz;
    const data = this.grid.data;
    const sx = 1;
    const sz = GRID_X;
    const sy = GRID_X * GRID_Z;
    const i000 = ix + iz * sz + iy * sy;
    const c000 = data[i000];
    const c100 = data[i000 + sx];
    const c001 = data[i000 + sz];
    const c101 = data[i000 + sz + sx];
    const c010 = data[i000 + sy];
    const c110 = data[i000 + sy + sx];
    const c011 = data[i000 + sy + sz];
    const c111 = data[i000 + sy + sz + sx];
    const x00 = c000 + (c100 - c000) * fx;
    const x10 = c010 + (c110 - c010) * fx;
    const x01 = c001 + (c101 - c001) * fx;
    const x11 = c011 + (c111 - c011) * fx;
    const y0 = x00 + (x10 - x00) * fy;
    const y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz;
  }

  isSolid(x: number, y: number, z: number): boolean {
    return this.getDensityAt(x, y, z) > 0.5;
  }

  getNormal(x: number, y: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
    const epsilon = 0.28;
    const gx =
      this.getDensityAt(x + epsilon, y, z) - this.getDensityAt(x - epsilon, y, z);
    const gy =
      this.getDensityAt(x, y + epsilon, z) - this.getDensityAt(x, y - epsilon, z);
    const gz =
      this.getDensityAt(x, y, z + epsilon) - this.getDensityAt(x, y, z - epsilon);
    target.set(-gx, -gy, -gz);
    if (target.lengthSq() < 1e-8) {
      target.set(0, 1, 0);
    } else {
      target.normalize();
    }
    return target;
  }

  hardnessAtDepth(depth: number): number {
    return layerAtDepth(depth).hardness;
  }

  carve(event: CarveEvent, deferRebuild = false): boolean {
    const { x, y, z, r, s, shape, length, dirY } = event;
    if (-y > mapMaxDepth(this.mapId)) {
      return false;
    }
    if (r <= 0.05 || s <= 0.01) {
      return false;
    }
    const len = length ?? 0;
    const dy = dirY ?? -1;
    const reach = r + 1.15;
    const targetEndY = len > 0 ? y + dy * len : y;
    const minBoundY = Math.min(y, targetEndY);
    const maxBoundY = Math.max(y, targetEndY);

    const minX = Math.max(0, Math.floor((x - reach - GRID_ORIGIN_X) / GRID_CELL));
    const maxX = Math.min(GRID_X - 1, Math.ceil((x + reach - GRID_ORIGIN_X) / GRID_CELL));
    const minY = Math.max(0, Math.floor((minBoundY - reach - GRID_ORIGIN_Y) / GRID_CELL));
    const maxY = Math.min(GRID_Y - 1, Math.ceil((maxBoundY + reach - GRID_ORIGIN_Y) / GRID_CELL));
    const minZ = Math.max(0, Math.floor((z - reach - GRID_ORIGIN_Z) / GRID_CELL));
    const maxZ = Math.min(GRID_Z - 1, Math.ceil((z + reach - GRID_ORIGIN_Z) / GRID_CELL));
    const data = this.grid.data;
    let changed = false;

    for (let iy = minY; iy <= maxY; iy += 1) {
      const wy = GRID_ORIGIN_Y + iy * GRID_CELL;
      for (let iz = minZ; iz <= maxZ; iz += 1) {
        const wz = GRID_ORIGIN_Z + iz * GRID_CELL;
        for (let ix = minX; ix <= maxX; ix += 1) {
          const wx = GRID_ORIGIN_X + ix * GRID_CELL;
          let distance = Math.hypot(wx - x, wy - y, wz - z);
          if (shape === 'capsule' && len > 0) {
            const segSpan = targetEndY - y;
            const t = clamp((wy - y) / (Math.abs(segSpan) > 1e-4 ? segSpan : 1), 0, 1);
            const closeY = y + segSpan * t;
            distance = Math.hypot(wx - x, wy - closeY, wz - z);
          } else if (shape === 'cone' && len > 0) {
            const t = clamp((y - wy) / len, 0, 1);
            const coneScale = 0.35 + 0.65 * t;
            const horiz = Math.hypot(wx - x, wz - z);
            if (wy < minBoundY - reach * 0.2 || wy > maxBoundY + reach * 0.4) {
              continue;
            }
            distance = Math.max(horiz / coneScale, Math.abs(wy - (y + targetEndY) * 0.5) * 0.3);
          }
          if (distance > reach) {
            continue;
          }
          const falloff = 1 - distance / reach;
          const smooth = smoothstep(0, 1, falloff);
          const macro = 0.92 + hash3(ix >> 1, iy >> 1, iz >> 1, this.seed ^ 0x165667b1) * 0.16;
          const target = 0.5 - s * 1.12 * Math.pow(smooth, 1.7) * macro;
          const index = this.gridIndex(ix, iy, iz);
          const wasSolid = data[index] > 0.5;
          if (data[index] <= target) {
            continue;
          }
          data[index] = Math.max(0, target);
          if (wasSolid && data[index] <= 0.5) {
            this.solidCount -= 1;
          }
          changed = true;
        }
      }
    }

    if (!changed) {
      return false;
    }

    const minCX = clamp(Math.floor((minX - 1) / CHUNK_CELLS_X), 0, CHUNK_X - 1);
    const maxCX = clamp(Math.floor(maxX / CHUNK_CELLS_X), 0, CHUNK_X - 1);
    const minCY = clamp(Math.floor((minY - 1) / CHUNK_CELLS_Y), 0, CHUNK_Y - 1);
    const maxCY = clamp(Math.floor(maxY / CHUNK_CELLS_Y), 0, CHUNK_Y - 1);
    const minCZ = clamp(Math.floor((minZ - 1) / CHUNK_CELLS_Z), 0, CHUNK_Z - 1);
    const maxCZ = clamp(Math.floor(maxZ / CHUNK_CELLS_Z), 0, CHUNK_Z - 1);
    for (let cy = minCY; cy <= maxCY; cy += 1) {
      for (let cz = minCZ; cz <= maxCZ; cz += 1) {
        for (let cx = minCX; cx <= maxCX; cx += 1) {
          this.dirty.add(chunkKey(cx, cy, cz));
        }
      }
    }
    if (!deferRebuild) {
      this.rebuildDirty(4);
    }
    return true;
  }

  carveBatch(events: readonly CarveEvent[], deferRebuild = false): boolean {
    if (events.length === 0) return false;
    let anyChanged = false;
    for (const event of events) {
      if (this.carve(event, true)) {
        anyChanged = true;
      }
    }
    if (anyChanged && !deferRebuild) {
      this.rebuildDirty(4);
    }
    return anyChanged;
  }

  applyCarveHistory(events: readonly CarveEvent[]): void {
    for (const event of events) {
      this.carve(event, true);
    }
    this.rebuildDirty(Number.MAX_SAFE_INTEGER);
  }

  update(cameraPos?: THREE.Vector3, slowFrame = false): void {
    if (this.dirty.size > 0) {
      const budget = slowFrame ? 2 : 4;
      this.rebuildDirty(budget, cameraPos);
    }
  }

  flushDirty(): void {
    this.rebuildDirty(Number.MAX_SAFE_INTEGER);
  }

  getDirtyCount(): number {
    return this.dirty.size;
  }

  private markAllDirty(): void {
    for (let index = 0; index < this.chunks.length; index += 1) {
      this.dirty.add(index);
    }
  }

  private rebuildDirty(maxChunks: number, cameraPos?: THREE.Vector3): void {
    let keys = [...this.dirty];
    if (cameraPos && keys.length > 1) {
      keys.sort((a, b) => {
        const slotA = this.chunks[a];
        const slotB = this.chunks[b];
        if (!slotA || !slotB) return 0;
        const ax = GRID_ORIGIN_X + (slotA.cx + 0.5) * CHUNK_CELLS_X * GRID_CELL;
        const ay = GRID_ORIGIN_Y + (slotA.cy + 0.5) * CHUNK_CELLS_Y * GRID_CELL;
        const az = GRID_ORIGIN_Z + (slotA.cz + 0.5) * CHUNK_CELLS_Z * GRID_CELL;
        const bx = GRID_ORIGIN_X + (slotB.cx + 0.5) * CHUNK_CELLS_X * GRID_CELL;
        const by = GRID_ORIGIN_Y + (slotB.cy + 0.5) * CHUNK_CELLS_Y * GRID_CELL;
        const bz = GRID_ORIGIN_Z + (slotB.cz + 0.5) * CHUNK_CELLS_Z * GRID_CELL;
        const distA = (ax - cameraPos.x) ** 2 + (ay - cameraPos.y) ** 2 + (az - cameraPos.z) ** 2;
        const distB = (bx - cameraPos.x) ** 2 + (by - cameraPos.y) ** 2 + (bz - cameraPos.z) ** 2;
        return distA - distB;
      });
    }

    let rebuilt = 0;
    for (const key of keys) {
      if (rebuilt >= maxChunks) {
        break;
      }
      this.dirty.delete(key);
      this.rebuildChunk(key);
      rebuilt += 1;
    }
  }

  private rebuildChunk(key: number): void {
    const slot = this.chunks[key];
    if (!slot) {
      return;
    }
    if (slot.mesh) {
      this.group.remove(slot.mesh);
      slot.mesh.geometry.dispose();
      slot.mesh = null;
    }
    const startIX = slot.cx * CHUNK_CELLS_X;
    const startIY = slot.cy * CHUNK_CELLS_Y;
    const startIZ = slot.cz * CHUNK_CELLS_Z;
    const data = buildChunkGeometry(
      this.grid,
      startIX,
      startIY,
      startIZ,
      CHUNK_CELLS_X,
      CHUNK_CELLS_Y,
      CHUNK_CELLS_Z,
      (x, y, z, out) => this.colorAt(x, y, z, out),
    );
    if (!data) {
      return;
    }
    const geometry = geometryFromChunk(data);
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `terrain-chunk-${slot.cx}-${slot.cy}-${slot.cz}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
    slot.mesh = mesh;
  }

  private colorAt(x: number, y: number, z: number, out: THREE.Color): void {
    const depth = clamp(-y, 0, MINE_DEPTH);
    const layer = layerAtDepth(depth);
    const palette = this.layerColors[layer.index - 1];
    const quantizedX = Math.floor(x / 1.2);
    const quantizedY = Math.floor(y / 1.2);
    const quantizedZ = Math.floor(z / 1.2);
    const grain = hash3(quantizedX, quantizedY, quantizedZ, this.seed);
    const facet = hash3(Math.floor(x * 3.1), Math.floor(y * 2.9), Math.floor(z * 3.1), this.seed);
    const contour = valueNoise3(
      quantizedX * 0.16,
      quantizedY * 0.16,
      quantizedZ * 0.16,
      this.seed ^ 0x2545f491,
    );
    const surface = depth < 1.5;
    const grainMix = surface
      ? 0.36 + contour * 0.035
      : 0.12 + grain * 0.58 + contour * 0.16;
    const shade = surface ? 0.985 + facet * 0.02 : 0.7 + facet * 0.46;
    out
      .copy(palette.rock)
      .lerp(palette.highlight, grainMix)
      .multiplyScalar(shade);
    if (layer.index === 4 && grain > 0.9) {
      out.lerp(this.scratchColor.setHex(0x86d8ff), 0.4);
    } else if (layer.index === 3 && grain > 0.95) {
      out.lerp(this.scratchColor.setHex(0xff7b3d), 0.3);
    }
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 40): TerrainRayHit | null {
    const dir = direction.clone().normalize();
    let previous = 0;
    const step = 0.11;
    let distance = 0.05;
    let found = -1;
    while (distance <= maxDistance) {
      const x = origin.x + dir.x * distance;
      const y = origin.y + dir.y * distance;
      const z = origin.z + dir.z * distance;
      if (this.getDensityAt(x, y, z) > 0.5) {
        found = distance;
        break;
      }
      previous = distance;
      distance += step;
    }
    if (found < 0) {
      return null;
    }
    let low = previous;
    let high = found;
    for (let iteration = 0; iteration < 7; iteration += 1) {
      const mid = (low + high) * 0.5;
      if (
        this.getDensityAt(origin.x + dir.x * mid, origin.y + dir.y * mid, origin.z + dir.z * mid) >
        0.5
      ) {
        high = mid;
      } else {
        low = mid;
      }
    }
    const hitDistance = high;
    const x = origin.x + dir.x * hitDistance;
    const y = origin.y + dir.y * hitDistance;
    const z = origin.z + dir.z * hitDistance;
    const normal = this.getNormal(x, y, z);
    return {
      x,
      y,
      z,
      distance: hitDistance,
      normal,
      depth: clamp(-y, 0, MINE_DEPTH),
    };
  }

  capsuleBlocked(
    feetX: number,
    feetY: number,
    feetZ: number,
    radius: number,
    height: number,
  ): boolean {
    const heights = [0.24, height * 0.5, height - 0.16];
    for (const heightRatio of heights) {
      const y = feetY + heightRatio;
      if (this.isSolid(feetX, y, feetZ)) {
        return true;
      }
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2;
        if (
          this.isSolid(
            feetX + Math.cos(angle) * radius,
            y,
            feetZ + Math.sin(angle) * radius,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isGrounded(feetX: number, feetY: number, feetZ: number, radius: number): boolean {
    const sampleY = feetY - 0.08;
    if (this.isSolid(feetX, sampleY, feetZ)) {
      return true;
    }
    const ring = radius * 0.7;
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
      if (
        this.isSolid(
          feetX + Math.cos(angle) * ring,
          sampleY,
          feetZ + Math.sin(angle) * ring,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  getSeed(): number {
    return this.seed;
  }

  getMeshCount(): number {
    return this.chunks.reduce((count, chunk) => (chunk.mesh ? count + 1 : count), 0);
  }

  dispose(): void {
    this.clearMeshes();
    for (const mesh of this.boundaryMeshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    this.boundaryMeshes.length = 0;
    this.boundaryMaterial.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }

  private clearMeshes(): void {
    for (const slot of this.chunks) {
      if (slot.mesh) {
        this.group.remove(slot.mesh);
        slot.mesh.geometry.dispose();
        slot.mesh = null;
      }
    }
    this.dirty.clear();
  }
}
