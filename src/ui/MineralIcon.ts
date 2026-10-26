import { MINERALS } from '../config';
import { hashString, mulberry32 } from '../core/Rng';
import type { MineralId } from '../types';

const cache = new Map<MineralId, string>();

function hex(value: number, alpha = 1): string {
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return alpha >= 1
    ? `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const cssHex = hex;

/**
 * Icono low-poly procedural por mineral. Se cachea como data URL para no
 * reconstruir el canvas cada vez que el HUD se actualiza.
 */
export function mineralIconUrl(id: MineralId): string {
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  const mineral = MINERALS[id];
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }
  const random = mulberry32(hashString(`icon-${id}`));
  const isCoal = mineral.family === 'coal';
  const centerX = 32;
  const centerY = isCoal ? 35 : 33;
  const radius = isCoal ? 18 : 21;
  const points: Array<{ x: number; y: number }> = [];
  const count = isCoal ? 7 : 6;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const wobble = 0.78 + random() * 0.32;
    const vertical = isCoal ? 0.72 : index % 2 === 0 ? 1.08 : 0.86;
    points.push({
      x: centerX + Math.cos(angle) * radius * wobble,
      y: centerY + Math.sin(angle) * radius * wobble * vertical,
    });
  }
  const gradient = context.createLinearGradient(12, 8, 52, 58);
  gradient.addColorStop(0, hex(mineral.glow));
  gradient.addColorStop(0.45, hex(mineral.color));
  gradient.addColorStop(1, hex(mineral.emissive));
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.closePath();
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = 'rgba(3, 7, 8, 0.9)';
  context.lineWidth = 2.4;
  context.stroke();

  for (let index = 0; index < 4; index += 1) {
    const a = points[index % points.length];
    const b = points[(index + 2) % points.length];
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.closePath();
    context.fillStyle =
      index % 2 === 0 ? hex(mineral.glow, 0.28) : hex(mineral.emissive, 0.34);
    context.fill();
  }
  context.beginPath();
  context.moveTo(centerX - 5, centerY - 12);
  context.lineTo(centerX + 2, centerY - 16);
  context.lineTo(centerX - 1, centerY - 7);
  context.closePath();
  context.fillStyle = 'rgba(255, 255, 255, 0.72)';
  context.fill();

  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}
