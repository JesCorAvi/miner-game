import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LADDER_HEIGHT } from '../config';
import type { NetworkLadderState } from '../types';

const MAX_LADDERS = 80;
const LADDER_TOP_OFFSET = 0.08;

function combine(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  return merged ?? new THREE.BoxGeometry(0.3, LADDER_HEIGHT, 0.1);
}

function buildVerticalGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const railX of [-0.31, 0.31]) {
    const rail = new THREE.BoxGeometry(0.075, LADDER_HEIGHT, 0.075);
    rail.translate(railX, LADDER_HEIGHT * 0.5, 0);
    parts.push(rail);
  }
  const rungCount = 12;
  for (let index = 0; index < rungCount; index += 1) {
    const rung = new THREE.BoxGeometry(0.64, 0.045, 0.055);
    rung.translate(0, 0.22 + (index / (rungCount - 1)) * (LADDER_HEIGHT - 0.42), 0.035);
    parts.push(rung);
  }
  const topBrace = new THREE.BoxGeometry(0.7, 0.09, 0.08);
  topBrace.translate(0, LADDER_HEIGHT - 0.08, 0.04);
  parts.push(topBrace);
  const merged = combine(parts);
  for (const part of parts) {
    part.dispose();
  }
  return merged;
}

function buildHorizontalGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const railX of [-0.31, 0.31]) {
    const rail = new THREE.BoxGeometry(0.075, 0.075, LADDER_HEIGHT);
    rail.translate(railX, 0.04, 0);
    parts.push(rail);
  }
  const rungCount = 12;
  for (let index = 0; index < rungCount; index += 1) {
    const rung = new THREE.BoxGeometry(0.64, 0.045, 0.055);
    rung.translate(
      0,
      0.05,
      -LADDER_HEIGHT * 0.5 + 0.22 + (index / (rungCount - 1)) * (LADDER_HEIGHT - 0.42),
    );
    parts.push(rung);
  }
  const endBrace = new THREE.BoxGeometry(0.7, 0.09, 0.08);
  endBrace.translate(0, 0.04, LADDER_HEIGHT * 0.5 - 0.08);
  parts.push(endBrace);
  const merged = combine(parts);
  for (const part of parts) {
    part.dispose();
  }
  return merged;
}

export interface LadderAnchor {
  kind: 'vertical-top' | 'horizontal-end';
  ladder: NetworkLadderState;
}

export class Ladders {
  readonly group = new THREE.Group();
  private readonly ladders = new Map<string, NetworkLadderState>();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly verticalGeometry: THREE.BufferGeometry;
  private readonly horizontalGeometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly ghostMaterial: THREE.MeshBasicMaterial;
  private readonly ghostVertical: THREE.Mesh;
  private readonly ghostHorizontal: THREE.Mesh;
  private readonly ray = new THREE.Ray();
  private readonly closest = new THREE.Vector3();

  constructor() {
    this.group.name = 'placed-ladders';
    this.verticalGeometry = buildVerticalGeometry();
    this.horizontalGeometry = buildHorizontalGeometry();
    this.material = new THREE.MeshStandardMaterial({
      color: 0x9b6a2f,
      emissive: 0x8a5117,
      emissiveIntensity: 0.55,
      roughness: 0.48,
      metalness: 0.62,
      flatShading: true,
    });
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fffd0,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.ghostVertical = new THREE.Mesh(this.verticalGeometry, this.ghostMaterial);
    this.ghostHorizontal = new THREE.Mesh(this.horizontalGeometry, this.ghostMaterial);
    for (const ghost of [this.ghostVertical, this.ghostHorizontal]) {
      ghost.visible = false;
      ghost.renderOrder = 20;
      ghost.frustumCulled = false;
      this.group.add(ghost);
    }
  }

  add(ladder: NetworkLadderState): boolean {
    if (this.ladders.size >= MAX_LADDERS || this.ladders.has(ladder.id)) {
      return false;
    }
    const orientation = ladder.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    const clean: NetworkLadderState = {
      id: ladder.id.slice(0, 64),
      x: ladder.x,
      y: ladder.y,
      z: ladder.z,
      nx: ladder.nx,
      nz: ladder.nz,
      height: Math.max(1, Math.min(8, ladder.height)),
      orientation,
      anchorId: ladder.anchorId?.slice(0, 64),
    };
    this.ladders.set(clean.id, clean);
    const geometry =
      orientation === 'horizontal' ? this.horizontalGeometry : this.verticalGeometry;
    const mesh = new THREE.Mesh(geometry, this.material);
    this.applyTransform(mesh, clean);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.name = `ladder-${clean.id}`;
    this.group.add(mesh);
    this.meshes.set(clean.id, mesh);
    return true;
  }

