import type { CarveEvent } from '../types';

export const COMPRESSED_CARVE_LIMIT = 8000;
export const COMPRESSED_HISTORY_BYTE_LIMIT = 96 * 1024; // 96 KiB

/**
 * Cuantiza y comprime un CarveEvent en 8 bytes.
 * Byte 0: X cuantizado ([-24, 24] -> [0, 240], paso 0.2 m)
 * Bytes 1-2: Y cuantizado ([-240, 5] -> [0, 490], paso 0.5 m, little-endian)
 * Byte 3: Z cuantizado ([-24, 24] -> [0, 240], paso 0.2 m)
 * Byte 4: Radio cuantizado ([0, 12.75] -> [0, 255], paso 0.05 m)
 * Byte 5: Fuerza cuantizada ([0, 25.5] -> [0, 255], paso 0.1)
 * Byte 6: Shape (0 = sphere, 1 = capsule, 2 = cone)
 * Byte 7: Length cuantizado ([0, 25.5] -> [0, 255], paso 0.1)
 */
export function compressCarveEvent(event: CarveEvent): Uint8Array {
  const bytes = new Uint8Array(8);
  bytes[0] = Math.max(0, Math.min(255, Math.round((event.x + 24) * 5)));
  const y = Math.max(0, Math.min(490, Math.round((event.y + 240) * 2)));
  bytes[1] = y & 0xff;
  bytes[2] = (y >> 8) & 0xff;
  bytes[3] = Math.max(0, Math.min(255, Math.round((event.z + 24) * 5)));
  bytes[4] = Math.max(0, Math.min(255, Math.round(event.r * 20)));
  bytes[5] = Math.max(0, Math.min(255, Math.round(event.s * 10)));
  const shapeCode = event.shape === 'capsule' ? 1 : event.shape === 'cone' ? 2 : 0;
  bytes[6] = shapeCode;
  bytes[7] = Math.max(0, Math.min(255, Math.round((event.length ?? 0) * 10)));
  return bytes;
}

export function decompressCarveEvent(
  bytes: Uint8Array | ArrayLike<number>,
  offset = 0,
): { event: CarveEvent; nextOffset: number } {
  const x = Number(((bytes[offset] / 5) - 24).toFixed(2));
  const yRaw = bytes[offset + 1] | (bytes[offset + 2] << 8);
  const y = Number(((yRaw / 2) - 240).toFixed(2));
  const z = Number(((bytes[offset + 3] / 5) - 24).toFixed(2));
  const r = Number((bytes[offset + 4] / 20).toFixed(2));
  const s = Number((bytes[offset + 5] / 10).toFixed(2));
  const shapeCode = bytes[offset + 6];
  const shape = shapeCode === 1 ? 'capsule' : shapeCode === 2 ? 'cone' : 'sphere';
  const length = bytes[offset + 7] > 0 ? Number((bytes[offset + 7] / 10).toFixed(2)) : undefined;

  const event: CarveEvent = {
    x,
    y,
    z,
    r,
    s,
    shape,
    length,
    dirX: 0,
    dirY: shape !== 'sphere' ? -1 : 0,
    dirZ: 0,
  };
  return { event, nextOffset: offset + 8 };
}

export function compressCarveHistory(events: readonly CarveEvent[]): Uint8Array {
  const count = Math.min(events.length, COMPRESSED_CARVE_LIMIT);
  const out = new Uint8Array(2 + count * 8);
  out[0] = (count >> 8) & 0xff;
  out[1] = count & 0xff;
  let offset = 2;
  const startIdx = events.length - count;

  for (let i = startIdx; i < events.length; i += 1) {
    const raw = compressCarveEvent(events[i]);
    out.set(raw, offset);
    offset += 8;
    if (offset + 8 > COMPRESSED_HISTORY_BYTE_LIMIT) {
      break;
    }
  }
  return out.subarray(0, offset);
}

export function decompressCarveHistory(buffer: Uint8Array): CarveEvent[] {
  if (buffer.length < 2) return [];
  const count = (buffer[0] << 8) | buffer[1];
  const events: CarveEvent[] = [];
  let offset = 2;

  for (let i = 0; i < count && offset + 8 <= buffer.length; i += 1) {
    const { event, nextOffset } = decompressCarveEvent(buffer, offset);
    events.push(event);
    offset = nextOffset;
  }
  return events;
}
