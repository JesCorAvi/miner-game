import * as THREE from 'three';
import type { WeaponFamilyDefinition } from '../data/weaponFamilies';

export interface WeaponModelParts {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  movingPart?: THREE.Object3D;
  flashColor: number;
  flashSize: number;
}

function material(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    fog: false,
    toneMapped: false,
  });
}

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

function cylinder(
  top: number,
  bottom: number,
  height: number,
  segments: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, segments),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

function cone(
  radius: number,
  height: number,
  segments: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, segments),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

function sphere(radius: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function addGrip(group: THREE.Group, x = 0, y = -0.12, z = 0.08): void {
  group.add(box(0.15, 0.32, 0.2, 0x3b3630, x, y, z, -0.22));
  group.add(box(0.2, 0.2, 0.2, 0x4a4033, x - 0.04, y - 0.22, z + 0.06, -0.1));
}

function addMuzzle(group: THREE.Group, x: number, y: number, z: number): THREE.Object3D {
  const muzzle = new THREE.Object3D();
  muzzle.position.set(x, y, z);
  group.add(muzzle);
  return muzzle;
}

function buildGun(
  body: number,
  accent: number,
  barrelLength: number,
  barrelRadius: number,
  muzzleZ: number,
  barrels = 1,
): WeaponModelParts {
  const group = new THREE.Group();
  group.add(box(0.2, 0.18, 0.38, body, 0, 0.05, 0.05));
  if (barrels > 1) {
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.08, -0.24);
    for (let index = 0; index < barrels; index += 1) {
      const angle = (index / barrels) * Math.PI * 2;
      rotor.add(
        cylinder(
          barrelRadius,
          barrelRadius,
          barrelLength,
          6,
          accent,
          Math.cos(angle) * 0.09,
          Math.sin(angle) * 0.09,
          0,
          Math.PI / 2,
        ),
      );
    }
    group.add(rotor);
  } else {
    group.add(
      cylinder(
        barrelRadius,
        barrelRadius * 1.08,
        barrelLength,
        7,
        accent,
        0,
        0.08,
        -barrelLength * 0.35,
        Math.PI / 2,
      ),
    );
  }
  group.add(box(0.12, 0.1, 0.22, accent, 0, 0.17, 0.0));
  addGrip(group);
  const muzzle = addMuzzle(group, 0, 0.08, muzzleZ);
  return {
    group,
    muzzle,
    movingPart: barrels > 1 ? group.children[1] as THREE.Group : undefined,
    flashColor: accent,
    flashSize: barrelRadius * 3.4,
  };
}

function buildAxe(colors: { head: number; edge: number }, double: boolean): WeaponModelParts {
  const group = new THREE.Group();
  group.add(cylinder(0.035, 0.045, 0.95, 7, 0x6b4a2f, 0, 0.0, 0, 0, 0, 0.05));
  group.add(box(0.3, 0.16, 0.14, 0x4c4f4a, 0, 0.46, 0, 0, 0, 0.05));
  group.add(box(0.42, 0.3, 0.1, colors.head, 0.24, 0.5, 0, 0, 0, -0.25));
  group.add(box(0.08, 0.34, 0.12, colors.edge, 0.45, 0.53, 0, 0, 0, -0.25));
  if (double) {
    group.add(box(0.42, 0.3, 0.1, colors.head, -0.24, 0.5, 0, 0, 0, 0.25));
    group.add(box(0.08, 0.34, 0.12, colors.edge, -0.45, 0.53, 0, 0, 0, 0.25));
  }
  const muzzle = addMuzzle(group, 0.4, 0.5, -0.1);
  return { group, muzzle, flashColor: colors.edge, flashSize: 0.16 };
}

function buildFist(): WeaponModelParts {
  const group = new THREE.Group();
  group.add(box(0.34, 0.32, 0.38, 0x7d3c37, 0, 0.0, -0.08, 0, 0, 0.08));
  group.add(box(0.28, 0.1, 0.34, 0xb85b4d, 0, 0.16, -0.08, 0, 0, 0.08));
  group.add(cylinder(0.13, 0.1, 0.22, 7, 0x4a4033, -0.16, -0.18, 0.08, 0, 0, 0.35));
  const muzzle = addMuzzle(group, 0, 0.02, -0.42);
  return { group, muzzle, flashColor: 0xff8a8a, flashSize: 0.12 };
}

function buildBoot(): WeaponModelParts {
  const group = new THREE.Group();
  group.add(cylinder(0.13, 0.11, 0.62, 7, 0x4a4033, -0.18, -0.12, 0.12, 0.4, 0, 0.2));
  group.add(box(0.24, 0.18, 0.52, 0x5b4a3b, -0.08, -0.42, -0.18, -0.08));
  group.add(box(0.26, 0.08, 0.2, 0x2f2b27, -0.08, -0.47, -0.4));
  const muzzle = addMuzzle(group, 0.2, -0.32, -0.4);
  return { group, muzzle, flashColor: 0xff8a8a, flashSize: 0.12 };
}

