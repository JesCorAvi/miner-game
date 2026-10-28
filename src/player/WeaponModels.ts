import * as THREE from 'three';
import type { WeaponFamilyDefinition } from '../data/weaponFamilies';
import {
  BLACK,
  BRASS,
  BONE,
  COPPER,
  HAZARD,
  IRON,
  LEATHER,
  RUBBER,
  STEEL,
  STEEL_DARK,
  WOOD,
  WOOD_DARK,
  addHand,
  addMuzzle,
  addRivet,
  box,
  cone,
  cylinder,
  glowMaterial,
  litMaterial,
  parts,
  sphere,
  torus,
  type WeaponModelParts,
} from './WeaponModelKit';

/** Punto de apoyo de cada viewmodel; el llamador aplica la pose. */
export function familyWeaponPose(family: WeaponFamilyDefinition): {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
} {
  switch (family.model) {
    case 'staff':
      return {
        position: new THREE.Vector3(0.43, -0.32, -0.72),
        rotation: new THREE.Euler(-0.06, -0.22, 0.18, 'YXZ'),
        scale: 0.9,
      };
    case 'orb':
      return {
        position: new THREE.Vector3(0.36, -0.27, -0.58),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        scale: 1,
      };
    case 'glove':
    case 'boot':
      return {
        position: new THREE.Vector3(0.3, -0.16, -0.64),
        rotation: new THREE.Euler(0.06, 0.3, 0.22, 'YXZ'),
        scale: 0.95,
      };
    case 'drill':
    case 'quake':
      return {
        position: new THREE.Vector3(0.42, -0.28, -0.8),
        rotation: new THREE.Euler(-0.04, -0.12, 0.12, 'YXZ'),
        scale: 0.8,
      };
    case 'jet':
      return {
        position: new THREE.Vector3(0.45, -0.2, -0.74),
        rotation: new THREE.Euler(-0.08, -0.18, 0.06, 'YXZ'),
        scale: 0.88,
      };
    case 'tank':
    case 'mortar':
      return {
        position: new THREE.Vector3(0.45, -0.18, -0.76),
        rotation: new THREE.Euler(-0.06, -0.18, 0.08, 'YXZ'),
        scale: 0.9,
      };
    case 'gun':
      return {
        position: new THREE.Vector3(0.44, -0.14, -0.76),
        rotation: new THREE.Euler(-0.03, -0.18, 0.08, 'YXZ'),
        scale: 0.88,
      };
    default:
      return {
        position: new THREE.Vector3(0.4, -0.32, -0.68),
        rotation: new THREE.Euler(0.06, 0.3, 0.22, 'YXZ'),
        scale: 0.9,
      };
  }
}

function buildTesla(): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.035, 0.047, 0.9, 8, WOOD_DARK(), 0, -0.02, 0, 0, 0, 0.05);
  cylinder(group, 0.055, 0.05, 0.18, 8, LEATHER(), 0, -0.35, 0.01, 0, 0, 0.05);
  torus(group, 0.06, 0.01, BLACK(), 0, -0.25, 0, Math.PI / 2);
  torus(group, 0.06, 0.01, BLACK(), 0, -0.44, 0, Math.PI / 2);
  box(group, 0.16, 0.12, 0.18, IRON(), 0, 0.42, 0, 0, 0, 0.03);
  const coil = new THREE.Group();
  coil.position.set(0, 0.24, 0);
  group.add(coil);
  for (let index = 0; index < 5; index += 1) {
    torus(coil, 0.074 + index * 0.007, 0.012, COPPER(), 0, index * 0.045, 0, Math.PI / 2);
  }
  sphere(coil, 0.058, glowMaterial(0x7beaff, 1.1), 0, 0.02, 0);
  cylinder(group, 0.07, 0.085, 0.15, 6, BRASS(), 0, 0.52, 0, 0, 0, 0.02);
  cone(group, 0.055, 0.2, 4, STEEL(), -0.18, 0.55, -0.03, 0, 0, -Math.PI / 2);
  cone(group, 0.055, 0.2, 4, STEEL(), 0.18, 0.55, -0.03, 0, 0, Math.PI / 2);
  cone(group, 0.026, 0.17, 4, STEEL(), -0.29, 0.55, -0.03, 0, 0, -Math.PI / 2);
  cone(group, 0.026, 0.17, 4, STEEL(), 0.29, 0.55, -0.03, 0, 0, Math.PI / 2);
  torus(group, 0.11, 0.012, glowMaterial(0x7beaff, 0.7), 0, 0.52, 0, Math.PI / 2);
  cylinder(group, 0.022, 0.022, 0.28, 6, BLACK(), 0.1, 0.28, 0.08, 0, 0, 0.4);
  addHand(group, -0.15, -0.34, 0.1, 0.9, 0.35);
  return parts(group, addMuzzle(group, 0, 0.55, -0.17), 0x7beaff, 0.16, coil);
}

