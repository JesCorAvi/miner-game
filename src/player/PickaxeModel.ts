import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PICKAXE_SCALE = 0.5;
export const PICKAXE_IMPACT_HOLD = 0.03;
export const PICKAXE_IMPACT_FRACTION = 0.35;
const WINDUP_END = 0.2;
const RECOIL_END = 0.5;
const PIVOT_OFFSET = 0.32;
const HEAD_Y = 0.55;
const HEAD_YAW = Math.PI / 2;

export interface PickaxeMaterials {
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  edge: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  glove: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
}

export interface PickaxeModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
}

function litMaterial(
  color: number,
  roughness: number,
  metalness: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true,
    emissive,
    emissiveIntensity,
  });
}

export function createPickaxeMaterials(): PickaxeMaterials {
  return {
    wood: litMaterial(0x8a5528, 0.9, 0.04),
    woodDark: litMaterial(0x4a2d17, 0.94, 0.02),
    steel: litMaterial(0xa0aca8, 0.38, 0.78, 0x0b1011, 0.18),
    edge: litMaterial(0xc4cec9, 0.3, 0.86, 0x101617, 0.12),
    dark: litMaterial(0x2e383a, 0.5, 0.68),
    glove: litMaterial(0x4a4033, 0.95, 0.02),
    amber: litMaterial(0xffa63d, 0.4, 0.3, 0xff7a18, 0.7),
  };
}

function easeInOutSine(value: number): number {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

/**
 * Curva del pico: negativa en la anticipación, 1 en el impacto y un rebote
 * elástico antes de volver a la pose base. El impacto se alcanza al 35 %.
 */
export function pickaxeSwingCurve(progress: number): number {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  if (p < WINDUP_END) {
    return -0.5 * easeInOutSine(p / WINDUP_END);
  }
  if (p < PICKAXE_IMPACT_FRACTION) {
    const t = easeInCubic((p - WINDUP_END) / (PICKAXE_IMPACT_FRACTION - WINDUP_END));
    return -0.5 + 1.5 * t;
  }
  if (p < RECOIL_END) {
    const t = easeOutCubic((p - PICKAXE_IMPACT_FRACTION) / (RECOIL_END - PICKAXE_IMPACT_FRACTION));
    return 1 - 1.22 * t + Math.sin(t * Math.PI * 2) * 0.05 * (1 - t);
  }
  const t = easeInOutSine((p - RECOIL_END) / (1 - RECOIL_END));
  return -0.22 * (1 - t);
}

/**
 * Construye el pico con el pivote en la muñeca (base del mango) y el cabezal
 * girado 90° para que las puntas miren adelante/atrás, no a los lados.
 * El llamador aplica pose y escala. La geometría estática se fusiona por material.
 */
export function buildPickaxeModel(materials: PickaxeMaterials): PickaxeModel {
  const root = new THREE.Group();
  const body = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.05, 1.04, 8),
    materials.wood,
  );
  body.add(handle);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.059, 0.3, 8),
    materials.woodDark,
  );
  grip.position.set(0, -0.32, 0);
  body.add(grip);
  for (const ringY of [-0.23, -0.41]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 4, 8), materials.dark);
    ring.position.set(0, ringY, 0);
    ring.rotation.x = Math.PI / 2;
    body.add(ring);
  }
  const pommel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.06, 0.07, 8),
    materials.dark,
  );
  pommel.position.set(0, -0.53, 0);
  body.add(pommel);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, HEAD_Y, 0);
  headGroup.rotation.y = HEAD_YAW;
  body.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.2), materials.steel);
  head.rotation.z = -0.03;
  headGroup.add(head);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.24), materials.edge);
  crest.position.set(0, 0.1, 0);
  crest.rotation.z = 0.04;
  headGroup.add(crest);
  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.062, 0.15, 8),
    materials.dark,
  );
  socket.position.set(0, -0.11, 0);
  headGroup.add(socket);
  const socketTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.067, 0.062, 0.045, 8),
    materials.steel,
  );
  socketTop.position.set(0, -0.035, 0);
  headGroup.add(socketTop);
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.073, 0.012, 4, 8),
    materials.amber,
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.set(0, -0.035, 0);
  headGroup.add(glowRing);

  // La punta larga (side -1) queda adelante (-Z) tras girar el cabezal.
  addPickWing(headGroup, materials, 1, 0.1, 0.08);
  addPickWing(headGroup, materials, -1, 0.62, 0.38);

  for (const corner of [
    [-0.055, 0.05],
    [0.055, 0.05],
    [-0.055, -0.05],
    [0.055, -0.05],
  ]) {
    const rivet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016, 0), materials.steel);
    rivet.position.set(corner[0], corner[1], -0.102);
    headGroup.add(rivet);
  }

  const handWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 0.18, 8),
    materials.glove,
  );
  handWrap.position.set(0, -0.33, 0.006);
  body.add(handWrap);
  const fist = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.19, 0.17), materials.glove);
  fist.position.set(-0.012, -0.32, 0.035);
  fist.rotation.z = 0.08;
  body.add(fist);
  for (let index = 0; index < 3; index += 1) {
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.045, 0.15),
      materials.glove,
    );
    knuckle.position.set(0.048, -0.265 - index * 0.048, 0.055);
    knuckle.rotation.z = -0.12;
    body.add(knuckle);
  }
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.082, 0.24, 7),
    materials.dark,
  );
  cuff.position.set(-0.13, -0.47, 0.12);
  cuff.rotation.z = 0.52;
  cuff.rotation.x = 0.28;
  body.add(cuff);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, HEAD_Y, -0.42);
  body.add(muzzle);
  mergeStaticMeshes(body);
  body.position.y = PIVOT_OFFSET;
  root.add(body);
  return { group: root, muzzle };
}

