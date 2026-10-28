import * as THREE from 'three';
import { BEACON_COLORS, MAX_BEACONS, PIT_HALF } from '../config';
import type { NetworkBeaconState } from '../types';
import type { Terrain } from './Terrain';

export class BeaconSystem {
  readonly group = new THREE.Group();
  private readonly beacons = new Map<string, NetworkBeaconState>();
  private readonly meshes = new Map<
    string,
    { root: THREE.Group; light: THREE.PointLight; material: THREE.MeshBasicMaterial }
  >();

  private nextColorIndex = 0;

  constructor() {
    this.group.name = 'beacons-system';
  }

  clear(): void {
    for (const entry of this.meshes.values()) {
      entry.material.dispose();
      this.group.remove(entry.root);
    }
    this.meshes.clear();
    this.beacons.clear();
  }

  dispose(): void {
    this.clear();
  }

  add(beacon: NetworkBeaconState): boolean {
    if (this.beacons.size >= MAX_BEACONS && !this.beacons.has(beacon.id)) {
      // Si se supera el límite, retirar la baliza más antigua
      const oldestKey = this.beacons.keys().next().value;
      if (oldestKey) {
        this.remove(oldestKey);
      }
    }
    this.remove(beacon.id);
    this.beacons.set(beacon.id, beacon);

    const root = new THREE.Group();
    root.name = `beacon-${beacon.id}`;
    root.position.set(beacon.x, beacon.y, beacon.z);

    // Mástil de metal oscuro
    const mastGeo = new THREE.CylinderGeometry(0.035, 0.02, 1.3, 8);
    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.4,
    });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 0.65;
    root.add(mast);

    // Emisor luminoso
    const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: beacon.color });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 1.3;
    root.add(bulb);

    // Luz puntual
    const light = new THREE.PointLight(beacon.color, 1.5, 8, 2);
    light.position.y = 1.4;
    root.add(light);

    this.group.add(root);
    this.meshes.set(beacon.id, { root, light, material: bulbMat });
    return true;
  }

  remove(id: string): void {
    const existing = this.meshes.get(id);
    if (existing) {
      existing.material.dispose();
      this.group.remove(existing.root);
      this.meshes.delete(id);
    }
    this.beacons.delete(id);
  }

  get(id: string): NetworkBeaconState | undefined {
    return this.beacons.get(id);
  }

  getSnapshot(): NetworkBeaconState[] {
    return Array.from(this.beacons.values());
  }

  fromSnapshot(states: NetworkBeaconState[]): void {
    this.clear();
    for (const state of states) {
      this.add(state);
    }
  }

  getAll(): NetworkBeaconState[] {
    return Array.from(this.beacons.values());
  }

  getNextColor(): number {
    const color = BEACON_COLORS[this.nextColorIndex % BEACON_COLORS.length];
    this.nextColorIndex += 1;
    return color;
  }

  /**
   * Intenta colocar una baliza en la posición apuntada o a los pies del jugador.
   */
  placeAt(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    terrain: Terrain,
    id: string,
    ownerId?: string,
  ): NetworkBeaconState | null {
    // Raycast a corta distancia hacia el suelo
    const hit = terrain.raycast(origin, direction, 4.5);
    const pos = hit ? new THREE.Vector3(hit.x, hit.y, hit.z) : origin.clone().add(new THREE.Vector3(0, -0.9, 0));

    if (Math.abs(pos.x) > PIT_HALF || Math.abs(pos.z) > PIT_HALF) {
      return null;
    }

    const color = this.getNextColor();
    const label = `B-${this.beacons.size + 1}`;
    const beacon: NetworkBeaconState = {
      id,
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2)),
      color,
      label,
      ownerId,
    };

    if (this.add(beacon)) {
      return beacon;
    }
    return null;
  }
}