function buildDrill(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.3, 0.26, 0.5, IRON(), 0, 0.1, 0.05);
  box(group, 0.34, 0.08, 0.36, STEEL_DARK(), 0, 0.265, 0.08);
  box(group, 0.2, 0.06, 0.16, HAZARD(), 0, 0.02, -0.18);
  for (let index = 0; index < 3; index += 1) {
    box(group, 0.26, 0.025, 0.12, BLACK(), 0, 0.12 + index * 0.055, 0.18);
  }
  cylinder(group, 0.14, 0.18, 0.22, 8, STEEL(), 0, 0.06, -0.34, Math.PI / 2);
  cylinder(group, 0.1, 0.12, 0.08, 8, BRASS(), 0, 0.06, -0.48, Math.PI / 2);
  const bit = new THREE.Group();
  bit.position.set(0, 0.06, -0.51);
  group.add(bit);
  cylinder(bit, 0.045, 0.045, 0.62, 6, STEEL(), 0, 0, -0.25, Math.PI / 2);
  for (let index = 0; index < 5; index += 1) {
    box(
      bit,
      0.22,
      0.035,
      0.1,
      index % 2 === 0 ? STEEL() : STEEL_DARK(),
      0,
      0,
      -0.05 - index * 0.115,
      0,
      0,
      index * 1.7,
    );
  }
  cone(bit, 0.08, 0.22, 6, STEEL(), 0, 0, -0.56, -Math.PI / 2);
  box(group, 0.12, 0.3, 0.14, LEATHER(), -0.08, -0.2, 0.08, -0.2);
  cylinder(group, 0.038, 0.038, 0.35, 6, BLACK(), 0.16, 0.02, 0.24, 0, 0.4, 0.7);
  addHand(group, 0.04, -0.19, 0.13, 0.85, 0.18);
  return parts(group, addMuzzle(group, 0, 0.06, -0.84), 0xfcb45c, 0.2, bit);
}

function buildShotgun(): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.062, 0.072, 0.9, 8, STEEL(), 0, 0.14, -0.23, Math.PI / 2);
  cylinder(group, 0.032, 0.036, 0.72, 7, IRON(), 0, 0.025, -0.15, Math.PI / 2);
  box(group, 0.21, 0.18, 0.3, IRON(), 0, 0.09, 0.22);
  box(group, 0.17, 0.19, 0.34, WOOD_DARK(), 0, 0.01, 0.48, -0.18);
  box(group, 0.14, 0.09, 0.24, WOOD(), 0, 0.02, 0.44, -0.18);
  const pump = new THREE.Group();
  pump.position.set(0, 0.025, -0.28);
  group.add(pump);
  cylinder(pump, 0.1, 0.105, 0.24, 8, LEATHER(), 0, 0, 0, Math.PI / 2);
  for (let index = 0; index < 3; index += 1) {
    torus(pump, 0.103, 0.008, BLACK(), 0, 0, -0.07 + index * 0.07, Math.PI / 2);
  }
  box(group, 0.026, 0.055, 0.035, BRASS(), 0, 0.23, -0.45);
  torus(group, 0.052, 0.012, STEEL_DARK(), 0, 0.06, -0.02, 0, Math.PI / 2);
  for (let index = 0; index < 4; index += 1) {
    cylinder(group, 0.022, 0.022, 0.09, 6, HAZARD(), -0.12, 0.08, 0.16 + index * 0.06, 0, 0, Math.PI / 2);
  }
  addHand(group, 0.02, -0.13, 0.15, 0.9, 0.2);
  return parts(group, addMuzzle(group, 0, 0.14, -0.8), 0xffce7d, 0.24, pump);
}

