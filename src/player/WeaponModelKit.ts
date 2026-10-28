import * as THREE from 'three';

export interface WeaponModelParts {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  movingPart?: THREE.Object3D;
  flashColor: number;
  flashSize: number;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function resetWeaponModelMaterials(): void {
  materialCache.clear();
}

/** Material low-poly compartido por los viewmodels; se cachea por parámetros. */
export function litMaterial(
  color: number,
  roughness = 0.62,
  metalness = 0.25,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  const key = `${color}:${roughness}:${metalness}:${emissive}:${emissiveIntensity}`;
  const cached = materialCache.get(key);
  if (cached) {
    return cached;
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true,
    emissive,
    emissiveIntensity,
  });
  materialCache.set(key, material);
  return material;
}

export function glowMaterial(color: number, intensity = 0.9): THREE.MeshStandardMaterial {
  return litMaterial(color, 0.26, 0.35, color, intensity);
}

export const WOOD = (): THREE.MeshStandardMaterial => litMaterial(0x9a6232, 0.92, 0.03);
export const WOOD_DARK = (): THREE.MeshStandardMaterial => litMaterial(0x5a361d, 0.95, 0.02);
export const STEEL = (): THREE.MeshStandardMaterial =>
  litMaterial(0xb8c2bd, 0.42, 0.55, 0x0d1415, 0.08);
export const STEEL_DARK = (): THREE.MeshStandardMaterial =>
  litMaterial(0x667274, 0.5, 0.45);
export const IRON = (): THREE.MeshStandardMaterial => litMaterial(0x3f4a4c, 0.55, 0.4);
export const BLACK = (): THREE.MeshStandardMaterial => litMaterial(0x202829, 0.72, 0.3);
export const COPPER = (): THREE.MeshStandardMaterial => litMaterial(0xc47a42, 0.38, 0.55);
export const BRASS = (): THREE.MeshStandardMaterial => litMaterial(0xd0a752, 0.34, 0.58);
export const LEATHER = (): THREE.MeshStandardMaterial => litMaterial(0x4a4033, 0.94, 0.02);
export const RUBBER = (): THREE.MeshStandardMaterial => litMaterial(0x1e2424, 0.92, 0.02);
export const HAZARD = (): THREE.MeshStandardMaterial => litMaterial(0xd6a33d, 0.55, 0.35);
export const BONE = (): THREE.MeshStandardMaterial => litMaterial(0xd8cfb8, 0.8, 0.05);

export function box(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

export function cylinder(
  group: THREE.Group,
  top: number,
  bottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, segments),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

export function cone(
  group: THREE.Group,
  radius: number,
  height: number,
  segments: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

export function torus(
  group: THREE.Group,
  radius: number,
  tube: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 5, 12), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

export function sphere(
  group: THREE.Group,
  radius: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function addRivet(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius = 0.014,
): void {
  sphere(group, radius, STEEL(), x, y, z);
}

/** Mano enguantada low-poly, coherente con el pico. */
export function addHand(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale = 1,
  rotationZ = 0,
  rotationX = 0,
): void {
  const hand = new THREE.Group();
  hand.position.set(x, y, z);
  hand.rotation.set(rotationX, 0, rotationZ);
  hand.scale.setScalar(scale);
  group.add(hand);
  box(hand, 0.15, 0.18, 0.17, LEATHER(), -0.01, 0, 0.035);
  for (let index = 0; index < 3; index += 1) {
    box(hand, 0.05, 0.04, 0.14, LEATHER(), 0.047, 0.055 - index * 0.045, 0.055, 0, 0, -0.12);
  }
  cylinder(hand, 0.1, 0.082, 0.18, 7, BLACK(), -0.13, -0.1, 0.09, 0.28, 0, 0.52);
  torus(hand, 0.075, 0.012, STEEL_DARK(), -0.01, 0.01, 0.04, Math.PI / 2);
}

export function addMuzzle(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
): THREE.Object3D {
  const muzzle = new THREE.Object3D();
  muzzle.position.set(x, y, z);
  group.add(muzzle);
  return muzzle;
}

export function parts(
  group: THREE.Group,
  muzzle: THREE.Object3D,
  flashColor: number,
  flashSize: number,
  movingPart?: THREE.Object3D,
): WeaponModelParts {
  return { group, muzzle, movingPart, flashColor, flashSize };
}
