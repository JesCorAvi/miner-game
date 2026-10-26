import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  HOPPER_POSITION,
  SURFACE_DECK_HALF,
  SURFACE_DECK_Y,
  SURFACE_SPAWN,
} from '../config';
import { hash2, mulberry32 } from '../core/Rng';

const OFFICE_X = -31;
const OFFICE_Z = 12;
const OFFICE_CLEARING = 19;
const CAMP_CLEARING = 13;
const TERRAIN_OUTER = 160;
const TERRAIN_STEP = 2;
const TERRAIN_HOLE = SURFACE_DECK_HALF - 1;
const TERRAIN_SEED = 0x4c2a7b13;
const GROUND_BASE = SURFACE_DECK_Y - 0.06;

const PALETTE = {
  clay: new THREE.Color(0x9a744d),
  clayLight: new THREE.Color(0xb48e61),
  clayDark: new THREE.Color(0x6f5437),
  moss: new THREE.Color(0x5c6846),
  rock: new THREE.Color(0x7d766a),
  rockDark: new THREE.Color(0x565751),
  snow: new THREE.Color(0xe3eaea),
  snowShade: new THREE.Color(0xc0ced3),
} as const;

function smoothRange(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function noise2(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = smoothRange(0, 1, x - xi);
  const fz = smoothRange(0, 1, z - zi);
  const c00 = hash2(xi, zi, seed);
  const c10 = hash2(xi + 1, zi, seed);
  const c01 = hash2(xi, zi + 1, seed);
  const c11 = hash2(xi + 1, zi + 1, seed);
  const top = c00 + (c10 - c00) * fx;
  const bottom = c01 + (c11 - c01) * fx;
  return top + (bottom - top) * fz;
}

function fbm2(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.5;
  let norm = 0;
  let px = x;
  let pz = z;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += noise2(px, pz, seed + octave * 1013) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    px *= 2.03;
    pz *= 2.03;
  }
  return norm > 0 ? sum / norm : 0;
}

function ridged2(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.55;
  let norm = 0;
  let px = x;
  let pz = z;
  for (let octave = 0; octave < octaves; octave += 1) {
    const value = 1 - Math.abs(noise2(px, pz, seed + octave * 733) * 2 - 1);
    sum += value * value * amplitude;
    norm += amplitude;
    amplitude *= 0.48;
    px *= 2.11;
    pz *= 2.11;
  }
  return norm > 0 ? sum / norm : 0;
}

/**
 * Altura del terreno natural que rodea la plataforma segura.
 * La zona de juego sigue siendo plana; solo el exterior se ondula.
 */
export function landscapeHeightAt(x: number, z: number): number {
  const square = Math.max(Math.abs(x), Math.abs(z));
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const open = smoothRange(SURFACE_DECK_HALF - 0.5, SURFACE_DECK_HALF + 15, square);
  const broad = (fbm2(x * 0.016 + 13.1, z * 0.016 - 8.7, TERRAIN_SEED, 4) - 0.5) * 2;
  const detail = (fbm2(x * 0.075 - 2.3, z * 0.075 + 5.9, TERRAIN_SEED + 101, 3) - 0.5) * 2;
  const rolling = (broad * 2.8 + detail * 0.8) * open;
  const sector =
    0.55 +
    0.55 * fbm2(Math.cos(angle) * 2.1 + 4.8, Math.sin(angle) * 2.1 - 2.3, TERRAIN_SEED + 211, 2);
  const wobble = (fbm2(x * 0.01 + 3.4, z * 0.01 - 6.1, TERRAIN_SEED + 311, 2) - 0.5) * 22;
  const mountain = smoothRange(54, 112, radius + wobble);
  const ridges = ridged2(x * 0.013 + 7.2, z * 0.013 - 3.4, TERRAIN_SEED + 37, 5);
  const massif = fbm2(x * 0.0045 + 19.4, z * 0.0045 + 11.1, TERRAIN_SEED + 73, 3);
  const peaks = mountain * (ridges * 40 + massif * 18) * (0.5 + sector * 0.9);
  return GROUND_BASE + rolling + peaks;
}