function buildPistol(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.17, 0.12, 0.32, STEEL_DARK(), 0, 0.09, 0.02);
  box(group, 0.14, 0.055, 0.26, STEEL(), 0, 0.165, -0.02);
  cylinder(group, 0.042, 0.045, 0.32, 7, IRON(), 0, 0.12, -0.28, Math.PI / 2);
  cylinder(group, 0.052, 0.052, 0.1, 7, BRASS(), 0, 0.12, -0.44, Math.PI / 2);
  box(group, 0.14, 0.25, 0.14, LEATHER(), -0.01, -0.08, 0.12, -0.2);
  box(group, 0.11, 0.04, 0.09, BLACK(), 0, -0.22, 0.16, -0.2);
  torus(group, 0.045, 0.012, IRON(), 0, 0.02, -0.04, 0, Math.PI / 2);
  box(group, 0.03, 0.035, 0.025, HAZARD(), 0, 0.205, -0.13);
  box(group, 0.025, 0.035, 0.025, HAZARD(), 0, 0.205, 0.08);
  cylinder(group, 0.018, 0.018, 0.14, 6, glowMaterial(0x7dd3fc, 0.5), 0.085, 0.12, -0.2, Math.PI / 2);
  addHand(group, -0.01, -0.12, 0.16, 0.9, 0.2);
  return parts(group, addMuzzle(group, 0, 0.12, -0.52), 0xffd27b, 0.13);
}

function buildRifle(): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.035, 0.042, 0.98, 7, STEEL(), 0, 0.115, -0.35, Math.PI / 2);
  cylinder(group, 0.058, 0.06, 0.12, 7, IRON(), 0, 0.115, -0.86, Math.PI / 2);
  box(group, 0.17, 0.13, 0.36, IRON(), 0, 0.1, 0.12);
  box(group, 0.14, 0.12, 0.32, STEEL_DARK(), 0, 0.16, 0.44);
  box(group, 0.11, 0.15, 0.24, WOOD_DARK(), 0, 0.02, 0.58, -0.16);
  for (let index = 0; index < 4; index += 1) {
    box(group, 0.13, 0.025, 0.06, BLACK(), 0, 0.21, -0.06 - index * 0.075);
  }
  cylinder(group, 0.055, 0.055, 0.28, 8, BLACK(), 0, 0.255, 0.06, Math.PI / 2);
  torus(group, 0.046, 0.01, STEEL(), 0, 0.255, -0.06, 0, Math.PI / 2);
  torus(group, 0.046, 0.01, STEEL(), 0, 0.255, 0.18, 0, Math.PI / 2);
  sphere(group, 0.04, glowMaterial(0x7dd3fc, 0.6), 0, 0.255, -0.08);
  box(group, 0.1, 0.22, 0.13, BLACK(), 0, -0.05, 0.25, -0.15);
  addHand(group, 0, -0.13, 0.18, 0.9, 0.2);
  addHand(group, 0, 0.0, -0.2, 0.75, 0.1);
  return parts(group, addMuzzle(group, 0, 0.115, -0.93), 0xffd27b, 0.14);
}

function buildMinigun(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.28, 0.26, 0.42, IRON(), 0, 0.08, 0.12);
  const rotor = new THREE.Group();
  rotor.position.set(0, 0.1, -0.2);
  group.add(rotor);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    cylinder(
      rotor,
      0.027,
      0.027,
      0.58,
      6,
      index % 2 === 0 ? STEEL() : STEEL_DARK(),
      Math.cos(angle) * 0.085,
      Math.sin(angle) * 0.085,
      0,
      Math.PI / 2,
    );
  }
  cylinder(group, 0.16, 0.17, 0.12, 10, STEEL(), 0, 0.1, -0.48, Math.PI / 2);
  torus(group, 0.14, 0.018, BRASS(), 0, 0.1, -0.52, Math.PI / 2);
  box(group, 0.3, 0.18, 0.24, STEEL_DARK(), 0.2, 0.06, 0.22);
  for (let index = 0; index < 4; index += 1) {
    box(group, 0.22, 0.03, 0.06, HAZARD(), 0.2, 0.17, 0.13 + index * 0.06);
  }
  cylinder(group, 0.04, 0.04, 0.25, 6, BLACK(), 0.22, 0.02, 0.3, 0, 0.4, 0.8);
  box(group, 0.13, 0.28, 0.13, LEATHER(), -0.12, -0.12, 0.15, -0.2);
  addHand(group, -0.02, -0.14, 0.16, 0.9, 0.16);
  return parts(group, addMuzzle(group, 0, 0.1, -0.58), 0xffd27b, 0.2, rotor);
}

