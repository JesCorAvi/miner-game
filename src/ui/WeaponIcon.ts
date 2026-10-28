import { weaponFamily } from '../config';
import type { WeaponId } from '../types';
import { cssHex } from './MineralIcon';

const cache = new Map<WeaponId, string>();

function canvasFor(weapon: WeaponId, draw: (context: CanvasRenderingContext2D) => void): string {
  const cached = cache.get(weapon);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return '';
  draw(context);
  const url = canvas.toDataURL('image/png');
  cache.set(weapon, url);
  return url;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function outline(context: CanvasRenderingContext2D, width = 2.5): void {
  context.strokeStyle = '#070b0c';
  context.lineWidth = width;
  context.lineJoin = 'round';
  context.stroke();
}

function base(context: CanvasRenderingContext2D, accent: string): void {
  roundRect(context, 3, 3, 58, 58, 7);
  context.fillStyle = '#0b1314';
  context.fill();
  context.strokeStyle = 'rgba(201,219,210,0.16)';
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = accent;
  context.globalAlpha = 0.8;
  context.fillRect(14, 57, 36, 2);
  context.globalAlpha = 1;
  const glow = context.createRadialGradient(32, 30, 2, 32, 30, 28);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(4, 4, 56, 56);
}

function poly(
  context: CanvasRenderingContext2D,
  color: string,
  points: Array<[number, number]>,
): void {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fillStyle = color;
  context.fill();
  outline(context);
}

function line(
  context: CanvasRenderingContext2D,
  color: string,
  width: number,
  points: Array<[number, number]>,
): void {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
}

function drawPickaxe(context: CanvasRenderingContext2D): void {
  line(context, '#7b4b26', 6, [[23, 55], [40, 15]]);
  line(context, '#4a2c18', 4, [[25, 49], [28, 42]]);
  poly(context, '#9aa7a4', [[40, 15], [54, 23], [41, 26], [34, 22]]);
  poly(context, '#c7d1cc', [[40, 15], [49, 19], [42, 22], [35, 20]]);
  poly(context, '#9aa7a4', [[40, 15], [28, 12], [21, 17], [33, 22]]);
  poly(context, '#c7d1cc', [[28, 12], [23, 14], [26, 18], [33, 20]]);
  context.fillStyle = '#e2a247';
  context.beginPath();
  context.arc(39, 21, 3.5, 0, Math.PI * 2);
  context.fill();
  outline(context, 1.5);
}

function drawTesla(context: CanvasRenderingContext2D): void {
  line(context, '#3c4950', 6, [[28, 56], [34, 19]]);
  for (let index = 0; index < 4; index += 1) {
    context.strokeStyle = '#57d5de';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(34, 30 - index * 5, 7 - index * 0.7, 2.5, 0, 0, Math.PI * 2);
    context.stroke();
  }
  line(context, '#aebbb8', 3, [[34, 19], [26, 11]]);
  line(context, '#aebbb8', 3, [[34, 19], [44, 10]]);
  line(context, '#6edfd5', 2.5, [[21, 7], [31, 13], [27, 18], [38, 21], [34, 28]]);
  context.fillStyle = '#c7fff9';
  context.beginPath();
  context.arc(34, 19, 4, 0, Math.PI * 2);
  context.fill();
  outline(context, 1.5);
}

function drawDrill(context: CanvasRenderingContext2D): void {
  poly(context, '#354143', [[10, 20], [38, 20], [43, 30], [38, 43], [10, 43]]);
  poly(context, '#727c77', [[38, 24], [53, 32], [38, 40]]);
  line(context, '#aebbb8', 2, [[42, 27], [50, 32], [42, 36]]);
  line(context, '#e2a247', 4, [[17, 46], [33, 46]]);
  poly(context, '#4a4033', [[15, 30], [23, 30], [20, 47], [12, 47]]);
  context.fillStyle = '#6edfd5';
  context.fillRect(30, 17, 6, 3);
}

function drawShotgun(context: CanvasRenderingContext2D): void {
  poly(context, '#2e383a', [[8, 18], [43, 18], [43, 22], [22, 22], [22, 28], [8, 28]]);
  poly(context, '#9aa7a4', [[21, 20], [54, 20], [54, 25], [21, 25]]);
  poly(context, '#727c77', [[26, 27], [43, 27], [43, 32], [26, 32]]);
  poly(context, '#6d4526', [[8, 17], [18, 14], [25, 22], [21, 31], [10, 30]]);
  context.strokeStyle = '#202728';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(29, 34, 4, 0, Math.PI);
  context.stroke();
  context.fillStyle = '#e2a247';
  context.beginPath();
  context.arc(50, 22.5, 1.8, 0, Math.PI * 2);
  context.fill();
}

function drawPistol(context: CanvasRenderingContext2D): void {
  poly(context, '#3b4749', [[15, 20], [48, 20], [54, 25], [48, 30], [15, 30]]);
  poly(context, '#9aa7a4', [[43, 23], [57, 23], [57, 27], [43, 27]]);
  poly(context, '#4a4033', [[23, 29], [34, 29], [30, 49], [20, 47]]);
  context.strokeStyle = '#202728';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(34, 34, 5, 0, Math.PI);
  context.stroke();
  context.fillStyle = '#e2a247';
  context.fillRect(19, 17, 9, 2);
  context.fillStyle = '#6edfd5';
  context.fillRect(49, 23, 4, 2);
}

function drawRifle(context: CanvasRenderingContext2D): void {
  poly(context, '#2e383a', [[6, 22], [18, 18], [24, 24], [21, 32], [8, 32]]);
  poly(context, '#4b5657', [[18, 22], [48, 22], [48, 28], [18, 28]]);
  poly(context, '#9aa7a4', [[46, 23], [60, 23], [60, 26], [46, 26]]);
  poly(context, '#202728', [[26, 28], [34, 28], [33, 41], [26, 41]]);
  context.strokeStyle = '#727c77';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(30, 17);
  context.lineTo(48, 17);
  context.stroke();
  context.strokeStyle = '#6edfd5';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(49, 17, 2, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#e2a247';
  context.fillRect(57, 22, 3, 5);
}

function drawMinigun(context: CanvasRenderingContext2D): void {
  poly(context, '#354143', [[18, 20], [38, 20], [44, 30], [38, 44], [18, 44]]);
  for (let index = 0; index < 5; index += 1) {
    const y = 20 + index * 5;
    line(context, index % 2 === 0 ? '#aebbb8' : '#727c77', 3, [[40, y], [57, y]]);
  }
  context.strokeStyle = '#4b5657';
  context.lineWidth = 5;
  context.beginPath();
  context.arc(41, 32, 14, -Math.PI / 2, Math.PI / 2);
  context.stroke();
  poly(context, '#6d4526', [[14, 24], [22, 24], [20, 49], [12, 48]]);
  poly(context, '#e2a247', [[35, 47], [48, 47], [48, 53], [35, 53]]);
  context.fillStyle = '#202728';
  context.fillRect(37, 49, 9, 2);
}

function drawAxe(context: CanvasRenderingContext2D, double: boolean): void {
  line(context, '#7b4b26', 6, [[22, 56], [34, 14]]);
  line(context, '#4a2c18', 4, [[24, 48], [27, 39]]);
  poly(context, '#9aa7a4', double
    ? [[34, 20], [54, 16], [58, 30], [38, 30]]
    : [[34, 18], [55, 22], [58, 36], [37, 32]]);
  poly(context, '#c7d1cc', double
    ? [[52, 17], [58, 19], [58, 29], [51, 30]]
    : [[54, 23], [60, 24], [60, 36], [55, 35]]);
  if (double) {
    poly(context, '#9aa7a4', [[33, 20], [14, 16], [10, 30], [30, 30]]);
    poly(context, '#c7d1cc', [[16, 17], [10, 19], [10, 29], [17, 30]]);
  } else {
    poly(context, '#727c77', [[33, 20], [24, 16], [22, 22], [31, 25]]);
  }
  context.fillStyle = '#e2a247';
  context.beginPath();
  context.arc(34, 24, 3, 0, Math.PI * 2);
  context.fill();
  outline(context, 1.5);
}

function drawGlove(context: CanvasRenderingContext2D): void {
  poly(context, '#8c3f39', [[14, 22], [42, 18], [48, 25], [47, 45], [20, 49], [12, 38]]);
  poly(context, '#c25e50', [[18, 23], [39, 20], [44, 26], [42, 33], [20, 35]]);
  for (let index = 0; index < 3; index += 1) {
    line(context, '#f0b0a4', 1.5, [[22, 25 + index * 3], [38, 24 + index * 3]]);
  }
  poly(context, '#4a4033', [[10, 39], [24, 48], [21, 56], [7, 50]]);
  context.fillStyle = '#e2a247';
  context.fillRect(12, 41, 9, 2);
  line(context, '#f0b0a4', 2, [[40, 27], [45, 30], [45, 38]]);
}

function drawBoot(context: CanvasRenderingContext2D): void {
  poly(context, '#4a4033', [[20, 10], [39, 13], [36, 38], [50, 41], [53, 52], [20, 52]]);
  poly(context, '#6b5642', [[23, 14], [34, 16], [32, 39], [49, 43], [50, 48], [23, 47]]);
  for (let index = 0; index < 3; index += 1) {
    line(context, '#d8cfb8', 1.5, [[26, 21 + index * 5], [33, 22 + index * 5]]);
  }
  poly(context, '#161d1e', [[19, 49], [53, 50], [53, 56], [19, 55]]);
  line(context, '#e2a247', 2, [[37, 44], [48, 46]]);
}

function drawStaff(
  context: CanvasRenderingContext2D,
  color: string,
  kind: 'magic' | 'poison' | 'water',
): void {
  line(context, kind === 'poison' ? '#4b5a2b' : kind === 'water' ? '#4d5b5c' : '#6d4526', 5, [[26, 56], [36, 12]]);
  if (kind === 'magic') {
    poly(context, color, [[30, 8], [40, 4], [44, 13], [36, 20], [28, 14]]);
    context.strokeStyle = '#c08cff';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(36, 13, 10, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#f0d8ff';
    context.beginPath();
    context.arc(36, 13, 3, 0, Math.PI * 2);
    context.fill();
  } else if (kind === 'poison') {
    context.fillStyle = color;
    context.beginPath();
    context.arc(37, 13, 8, 0, Math.PI * 2);
    context.fill();
    outline(context, 2);
    context.strokeStyle = '#4bbf3a';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(37, 13, 11, 0.3, Math.PI - 0.3);
    context.stroke();
    context.fillStyle = '#8aff6a';
    context.beginPath();
    context.arc(28, 20, 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = color;
    context.beginPath();
    context.arc(37, 13, 7, 0, Math.PI * 2);
    context.fill();
    outline(context, 2);
    context.strokeStyle = '#6ad8ff';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(37, 13, 12, 4, 0.5, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#bff6ff';
    context.beginPath();
    context.arc(29, 22, 1.7, 0, Math.PI * 2);
    context.fill();
  }
}

function drawOrb(context: CanvasRenderingContext2D, color: string): void {
  const glow = context.createRadialGradient(32, 29, 2, 32, 29, 17);
  glow.addColorStop(0, '#f0d8ff');
  glow.addColorStop(0.45, color);
  glow.addColorStop(1, 'rgba(192,140,255,0.1)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(32, 30, 13, 0, Math.PI * 2);
  context.fill();
  outline(context, 2);
  context.strokeStyle = '#d8a8ff';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(32, 30, 22, 7, -0.4, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(32, 30, 8, 22, 0.4, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#e2a247';
  for (const [x, y] of [[11, 25], [53, 36], [34, 8], [28, 51]] as const) {
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fill();
  }
}

function drawJet(context: CanvasRenderingContext2D): void {
  poly(context, '#3b4749', [[14, 25], [48, 25], [53, 32], [48, 40], [14, 40]]);
  poly(context, '#9aa7a4', [[8, 20], [20, 20], [20, 45], [8, 45]]);
  poly(context, '#727c77', [[44, 20], [56, 20], [60, 30], [56, 45], [44, 45]]);
  poly(context, '#202728', [[19, 30], [25, 30], [25, 37], [19, 37]]);
  context.fillStyle = '#7ab7ff';
  context.beginPath();
  context.arc(53, 32, 4, 0, Math.PI * 2);
  context.fill();
  line(context, '#6edfd5', 2, [[7, 50], [15, 47], [22, 50]]);
  context.fillStyle = '#e2a247';
  context.fillRect(28, 21, 8, 2);
}

function drawTank(context: CanvasRenderingContext2D): void {
  poly(context, '#354143', [[8, 23], [38, 21], [44, 30], [38, 42], [8, 43]]);
  poly(context, '#9aa7a4', [[38, 23], [59, 23], [59, 30], [38, 30]]);
  poly(context, '#4b5657', [[48, 20], [58, 20], [58, 33], [48, 33]]);
  context.strokeStyle = '#202728';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(25, 27, 9, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#e2a247';
  context.fillRect(14, 35, 12, 3);
  line(context, '#6edfd5', 2, [[23, 45], [32, 45]]);
}

function drawFlamethrower(context: CanvasRenderingContext2D): void {
  poly(context, '#354143', [[16, 24], [38, 24], [42, 31], [38, 40], [16, 40]]);
  poly(context, '#6d4526', [[16, 33], [25, 33], [22, 50], [13, 49]]);
  poly(context, '#9a4c32', [[12, 20], [26, 20], [26, 33], [12, 33]]);
  poly(context, '#9aa7a4', [[30, 27], [54, 29], [54, 34], [30, 35]]);
  poly(context, '#ffb36b', [[53, 27], [62, 22], [58, 30], [62, 38], [53, 35]]);
  context.fillStyle = '#ff8a4a';
  context.beginPath();
  context.arc(56, 31, 3, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#e2a247';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(19, 26, 5, 0, Math.PI * 2);
  context.stroke();
}

function drawPoisonGun(context: CanvasRenderingContext2D): void {
  poly(context, '#3b4749', [[14, 21], [42, 21], [48, 26], [42, 31], [14, 31]]);
  poly(context, '#9aa7a4', [[42, 24], [55, 24], [55, 28], [42, 28]]);
  poly(context, '#4a4033', [[20, 30], [31, 30], [28, 49], [17, 47]]);
  context.fillStyle = '#4f8f3a';
  context.beginPath();
  context.arc(31, 20, 7, 0, Math.PI * 2);
  context.fill();
  outline(context, 2);
  context.strokeStyle = '#8aff6a';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(31, 20, 10, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#8aff6a';
  context.beginPath();
  context.arc(40, 39, 2.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(37, 44, 1.4, 0, Math.PI * 2);
  context.fill();
  line(context, '#8aff6a', 2, [[47, 31], [51, 38], [49, 44]]);
}

function drawWaterGun(context: CanvasRenderingContext2D): void {
  poly(context, '#3b6f80', [[14, 21], [42, 21], [48, 26], [42, 31], [14, 31]]);
  poly(context, '#9aa7a4', [[42, 24], [56, 24], [56, 28], [42, 28]]);
  poly(context, '#4a4033', [[20, 30], [31, 30], [28, 49], [17, 47]]);
  context.fillStyle = '#34799a';
  context.beginPath();
  context.arc(30, 21, 7, 0, Math.PI * 2);
  context.fill();
  outline(context, 2);
  context.fillStyle = '#6ad8ff';
  context.fillRect(27, 18, 6, 2);
  for (const [x, y] of [[42, 37], [47, 43], [39, 47]] as const) {
    context.beginPath();
    context.arc(x, y, 1.8, 0, Math.PI * 2);
    context.fill();
  }
  line(context, '#6ad8ff', 2, [[50, 28], [55, 34], [54, 41]]);
}

function drawMortar(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(32, 30);
  context.rotate(-0.55);
  poly(context, '#354143', [[-16, -9], [16, -9], [21, 0], [16, 9], [-16, 9]]);
  poly(context, '#9aa7a4', [[12, -6], [25, -6], [25, 6], [12, 6]]);
  poly(context, '#202728', [[-16, -10], [-25, -10], [-25, 10], [-16, 10]]);
  context.restore();
  poly(context, '#4b5657', [[17, 43], [48, 43], [48, 50], [17, 50]]);
  line(context, '#9aa7a4', 3, [[25, 44], [19, 56], [17, 58]]);
  line(context, '#9aa7a4', 3, [[39, 44], [45, 56], [47, 58]]);
  context.fillStyle = '#e2a247';
  context.fillRect(28, 45, 10, 2);
  context.fillStyle = '#ffcf6a';
  context.beginPath();
  context.arc(8, 9, 3, 0, Math.PI * 2);
  context.fill();
}

function drawEarthquake(context: CanvasRenderingContext2D): void {
  poly(context, '#354143', [[13, 18], [48, 18], [52, 26], [48, 44], [13, 44], [9, 31]]);
  poly(context, '#4b5657', [[17, 22], [44, 22], [47, 29], [44, 40], [17, 40]]);
  context.strokeStyle = '#ff9b6b';
  context.lineWidth = 2.5;
  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    context.ellipse(31, 31, 8 + index * 5, 3 + index * 2, 0, 0, Math.PI * 2);
    context.stroke();
  }
  poly(context, '#e2a247', [[20, 14], [42, 14], [42, 18], [20, 18]]);
  line(context, '#202728', 3, [[22, 46], [18, 54]]);
  line(context, '#202728', 3, [[40, 46], [44, 54]]);
  context.fillStyle = '#ffcf6a';
  context.beginPath();
  context.arc(31, 31, 4, 0, Math.PI * 2);
  context.fill();
}

export function weaponIconUrl(weapon: WeaponId): string {
  const family = weaponFamily(weapon);
  const accent = cssHex(family.color);
  return canvasFor(weapon, (context) => {
    base(context, accent);
    switch (weapon) {
      case 'pickaxe':
        drawPickaxe(context);
        break;
      case 'tesla':
        drawTesla(context);
        break;
      case 'drill':
        drawDrill(context);
        break;
      case 'shotgun':
        drawShotgun(context);
        break;
      case 'pistol':
        drawPistol(context);
        break;
      case 'rifle':
        drawRifle(context);
        break;
      case 'minigun':
        drawMinigun(context);
        break;
      case 'axe':
        drawAxe(context, false);
        break;
      case 'battleaxe':
        drawAxe(context, true);
        break;
      case 'boxingGlove':
        drawGlove(context);
        break;
      case 'roundhouseKick':
        drawBoot(context);
        break;
      case 'magicStaff':
        drawStaff(context, accent, 'magic');
        break;
      case 'poisonStaff':
        drawStaff(context, accent, 'poison');
        break;
      case 'waterStaff':
        drawStaff(context, accent, 'water');
        break;
      case 'orb':
        drawOrb(context, accent);
        break;
      case 'jet':
        drawJet(context);
        break;
      case 'tank':
        drawTank(context);
        break;
      case 'flamethrower':
        drawFlamethrower(context);
        break;
      case 'poisonGun':
        drawPoisonGun(context);
        break;
      case 'waterGun':
        drawWaterGun(context);
        break;
      case 'mortar':
        drawMortar(context);
        break;
      case 'earthquake':
        drawEarthquake(context);
        break;
      default:
        drawPistol(context);
    }
  });
}