function buildStaff(color: number, accent: number, large: boolean): WeaponModelParts {
  const group = new THREE.Group();
  group.add(cylinder(0.04, 0.055, 1.05, 7, 0x5c442f, 0, 0.02, 0, 0, 0, -0.08));
  group.add(cylinder(0.07, 0.07, 0.14, 7, accent, 0, 0.56, 0));
  const orb = sphere(large ? 0.15 : 0.12, color, 0, 0.68, 0);
  group.add(orb);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(large ? 0.2 : 0.16, 0.018, 4, 10),
    material(accent),
  );
  ring.position.set(0, 0.68, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const muzzle = addMuzzle(group, 0, 0.68, -0.14);
  return {
    group,
    muzzle,
    movingPart: ring,
    flashColor: color,
    flashSize: 0.2,
  };
}

function buildOrb(): WeaponModelParts {
  const group = new THREE.Group();
  group.add(sphere(0.2, 0xd8a8ff, 0, 0.12, -0.28));
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.018, 4, 12),
    material(0xc08cff),
  );
  ringA.position.set(0, 0.12, -0.28);
  ringA.rotation.x = Math.PI / 2;
  group.add(ringA);
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.014, 4, 12),
    material(0xf0d0ff),
  );
  ringB.position.set(0, 0.12, -0.28);
  ringB.rotation.y = Math.PI / 3;
  group.add(ringB);
  const muzzle = addMuzzle(group, 0, 0.12, -0.5);
  return {
    group,
    muzzle,
    movingPart: ringA,
    flashColor: 0xd8a8ff,
    flashSize: 0.2,
  };
}

function buildCannon(color: number): WeaponModelParts {
  const group = new THREE.Group();
  group.add(cylinder(0.16, 0.2, 0.9, 8, 0x4a4033, 0, 0.12, -0.18, Math.PI / 2));
  group.add(cylinder(0.21, 0.21, 0.16, 8, color, 0, 0.12, -0.64, Math.PI / 2));
  group.add(box(0.32, 0.28, 0.4, 0x2f3433, 0, 0.05, 0.22));
  group.add(box(0.16, 0.22, 0.1, 0x6b4a2f, -0.1, -0.16, 0.38, -0.2));
  group.add(box(0.16, 0.22, 0.1, 0x6b4a2f, 0.1, -0.16, 0.38, -0.2));
  const muzzle = addMuzzle(group, 0, 0.12, -0.78);
  return { group, muzzle, flashColor: color, flashSize: 0.28 };
}

function buildFlamethrower(color: number): WeaponModelParts {
  const group = new THREE.Group();
  group.add(box(0.24, 0.22, 0.5, 0x303a34, 0, 0.06, 0));
  group.add(cylinder(0.08, 0.1, 0.55, 7, 0x5b5f58, 0, 0.08, -0.42, Math.PI / 2));
  group.add(cylinder(0.16, 0.14, 0.42, 7, color, 0, 0.06, 0.34, Math.PI / 2));
  group.add(cone(0.13, 0.2, 7, 0x2f3433, 0, 0.08, -0.74, -Math.PI / 2));
  addGrip(group, 0, -0.18, 0.05);
  const muzzle = addMuzzle(group, 0, 0.08, -0.86);
  return { group, muzzle, flashColor: color, flashSize: 0.24 };
}

function buildJet(color: number): WeaponModelParts {
  const group = new THREE.Group();
  group.add(box(0.28, 0.2, 0.46, 0x4c5560, 0, 0.06, 0));
  group.add(cylinder(0.08, 0.08, 0.56, 7, 0x7ab7ff, -0.18, 0.02, -0.18, Math.PI / 2));
  group.add(cylinder(0.08, 0.08, 0.56, 7, 0x7ab7ff, 0.18, 0.02, -0.18, Math.PI / 2));
  group.add(box(0.12, 0.08, 0.12, color, 0, 0.17, -0.05));
  addGrip(group);
  const muzzle = addMuzzle(group, 0, 0.04, -0.52);
  return { group, muzzle, flashColor: 0x7ab7ff, flashSize: 0.22 };
}

function buildMortar(color: number): WeaponModelParts {
  const group = new THREE.Group();
  group.add(cylinder(0.17, 0.22, 0.8, 8, 0x3d423d, 0, 0.18, -0.18, Math.PI / 2));
  group.add(cylinder(0.25, 0.25, 0.12, 8, color, 0, 0.18, -0.6, Math.PI / 2));
  group.add(box(0.3, 0.1, 0.3, 0x6b4a2f, 0, -0.12, 0.16));
  group.add(cylinder(0.04, 0.04, 0.34, 6, 0x4c4f4a, 0, -0.05, 0.34, 0, 0, 0.6));
  const muzzle = addMuzzle(group, 0, 0.18, -0.72);
  return { group, muzzle, flashColor: color, flashSize: 0.28 };
}