function buildAxe(dual = false): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.035, 0.046, 1.0, 7, WOOD(), 0, 0.02, 0, 0, 0, 0.05);
  for (let index = 0; index < 4; index += 1) {
    torus(group, 0.05, 0.012, LEATHER(), 0, -0.32 + index * 0.07, 0, Math.PI / 2);
  }
  box(group, 0.18, 0.16, 0.18, IRON(), 0, 0.5, 0, 0, 0, 0.05);
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0);
  group.add(head);
  box(head, 0.34, 0.28, 0.08, STEEL(), 0.22, 0.05, 0, 0, 0, -0.22);
  box(head, 0.1, 0.36, 0.06, STEEL(), 0.39, 0.11, 0, 0, 0, -0.22);
  cone(head, 0.09, 0.3, 4, STEEL(), 0.48, 0.22, 0, 0, 0, -0.45);
  if (dual) {
    box(head, 0.34, 0.28, 0.08, STEEL(), -0.22, 0.05, 0, 0, 0, 0.22);
    box(head, 0.1, 0.36, 0.06, STEEL(), -0.39, 0.11, 0, 0, 0, 0.22);
    cone(head, 0.09, 0.3, 4, STEEL(), -0.48, 0.22, 0, 0, 0, 0.45);
  } else {
    cone(head, 0.07, 0.22, 4, STEEL(), -0.29, 0.16, 0, 0, 0, 1.4);
  }
  for (const side of dual ? [-1, 1] : [1]) {
    for (let index = 0; index < 3; index += 1) {
      addRivet(head, side * (0.18 + index * 0.09), 0.0, -0.06);
    }
  }
  addHand(group, -0.02, -0.25, 0.08, 0.9, 0.2);
  return parts(group, addMuzzle(group, 0.42, 0.5, -0.12), 0xff8a8a, 0.15);
}

function buildGlove(): WeaponModelParts {
  const group = new THREE.Group();
  const leather = litLeather(0x8d3f39);
  const pad = litLeather(0xc25e50);
  box(group, 0.34, 0.32, 0.4, leather, 0, 0.02, -0.08, 0, 0, 0.08);
  box(group, 0.28, 0.1, 0.34, pad, 0, 0.18, -0.1, 0, 0, 0.08);
  box(group, 0.16, 0.2, 0.22, pad, -0.2, 0.0, -0.08, 0, 0, 0.3);
  cylinder(group, 0.13, 0.11, 0.22, 7, BLACK(), -0.16, -0.18, 0.08, 0, 0, 0.35);
  torus(group, 0.13, 0.018, BRASS(), -0.16, -0.1, 0.08, Math.PI / 2);
  for (let index = 0; index < 3; index += 1) {
    box(group, 0.05, 0.045, 0.18, pad, 0.0, 0.13 - index * 0.055, -0.25, 0, 0, -0.1);
  }
  for (let index = 0; index < 3; index += 1) {
    box(group, 0.2, 0.012, 0.02, BONE(), 0, 0.04 + index * 0.065, 0.11);
  }
  return parts(group, addMuzzle(group, 0, 0.02, -0.43), 0xff8a8a, 0.13);
}

