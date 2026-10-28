import * as THREE from 'three';
import { WEAPONS, WEAPON_FAMILY_ORDER, weaponFamily } from '../config';
import { PATENTS } from '../core/Progression';
import type { WeaponId } from '../types';
import {
  PICKAXE_IMPACT_FRACTION,
  PICKAXE_IMPACT_HOLD,
  PICKAXE_SCALE,
  buildPickaxeModel,
  createPickaxeMaterials,
  pickaxeSwingCurve,
  type PickaxeMaterials,
} from './PickaxeModel';
import { buildFamilyWeaponModel, familyWeaponPose } from './WeaponModels';
import { resetWeaponModelMaterials } from './WeaponModelKit';

interface ModelRig {
  group: THREE.Group;
  restPosition: THREE.Vector3;
  restRotation: THREE.Euler;
  muzzle: THREE.Object3D;
  movingPart?: THREE.Object3D;
  flash?: THREE.Mesh;
  flashMaterial?: THREE.MeshBasicMaterial;
}

const REST_POSITION = new THREE.Vector3(0.4, -0.62, -0.68);
const REST_ROTATION = new THREE.Euler(0.06, 0.3, 0.22, 'YXZ');

const PICKAXE_POSE = {
  position: REST_POSITION.clone(),
  rotation: REST_ROTATION.clone(),
};