function buildQuake(color: number): WeaponModelParts {
  const group = new THREE.Group();
  group.add(box(0.36, 0.34, 0.46, 0x3b403a, 0, 0.02, 0));
  group.add(cylinder(0.13, 0.17, 0.3, 8, color, 0, -0.18, -0.22, Math.PI / 2));
  group.add(box(0.2, 0.08, 0.2, 0x6b4a2f, 0, 0.2, 0.0));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.025, 4, 10),
    material(color),
  );
  ring.position.set(0, -0.26, -0.3);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  addGrip(group, -0.18, -0.12, 0.1);
  const muzzle = addMuzzle(group, 0, -0.26, -0.42);
  return {
    group,
    muzzle,
    movingPart: ring,
    flashColor: color,
    flashSize: 0.24,
  };
}

export function buildFamilyWeaponModel(
  family: WeaponFamilyDefinition,
): WeaponModelParts {
  switch (family.id) {
    case 'pistol':
      return buildGun(0x30363b, family.color, 0.42, 0.045, -0.48);
    case 'rifle':
      return buildGun(0x30363b, family.color, 0.9, 0.035, -0.78);
    case 'minigun':
      return buildGun(0x343a3e, family.color, 0.55, 0.04, -0.72, 6);
    case 'axe':
      return buildAxe({ head: 0xb45f4f, edge: 0xe0a0a0 }, false);
    case 'battleaxe':
      return buildAxe({ head: 0xb45f4f, edge: 0xf0c0c0 }, true);
    case 'boxingGlove':
      return buildFist();
    case 'roundhouseKick':
      return buildBoot();
    case 'magicStaff':
      return buildStaff(0xd8a8ff, 0xc08cff, false);
    case 'poisonStaff':
      return buildStaff(0x8aff6a, 0x4bbf3a, true);
    case 'waterStaff':
      return buildStaff(0x6ad8ff, 0x2f9fd0, true);
    case 'orb':
      return buildOrb();
    case 'tank':
      return buildCannon(family.color);
    case 'flamethrower':
      return buildFlamethrower(family.color);
    case 'poisonGun':
      return buildFlamethrower(0x8aff6a);
    case 'waterGun':
      return buildFlamethrower(0x6ad8ff);
    case 'jet':
      return buildJet(family.color);
    case 'mortar':
      return buildMortar(family.color);
    case 'earthquake':
      return buildQuake(family.color);
    default:
      return buildGun(0x30363b, family.color, 0.5, 0.045, -0.55);
  }
}

export function familyWeaponPose(family: WeaponFamilyDefinition): {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
} {
  switch (family.model) {
    case 'staff':
      return {
        position: new THREE.Vector3(0.43, -0.48, -0.72),
        rotation: new THREE.Euler(-0.06, -0.22, 0.18, 'YXZ'),
        scale: 0.86,
      };
    case 'orb':
      return {
        position: new THREE.Vector3(0.36, -0.42, -0.58),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        scale: 1,
      };
    case 'glove':
    case 'boot':
      return {
        position: new THREE.Vector3(0.34, -0.55, -0.62),
        rotation: new THREE.Euler(0.06, 0.3, 0.22, 'YXZ'),
        scale: 0.95,
      };
    case 'drill':
    case 'quake':
      return {
        position: new THREE.Vector3(0.42, -0.4, -0.8),
        rotation: new THREE.Euler(-0.04, -0.12, 0.12, 'YXZ'),
        scale: 0.78,
      };
    case 'jet':
      return {
        position: new THREE.Vector3(0.45, -0.42, -0.74),
        rotation: new THREE.Euler(-0.08, -0.18, 0.06, 'YXZ'),
        scale: 0.88,
      };
    case 'tank':
    case 'mortar':
      return {
        position: new THREE.Vector3(0.45, -0.46, -0.76),
        rotation: new THREE.Euler(-0.06, -0.18, 0.08, 'YXZ'),
        scale: 0.9,
      };
    case 'gun':
      return {
        position: new THREE.Vector3(0.45, -0.45, -0.74),
        rotation: new THREE.Euler(-0.06, -0.18, 0.08, 'YXZ'),
        scale: 0.88,
      };
    default:
      return {
        position: new THREE.Vector3(0.4, -0.62, -0.68),
        rotation: new THREE.Euler(0.06, 0.3, 0.22, 'YXZ'),
        scale: 0.9,
      };
  }
}