function addPickWing(
  group: THREE.Group,
  materials: PickaxeMaterials,
  side: 1 | -1,
  tipLength: number,
  shaftLength: number,
): void {
  const wing = new THREE.Group();
  wing.rotation.z = side * (Math.PI / 2 + 0.16);
  wing.rotation.x = side * 0.035;
  group.add(wing);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.083, 0.09, 0.07, 4),
    materials.dark,
  );
  base.position.y = 0.005;
  base.rotation.y = Math.PI / 4;
  wing.add(base);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.075, shaftLength, 4),
    materials.steel,
  );
  shaft.position.y = shaftLength * 0.5;
  shaft.rotation.y = Math.PI / 4;
  wing.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.058, tipLength, 4), materials.edge);
  tip.position.y = shaftLength + tipLength * 0.5;
  tip.rotation.y = Math.PI / 4;
  tip.rotation.z = side * 0.22;
  wing.add(tip);
}

/**
 * El pico comparte siete materiales; fusionarlos reduce el viewmodel de ~27
 * draw calls a siete sin perder las caras low-poly ni el flat shading.
 */
function mergeStaticMeshes(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const meshes: THREE.Mesh[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });
  for (const mesh of meshes) {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!material) {
      continue;
    }
    let geometry = mesh.geometry.clone();
    if (geometry.index) {
      const nonIndexed = geometry.toNonIndexed();
      geometry.dispose();
      geometry = nonIndexed;
    }
    const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    geometry.applyMatrix4(local);
    const bucket = buckets.get(material);
    if (bucket) {
      bucket.push(geometry);
    } else {
      buckets.set(material, [geometry]);
    }
  }
  if (buckets.size === 0) {
    return;
  }
  const mergedByMaterial: Array<{ material: THREE.Material; geometry: THREE.BufferGeometry }> = [];
  let mergeFailed = false;
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) {
      geometry.dispose();
    }
    if (merged) {
      mergedByMaterial.push({ material, geometry: merged });
    } else {
      mergeFailed = true;
    }
  }
  if (mergeFailed) {
    for (const entry of mergedByMaterial) {
      entry.geometry.dispose();
    }
    return;
  }
  for (const mesh of meshes) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  for (const entry of mergedByMaterial) {
    group.add(new THREE.Mesh(entry.geometry, entry.material));
  }
  const emptyGroups: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (child !== group && child.type === 'Group' && child.children.length === 0) {
      emptyGroups.push(child);
    }
  });
  for (const child of emptyGroups) {
    child.removeFromParent();
  }
}