function nearOffice(x: number, z: number): boolean {
  return Math.hypot(x - OFFICE_X, z - OFFICE_Z) < OFFICE_CLEARING;
}

function nearCamp(x: number, z: number): boolean {
  return (
    Math.hypot(x - SURFACE_SPAWN.x, z - SURFACE_SPAWN.z) < CAMP_CLEARING ||
    Math.hypot(x - HOPPER_POSITION.x, z - HOPPER_POSITION.z) < CAMP_CLEARING
  );
}

function canPlaceFeature(x: number, z: number): boolean {
  return Math.max(Math.abs(x), Math.abs(z)) > SURFACE_DECK_HALF - 0.5 &&
    !nearOffice(x, z) &&
    !nearCamp(x, z);
}

function slopeAt(x: number, z: number): number {
  const height = landscapeHeightAt(x, z);
  const dx = landscapeHeightAt(x + 1, z) - height;
  const dz = landscapeHeightAt(x, z + 1) - height;
  return Math.hypot(dx, dz);
}

function faceColor(
  target: THREE.Color,
  height: number,
  faceUp: number,
  x: number,
  z: number,
  variation: number,
): void {
  const patch = fbm2(x * 0.07 + 4.7, z * 0.07 - 3.1, TERRAIN_SEED + 17, 3);
  target.copy(PALETTE.clay);
  target.lerp(PALETTE.clayLight, smoothRange(0.42, 0.72, patch) * 0.35);

  const moss =
    (1 - smoothRange(9, 24, height)) *
    smoothRange(0.46, 0.72, patch) *
    smoothRange(0.52, 0.8, faceUp);
  target.lerp(PALETTE.moss, moss * 0.58);

  const rock =
    smoothRange(9, 34, height) * 0.5 +
    (1 - smoothRange(0.52, 0.8, faceUp)) * 0.48;
  target.lerp(PALETTE.rock, Math.min(1, rock));
  const steep = 1 - smoothRange(0.34, 0.66, faceUp);
  target.lerp(PALETTE.rockDark, steep * 0.26);

  const snow =
    smoothRange(24, 38, height + (patch - 0.5) * 5) *
    smoothRange(0.42, 0.72, faceUp);
  target.lerp(PALETTE.snow, snow);
  target.lerp(PALETTE.snowShade, snow * steep * 0.35);
  target.multiplyScalar(0.96 + variation * 0.08);
}

