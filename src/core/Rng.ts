export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, y: number, seed: number): number {
  let value = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  let value =
    seed ^
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x85ebca6b) ^
    Math.imul(z | 0, 0x165667b1);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = smoothstep(0, 1, x - xi);
  const fy = smoothstep(0, 1, y - yi);
  const fz = smoothstep(0, 1, z - zi);

  const c000 = hash3(xi, yi, zi, seed);
  const c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed);
  const c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed);
  const c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed);
  const c111 = hash3(xi + 1, yi + 1, zi + 1, seed);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

export function fbm3(
  x: number,
  y: number,
  z: number,
  seed: number,
  octaves = 3,
  lacunarity = 2.03,
  gain = 0.5,
): number {
  let sum = 0;
  let amplitude = 0.5;
  let norm = 0;
  let px = x;
  let py = y;
  let pz = z;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise3(px, py, pz, seed + octave * 1013) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    px *= lacunarity;
    py *= lacunarity;
    pz *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] >>> 0;
  }
  return (Math.random() * 0xffffffff) >>> 0;
}

export function seededRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

export function pickOne<T>(random: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
