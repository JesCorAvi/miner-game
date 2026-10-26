import type * as THREE from 'three';
import type { GrenadeTierId } from '../types';
import type { ResourceNode } from '../world/Resources';

export type ActiveRole = 'solo' | 'host' | 'client';

export interface GrenadeProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  fuse: number;
  bounces: number;
  tier: GrenadeTierId;
}

export interface AimTarget {
  node: ResourceNode | null;
  point: THREE.Vector3 | null;
  normal?: THREE.Vector3 | null;
  distance: number;
  terrainDistance: number;
  depth: number;
}