function buildBoot(): WeaponModelParts {
  const group = new THREE.Group();
  const boot = litLeather(0x4a3b2c);
  const bootLight = litLeather(0x6b5642);
  cylinder(group, 0.13, 0.11, 0.64, 7, boot, -0.16, -0.1, 0.08, 0.35, 0, 0.2);
  box(group, 0.24, 0.2, 0.5, boot, -0.06, -0.38, -0.18, -0.06);
  box(group, 0.26, 0.09, 0.54, RUBBER(), -0.06, -0.49, -0.17);
  box(group, 0.22, 0.08, 0.2, STEEL(), -0.06, -0.34, -0.45, -0.06);
  for (let index = 0; index < 3; index += 1) {
    box(group, 0.185, 0.02, 0.025, BONE(), -0.08, -0.18 - index * 0.065, -0.28);
  }
  cylinder(group, 0.14, 0.12, 0.2, 7, bootLight, -0.16, 0.14, 0.12, 0.2, 0, 0.18);
  torus(group, 0.13, 0.018, HAZARD(), -0.16, 0.06, 0.1, Math.PI / 2);
  box(group, 0.1, 0.1, 0.08, STEEL_DARK(), 0.08, -0.34, -0.42);
  return parts(group, addMuzzle(group, 0.2, -0.3, -0.5), 0xff8a8a, 0.13);
}

function buildStaff(kind: 'magic' | 'poison' | 'water', color: number): WeaponModelParts {
  const group = new THREE.Group();
  const shaft = kind === 'poison' ? litWood(0x4b5a2b) : kind === 'water' ? litWood(0x4d5b5c) : WOOD_DARK();
  cylinder(group, 0.035, 0.055, 1.2, 7, shaft, 0, 0.0, 0, 0, 0, kind === 'poison' ? -0.12 : -0.06);
  for (let index = 0; index < 3; index += 1) {
    torus(group, 0.055, 0.012, kind === 'water' ? COPPER() : BRASS(), 0, -0.32 + index * 0.32, 0, Math.PI / 2);
  }
  const top = new THREE.Group();
  top.position.set(0, 0.63, 0);
  group.add(top);
  if (kind === 'poison') {
    sphere(top, 0.12, glowMaterial(color, 0.9), 0, 0.06, 0);
    cylinder(top, 0.15, 0.12, 0.24, 7, glowMaterial(0x6fbf3a, 0.55), 0, 0.06, 0);
    for (let index = 0; index < 4; index += 1) {
      torus(top, 0.14, 0.01, COPPER(), 0, -0.02 + index * 0.07, 0, Math.PI / 2);
    }
    cone(top, 0.03, 0.18, 5, glowMaterial(color, 1), 0, 0.26, 0);
  } else if (kind === 'water') {
    sphere(top, 0.1, glowMaterial(color, 0.85), 0, 0.05, 0);
    for (let index = 0; index < 3; index += 1) {
      torus(top, 0.14 + index * 0.025, 0.012, COPPER(), 0, 0.05, 0, Math.PI / 2 + index * 0.5);
    }
    cone(top, 0.04, 0.2, 5, glowMaterial(color, 0.9), 0, 0.22, 0, 0, 0, -0.4);
  } else {
    const crystal = new THREE.Group();
    crystal.position.set(0, 0.08, 0);
    top.add(crystal);
    cone(crystal, 0.11, 0.3, 5, glowMaterial(color, 1.1), 0, 0.1, 0);
    cone(crystal, 0.06, 0.18, 5, glowMaterial(0xe5c8ff, 0.9), 0, 0.28, 0);
    for (let index = 0; index < 3; index += 1) {
      torus(crystal, 0.14 + index * 0.018, 0.01, BRASS(), 0, 0.08, 0, Math.PI / 2 + index * 0.35);
    }
  }
  const ring = new THREE.Group();
  ring.position.set(0, 0.7, 0);
  group.add(ring);
  torus(ring, 0.16, 0.012, glowMaterial(color, 0.8), 0, 0, 0, Math.PI / 2);
  addHand(group, -0.02, -0.2, 0.08, 0.85, 0.2);
  return parts(group, addMuzzle(group, 0, 0.72, -0.18), color, 0.22, ring);
}

