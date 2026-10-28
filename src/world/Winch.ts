import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MINE_DEPTH,
  MIN_WINCH_DROP,
  PIT_HALF,
  SAFE_ZONE_HALF,
  SURFACE_DECK_Y,
  WINCH_INTERACT_RADIUS,
  WINCH_SPEED,
} from '../config';
import type { NetworkWinchState } from '../types';
import type { Terrain } from './Terrain';

const MAX_WINCHES = 16;
const CABLE_RADIUS = 0.04;
const CAGE_WIDTH = 1.2;
const CAGE_HEIGHT = 2.0;

function buildPulleyGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Marco superior (vigas en cruz / pescante)
  const arm = new THREE.BoxGeometry(0.2, 0.25, 1.6);
  arm.translate(0, 0.2, 0.4);
  parts.push(arm);

  const mount = new THREE.BoxGeometry(0.3, 0.6, 0.3);
  mount.translate(0, 0, -0.4);
  parts.push(mount);

  // Polea
  const wheel = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12);
  wheel.rotateZ(Math.PI * 0.5);
  wheel.translate(0, 0.15, 1.0);
  parts.push(wheel);

  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(0.5, 0.5, 0.5);
  for (const part of parts) {
    part.dispose();
  }
  return merged;
}

function buildCageGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Suelo de la jaula
  const floor = new THREE.BoxGeometry(CAGE_WIDTH, 0.1, CAGE_WIDTH);
  floor.translate(0, 0.05, 0);
  parts.push(floor);

  // Techo y gancho
  const roof = new THREE.BoxGeometry(CAGE_WIDTH, 0.08, CAGE_WIDTH);
  roof.translate(0, CAGE_HEIGHT, 0);
  parts.push(roof);

  const hook = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
  hook.translate(0, CAGE_HEIGHT + 0.2, 0);
  parts.push(hook);

  // Postes esquineros
  const halfW = CAGE_WIDTH * 0.5 - 0.05;
  for (const sx of [-halfW, halfW]) {
    for (const sz of [-halfW, halfW]) {
      const bar = new THREE.BoxGeometry(0.08, CAGE_HEIGHT, 0.08);
      bar.translate(sx, CAGE_HEIGHT * 0.5, sz);
      parts.push(bar);
    }
  }

  // Barandilla intermedia
  const rail = new THREE.BoxGeometry(CAGE_WIDTH * 0.96, 0.06, 0.06);
  rail.translate(0, 1.0, halfW);
  parts.push(rail);
  const railBack = rail.clone();
  railBack.translate(0, 0, -CAGE_WIDTH + 0.1);
  parts.push(railBack);

  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(1, 2, 1);
  for (const part of parts) {
    part.dispose();
  }
  return merged;
}

export interface WinchCandidate {
  valid: boolean;
  reason: string;
  state: NetworkWinchState;
}

export interface WinchRideState {
  winchId: string;
  targetY: number;
  direction: 'up' | 'down';
}

export class WinchSystem {
  readonly group = new THREE.Group();
  private readonly winches = new Map<string, NetworkWinchState>();
  private readonly meshes = new Map<
    string,
    { root: THREE.Group; cable: THREE.Mesh; cage: THREE.Mesh }
  >();

  private readonly pulleyGeometry: THREE.BufferGeometry;
  private readonly cageGeometry: THREE.BufferGeometry;
  private readonly metalMaterial: THREE.MeshStandardMaterial;
  private readonly cableMaterial: THREE.MeshStandardMaterial;
  private readonly ghostMaterial: THREE.MeshBasicMaterial;
  private readonly ghostPulley: THREE.Mesh;
  private readonly ghostCage: THREE.Mesh;

  private activeRide: WinchRideState | null = null;