export class ToolView {
  private readonly root = new THREE.Group();
  private readonly viewScene = new THREE.Scene();
  private readonly viewCamera: THREE.PerspectiveCamera;
  private readonly mainCamera: THREE.PerspectiveCamera;
  private readonly rigs = new Map<WeaponId, ModelRig>();
  private readonly pickaxeMaterials: PickaxeMaterials;
  private active: WeaponId = 'pickaxe';
  private visible = false;
  private elapsed = 0;
  private swingTimer = 0;
  private swingDuration = 0.34;
  private switchProgress = 1;
  private firingHeld = false;
  private drillSpin = 0;
  private bobTime = 0;
  private impactHold = 0;
  private recoilStrength = 0;
  private swayX = 0;
  private swayY = 0;
  private previousYaw = 0;
  private previousPitch = 0;
  private hasCameraSample = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.mainCamera = camera;
    this.viewCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 0.01, 8);
    this.viewCamera.rotation.order = 'YXZ';
    this.viewScene.add(this.viewCamera);
    this.root.name = 'view-model';
    this.root.visible = false;
    this.viewCamera.add(this.root);
    this.buildViewLights();

    this.pickaxeMaterials = createPickaxeMaterials();

    this.rigs.set('pickaxe', this.buildPickaxe());
    for (const id of WEAPON_FAMILY_ORDER) {
      if (id === 'pickaxe') {
        continue;
      }
      const family = weaponFamily(id);
      const built = buildFamilyWeaponModel(family);
      const pose = familyWeaponPose(family);
      built.group.position.copy(pose.position);
      built.group.rotation.copy(pose.rotation);
      built.group.scale.setScalar(pose.scale);
      this.root.add(built.group);
      this.prepareGroup(built.group);
      this.rigs.set(id, {
        group: built.group,
        restPosition: pose.position.clone(),
        restRotation: pose.rotation.clone(),
        muzzle: built.muzzle,
        movingPart: built.movingPart,
        ...this.makeFlash(built.group, built.flashColor, built.flashSize),
      });
    }
    this.setActive('pickaxe', false);
  }

  private buildViewLights(): void {
    const ambient = new THREE.AmbientLight(0x93a6bb, 0.8);
    const hemisphere = new THREE.HemisphereLight(0xbcd8ff, 0x3a2a1a, 0.85);
    const key = new THREE.DirectionalLight(0xffe6c0, 2.7);
    key.position.set(-1.4, 2.4, 2.2);
    key.target.position.set(0, 0, -0.7);
    const rim = new THREE.DirectionalLight(0x77c8ff, 1.45);
    rim.position.set(1.8, 1.2, -1.4);
    rim.target.position.set(0, 0, -0.7);
    const warm = new THREE.PointLight(0xffa860, 1.1, 3.5, 2);
    warm.position.set(0.65, -0.35, 0.35);
    const fill = new THREE.PointLight(0xffe3c2, 0.85, 4, 2);
    fill.position.set(0.12, 0.05, 0.55);
    this.viewScene.add(ambient, hemisphere, key, key.target, rim, rim.target, warm, fill);
  }

  private buildPickaxe(): ModelRig {
    const pose = PICKAXE_POSE;
    const { group, muzzle } = buildPickaxeModel(this.pickaxeMaterials);
    group.position.copy(pose.position);
    group.rotation.copy(pose.rotation);
    group.scale.setScalar(PICKAXE_SCALE);
    this.root.add(group);
    this.prepareGroup(group);
    return {
      group,
      restPosition: pose.position.clone(),
      restRotation: pose.rotation.clone(),
      muzzle,
    };
  }

  private makeFlash(
    group: THREE.Group,
    color: number,
    size: number,
  ): { flash: THREE.Mesh; flashMaterial: THREE.MeshBasicMaterial } {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const flash = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.2, 6), material);
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(0, 0, -0.25);
    flash.visible = false;
    group.add(flash);
    return { flash, flashMaterial: material };
  }

  private prepareGroup(group: THREE.Group): void {
    group.visible = false;
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
      }
    });
  }

  setActive(weapon: WeaponId, animate = true): void {
    if (!this.rigs.has(weapon)) {
      return;
    }
    this.active = weapon;
    for (const [id, rig] of this.rigs) {
      rig.group.visible = id === weapon && this.visible;
    }
    this.swingTimer = 0;
    this.impactHold = 0;
    this.recoilStrength = 0;
    this.hasCameraSample = false;
    this.switchProgress = animate ? 0 : 1;
    const rig = this.rigs.get(weapon);
    if (rig?.flash) {
      rig.flash.visible = false;
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
    if (!visible) {
      this.hasCameraSample = false;
    }
    const rig = this.rigs.get(this.active);
    if (rig) {
      rig.group.visible = visible;
    }
  }

  getMuzzleWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    const rig = this.rigs.get(this.active);
    if (!rig) {
      return target.copy(this.mainCamera.getWorldPosition(new THREE.Vector3()));
    }
    rig.muzzle.getWorldPosition(target);
    this.mainCamera.updateMatrixWorld();
    return this.mainCamera.localToWorld(target);
  }

  render(renderer: THREE.WebGLRenderer): void {
    if (!this.visible) {
      return;
    }
    if (this.viewCamera.fov !== this.mainCamera.fov) {
      this.viewCamera.fov = this.mainCamera.fov;
      this.viewCamera.updateProjectionMatrix();
    }
    if (this.viewCamera.aspect !== this.mainCamera.aspect) {
      this.viewCamera.aspect = this.mainCamera.aspect;
      this.viewCamera.updateProjectionMatrix();
    }
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.viewScene, this.viewCamera);
    renderer.autoClear = autoClear;
  }

  playFire(weapon: WeaponId, duration?: number): void {
    if (weapon !== this.active) {
      return;
    }
    const rig = this.rigs.get(this.active);
    if (!rig) {
      return;
    }
    switch (weapon) {
      case 'pickaxe':
        this.swingDuration = duration && duration > 0.08 ? duration : 0.34;
        this.swingTimer = this.swingDuration;
        this.impactHold = 0;
        this.recoilStrength = 0;
        break;
      case 'tesla':
        this.swingDuration = 0.42;
        this.swingTimer = this.swingDuration;
        break;
      case 'drill':
        break;
      case 'shotgun':
        this.swingDuration = 0.24;
        this.swingTimer = this.swingDuration;
        break;
      default: {
        const style = WEAPONS[weapon]?.style;
        this.swingDuration = style === 'melee' ? 0.34 : style === 'continuous' ? 0.08 : 0.24;
        this.swingTimer = this.swingDuration;
        break;
      }
    }
    if (rig.flash) {
      rig.flash.visible = true;
      if (rig.flashMaterial) {
        rig.flashMaterial.opacity = 0.95;
      }
    }
  }

  playImpact(strong = false): void {
    if (WEAPONS[this.active]?.style !== 'melee' || this.swingTimer <= 0) {
      return;
    }
    this.impactHold = PICKAXE_IMPACT_HOLD;
    this.recoilStrength = strong ? 1.35 : 0.9;
    this.swayX += (Math.random() - 0.5) * 0.012;
    this.swayY += (Math.random() - 0.5) * 0.012;
  }

  setPatent(tier: number): void {
    if (tier <= 0 || !PATENTS[tier]) {
      this.pickaxeMaterials.edge.emissive.setHex(0x101617);
      this.pickaxeMaterials.edge.emissiveIntensity = 0.12;
      return;
    }
    const patent = PATENTS[tier];
    this.pickaxeMaterials.edge.emissive.setHex(patent.emissive);
    this.pickaxeMaterials.edge.emissiveIntensity = 0.55;
  }

  setFiringHeld(firing: boolean): void {
    this.firingHeld = firing;
  }

  update(
    dt: number,
    moving: boolean,
    speed: number,
    elapsed: number,
    jetpackActive: boolean,
  ): void {
    this.elapsed = elapsed;
    const safeDt = Math.min(dt, 0.05);
    const rig = this.rigs.get(this.active);
    if (!rig) {
      return;
    }
    this.switchProgress = Math.min(1, this.switchProgress + safeDt * 5.5);

    const yaw = this.mainCamera.rotation.y;
    const pitch = this.mainCamera.rotation.x;
    if (!this.hasCameraSample) {
      this.previousYaw = yaw;
      this.previousPitch = pitch;
      this.hasCameraSample = true;
    }
    let deltaYaw = yaw - this.previousYaw;
    if (deltaYaw > Math.PI) {
      deltaYaw -= Math.PI * 2;
    } else if (deltaYaw < -Math.PI) {
      deltaYaw += Math.PI * 2;
    }
    const deltaPitch = pitch - this.previousPitch;
    this.previousYaw = yaw;
    this.previousPitch = pitch;
    const swayTargetX = THREE.MathUtils.clamp(deltaYaw * 1.4, -0.045, 0.045);
    const swayTargetY = THREE.MathUtils.clamp(-deltaPitch * 1.4, -0.035, 0.035);
    this.swayX = THREE.MathUtils.damp(this.swayX, swayTargetX, 10, safeDt);
    this.swayY = THREE.MathUtils.damp(this.swayY, swayTargetY, 10, safeDt);

    if (moving) {
      this.bobTime += safeDt * (3.8 + Math.min(1, speed / 6.6) * 7.2);
    } else {
      this.bobTime += safeDt * 1.5;
    }
    const bobStrength = moving ? 0.012 + Math.min(1, speed / 6.6) * 0.01 : 0.003;
    const bobX = Math.cos(this.bobTime * 0.52) * bobStrength;
    const bobY = Math.sin(this.bobTime) * bobStrength;
    const jetTilt = jetpackActive ? 0.06 : 0;
    const isPickaxe = WEAPONS[this.active]?.style === 'melee';
    const breatheY = isPickaxe ? Math.sin(this.elapsed * 1.7) * 0.004 : 0;
    const breatheRot = isPickaxe ? Math.sin(this.elapsed * 1.15 + 0.7) * 0.008 : 0;

    let swing = 0;
    let kick = 0;
    let pickSwing = 0;
    let pickElastic = 0;
    let impactJolt = 0;
    if (this.swingTimer > 0) {
      if (isPickaxe && this.impactHold > 0) {
        this.impactHold = Math.max(0, this.impactHold - safeDt);
        impactJolt = this.impactHold / PICKAXE_IMPACT_HOLD;
      } else {
        this.swingTimer = Math.max(0, this.swingTimer - safeDt);
      }
      const progress = this.swingDuration > 0 ? 1 - this.swingTimer / this.swingDuration : 1;
      if (isPickaxe) {
        pickSwing = pickaxeSwingCurve(progress);
        if (progress > PICKAXE_IMPACT_FRACTION) {
          const t = Math.min(1, (progress - PICKAXE_IMPACT_FRACTION) / (1 - PICKAXE_IMPACT_FRACTION));
          pickElastic = Math.sin(t * Math.PI * 3) * (1 - t) * 0.05 * this.recoilStrength;
        }
      } else {
        swing = Math.sin(progress * Math.PI);
        if (WEAPONS[this.active]?.style === 'shotgun') {
          kick = Math.sin(Math.min(1, progress * 1.7) * Math.PI);
          swing = 0;
        }
      }
    } else {
      this.impactHold = 0;
      this.recoilStrength = Math.max(0, this.recoilStrength - safeDt * 5);
    }
    const switchOffset = (1 - this.switchProgress) * -0.25;
    const scale = 0.98 + this.switchProgress * 0.02;

    if (isPickaxe) {
      const jitter = impactJolt * 0.005;
      rig.group.position.set(
        rig.restPosition.x +
          bobX +
          this.swayX * 0.3 -
          pickSwing * 0.055 +
          (Math.random() - 0.5) * jitter,
        rig.restPosition.y +
          bobY +
          breatheY +
          switchOffset -
          jetTilt * 0.4 +
          this.swayY * 0.22 -
          pickSwing * 0.02 +
          (Math.random() - 0.5) * jitter,
        rig.restPosition.z - pickSwing * 0.105,
      );
      rig.group.rotation.set(
        rig.restRotation.x +
          breatheRot * 0.5 -
          pickSwing * 0.6 +
          pickElastic +
          this.swayY * 0.7 +
          jetTilt +
          (Math.random() - 0.5) * impactJolt * 0.02,
        rig.restRotation.y +
          this.swayX * 0.9 +
          pickSwing * 0.22 -
          bobX * 1.4 +
          (Math.random() - 0.5) * impactJolt * 0.015,
        rig.restRotation.z +
          breatheRot +
          pickSwing * 0.14 +
          this.swayX * 0.45 +
          bobX * 1.1 +
          (Math.random() - 0.5) * impactJolt * 0.02,
        'YXZ',
      );
      rig.group.scale.setScalar(
        PICKAXE_SCALE * weaponScale(this.active) * (0.97 + this.switchProgress * 0.03),
      );
    } else {
      const targetX = rig.restPosition.x + bobX;
      const targetY = rig.restPosition.y + bobY + switchOffset - jetTilt * 0.4;
      const targetZ = rig.restPosition.z;
      rig.group.position.x = THREE.MathUtils.damp(rig.group.position.x, targetX, 18, safeDt);
      rig.group.position.y = THREE.MathUtils.damp(rig.group.position.y, targetY, 18, safeDt);
      rig.group.position.z = THREE.MathUtils.damp(
        rig.group.position.z,
        targetZ + kick * 0.12 + swing * 0.08,
        20,
        safeDt,
      );
      rig.group.rotation.x =
        rig.restRotation.x - swing * 1.05 + kick * 0.22 + jetTilt;
      rig.group.rotation.y = rig.restRotation.y + swing * 0.2 - bobX * 2.2;
      rig.group.rotation.z = rig.restRotation.z + swing * 0.45 + bobX * 1.6;
      rig.group.scale.setScalar(
        (WEAPONS[this.active]?.style === 'chain'
          ? 0.72
          : WEAPONS[this.active]?.style === 'continuous'
            ? 0.7
            : 0.74) *
          weaponScale(this.active) *
          scale *
          0.36,
      );
    }

    if (WEAPONS[this.active]?.style === 'continuous') {
      const desiredSpin = this.firingHeld ? 1 : 0;
      this.drillSpin = THREE.MathUtils.damp(this.drillSpin, desiredSpin, 8, safeDt);
      if (rig.movingPart) {
        rig.movingPart.rotation.z += safeDt * (4 + this.drillSpin * 36);
      }
      if (rig.flash) {
        rig.flash.visible = this.drillSpin > 0.35;
        if (rig.flashMaterial) {
          rig.flashMaterial.opacity = this.drillSpin * 0.48;
        }
      }
    } else if (WEAPONS[this.active]?.style === 'chain' && rig.movingPart) {
      rig.movingPart.rotation.y += safeDt * 1.6;
    } else if (this.active === 'minigun' && rig.movingPart) {
      rig.movingPart.rotation.z += safeDt * (this.swingTimer > 0 ? 42 : 5);
    }

    if (rig.flash && this.active !== 'drill' && rig.flash.visible) {
      const material = rig.flashMaterial;
      if (material) {
        material.opacity = Math.max(0, material.opacity - safeDt * 16);
      }
      if (material && material.opacity <= 0.02) {
        rig.flash.visible = false;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const lights = new Set<THREE.Light>();
    this.viewScene.traverse((child) => {
      if (child instanceof THREE.Light) {
        lights.add(child);
        return;
      }
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      geometries.add(child.geometry);
      const material = child.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          materials.add(entry);
        }
      } else {
        materials.add(material);
      }
    });
    for (const geometry of geometries) {
      geometry.dispose();
    }
    for (const material of materials) {
      material.dispose();
    }
    for (const light of lights) {
      light.dispose();
    }
    resetWeaponModelMaterials();
  }

  getActive(): WeaponId {
    return this.active;
  }

  getSwingProgress(): number {
    return this.swingDuration > 0 ? 1 - this.swingTimer / this.swingDuration : 0;
  }

  getElapsed(): number {
    return this.elapsed;
  }
}

function weaponScale(weapon: WeaponId): number {
  switch (weapon) {
    case 'pickaxe':
      return 1.08;
    case 'tesla':
      return 1.15;
    case 'drill':
      return 1.1;
    case 'shotgun':
    case 'pistol':
    case 'rifle':
    case 'minigun':
      return 1.45;
    case 'axe':
    case 'battleaxe':
      return 1;
    case 'boxingGlove':
      return 0.7;
    case 'roundhouseKick':
      return 0.75;
    case 'magicStaff':
    case 'poisonStaff':
    case 'waterStaff':
      return 1.15;
    case 'orb':
      return 1.7;
    case 'jet':
      return 1.35;
    case 'tank':
    case 'mortar':
    case 'earthquake':
      return 1.35;
    case 'flamethrower':
    case 'poisonGun':
    case 'waterGun':
      return 1.4;
    default:
      return 1;
  }
}