function buildOrb(): WeaponModelParts {
  const group = new THREE.Group();
  const core = new THREE.Group();
  core.position.set(0, 0.12, -0.3);
  group.add(core);
  sphere(core, 0.17, glowMaterial(0xd8a8ff, 1.2), 0, 0, 0);
  sphere(core, 0.1, glowMaterial(0xf0d8ff, 0.9), 0, 0.02, 0);
  for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Group();
    ring.rotation.x = index === 0 ? Math.PI / 2 : index * 0.7;
    ring.rotation.y = index * 0.6;
    core.add(ring);
    torus(ring, 0.24 + index * 0.025, 0.014, index === 1 ? BRASS() : glowMaterial(0xc08cff, 0.7), 0, 0, 0);
    for (let node = 0; node < 3; node += 1) {
      const angle = (node / 3) * Math.PI * 2;
      sphere(ring, 0.025, glowMaterial(0xe6ccff, 1), Math.cos(angle) * (0.24 + index * 0.025), Math.sin(angle) * (0.24 + index * 0.025), 0);
    }
  }
  torus(group, 0.22, 0.012, STEEL_DARK(), 0, 0.12, -0.3, Math.PI / 2, 0, 0);
  return parts(group, addMuzzle(group, 0, 0.12, -0.56), 0xd8a8ff, 0.22, core);
}

function buildJet(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.24, 0.2, 0.46, STEEL_DARK(), 0, 0.06, 0);
  box(group, 0.16, 0.08, 0.28, glowMaterial(0x7ab7ff, 0.5), 0, 0.18, -0.02);
  for (const side of [-1, 1]) {
    cylinder(group, 0.075, 0.09, 0.54, 7, IRON(), side * 0.18, 0.03, -0.16, Math.PI / 2);
    cone(group, 0.09, 0.18, 6, STEEL(), side * 0.18, 0.03, -0.48, -Math.PI / 2);
    box(group, 0.05, 0.16, 0.22, HAZARD(), side * 0.25, 0.03, 0.05);
    cylinder(group, 0.04, 0.04, 0.16, 6, glowMaterial(0x7ab7ff, 1), side * 0.18, 0.03, 0.14, Math.PI / 2);
  }
  box(group, 0.12, 0.09, 0.14, BRASS(), 0, 0.15, 0.18);
  addHand(group, 0, -0.14, 0.12, 0.85, 0.2);
  return parts(group, addMuzzle(group, 0, 0.03, -0.58), 0x7ab7ff, 0.24);
}

function buildTank(): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.16, 0.19, 0.92, 8, STEEL(), 0, 0.14, -0.2, Math.PI / 2);
  cylinder(group, 0.22, 0.22, 0.16, 8, STEEL_DARK(), 0, 0.14, -0.68, Math.PI / 2);
  torus(group, 0.18, 0.022, BRASS(), 0, 0.14, -0.6, Math.PI / 2);
  box(group, 0.34, 0.3, 0.42, STEEL_DARK(), 0, 0.08, 0.26);
  cylinder(group, 0.08, 0.08, 0.36, 7, STEEL(), -0.22, 0.05, 0.18, Math.PI / 2);
  cylinder(group, 0.08, 0.08, 0.36, 7, STEEL(), 0.22, 0.05, 0.18, Math.PI / 2);
  box(group, 0.16, 0.08, 0.14, HAZARD(), 0, 0.27, 0.18);
  for (let index = 0; index < 4; index += 1) {
    box(group, 0.022, 0.14, 0.06, BLACK(), -0.14 + index * 0.09, 0.3, -0.25);
  }
  addHand(group, -0.22, -0.1, 0.28, 0.9, 0.25);
  addHand(group, 0.22, -0.1, 0.28, 0.9, -0.25);
  return parts(group, addMuzzle(group, 0, 0.14, -0.82), 0xffb36b, 0.28);
}

function buildFlamethrower(kind: 'flame' | 'poison' | 'water'): WeaponModelParts {
  const group = new THREE.Group();
  const accent = kind === 'flame' ? 0xff8a4a : kind === 'poison' ? 0x8aff6a : 0x6ad8ff;
  box(group, 0.24, 0.22, 0.5, STEEL_DARK(), 0, 0.08, 0);
  cylinder(group, 0.17, 0.14, 0.42, 8, kind === 'poison' ? glowMaterial(0x4c7c36, 0.35) : kind === 'water' ? glowMaterial(0x34799a, 0.35) : glowMaterial(0x9a4c32, 0.35), 0, 0.08, 0.34, Math.PI / 2);
  cylinder(group, 0.055, 0.045, 0.24, 7, BLACK(), 0, 0.08, -0.34, Math.PI / 2);
  cone(group, 0.12, 0.22, 7, STEEL_DARK(), 0, 0.08, -0.5, -Math.PI / 2);
  cylinder(group, 0.035, 0.035, 0.3, 6, COPPER(), 0.16, 0.02, 0.12, 0, 0, 0.8);
  torus(group, 0.11, 0.012, BRASS(), 0, 0.2, 0.34, 0, Math.PI / 2);
  box(group, 0.12, 0.08, 0.12, HAZARD(), 0, 0.2, -0.06);
  const nozzle = new THREE.Group();
  nozzle.position.set(0, 0.08, -0.58);
  group.add(nozzle);
  torus(nozzle, 0.09, 0.018, glowMaterial(accent, 0.9), 0, 0, 0, Math.PI / 2);
  addHand(group, -0.02, -0.16, 0.15, 0.85, 0.2);
  return parts(group, addMuzzle(group, 0, 0.08, -0.68), accent, 0.26, nozzle);
}