  private applyTransform(mesh: THREE.Mesh, ladder: NetworkLadderState): void {
    if (ladder.orientation === 'horizontal') {
      mesh.position.set(
        ladder.x + ladder.nx * ladder.height * 0.5,
        ladder.y,
        ladder.z + ladder.nz * ladder.height * 0.5,
      );
      mesh.rotation.set(0, Math.atan2(ladder.nx, ladder.nz), 0);
      mesh.scale.set(1, 1, ladder.height / LADDER_HEIGHT);
    } else {
      mesh.position.set(ladder.x, ladder.y, ladder.z);
      mesh.rotation.set(0, Math.atan2(ladder.nx, ladder.nz), 0);
      mesh.scale.set(1, ladder.height / LADDER_HEIGHT, 1);
    }
  }

  fromSnapshot(ladders: readonly NetworkLadderState[]): void {
    this.clear();
    for (const ladder of ladders) {
      this.add(ladder);
    }
  }

  getSnapshot(): NetworkLadderState[] {
    return [...this.ladders.values()].map((ladder) => ({ ...ladder }));
  }

  getById(id: string): NetworkLadderState | undefined {
    return this.ladders.get(id);
  }

  getAll(): NetworkLadderState[] {
    return [...this.ladders.values()];
  }

  findNearest(position: THREE.Vector3): NetworkLadderState | null {
    let best: NetworkLadderState | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'vertical') {
        continue;
      }
      const top = ladder.y + ladder.height;
      if (position.y < ladder.y - 0.75 || position.y > top - 0.02) {
        continue;
      }
      const horizontal = Math.hypot(position.x - ladder.x, position.z - ladder.z);
      if (horizontal > 1.05) {
        continue;
      }
      const score = horizontal + Math.abs(position.y - ladder.y) * 0.06;
      if (score < bestDistance) {
        bestDistance = score;
        best = ladder;
      }
    }
    return best;
  }

  findBelow(position: THREE.Vector3, current: NetworkLadderState): NetworkLadderState | null {
    let best: NetworkLadderState | null = null;
    let bestTop = Number.NEGATIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'vertical' || ladder.id === current.id) {
        continue;
      }
      const top = ladder.y + ladder.height;
      if (top > current.y + 0.05) {
        continue;
      }
      if (position.y < ladder.y - 0.75 || position.y > top + 0.1) {
        continue;
      }
      if (Math.hypot(position.x - ladder.x, position.z - ladder.z) > 1.05) {
        continue;
      }
      if (top > bestTop) {
        best = ladder;
        bestTop = top;
      }
    }
    return best;
  }

  findAnchor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
  ): LadderAnchor | null {
    this.ray.set(origin, direction.clone().normalize());
    let best: LadderAnchor | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      const point =
        ladder.orientation === 'horizontal'
          ? new THREE.Vector3(
              ladder.x + ladder.nx * ladder.height,
              ladder.y + LADDER_TOP_OFFSET,
              ladder.z + ladder.nz * ladder.height,
            )
          : new THREE.Vector3(
              ladder.x,
              ladder.y + ladder.height,
              ladder.z,
            );
      this.ray.closestPointToPoint(point, this.closest);
      const along = this.closest.distanceTo(origin);
      if (along <= 0.2 || along > maxDistance) {
        continue;
      }
      const perpendicular = this.closest.distanceTo(point);
      if (perpendicular > 1.05 || along >= bestDistance) {
        continue;
      }
      bestDistance = along;
      best = {
        kind: ladder.orientation === 'horizontal' ? 'horizontal-end' : 'vertical-top',
        ladder,
      };
    }
    return best;
  }

  findHorizontalTop(
    x: number,
    z: number,
    feetY: number,
    radius: number,
    maxStep: number,
  ): number | null {
    let support: number | null = null;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'horizontal') {
        continue;
      }
      const top = ladder.y + LADDER_TOP_OFFSET;
      if (top < feetY - 0.1 || top > feetY + maxStep) {
        continue;
      }
      const endX = ladder.x + ladder.nx * ladder.height;
      const endZ = ladder.z + ladder.nz * ladder.height;
      const dx = endX - ladder.x;
      const dz = endZ - ladder.z;
      const lengthSq = dx * dx + dz * dz;
      const t =
        lengthSq > 1e-6
          ? Math.max(0, Math.min(1, ((x - ladder.x) * dx + (z - ladder.z) * dz) / lengthSq))
          : 0;
      const closestX = ladder.x + dx * t;
      const closestZ = ladder.z + dz * t;
      if (Math.hypot(x - closestX, z - closestZ) > 0.32 + radius) {
        continue;
      }
      if (support === null || top > support) {
        support = top;
      }
    }
    return support;
  }

  findHorizontalSupport(
    x: number,
    oldY: number,
    nextY: number,
    z: number,
    radius: number,
  ): number | null {
    let support: number | null = null;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'horizontal') {
        continue;
      }
      const top = ladder.y + LADDER_TOP_OFFSET;
      if (oldY < top - 0.12 || nextY > top + 0.12) {
        continue;
      }
      const endX = ladder.x + ladder.nx * ladder.height;
      const endZ = ladder.z + ladder.nz * ladder.height;
      const dx = endX - ladder.x;
      const dz = endZ - ladder.z;
      const lengthSq = dx * dx + dz * dz;
      const t =
        lengthSq > 1e-6
          ? Math.max(0, Math.min(1, ((x - ladder.x) * dx + (z - ladder.z) * dz) / lengthSq))
          : 0;
      const closestX = ladder.x + dx * t;
      const closestZ = ladder.z + dz * t;
      if (Math.hypot(x - closestX, z - closestZ) > 0.32 + radius) {
        continue;
      }
      if (support === null || top > support) {
        support = top;
      }
    }
    return support;
  }

  overlaps(candidate: NetworkLadderState): boolean {
    for (const ladder of this.ladders.values()) {
      if (ladder.id === candidate.anchorId) {
        continue;
      }
      if (ladder.orientation !== candidate.orientation) {
        if (candidate.orientation === 'vertical') {
          const horizontalTop = ladder.y + LADDER_TOP_OFFSET;
          if (
            horizontalTop >= candidate.y - 0.1 &&
            horizontalTop <= candidate.y + candidate.height + 0.1 &&
            pointSegmentDistance(
              candidate.x,
              candidate.z,
              ladder.x,
              ladder.z,
              ladder.x + ladder.nx * ladder.height,
              ladder.z + ladder.nz * ladder.height,
            ) < 0.45
          ) {
            return true;
          }
        } else {
          const candidateTop = candidate.y + LADDER_TOP_OFFSET;
          if (
            candidateTop >= ladder.y - 0.1 &&
            candidateTop <= ladder.y + ladder.height + 0.1 &&
            pointSegmentDistance(
              ladder.x,
              ladder.z,
              candidate.x,
              candidate.z,
              candidate.x + candidate.nx * candidate.height,
              candidate.z + candidate.nz * candidate.height,
            ) < 0.45
          ) {
            return true;
          }
        }
        continue;
      }
      if (candidate.orientation === 'vertical') {
        if (Math.hypot(ladder.x - candidate.x, ladder.z - candidate.z) > 0.35) {
          continue;
        }
        const start = Math.max(ladder.y, candidate.y);
        const end = Math.min(
          ladder.y + ladder.height,
          candidate.y + candidate.height,
        );
        if (end - start > 0.2) {
          return true;
        }
      } else {
        if (Math.abs(ladder.y - candidate.y) > 0.25) {
          continue;
        }
        const ax = ladder.x;
        const az = ladder.z;
        const bx = ladder.x + ladder.nx * ladder.height;
        const bz = ladder.z + ladder.nz * ladder.height;
        const cx = candidate.x;
        const cz = candidate.z;
        const dx = candidate.x + candidate.nx * candidate.height;
        const dz = candidate.z + candidate.nz * candidate.height;
        if (segmentsNear(ax, az, bx, bz, cx, cz, dx, dz, 0.45)) {
          return true;
        }
      }
    }
    return false;
  }

  showGhost(candidate: NetworkLadderState | null, valid: boolean): void {
    this.ghostVertical.visible = false;
    this.ghostHorizontal.visible = false;
    if (!candidate) {
      return;
    }
    const ghost =
      candidate.orientation === 'horizontal' ? this.ghostHorizontal : this.ghostVertical;
    this.applyTransform(ghost, candidate);
    this.ghostMaterial.color.setHex(valid ? 0x6fffd0 : 0xff6b5a);
    this.ghostMaterial.opacity = valid ? 0.32 : 0.26;
    ghost.visible = true;
  }

  clearGhost(): void {
    this.ghostVertical.visible = false;
    this.ghostHorizontal.visible = false;
  }

  clear(): void {
    for (const id of [...this.meshes.keys()]) {
      const mesh = this.meshes.get(id);
      if (mesh) {
        this.group.remove(mesh);
      }
    }
    this.meshes.clear();
    this.ladders.clear();
  }

  getCount(): number {
    return this.ladders.size;
  }

  dispose(): void {
    this.clear();
    this.clearGhost();
    this.group.removeFromParent();
    this.verticalGeometry.dispose();
    this.horizontalGeometry.dispose();
    this.material.dispose();
    this.ghostMaterial.dispose();
  }
}

function segmentsNear(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  dx: number,
  dz: number,
  threshold: number,
): boolean {
  return (
    pointSegmentDistance(ax, az, cx, cz, dx, dz) < threshold ||
    pointSegmentDistance(bx, bz, cx, cz, dx, dz) < threshold ||
    pointSegmentDistance(cx, cz, ax, az, bx, bz) < threshold ||
    pointSegmentDistance(dx, dz, ax, az, bx, bz) < threshold
  );
}

function pointSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-6) {
    return Math.hypot(px - ax, pz - az);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
