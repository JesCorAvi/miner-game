import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LADDER_HEIGHT } from '../config';
import type { NetworkLadderState } from '../types';

const MAX_LADDERS = 80;
const LADDER_TOP_OFFSET = 0.08;
const DIAGONAL_RUN = Math.SQRT1_2;

function isDiagonalOrientation(orientation: NetworkLadderState['orientation']): boolean {
  return orientation === 'diagonal-up' || orientation === 'diagonal-down';
}

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

export interface LadderDiagonalLink {
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  anchorId: string;
  distance: number;
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
    const orientation: NetworkLadderState['orientation'] =
      ladder.orientation === 'horizontal'
        ? 'horizontal'
        : ladder.orientation === 'diagonal-up'
          ? 'diagonal-up'
          : ladder.orientation === 'diagonal-down'
            ? 'diagonal-down'
            : 'vertical';
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
      mesh.quaternion.setFromEuler(mesh.rotation);
      mesh.scale.set(1, 1, ladder.height / LADDER_HEIGHT);
      return;
    }
    if (ladder.orientation === 'vertical') {
      mesh.position.set(ladder.x, ladder.y, ladder.z);
      mesh.rotation.set(0, Math.atan2(ladder.nx, ladder.nz), 0);
      mesh.quaternion.setFromEuler(mesh.rotation);
      mesh.scale.set(1, ladder.height / LADDER_HEIGHT, 1);
      return;
    }
    const sign = ladder.orientation === 'diagonal-up' ? 1 : -1;
    const slopeX = ladder.nx * DIAGONAL_RUN;
    const slopeY = sign * DIAGONAL_RUN;
    const slopeZ = ladder.nz * DIAGONAL_RUN;
    // La geometría vertical crece desde y=0, no está centrada: la rampa debe
    // nacer en su punto de anclaje, igual que la escalera vertical. Si se
    // coloca en el punto medio, la malla queda media eslora más arriba y el
    // fantasma aparece flotando lejos de la escalera o del suelo.
    mesh.position.set(ladder.x, ladder.y, ladder.z);
    const xAxis = new THREE.Vector3(-ladder.nz, 0, ladder.nx).normalize();
    const yAxis = new THREE.Vector3(slopeX, slopeY, slopeZ).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.scale.set(1, ladder.height / LADDER_HEIGHT, 1);
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

  /**
   * Cima vertical más cercana a los pies del jugador. Permite colocar un
   * puente encima sin tener que mirar exactamente el punto de la cima.
   */
  findNearestTop(position: THREE.Vector3, maxDistance: number): NetworkLadderState | null {
    let best: NetworkLadderState | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'vertical') {
        continue;
      }
      const top = ladder.y + ladder.height;
      const verticalDistance = Math.abs(position.y - top);
      if (verticalDistance > 0.75) {
        continue;
      }
      const horizontal = Math.hypot(position.x - ladder.x, position.z - ladder.z);
      if (horizontal > maxDistance) {
        continue;
      }
      const score = horizontal + verticalDistance * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = ladder;
      }
    }
    return best;
  }

  /** Extremo de puente más cercano a los pies, para continuar desde ahí. */
  findNearestEnd(position: THREE.Vector3, maxDistance: number): NetworkLadderState | null {
    let best: NetworkLadderState | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'horizontal') {
        continue;
      }
      const top = ladder.y + LADDER_TOP_OFFSET;
      const verticalDistance = Math.abs(position.y - top);
      if (verticalDistance > 0.75) {
        continue;
      }
      const endX = ladder.x + ladder.nx * ladder.height;
      const endZ = ladder.z + ladder.nz * ladder.height;
      const horizontal = Math.hypot(position.x - endX, position.z - endZ);
      if (horizontal > maxDistance) {
        continue;
      }
      const score = horizontal + verticalDistance * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = ladder;
      }
    }
    return best;
  }

  /**
   * Distancia real de un punto a la geometría de una escalera. Sirve para
   * comprobar que un tramo anclado a otra escalera la toca de verdad.
   */
  contactDistance(id: string, x: number, y: number, z: number): number {
    const ladder = this.ladders.get(id);
    if (!ladder) {
      return Number.POSITIVE_INFINITY;
    }
    if (ladder.orientation === 'vertical') {
      const top = ladder.y + ladder.height;
      const closestY = THREE.MathUtils.clamp(y, ladder.y, top);
      return Math.hypot(x - ladder.x, y - closestY, z - ladder.z);
    }
    let ax = ladder.x;
    let ay = ladder.y;
    let az = ladder.z;
    let bx = ladder.x + ladder.nx * ladder.height;
    let by = ladder.y;
    let bz = ladder.z + ladder.nz * ladder.height;
    if (isDiagonalOrientation(ladder.orientation)) {
      const sign = ladder.orientation === 'diagonal-up' ? 1 : -1;
      const run = ladder.height * DIAGONAL_RUN;
      bx = ladder.x + ladder.nx * run;
      by = ladder.y + sign * run;
      bz = ladder.z + ladder.nz * run;
    } else {
      ay += 0.04;
      by += 0.04;
    }
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const lengthSq = dx * dx + dy * dy + dz * dz;
    if (lengthSq < 1e-6) {
      return Math.hypot(x - ax, y - ay, z - az);
    }
    const t = THREE.MathUtils.clamp(
      ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / lengthSq,
      0,
      1,
    );
    return Math.hypot(x - (ax + dx * t), y - (ay + dy * t), z - (az + dz * t));
  }

  findNearest(
    position: THREE.Vector3,
    allowAboveTop = false,
  ): NetworkLadderState | null {
    let best: NetworkLadderState | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'vertical') {
        continue;
      }
      const top = ladder.y + ladder.height;
      const upper = allowAboveTop ? top + 0.35 : top - 0.02;
      if (position.y < ladder.y - 0.75 || position.y > upper) {
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

  /** Punto de una vertical más cercano a la mirada (para anclar un puente). */
  findVerticalPoint(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
  ): { ladder: NetworkLadderState; y: number; distance: number } | null {
    this.ray.set(origin, direction.clone().normalize());
    let best: { ladder: NetworkLadderState; y: number; distance: number } | null = null;
    for (const ladder of this.ladders.values()) {
      if (ladder.orientation !== 'vertical') {
        continue;
      }
      const top = ladder.y + ladder.height;
      for (let y = ladder.y; y <= top + 0.01; y += 0.2) {
        const point = new THREE.Vector3(ladder.x, y, ladder.z);
        this.ray.closestPointToPoint(point, this.closest);
        const along = this.closest.distanceTo(origin);
        if (along <= 0.2 || along > maxDistance) {
          continue;
        }
        if (this.closest.distanceTo(point) > 1.05) {
          continue;
        }
        if (!best || along < best.distance) {
          best = { ladder, y, distance: along };
        }
      }
    }
    return best;
  }

  /**
   * Punto de una escalera cercana donde apoyar una rampa diagonal.
   * Se prefieren los extremos reales (cima de vertical, punta de puente o
   * rampa) y, si no hay, cualquier altura de una vertical. La rampa resultante
   * siempre comparte su extremo con la escalera, nunca queda flotando.
   */
  findDiagonalLink(
    position: THREE.Vector3,
    aim: THREE.Vector3,
    maxDistance = 2.2,
  ): LadderDiagonalLink | null {
    const aimLength = Math.hypot(aim.x, aim.z);
    const aimX = aimLength >= 0.08 ? aim.x / aimLength : 0;
    const aimZ = aimLength >= 0.08 ? aim.z / aimLength : 0;
    let best: LadderDiagonalLink | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    const consider = (
      x: number,
      y: number,
      z: number,
      outX: number,
      outZ: number,
      anchorId: string,
      score: number,
    ): void => {
      let nx = outX;
      let nz = outZ;
      const outLength = Math.hypot(nx, nz);
      if (outLength < 1e-4) {
        nx = aimX;
        nz = aimZ;
      } else {
        nx /= outLength;
        nz /= outLength;
      }
      if (aimLength >= 0.08 && nx * aimX + nz * aimZ > 0.05) {
        nx = aimX;
        nz = aimZ;
      }
      if (score >= bestScore) {
        return;
      }
      bestScore = score;
      best = { x, y, z, nx, nz, anchorId, distance: score };
    };

    for (const ladder of this.ladders.values()) {
      if (ladder.orientation === 'vertical') {
        const top = ladder.y + ladder.height;
        if (position.y < ladder.y - 0.9 || position.y > top + 0.9) {
          continue;
        }
        const horizontal = Math.hypot(position.x - ladder.x, position.z - ladder.z);
        if (horizontal > maxDistance) {
          continue;
        }
        const offset =
          (position.x - ladder.x) * ladder.nx +
          (position.z - ladder.z) * ladder.nz;
        let side: 1 | -1;
        if (Math.abs(offset) > 0.08) {
          side = offset >= 0 ? 1 : -1;
        } else if (aimLength >= 0.08) {
          side = ladder.nx * aimX + ladder.nz * aimZ >= 0 ? 1 : -1;
        } else {
          side = 1;
        }
        const anchorY = Math.max(
          ladder.y + 0.04,
          Math.min(top - 0.02, position.y),
        );
        consider(
          ladder.x,
          anchorY,
          ladder.z,
          ladder.nx * side,
          ladder.nz * side,
          ladder.id,
          horizontal + Math.abs(anchorY - position.y) * 0.3,
        );
        continue;
      }

      if (ladder.orientation === 'horizontal') {
        const y = ladder.y + LADDER_TOP_OFFSET;
        const ends: Array<{ x: number; z: number; outX: number; outZ: number }> = [
          { x: ladder.x, z: ladder.z, outX: -ladder.nx, outZ: -ladder.nz },
          {
            x: ladder.x + ladder.nx * ladder.height,
            z: ladder.z + ladder.nz * ladder.height,
            outX: ladder.nx,
            outZ: ladder.nz,
          },
        ];
        for (const end of ends) {
          const distance = Math.hypot(
            position.x - end.x,
            position.y - y,
            position.z - end.z,
          );
          if (distance > maxDistance) {
            continue;
          }
          consider(
            end.x,
            y,
            end.z,
            end.outX,
            end.outZ,
            ladder.id,
            distance,
          );
        }
        // También se puede enganchar una rampa al costado del puente, no
        // solo a sus dos puntas, para que acercarse baste.
        const dx = ladder.nx * ladder.height;
        const dz = ladder.nz * ladder.height;
        const lengthSq = dx * dx + dz * dz;
        const t =
          lengthSq > 1e-6
            ? THREE.MathUtils.clamp(
                ((position.x - ladder.x) * dx + (position.z - ladder.z) * dz) /
                  lengthSq,
                0,
                1,
              )
            : 0;
        const sideX = ladder.x + dx * t;
        const sideZ = ladder.z + dz * t;
        const sideDistance = Math.hypot(
          position.x - sideX,
          position.y - y,
          position.z - sideZ,
        );
        if (sideDistance <= maxDistance) {
          const perpX = -ladder.nz;
          const perpZ = ladder.nx;
          const offset =
            (position.x - sideX) * perpX + (position.z - sideZ) * perpZ;
          let side: 1 | -1;
          if (Math.abs(offset) > 0.08) {
            side = offset >= 0 ? 1 : -1;
          } else if (aimLength >= 0.08) {
            side = perpX * aimX + perpZ * aimZ >= 0 ? 1 : -1;
          } else {
            side = 1;
          }
          consider(
            sideX,
            y,
            sideZ,
            perpX * side,
            perpZ * side,
            ladder.id,
            sideDistance,
          );
        }
        continue;
      }

      const sign = ladder.orientation === 'diagonal-up' ? 1 : -1;
      const run = ladder.height * DIAGONAL_RUN;
      const farX = ladder.x + ladder.nx * run;
      const farY = ladder.y + sign * run;
      const farZ = ladder.z + ladder.nz * run;
      const low =
        sign > 0
          ? { x: ladder.x, y: ladder.y, z: ladder.z }
          : { x: farX, y: farY, z: farZ };
      const high =
        sign > 0
          ? { x: farX, y: farY, z: farZ }
          : { x: ladder.x, y: ladder.y, z: ladder.z };
      const ends = [
        { point: low, other: high },
        { point: high, other: low },
      ];
      for (const end of ends) {
        const distance = Math.hypot(
          position.x - end.point.x,
          position.y - end.point.y,
          position.z - end.point.z,
        );
        if (distance > maxDistance) {
          continue;
        }
        consider(
          end.point.x,
          end.point.y,
          end.point.z,
          end.point.x - end.other.x,
          end.point.z - end.other.z,
          ladder.id,
          distance,
        );
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
      if (isDiagonalOrientation(ladder.orientation)) {
        continue;
      }
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

  private diagonalSupportAt(
    ladder: NetworkLadderState,
    x: number,
    z: number,
    radius: number,
  ): number | null {
    const sign = ladder.orientation === 'diagonal-up' ? 1 : -1;
    const run = ladder.height * DIAGONAL_RUN;
    const endX = ladder.x + ladder.nx * run;
    const endZ = ladder.z + ladder.nz * run;
    const dx = endX - ladder.x;
    const dz = endZ - ladder.z;
    const lengthSq = dx * dx + dz * dz;
    const t =
      lengthSq > 1e-6
        ? THREE.MathUtils.clamp(
            ((x - ladder.x) * dx + (z - ladder.z) * dz) / lengthSq,
            0,
            1,
          )
        : 0;
    const closestX = ladder.x + dx * t;
    const closestZ = ladder.z + dz * t;
    if (Math.hypot(x - closestX, z - closestZ) > 0.32 + radius) {
      return null;
    }
    return ladder.y + sign * run * t;
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
      if (isDiagonalOrientation(ladder.orientation)) {
        const top = this.diagonalSupportAt(ladder, x, z, radius);
        if (top === null || top < feetY - 0.1 || top > feetY + maxStep) {
          continue;
        }
        if (support === null || top > support) {
          support = top;
        }
        continue;
      }
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
      if (isDiagonalOrientation(ladder.orientation)) {
        const top = this.diagonalSupportAt(ladder, x, z, radius);
        if (top === null || oldY < top - 0.12 || nextY > top + 0.12) {
          continue;
        }
        if (support === null || top > support) {
          support = top;
        }
        continue;
      }
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
      // Las rampas diagonales se pueden cruzar libremente con otros tramos.
      if (
        isDiagonalOrientation(ladder.orientation) ||
        isDiagonalOrientation(candidate.orientation)
      ) {
        continue;
      }
      // Las escaleras de distinta orientación pueden cruzarse (T, andamio);
      // solo se rechazan solapamientos entre tramos del mismo tipo.
      if (ladder.orientation !== candidate.orientation) {
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
        if (horizontalLaddersOverlap(ladder, candidate)) {
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

/**
 * Solo rechaza dos puentes que discurren casi en la misma línea y se pisan.
 * Los que comparten punta en ángulo (T, esquina) o se cruzan se permiten.
 */
function horizontalLaddersOverlap(
  a: NetworkLadderState,
  b: NetworkLadderState,
): boolean {
  const ax = a.x;
  const az = a.z;
  const bx = a.x + a.nx * a.height;
  const bz = a.z + a.nz * a.height;
  const cx = b.x;
  const cz = b.z;
  const dx = b.x + b.nx * b.height;
  const dz = b.z + b.nz * b.height;
  const abx = bx - ax;
  const abz = bz - az;
  const cdx = dx - cx;
  const cdz = dz - cz;
  const lengthAB = Math.hypot(abx, abz);
  const lengthCD = Math.hypot(cdx, cdz);
  if (lengthAB < 1e-4 || lengthCD < 1e-4) {
    return true;
  }
  const angle = Math.abs(abx * cdz - abz * cdx) / (lengthAB * lengthCD);
  if (angle > 0.35) {
    return false;
  }
  const distance = Math.abs(abx * (cz - az) - abz * (cx - ax)) / lengthAB;
  if (distance > 0.35) {
    return false;
  }
  const ux = abx / lengthAB;
  const uz = abz / lengthAB;
  const tc = (cx - ax) * ux + (cz - az) * uz;
  const td = (dx - ax) * ux + (dz - az) * uz;
  const overlap =
    Math.min(lengthAB, Math.max(tc, td)) - Math.max(0, Math.min(tc, td));
  return overlap > 0.45;
}
