import * as THREE from 'three';
import { mulberry32 } from '../core/Rng';

interface SkyKey {
  t: number;
  background: number;
  fog: number;
  fogDensity: number;
  zenith: number;
  mid: number;
  horizon: number;
  ambient: number;
  ambientIntensity: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  sun: number;
  sunIntensity: number;
  sunGlow: number;
  cloud: number;
  nightMix: number;
}

const KEYS: readonly SkyKey[] = [
  {
    t: 0,
    background: 0x6f8f9b,
    fog: 0xb7a88f,
    fogDensity: 0.0062,
    zenith: 0x275f8c,
    mid: 0x7fa7b7,
    horizon: 0xf6bd84,
    ambient: 0xcbbfae,
    ambientIntensity: 0.6,
    hemisphereSky: 0xd7d6c4,
    hemisphereGround: 0x60432b,
    hemisphereIntensity: 0.95,
    sun: 0xffd39a,
    sunIntensity: 1,
    sunGlow: 1,
    cloud: 0xffe1c2,
    nightMix: 0,
  },
  {
    t: 0.35,
    background: 0x6a9fb5,
    fog: 0xa9bcb9,
    fogDensity: 0.005,
    zenith: 0x2776a6,
    mid: 0x74aec2,
    horizon: 0xcfe2da,
    ambient: 0xb6d0d6,
    ambientIntensity: 0.55,
    hemisphereSky: 0xbfe0e8,
    hemisphereGround: 0x6a4c31,
    hemisphereIntensity: 1.05,
    sun: 0xfff4dc,
    sunIntensity: 1.25,
    sunGlow: 0.55,
    cloud: 0xf9fbf7,
    nightMix: 0,
  },
  {
    t: 0.7,
    background: 0x6e5a5e,
    fog: 0xc29278,
    fogDensity: 0.0065,
    zenith: 0x2e3558,
    mid: 0x84657a,
    horizon: 0xf28f56,
    ambient: 0xd6a283,
    ambientIntensity: 0.62,
    hemisphereSky: 0xe4a77e,
    hemisphereGround: 0x553627,
    hemisphereIntensity: 1,
    sun: 0xffa06c,
    sunIntensity: 1,
    sunGlow: 1.15,
    cloud: 0xf6b088,
    nightMix: 0.2,
  },
  {
    t: 1,
    background: 0x0a1322,
    fog: 0x182838,
    fogDensity: 0.009,
    zenith: 0x050d1e,
    mid: 0x0e1d38,
    horizon: 0x2a3f58,
    ambient: 0x9db3ce,
    ambientIntensity: 0.5,
    hemisphereSky: 0x93aecd,
    hemisphereGround: 0x272824,
    hemisphereIntensity: 0.82,
    sun: 0xb4ccec,
    sunIntensity: 0.9,
    sunGlow: 0.3,
    cloud: 0x3b4b61,
    nightMix: 1,
  },
];