function buildPoisonGun(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.18, 0.14, 0.36, STEEL_DARK(), 0, 0.08, 0.02);
  cylinder(group, 0.04, 0.045, 0.38, 7, IRON(), 0, 0.1, -0.28, Math.PI / 2);
  box(group, 0.1, 0.1, 0.16, glowMaterial(0x8aff6a, 0.55), 0, 0.2, -0.02);
  cylinder(group, 0.1, 0.12, 0.22, 8, glowMaterial(0x4f8f3a, 0.35), 0, 0.11, 0.28, Math.PI / 2);
  torus(group, 0.11, 0.012, COPPER(), 0, 0.11, 0.22, Math.PI / 2);
  cylinder(group, 0.025, 0.03, 0.2, 6, BLACK(), 0.08, 0.02, -0.3, 0.2, 0, 0.4);
  cone(group, 0.055, 0.16, 6, glowMaterial(0x8aff6a, 0.9), 0, 0.1, -0.48, -Math.PI / 2);
  for (let index = 0; index < 3; index += 1) {
    sphere(group, 0.022, glowMaterial(0x8aff6a, 0.8), -0.05 + index * 0.05, 0.28, 0.04);
  }
  box(group, 0.14, 0.24, 0.13, LEATHER(), -0.01, -0.08, 0.13, -0.2);
  addHand(group, -0.01, -0.12, 0.17, 0.9, 0.2);
  return parts(group, addMuzzle(group, 0, 0.1, -0.56), 0x8aff6a, 0.16);
}

function buildWaterGun(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.2, 0.15, 0.34, glowMaterial(0x34799a, 0.3), 0, 0.08, 0);
  box(group, 0.13, 0.1, 0.3, STEEL(), 0, 0.17, -0.06);
  cylinder(group, 0.045, 0.05, 0.34, 7, IRON(), 0, 0.1, -0.3, Math.PI / 2);
  cylinder(group, 0.09, 0.09, 0.24, 8, glowMaterial(0x6ad8ff, 0.5), 0, 0.13, 0.25, Math.PI / 2);
  torus(group, 0.09, 0.014, BRASS(), 0, 0.13, 0.18, Math.PI / 2);
  cylinder(group, 0.035, 0.035, 0.2, 6, COPPER(), 0.1, 0.02, 0.06, 0, 0, 0.6);
  cone(group, 0.06, 0.14, 6, glowMaterial(0x6ad8ff, 0.9), 0, 0.1, -0.49, -Math.PI / 2);
  for (let index = 0; index < 3; index += 1) {
    sphere(group, 0.018, glowMaterial(0x6ad8ff, 0.8), -0.05 + index * 0.05, 0.28, 0.05);
  }
  box(group, 0.13, 0.22, 0.12, RUBBER(), -0.01, -0.08, 0.13, -0.2);
  addHand(group, -0.01, -0.12, 0.17, 0.9, 0.2);
  return parts(group, addMuzzle(group, 0, 0.1, -0.57), 0x6ad8ff, 0.16);
}