  constructor() {
    this.group.name = 'winch-system';
    this.pulleyGeometry = buildPulleyGeometry();
    this.cageGeometry = buildCageGeometry();

    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.85,
      roughness: 0.35,
    });
    this.cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.9,
      roughness: 0.5,
    });
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });

    this.ghostPulley = new THREE.Mesh(this.pulleyGeometry, this.ghostMaterial);
    this.ghostPulley.visible = false;
    this.group.add(this.ghostPulley);

    this.ghostCage = new THREE.Mesh(this.cageGeometry, this.ghostMaterial);
    this.ghostCage.visible = false;
    this.group.add(this.ghostCage);
  }

  clear(): void {
    for (const entry of this.meshes.values()) {
      entry.cable.geometry.dispose();
      this.group.remove(entry.root);
    }
    this.meshes.clear();
    this.winches.clear();
    this.activeRide = null;
    this.clearGhost();
  }

  dispose(): void {
    this.clear();
    this.pulleyGeometry.dispose();
    this.cageGeometry.dispose();
    this.metalMaterial.dispose();
    this.cableMaterial.dispose();
    this.ghostMaterial.dispose();
  }

  showGhost(candidate: WinchCandidate | null): void {
    if (!candidate) {
      this.clearGhost();
      return;
    }
    const color = candidate.valid ? 0x22c55e : 0xef4444;
    this.ghostMaterial.color.setHex(color);
    this.ghostPulley.position.set(candidate.state.x, candidate.state.topY, candidate.state.z);
    this.ghostPulley.visible = true;

    this.ghostCage.position.set(candidate.state.x, candidate.state.bottomY, candidate.state.z);
    this.ghostCage.visible = true;
  }

  clearGhost(): void {
    this.ghostPulley.visible = false;
    this.ghostCage.visible = false;
  }

  add(winch: NetworkWinchState): boolean {
    if (this.winches.size >= MAX_WINCHES) {
      return false;
    }
    this.remove(winch.id);
    this.winches.set(winch.id, winch);

    const root = new THREE.Group();
    root.name = `winch-${winch.id}`;

    // Polea fija arriba
    const pulley = new THREE.Mesh(this.pulleyGeometry, this.metalMaterial);
    pulley.position.set(winch.x, winch.topY, winch.z);
    root.add(pulley);

    // Cable vertical desde topY hasta bottomY
    const height = Math.max(1, winch.topY - winch.bottomY);
    const cableGeo = new THREE.CylinderGeometry(CABLE_RADIUS, CABLE_RADIUS, height, 8);
    cableGeo.translate(0, -height * 0.5, 0);
    const cable = new THREE.Mesh(cableGeo, this.cableMaterial);
    cable.position.set(winch.x, winch.topY, winch.z);
    root.add(cable);

    // Jaula en la parada inferior (o superior por defecto)
    const cage = new THREE.Mesh(this.cageGeometry, this.metalMaterial);
    cage.position.set(winch.x, winch.bottomY, winch.z);
    root.add(cage);

    this.group.add(root);
    this.meshes.set(winch.id, { root, cable, cage });
    return true;
  }

  updateCableMesh(id: string): void {
    const winch = this.winches.get(id);
    const entry = this.meshes.get(id);
    if (!winch || !entry) return;
    const height = Math.max(1, winch.topY - winch.bottomY);
    entry.cable.geometry.dispose();
    const newGeo = new THREE.CylinderGeometry(CABLE_RADIUS, CABLE_RADIUS, height, 8);
    newGeo.translate(0, -height * 0.5, 0);
    entry.cable.geometry = newGeo;
    if (!this.activeRide || this.activeRide.winchId !== id) {
      entry.cage.position.set(winch.x, winch.bottomY, winch.z);
    }
  }

  syncBottomWithTerrain(winchId: string, terrain: Terrain): boolean {
    const winch = this.winches.get(winchId);
    if (!winch) return false;
    let bottomY = winch.topY;
    let solidFound = false;
    for (let testY = winch.topY - 1.0; testY >= -MINE_DEPTH; testY -= 0.5) {
      if (terrain.isSolid(winch.x, testY, winch.z)) {
        bottomY = testY + 0.1;
        solidFound = true;
        break;
      }
    }
    if (!solidFound) {
      bottomY = -MINE_DEPTH;
    }
    const safeBottomY = Number(bottomY.toFixed(2));
    if (Math.abs(winch.bottomY - safeBottomY) > 0.4) {
      winch.bottomY = safeBottomY;
      this.updateCableMesh(winchId);
      return true;
    }
    return false;
  }

  remove(id: string): void {
    const existingMesh = this.meshes.get(id);
    if (existingMesh) {
      existingMesh.cable.geometry.dispose();
      this.group.remove(existingMesh.root);
      this.meshes.delete(id);
    }
    this.winches.delete(id);
    if (this.activeRide?.winchId === id) {
      this.activeRide = null;
    }
  }

  get(id: string): NetworkWinchState | undefined {
    return this.winches.get(id);
  }

  getSnapshot(): NetworkWinchState[] {
    return Array.from(this.winches.values());
  }

  fromSnapshot(states: NetworkWinchState[]): void {
    this.clear();
    for (const state of states) {
      this.add(state);
    }
  }

  /**
   * Valida si se puede instalar una cabria en el punto apuntado.
   * Requiere anclaje a superficie o pared vertical sólida, y un tiro vertical despejado >= MIN_WINCH_DROP.
   */
  validatePlacement(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    terrain: Terrain,
  ): WinchCandidate | null {
    // Proyección hacia suelo o pared
    const hit = terrain.raycast(origin, direction, 8.0);
    const deckHit = this.findDeckAnchor(origin, direction);
    const anchorPoint = hit ? new THREE.Vector3(hit.x, hit.y, hit.z) : deckHit;
    if (!anchorPoint) {
      return null;
    }

    const x = Number(anchorPoint.x.toFixed(2));
    const z = Number(anchorPoint.z.toFixed(2));
    const topY = Number(anchorPoint.y.toFixed(2));

    // Comprobar que no esté fuera del pozo y que haya espacio vertical
    if (Math.abs(x) > PIT_HALF - 1 || Math.abs(z) > PIT_HALF - 1) {
      return {
        valid: false,
        reason: 'FUERA DE LÍMITES · Solo se puede instalar en la boca o perímetro del pozo.',
        state: { id: '', x, topY, bottomY: topY - MIN_WINCH_DROP, z },
      };
    }

    // Comprobar tiro vertical descendente hasta suelo sólido
    let bottomY = topY;
    let solidFound = false;
    for (let testY = topY - 1.0; testY >= -MINE_DEPTH; testY -= 0.5) {
      if (terrain.isSolid(x, testY, z)) {
        bottomY = testY + 0.1;
        solidFound = true;
        break;
      }
    }
    if (!solidFound) {
      bottomY = -MINE_DEPTH;
    }

    const drop = topY - bottomY;
    if (drop < MIN_WINCH_DROP) {
      return {
        valid: false,
        reason: `DESNIVEL INSUFICIENTE · Se requieren al menos ${MIN_WINCH_DROP} m de tiro despejado (hay ${drop.toFixed(1)} m).`,
        state: { id: '', x, topY, bottomY, z },
      };
    }

    // Comprobar que no atraviese columnas de roca intermedias
    for (let testY = topY - 2.0; testY > bottomY + 1.0; testY -= 1.0) {
      if (terrain.isSolid(x, testY, z)) {
        return {
          valid: false,
          reason: 'LÍNEA BLOQUEADA · El recorrido vertical del cable atraviesa roca.',
          state: { id: '', x, topY, bottomY, z },
        };
      }
    }

    return {
      valid: true,
      reason: `CABRIA VÁLIDA · Descenso vertical de ${drop.toFixed(1)} m.`,
      state: { id: '', x, topY, bottomY, z },
    };
  }

  private findDeckAnchor(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Vector3 | null {
    if (Math.abs(direction.y) < 1e-4) return null;
    const t = (SURFACE_DECK_Y - origin.y) / direction.y;
    if (t < 0.5 || t > 8.0) return null;
    const px = origin.x + direction.x * t;
    const pz = origin.z + direction.z * t;
    if (Math.abs(px) <= SAFE_ZONE_HALF && Math.abs(pz) <= SAFE_ZONE_HALF) {
      return new THREE.Vector3(px, SURFACE_DECK_Y, pz);
    }
    return null;
  }

  /**
   * Busca una cabria cercana con la que el jugador pueda interactuar.
   */
  findNearestInteractive(
    playerPos: THREE.Vector3,
    terrain?: Terrain,
    radius = WINCH_INTERACT_RADIUS,
  ): { winch: NetworkWinchState; direction: 'up' | 'down'; targetY: number } | null {
    if (terrain) {
      for (const id of this.winches.keys()) {
        this.syncBottomWithTerrain(id, terrain);
      }
    }
    let nearest: { winch: NetworkWinchState; direction: 'up' | 'down'; targetY: number } | null =
      null;
    let minDistance = radius;

    for (const winch of this.winches.values()) {
      const horizontalDist = Math.hypot(playerPos.x - winch.x, playerPos.z - winch.z);
      if (horizontalDist > radius) continue;

      const distToTop = Math.abs(playerPos.y - winch.topY);
      const distToBottom = Math.abs(playerPos.y - winch.bottomY);

      if (distToTop <= radius && distToTop <= distToBottom) {
        if (horizontalDist < minDistance) {
          minDistance = horizontalDist;
          nearest = { winch, direction: 'down', targetY: winch.bottomY };
        }
      } else if (distToBottom <= radius) {
        if (horizontalDist < minDistance) {
          minDistance = horizontalDist;
          nearest = { winch, direction: 'up', targetY: winch.topY };
        }
      }
    }
    return nearest;
  }

  startRide(winchId: string, targetY: number, direction: 'up' | 'down'): void {
    this.activeRide = { winchId, targetY, direction };
  }

  stopRide(): void {
    this.activeRide = null;
  }

  isRiding(): boolean {
    return this.activeRide !== null;
  }

  getActiveRide(): WinchRideState | null {
    return this.activeRide;
  }

  /**
   * Actualiza el viaje de la cabria si el jugador está montado en ella.
   * Devuelve la nueva posición Y del jugador, o null si el viaje ha terminado.
   */
  updateRide(currentY: number, dt: number): number | null {
    if (!this.activeRide) {
      return null;
    }
    const { targetY, direction, winchId } = this.activeRide;
    const speed = WINCH_SPEED;
    let newY = currentY;

    if (direction === 'down') {
      newY = Math.max(targetY, currentY - speed * dt);
      if (newY <= targetY + 0.05) {
        this.activeRide = null;
      }
    } else {
      newY = Math.min(targetY, currentY + speed * dt);
      if (newY >= targetY - 0.05) {
        this.activeRide = null;
      }
    }

    // Actualizar visualmente la jaula
    const meshEntry = this.meshes.get(winchId);
    if (meshEntry) {
      meshEntry.cage.position.y = newY;
    }

    return newY;
  }
}