function buildTerrainGeometry(): THREE.BufferGeometry {
  const cells = (TERRAIN_OUTER * 2) / TERRAIN_STEP;
  const points = cells + 1;
  const heights = new Float32Array(points * points);
  const vertexColors = new Float32Array(points * points * 3);
  const color = new THREE.Color();

  for (let iz = 0; iz < points; iz += 1) {
    const z = -TERRAIN_OUTER + iz * TERRAIN_STEP;
    for (let ix = 0; ix < points; ix += 1) {
      const x = -TERRAIN_OUTER + ix * TERRAIN_STEP;
      heights[iz * points + ix] = landscapeHeightAt(x, z);
    }
  }

  for (let iz = 0; iz < points; iz += 1) {
    const z = -TERRAIN_OUTER + iz * TERRAIN_STEP;
    const zLow = Math.max(0, iz - 1);
    const zHigh = Math.min(cells, iz + 1);
    for (let ix = 0; ix < points; ix += 1) {
      const x = -TERRAIN_OUTER + ix * TERRAIN_STEP;
      const xLow = Math.max(0, ix - 1);
      const xHigh = Math.min(cells, ix + 1);
      const index = iz * points + ix;
      const dz =
        (heights[zHigh * points + ix] - heights[zLow * points + ix]) /
        ((zHigh - zLow) * TERRAIN_STEP);
      const dx =
        (heights[iz * points + xHigh] - heights[iz * points + xLow]) /
        ((xHigh - xLow) * TERRAIN_STEP);
      const up = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
      faceColor(
        color,
        heights[index],
        up,
        x,
        z,
        hash2(ix, iz, TERRAIN_SEED + 401),
      );
      vertexColors[index * 3] = color.r;
      vertexColors[index * 3 + 1] = color.g;
      vertexColors[index * 3 + 2] = color.b;
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const pushVertex = (ix: number, iz: number): void => {
    const index = iz * points + ix;
    positions.push(
      -TERRAIN_OUTER + ix * TERRAIN_STEP,
      heights[index],
      -TERRAIN_OUTER + iz * TERRAIN_STEP,
    );
    colors.push(
      vertexColors[index * 3],
      vertexColors[index * 3 + 1],
      vertexColors[index * 3 + 2],
    );
  };

  for (let iz = 0; iz < cells; iz += 1) {
    const z0 = -TERRAIN_OUTER + iz * TERRAIN_STEP;
    const z1 = z0 + TERRAIN_STEP;
    for (let ix = 0; ix < cells; ix += 1) {
      const x0 = -TERRAIN_OUTER + ix * TERRAIN_STEP;
      const x1 = x0 + TERRAIN_STEP;
      const insideHole =
        x0 >= -TERRAIN_HOLE &&
        x1 <= TERRAIN_HOLE &&
        z0 >= -TERRAIN_HOLE &&
        z1 <= TERRAIN_HOLE;
      if (insideHole) {
        continue;
      }
      pushVertex(ix, iz);
      pushVertex(ix, iz + 1);
      pushVertex(ix + 1, iz);
      pushVertex(ix + 1, iz);
      pushVertex(ix, iz + 1);
      pushVertex(ix + 1, iz + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makePineGeometry(): THREE.BufferGeometry {
  const tiers = [
    new THREE.ConeGeometry(1.12, 2.1, 6),
    new THREE.ConeGeometry(0.88, 1.9, 6),
    new THREE.ConeGeometry(0.58, 1.55, 6),
  ];
  tiers[0].translate(0, 1.72, 0);
  tiers[1].translate(0, 2.78, 0);
  tiers[2].translate(0, 3.74, 0);
  const merged = mergeGeometries(tiers, false);
  if (!merged) {
    return tiers[0];
  }
  for (const tier of tiers) {
    tier.dispose();
  }
  return merged;
}

interface ScatterPoint {
  x: number;
  z: number;
  height: number;
}

function scatter(
  random: () => number,
  count: number,
  minRadius: number,
  maxRadius: number,
  maxHeight: number,
  maxSlope: number,
): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  let attempts = 0;
  while (points.length < count && attempts < count * 16) {
    attempts += 1;
    const angle = random() * Math.PI * 2;
    const radius = minRadius + Math.pow(random(), 0.72) * (maxRadius - minRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!canPlaceFeature(x, z)) {
      continue;
    }
    const height = landscapeHeightAt(x, z);
    if (height > maxHeight || slopeAt(x, z) > maxSlope) {
      continue;
    }
    points.push({ x, z, height });
  }
  return points;
}

function addForest(
  group: THREE.Group,
  materials: THREE.Material[],
  meshes: THREE.Mesh[],
): void {
  const random = mulberry32(0x6e2f91c7);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
  });
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a523a,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  materials.push(foliageMaterial, trunkMaterial);

  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.22, 1.5, 5);
  trunkGeometry.translate(0, 0.75, 0);
  const foliageGeometry = makePineGeometry();
  const maxTrees = 240;
  const foliageMesh = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, maxTrees);
  const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, maxTrees);
  foliageMesh.count = 0;
  trunkMesh.count = 0;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const groveRandom = mulberry32(0x35d18ab1);
  const groves: Array<{ x: number; z: number; radius: number; count: number }> = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = groveRandom() * Math.PI * 2;
    const radius = 52 + groveRandom() * 72;
    groves.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 8 + groveRandom() * 13,
      count: 7 + Math.floor(groveRandom() * 10),
    });
  }

  let placed = 0;
  for (const grove of groves) {
    for (let index = 0; index < grove.count && placed < maxTrees; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * grove.radius;
      const x = grove.x + Math.cos(angle) * distance;
      const z = grove.z + Math.sin(angle) * distance;
      if (!canPlaceFeature(x, z)) {
        continue;
      }
      const height = landscapeHeightAt(x, z);
      if (height > 24 || slopeAt(x, z) > 0.95) {
        continue;
      }
      const scale = 0.78 + random() * 0.85;
      dummy.position.set(x, height - 0.18, z);
      dummy.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.055);
      dummy.scale.set(scale, scale * (0.86 + random() * 0.32), scale);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(placed, dummy.matrix);
      trunkMesh.setMatrixAt(placed, dummy.matrix);
      color
        .setHex(0x4b7257)
        .lerp(PALETTE.clayDark, 0.08)
        .offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.08);
      foliageMesh.setColorAt(placed, color);
      placed += 1;
    }
  }
  foliageMesh.count = placed;
  trunkMesh.count = placed;
  foliageMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.instanceMatrix.needsUpdate = true;
  foliageMesh.frustumCulled = false;
  trunkMesh.frustumCulled = false;
  if (foliageMesh.instanceColor) {
    foliageMesh.instanceColor.needsUpdate = true;
  }
  group.add(foliageMesh, trunkMesh);
  meshes.push(foliageMesh, trunkMesh);

  const bushMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
  });
  materials.push(bushMaterial);
  const bushGeometry = new THREE.DodecahedronGeometry(1, 0);
  const bushCount = 120;
  const bushMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
  bushMesh.count = 0;
  const bushes = scatter(random, bushCount, 39, 95, 16, 0.8);
  for (let index = 0; index < bushes.length; index += 1) {
    const point = bushes[index];
    const scale = 0.55 + random() * 0.95;
    dummy.position.set(point.x, point.height - 0.05, point.z);
    dummy.rotation.set(random() * 0.3, random() * Math.PI * 2, random() * 0.3);
    dummy.scale.set(scale, scale * (0.5 + random() * 0.35), scale);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(index, dummy.matrix);
    color
      .setHex(0x687a57)
      .offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08);
    bushMesh.setColorAt(index, color);
  }
  bushMesh.count = bushes.length;
  bushMesh.instanceMatrix.needsUpdate = true;
  bushMesh.frustumCulled = false;
  if (bushMesh.instanceColor) {
    bushMesh.instanceColor.needsUpdate = true;
  }
  group.add(bushMesh);
  meshes.push(bushMesh);
}

function makeGrassGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const tufts = [
    { x: 0, z: 0, rotation: 0.2, lean: 0.05, scale: 1 },
    { x: 0.17, z: 0.08, rotation: 2.1, lean: -0.16, scale: 0.84 },
    { x: -0.15, z: -0.1, rotation: 4.1, lean: 0.18, scale: 0.74 },
    { x: 0.06, z: -0.17, rotation: 1.2, lean: -0.1, scale: 0.68 },
  ];
  for (const tuft of tufts) {
    const blade = new THREE.ConeGeometry(0.075 * tuft.scale, 0.42 * tuft.scale, 3, 1, true);
    blade.translate(0, 0.21 * tuft.scale, 0);
    blade.rotateZ(tuft.lean);
    blade.rotateY(tuft.rotation);
    blade.translate(tuft.x, 0, tuft.z);
    blades.push(blade);
  }
  const merged = mergeGeometries(blades, false);
  if (!merged) {
    return blades[0];
  }
  for (const blade of blades) {
    blade.dispose();
  }
  return merged;
}

function addDeckEdgeGrass(
  group: THREE.Group,
  materials: THREE.Material[],
  meshes: THREE.Mesh[],
): void {
  const random = mulberry32(0x2d8a4f17);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  materials.push(material);
  const geometry = makeGrassGeometry();
  const maxGrass = 180;
  const mesh = new THREE.InstancedMesh(geometry, material, maxGrass);
  mesh.count = 0;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;

  for (let attempt = 0; attempt < 520 && placed < maxGrass; attempt += 1) {
    const along = (random() * 2 - 1) * (SURFACE_DECK_HALF - 0.8);
    const inset = SURFACE_DECK_HALF - 0.6 - random() * 3.6;
    const side = Math.floor(random() * 4);
    const x = side < 2 ? (side === 0 ? -inset : inset) : along;
    const z = side >= 2 ? (side === 2 ? -inset : inset) : along;
    if (
      Math.hypot(x - OFFICE_X, z - OFFICE_Z) < 8.5 ||
      Math.hypot(x - SURFACE_SPAWN.x, z - SURFACE_SPAWN.z) < 5.5 ||
      Math.hypot(x - HOPPER_POSITION.x, z - HOPPER_POSITION.z) < 5.5
    ) {
      continue;
    }
    const scale = 0.72 + random() * 0.55;
    const baseY =
      Math.max(Math.abs(x), Math.abs(z)) <= SURFACE_DECK_HALF
        ? SURFACE_DECK_Y + 0.005
        : landscapeHeightAt(x, z);
    dummy.position.set(x, baseY, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (0.72 + random() * 0.55), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    color
      .setHex(random() > 0.35 ? 0x5f7448 : 0x6f8154)
      .offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.08);
    mesh.setColorAt(placed, color);
    placed += 1;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  group.add(mesh);
  meshes.push(mesh);
}

function addBoulders(
  group: THREE.Group,
  materials: THREE.Material[],
  meshes: THREE.Mesh[],
): void {
  const random = mulberry32(0x1d7c4e29);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
  });
  materials.push(material);
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const maxBoulders = 110;
  const mesh = new THREE.InstancedMesh(geometry, material, maxBoulders);
  mesh.count = 0;
  const points = scatter(random, 76, 37, 118, 34, 1.5);
  const scatterCount = points.length;
  for (const axis of [0, 1]) {
    for (const sign of [-1, 1]) {
      for (let index = 0; index < 7; index += 1) {
        const along =
          -SURFACE_DECK_HALF +
          ((index + 0.5) / 7) * SURFACE_DECK_HALF * 2 +
          (random() - 0.5) * 1.4;
        const offset = SURFACE_DECK_HALF + 0.7 + random() * 1.8;
        const x = axis === 0 ? sign * offset : along;
        const z = axis === 1 ? sign * offset : along;
        if (!canPlaceFeature(x, z)) {
          continue;
        }
        const height = landscapeHeightAt(x, z);
        if (height > 8 || slopeAt(x, z) > 1.2) {
          continue;
        }
        points.push({ x, z, height });
      }
    }
  }
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const scale = index < scatterCount ? 0.6 + random() * 1.8 : 0.45 + random() * 0.9;
    dummy.position.set(point.x, point.height + scale * 0.22, point.z);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(scale, scale * (0.55 + random() * 0.65), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    color
      .setHex(random() > 0.45 ? 0x8a8274 : 0x78766c)
      .offsetHSL(0, 0, (random() - 0.5) * 0.07);
    mesh.setColorAt(index, color);
  }
  mesh.count = points.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  group.add(mesh);
  meshes.push(mesh);
}

export function buildLandscape(
  group: THREE.Group,
  meshes: THREE.Mesh[],
  materials: THREE.Material[],
): void {
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  materials.push(terrainMaterial);
  const terrain = new THREE.Mesh(buildTerrainGeometry(), terrainMaterial);
  terrain.name = 'natural-terrain';
  terrain.castShadow = false;
  terrain.receiveShadow = false;
  group.add(terrain);
  meshes.push(terrain);

  addForest(group, materials, meshes);
  addBoulders(group, materials, meshes);
  addDeckEdgeGrass(group, materials, meshes);
}