function buildMortar(): WeaponModelParts {
  const group = new THREE.Group();
  cylinder(group, 0.19, 0.23, 0.86, 8, STEEL(), 0, 0.2, -0.18, Math.PI / 3.4);
  cylinder(group, 0.25, 0.25, 0.14, 8, IRON(), 0, 0.38, -0.46, Math.PI / 3.4);
  torus(group, 0.2, 0.02, BRASS(), 0, 0.32, -0.38, Math.PI / 3.4);
  box(group, 0.38, 0.1, 0.32, IRON(), 0, -0.08, 0.12);
  for (const side of [-1, 1]) {
    cylinder(group, 0.025, 0.03, 0.5, 6, STEEL(), side * 0.2, -0.05, 0.1, 0.5, 0, side * 0.2);
    addRivet(group, side * 0.25, -0.02, 0.12);
  }
  box(group, 0.08, 0.18, 0.12, HAZARD(), 0, 0.1, 0.26);
  cylinder(group, 0.02, 0.02, 0.22, 5, glowMaterial(0xffcf6a, 0.4), 0.14, 0.2, 0.04, 0.4);
  addHand(group, -0.22, -0.2, 0.22, 0.85, 0.3);
  return parts(group, addMuzzle(group, 0, 0.47, -0.58), 0xffcf6a, 0.28);
}

function buildEarthquake(): WeaponModelParts {
  const group = new THREE.Group();
  box(group, 0.4, 0.36, 0.5, STEEL_DARK(), 0, 0.02, 0);
  box(group, 0.32, 0.1, 0.34, STEEL_DARK(), 0, 0.23, 0.0);
  box(group, 0.34, 0.06, 0.12, HAZARD(), 0, 0.14, 0.26);
  for (let index = 0; index < 3; index += 1) {
    torus(group, 0.16 + index * 0.04, 0.014, COPPER(), 0, -0.03, -0.24, Math.PI / 2 + index * 0.25);
  }
  const piston = new THREE.Group();
  piston.position.set(0, -0.2, -0.24);
  group.add(piston);
  cylinder(piston, 0.09, 0.12, 0.3, 7, STEEL(), 0, 0, 0, Math.PI / 2);
  cone(piston, 0.13, 0.2, 7, IRON(), 0, 0, -0.23, -Math.PI / 2);
  torus(piston, 0.14, 0.02, glowMaterial(0xff9b6b, 0.9), 0, 0, -0.3, Math.PI / 2);
  cylinder(group, 0.035, 0.035, 0.34, 6, BLACK(), -0.26, -0.1, 0.2, 0.2, 0, 0.8);
  cylinder(group, 0.035, 0.035, 0.34, 6, BLACK(), 0.26, -0.1, 0.2, 0.2, 0, -0.8);
  for (const side of [-1, 1]) {
    addRivet(group, side * 0.15, 0.12, -0.2);
    addRivet(group, side * 0.15, -0.05, -0.2);
  }
  addHand(group, -0.27, -0.1, 0.26, 0.8, 0.35);
  addHand(group, 0.27, -0.1, 0.26, 0.8, -0.35);
  return parts(group, addMuzzle(group, 0, -0.2, -0.48), 0xff9b6b, 0.3, piston);
}

function litWood(color: number): THREE.MeshStandardMaterial {
  return litMaterial(color, 0.93, 0.03);
}

function litLeather(color: number): THREE.MeshStandardMaterial {
  return litMaterial(color, 0.9, 0.04);
}

export function buildFamilyWeaponModel(
  family: WeaponFamilyDefinition,
): WeaponModelParts {
  switch (family.id) {
    case 'tesla':
      return buildTesla();
    case 'drill':
      return buildDrill();
    case 'shotgun':
      return buildShotgun();
    case 'pistol':
      return buildPistol();
    case 'rifle':
      return buildRifle();
    case 'minigun':
      return buildMinigun();
    case 'axe':
      return buildAxe(false);
    case 'battleaxe':
      return buildAxe(true);
    case 'boxingGlove':
      return buildGlove();
    case 'roundhouseKick':
      return buildBoot();
    case 'magicStaff':
      return buildStaff('magic', family.color);
    case 'poisonStaff':
      return buildStaff('poison', family.color);
    case 'waterStaff':
      return buildStaff('water', family.color);
    case 'orb':
      return buildOrb();
    case 'jet':
      return buildJet();
    case 'tank':
      return buildTank();
    case 'flamethrower':
      return buildFlamethrower('flame');
    case 'poisonGun':
      return buildPoisonGun();
    case 'waterGun':
      return buildWaterGun();
    case 'mortar':
      return buildMortar();
    case 'earthquake':
      return buildEarthquake();
    default:
      return buildPistol();
  }
}