const SKY_VERTEX = `
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uMoonColor;
uniform vec3 uCloudColor;
uniform vec3 uSunDirection;
uniform vec3 uMoonDirection;
uniform float uSunGlow;
uniform float uNight;
uniform float uTime;
varying vec3 vDirection;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave += 1) {
    total += valueNoise(p) * amplitude;
    p = p * 2.03 + vec2(17.13, 9.37);
    amplitude *= 0.5;
  }
  return total;
}

void main() {
  vec3 dir = normalize(vDirection);
  float h = dir.y;
  float up = clamp(h, 0.0, 1.0);

  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.11, up));
  sky = mix(sky, uZenith, smoothstep(0.12, 0.5, up));
  float below = 1.0 - smoothstep(-0.18, 0.02, h);
  sky = mix(sky, uGround, below);

  vec3 sunDir = normalize(uSunDirection);
  vec3 moonDir = normalize(uMoonDirection);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float moonDot = max(dot(dir, moonDir), 0.0);

  vec2 flatDir = normalize(dir.xz + vec2(0.0001));
  vec2 flatSun = normalize(sunDir.xz + vec2(0.0001));
  float skyAlignment = pow(max(dot(flatDir, flatSun), 0.0), 5.0);
  float horizonGlow = exp(-pow((h - 0.025) * 7.5, 2.0));
  sky += uSunColor * horizonGlow * skyAlignment * 0.2 * uSunGlow;

  float halo = pow(sunDot, 40.0) * 0.07 + pow(sunDot, 500.0) * 0.16;
  sky += uSunColor * halo * uSunGlow * (1.0 - uNight * 0.9);

  float sunUp = smoothstep(-0.035, 0.025, sunDir.y);
  float sunDisc = smoothstep(0.99965, 0.99985, sunDot);
  sky = mix(sky, uSunColor * 1.9, sunDisc * sunUp * (1.0 - uNight) * 0.95);

  float moonUp = smoothstep(-0.03, 0.035, moonDir.y);
  float moonDisc = smoothstep(0.99948, 0.9997, moonDot);
  vec3 moonOffset = normalize(moonDir + vec3(0.03, 0.01, 0.024));
  float moonShadow = smoothstep(0.9991, 0.99955, max(dot(dir, moonOffset), 0.0));
  moonDisc *= 1.0 - moonShadow * 0.4;
  sky += uMoonColor * (pow(moonDot, 150.0) * 0.03 + moonDisc * 0.9) * uNight * moonUp;

  float cloudFade = smoothstep(0.012, 0.14, h);
  float domeFade = 1.0 - smoothstep(0.84, 1.0, h) * 0.45;
  vec2 projected = dir.xz / max(h + 0.1, 0.045);
  vec2 cloudUv = projected * 1.3 + vec2(uTime * 0.0025, uTime * 0.0008);
  float broad = fbm(cloudUv * 0.9 + vec2(3.1, 7.7));
  float detail = fbm(cloudUv * 2.25 + vec2(-4.4, 1.9));
  float shape = broad * 0.72 + detail * 0.28;
  float density = smoothstep(0.53, 0.67, shape);
  density *= cloudFade * domeFade;
  vec3 cloudShadow = uCloudColor * (0.6 + 0.08 * uNight);
  vec3 cloudLit = uCloudColor * (1.02 - 0.22 * uNight);
  vec3 cloud = mix(cloudShadow, cloudLit, smoothstep(0.38, 0.68, detail));
  cloud += uSunColor * pow(sunDot, 8.0) * 0.12 * (1.0 - uNight);
  sky = mix(sky, cloud, density * 0.86);

  vec2 wispUv = dir.xz / max(h + 0.3, 0.1) * 0.46 + vec2(uTime * 0.0012, 0.0);
  float wisp = smoothstep(0.58, 0.73, fbm(wispUv * 1.6 + 12.0));
  sky = mix(sky, uCloudColor * 0.92, wisp * cloudFade * 0.16);

  float grain = hash12(gl_FragCoord.xy) - 0.5;
  sky += grain * 0.018;

  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const STAR_RADIUS = 162;
const SKY_RADIUS = 180;

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function makeStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 15);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(224,238,255,0.85)');
    gradient.addColorStop(1, 'rgba(160,190,230,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export class SkyCycle {
  private readonly scene: THREE.Scene;
  private readonly group: THREE.Group;
  private readonly skyGroup = new THREE.Group();
  private readonly skyGeometry: THREE.SphereGeometry;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly skyMesh: THREE.Mesh;
  private readonly starGeometry: THREE.BufferGeometry;
  private readonly starMaterial: THREE.PointsMaterial;
  private readonly starTexture: THREE.CanvasTexture;
  private readonly stars: THREE.Points;
  private readonly ambient: THREE.AmbientLight;
  private readonly hemisphere: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly fill: THREE.DirectionalLight;
  private readonly pitGlow: THREE.PointLight;
  private footprintStage = 0;
  private suspendedDust = false;

  setSuspendedDust(active: boolean): void {
    this.suspendedDust = active;
  }

  setFootprintStage(stage: number): void {
    this.footprintStage = Math.max(0, Math.min(4, Math.floor(stage)));
  }
  private readonly backgroundColor = new THREE.Color();
  private readonly fogColor = new THREE.Color();
  private readonly zenithColor = new THREE.Color();
  private readonly midColor = new THREE.Color();
  private readonly horizonColor = new THREE.Color();
  private readonly cloudColor = new THREE.Color();
  private readonly colorA = new THREE.Color();
  private readonly colorB = new THREE.Color();
  private readonly sunDirection = new THREE.Vector3();
  private readonly moonDirection = new THREE.Vector3();
  private elapsed = 0;

  constructor(scene: THREE.Scene, group: THREE.Group) {
    this.scene = scene;
    this.group = group;

    this.skyGeometry = new THREE.SphereGeometry(SKY_RADIUS, 40, 22);
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(0x275f8c) },
        uMid: { value: new THREE.Color(0x7fa7b7) },
        uHorizon: { value: new THREE.Color(0xf6bd84) },
        uGround: { value: new THREE.Color(0xb7a88f) },
        uSunColor: { value: new THREE.Color(0xffd39a) },
        uMoonColor: { value: new THREE.Color(0xdde8ff) },
        uCloudColor: { value: new THREE.Color(0xffe1c2) },
        uSunDirection: { value: new THREE.Vector3(0.9, 0.2, 0.4) },
        uMoonDirection: { value: new THREE.Vector3(-0.9, -0.2, 0.3) },
        uSunGlow: { value: 1 },
        uNight: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    this.skyMesh = new THREE.Mesh(this.skyGeometry, this.skyMaterial);
    this.skyMesh.renderOrder = -2;
    this.skyMesh.frustumCulled = false;
    this.skyGroup.add(this.skyMesh);
    group.add(this.skyGroup);

    this.starTexture = makeStarTexture();
    this.starGeometry = new THREE.BufferGeometry();
    const starRandom = mulberry32(0x51a7c0de);
    const starPositions: number[] = [];
    const starColors: number[] = [];
    const starColor = new THREE.Color();
    for (let index = 0; index < 360; index += 1) {
      const angle = starRandom() * Math.PI * 2;
      const y = 0.035 + starRandom() * 0.94;
      const flat = Math.sqrt(Math.max(0, 1 - y * y));
      starPositions.push(
        Math.cos(angle) * flat * STAR_RADIUS,
        y * STAR_RADIUS,
        Math.sin(angle) * flat * STAR_RADIUS,
      );
      const roll = starRandom();
      starColor
        .setHex(roll > 0.82 ? 0xffe2b8 : roll > 0.42 ? 0xcfe0ff : 0xffffff)
        .multiplyScalar(0.7 + starRandom() * 0.3);
      starColors.push(starColor.r, starColor.g, starColor.b);
    }
    this.starGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    this.starGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    this.starMaterial = new THREE.PointsMaterial({
      map: this.starTexture,
      size: 1.9,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.015,
      fog: false,
      toneMapped: false,
    });
    this.stars = new THREE.Points(this.starGeometry, this.starMaterial);
    this.stars.renderOrder = -1;
    this.stars.frustumCulled = false;
    this.skyGroup.add(this.stars);

    this.ambient = new THREE.AmbientLight(0xcbbfae, 0.55);
    this.hemisphere = new THREE.HemisphereLight(0xd7d6c4, 0x60432b, 0.9);
    this.sun = new THREE.DirectionalLight(0xffd39a, 1);
    this.sun.target.position.set(0, -24, 0);
    this.sun.castShadow = false;
    this.fill = new THREE.DirectionalLight(0xbfd7e2, 0.28);
    this.fill.target.position.set(0, -16, 0);
    this.fill.castShadow = false;
    this.pitGlow = new THREE.PointLight(0x789bb0, 7, 26, 1.8);
    this.pitGlow.position.set(0, 1.4, 0);
    group.add(
      this.ambient,
      this.hemisphere,
      this.sun,
      this.sun.target,
      this.fill,
      this.fill.target,
      this.pitGlow,
    );

    this.update(0.15);
  }

  private mixColor(target: THREE.Color, a: number, b: number, f: number): void {
    this.colorA.setHex(a);
    this.colorB.setHex(b);
    target.copy(this.colorA).lerp(this.colorB, f);
  }

  private mixNumber(a: number, b: number, f: number): number {
    return a + (b - a) * f;
  }

  update(progress: number, cameraPosition?: THREE.Vector3, dt = 0): void {
    this.elapsed += dt;
    const t = Math.max(0, Math.min(1, progress));
    let index = 0;
    while (index < KEYS.length - 2 && t > KEYS[index + 1].t) {
      index += 1;
    }
    const from = KEYS[index];
    const to = KEYS[index + 1];
    const span = Math.max(0.0001, to.t - from.t);
    const f = smooth((t - from.t) / span);

    this.mixColor(this.backgroundColor, from.background, to.background, f);
    this.mixColor(this.fogColor, from.fog, to.fog, f);
    this.mixColor(this.zenithColor, from.zenith, to.zenith, f);
    this.mixColor(this.midColor, from.mid, to.mid, f);
    this.mixColor(this.horizonColor, from.horizon, to.horizon, f);
    this.mixColor(this.ambient.color, from.ambient, to.ambient, f);
    this.mixColor(this.hemisphere.color, from.hemisphereSky, to.hemisphereSky, f);
    this.mixColor(this.hemisphere.groundColor, from.hemisphereGround, to.hemisphereGround, f);
    this.mixColor(this.sun.color, from.sun, to.sun, f);
    this.mixColor(this.cloudColor, from.cloud, to.cloud, f);

    if (this.footprintStage >= 2) {
      this.fogColor.lerp(new THREE.Color(0x946b48), 0.25 * (this.footprintStage / 4));
      this.horizonColor.lerp(new THREE.Color(0xb45309), 0.3 * (this.footprintStage / 4));
    }

    const fogDensity = this.mixNumber(from.fogDensity, to.fogDensity, f);
    const nightMix = this.mixNumber(from.nightMix, to.nightMix, f);
    const sunGlow = this.mixNumber(from.sunGlow, to.sunGlow, f);
    const depthFactor = cameraPosition
      ? 0.35 + 0.65 * smooth((cameraPosition.y + 8) / 9)
      : 1;
    this.ambient.intensity =
      this.mixNumber(from.ambientIntensity, to.ambientIntensity, f) * depthFactor;
    this.hemisphere.intensity =
      this.mixNumber(from.hemisphereIntensity, to.hemisphereIntensity, f) * depthFactor;
    this.sun.intensity =
      this.mixNumber(from.sunIntensity, to.sunIntensity, f) * depthFactor;
    this.pitGlow.intensity = 5 + (1 - t) * 3;

    const sunAngle =
      t <= 0.78
        ? 0.2 + (t / 0.78) * (Math.PI - 0.2)
        : Math.PI + (t - 0.78) * 9.5;
    this.sunDirection
      .set(Math.cos(sunAngle), Math.sin(sunAngle), 0.42)
      .normalize();
    const moonAngle = sunAngle - Math.PI + 0.45;
    this.moonDirection
      .set(Math.cos(moonAngle), Math.sin(moonAngle), 0.28)
      .normalize();

    const lightDirection = nightMix > 0.55 ? this.moonDirection : this.sunDirection;
    this.sun.position.copy(lightDirection).multiplyScalar(130).add(this.sun.target.position);
    this.fill.position
      .copy(this.fill.target.position)
      .addScaledVector(lightDirection, -95);
    this.fill.color.copy(this.hemisphere.color);
    this.fill.intensity = (0.2 + (1 - nightMix) * 0.13) * depthFactor;

    const uniforms = this.skyMaterial.uniforms;
    (uniforms.uZenith.value as THREE.Color).copy(this.zenithColor);
    (uniforms.uMid.value as THREE.Color).copy(this.midColor);
    (uniforms.uHorizon.value as THREE.Color).copy(this.horizonColor);
    (uniforms.uGround.value as THREE.Color).copy(this.fogColor);
    (uniforms.uSunColor.value as THREE.Color).copy(this.sun.color);
    (uniforms.uCloudColor.value as THREE.Color).copy(this.cloudColor);
    (uniforms.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
    (uniforms.uMoonDirection.value as THREE.Vector3).copy(this.moonDirection);
    uniforms.uSunGlow.value = sunGlow;
    uniforms.uNight.value = nightMix;
    uniforms.uTime.value = this.elapsed;

    if (cameraPosition) {
      this.skyGroup.position.copy(cameraPosition);
    }
    this.starMaterial.opacity =
      smooth((nightMix - 0.06) / 0.68) * (0.82 + Math.sin(this.elapsed * 0.7) * 0.05);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.backgroundColor);
    } else {
      this.scene.background = this.backgroundColor.clone();
    }
    const dustClauseMult = this.suspendedDust ? 1.4 : 1.0;
    const dustMult = (1 + this.footprintStage * 0.45) * dustClauseMult;
    const finalFogDensity = fogDensity * dustMult;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.fogColor);
      this.scene.fog.density = finalFogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), finalFogDensity);
    }
  }

  dispose(): void {
    this.group.remove(
      this.skyGroup,
      this.ambient,
      this.hemisphere,
      this.sun,
      this.sun.target,
      this.fill,
      this.fill.target,
      this.pitGlow,
    );
    this.skyGeometry.dispose();
    this.skyMaterial.dispose();
    this.starGeometry.dispose();
    this.starMaterial.dispose();
    this.starTexture.dispose();
  }
}
