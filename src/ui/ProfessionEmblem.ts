import type { ProfessionId } from '../types';

const cache = new Map<string, string>();

const ACCENTS: Record<string, string> = {
  internship: '#e2a247',
  shaman: '#8aff6a',
  gunslinger: '#ffd27b',
  shotgunner: '#ff9a5c',
  wizard: '#c08cff',
  barbarian: '#ff8a8a',
  martialArtist: '#ff8a8a',
  loneRanger: '#6edfd5',
  demolitionist: '#ffb36b',
  waterbender: '#6ad8ff',
  maverick: '#7ab7ff',
  lumberjack: '#b6d47a',
  destructor: '#ff8065',
  mule: '#e2c46a',
  generalist: '#c7d1cc',
};

function badgeBase(context: CanvasRenderingContext2D, accent: string): void {
  const shield: Array<[number, number]> = [
    [18, 8],
    [78, 8],
    [89, 20],
    [89, 68],
    [48, 91],
    [7, 68],
    [7, 20],
  ];
  context.beginPath();
  context.moveTo(shield[0][0], shield[0][1]);
  for (let index = 1; index < shield.length; index += 1) {
    context.lineTo(shield[index][0], shield[index][1]);
  }
  context.closePath();
  const fill = context.createLinearGradient(0, 8, 0, 91);
  fill.addColorStop(0, '#172223');
  fill.addColorStop(0.48, '#0c1415');
  fill.addColorStop(1, '#070b0c');
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.lineJoin = 'round';
  context.stroke();
  context.strokeStyle = 'rgba(201,219,210,0.16)';
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(22, 13);
  context.lineTo(74, 13);
  context.lineTo(83, 22);
  context.lineTo(83, 64);
  context.lineTo(48, 83);
  context.lineTo(13, 64);
  context.lineTo(13, 22);
  context.closePath();
  context.stroke();
  context.fillStyle = accent;
  context.globalAlpha = 0.85;
  context.fillRect(24, 72, 48, 2);
  context.globalAlpha = 1;
  const glow = context.createRadialGradient(48, 42, 4, 48, 42, 42);
  glow.addColorStop(0, `${accent}2e`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(8, 8, 80, 80);
  for (const [x, y] of [[20, 17], [76, 17], [20, 66], [76, 66]] as const) {
    context.fillStyle = '#59625e';
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fill();
  }
}

function strokeOutline(context: CanvasRenderingContext2D, width = 2.4): void {
  context.strokeStyle = '#060a0b';
  context.lineWidth = width;
  context.lineJoin = 'round';
  context.stroke();
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
  strokeOutline(context);
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

function ring(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  width = 2.2,
): void {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
}

function drawIntern(context: CanvasRenderingContext2D, accent: string): void {
  line(context, '#7b4b26', 5, [[30, 74], [49, 24]]);
  poly(context, '#aab7b1', [[49, 24], [67, 33], [49, 37], [40, 31]]);
  poly(context, '#d7e0dc', [[49, 24], [61, 29], [50, 33], [42, 29]]);
  poly(context, '#aab7b1', [[49, 24], [33, 21], [24, 28], [41, 33]]);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(48, 32, 3.2, 0, Math.PI * 2);
  context.fill();
  line(context, accent, 2, [[25, 58], [44, 58], [44, 69]]);
  line(context, accent, 2, [[25, 58], [25, 69], [44, 69]]);
}

function drawShaman(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#202728', [[37, 26], [59, 26], [65, 48], [55, 72], [41, 72], [31, 48]]);
  context.fillStyle = `${accent}88`;
  context.beginPath();
  context.moveTo(38, 42);
  context.lineTo(58, 42);
  context.lineTo(53, 68);
  context.lineTo(43, 68);
  context.closePath();
  context.fill();
  strokeOutline(context, 1.6);
  context.fillStyle = '#d7e0dc';
  context.beginPath();
  context.arc(48, 22, 7, 0, Math.PI * 2);
  context.fill();
  strokeOutline(context, 1.6);
  line(context, accent, 2.2, [[48, 15], [48, 9], [53, 7]]);
  poly(context, '#8aff6a', [[60, 19], [69, 14], [65, 24]]);
}

function drawGunslinger(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#aab7b1', [[17, 37], [59, 37], [70, 44], [59, 50], [17, 50]]);
  poly(context, '#d7e0dc', [[59, 41], [77, 41], [77, 46], [59, 46]]);
  poly(context, '#4a4033', [[31, 48], [48, 48], [43, 71], [27, 68]]);
  strokeOutline(context, 1.5);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(49, 55, 7, 0, Math.PI);
  context.stroke();
  context.fillStyle = accent;
  context.fillRect(21, 33, 14, 2.5);
  ring(context, 68, 43, 3, accent, 1.6);
}

function drawShotgunner(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#aab7b1', [[18, 28], [58, 28], [58, 34], [18, 34]]);
  poly(context, '#6d4526', [[18, 36], [32, 36], [36, 51], [18, 51]]);
  poly(context, '#9a5a2d', [[14, 22], [28, 22], [28, 39], [14, 39]]);
  context.fillStyle = accent;
  context.fillRect(19, 25, 4, 11);
  context.fillStyle = '#d7e0dc';
  context.fillRect(23, 25, 2, 11);
  poly(context, '#4a4033', [[36, 30], [54, 30], [52, 40], [36, 40]]);
  context.strokeStyle = accent;
  context.lineWidth = 2.2;
  context.beginPath();
  context.arc(45, 44, 6, 0, Math.PI);
  context.stroke();
}

function drawWizard(context: CanvasRenderingContext2D, accent: string): void {
  line(context, '#6d4526', 4.5, [[30, 74], [49, 22]]);
  poly(context, accent, [[49, 15], [59, 7], [67, 17], [57, 28], [45, 26]]);
  poly(context, '#f0d8ff', [[52, 14], [58, 11], [63, 17], [56, 21]]);
  ring(context, 54, 20, 14, accent, 2);
  context.fillStyle = '#f0d8ff';
  context.beginPath();
  context.arc(54, 20, 3, 0, Math.PI * 2);
  context.fill();
  line(context, accent, 1.8, [[27, 32], [22, 29]]);
  line(context, accent, 1.8, [[30, 38], [24, 40]]);
}

function drawBarbarian(context: CanvasRenderingContext2D, accent: string): void {
  line(context, '#7b4b26', 5, [[30, 75], [68, 25]]);
  line(context, '#7b4b26', 5, [[66, 75], [28, 25]]);
  poly(context, '#d7e0dc', [[68, 25], [61, 17], [76, 14], [78, 27]]);
  poly(context, '#d7e0dc', [[28, 25], [35, 17], [20, 14], [18, 27]]);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(48, 50, 5, 0, Math.PI * 2);
  context.fill();
  strokeOutline(context, 1.6);
  line(context, accent, 2, [[42, 59], [54, 59]]);
}

function drawMartial(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#8d3f39', [[26, 31], [62, 28], [69, 38], [64, 63], [34, 68], [22, 53]]);
  poly(context, '#c25e50', [[31, 34], [58, 32], [64, 40], [58, 50], [34, 52]]);
  for (let index = 0; index < 3; index += 1) {
    line(context, '#f0b0a4', 1.5, [[35, 37 + index * 4], [56, 35 + index * 4]]);
  }
  poly(context, '#4a4033', [[19, 56], [36, 67], [31, 77], [13, 67]]);
  context.fillStyle = accent;
  context.fillRect(18, 59, 13, 2.5);
}

function drawRanger(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#d7e0dc', [[48, 12], [55, 34], [78, 34], [59, 48], [66, 70], [48, 57], [30, 70], [37, 48], [18, 34], [41, 34]]);
  context.strokeStyle = accent;
  context.lineWidth = 2.4;
  context.beginPath();
  context.arc(48, 43, 27, 0, Math.PI * 2);
  context.stroke();
  ring(context, 48, 43, 20, '#6edfd5', 1.4);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(48, 43, 4, 0, Math.PI * 2);
  context.fill();
}

function drawDemolition(context: CanvasRenderingContext2D, accent: string): void {
  for (const x of [33, 49, 65]) {
    poly(context, '#b85b4d', [[x - 7, 30], [x + 7, 30], [x + 7, 66], [x - 7, 66]]);
    context.fillStyle = '#d7e0dc';
    context.fillRect(x - 8, 34, 16, 3);
    context.fillRect(x - 8, 47, 16, 3);
    line(context, '#202728', 2, [[x, 30], [x + 8, 19], [x + 13, 22]]);
  }
  context.fillStyle = accent;
  context.beginPath();
  context.arc(72, 21, 4, 0, Math.PI * 2);
  context.fill();
  line(context, accent, 2, [[68, 25], [63, 30]]);
}

function drawWater(context: CanvasRenderingContext2D, accent: string): void {
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(48, 13);
  context.bezierCurveTo(64, 35, 69, 45, 69, 55);
  context.bezierCurveTo(69, 69, 58, 77, 48, 77);
  context.bezierCurveTo(38, 77, 27, 69, 27, 55);
  context.bezierCurveTo(27, 45, 32, 35, 48, 13);
  context.closePath();
  context.fill();
  strokeOutline(context, 2);
  context.fillStyle = '#d6f7ff';
  context.beginPath();
  context.ellipse(42, 54, 5, 8, -0.4, 0, Math.PI * 2);
  context.fill();
  line(context, '#d6f7ff', 2, [[31, 68], [39, 72], [47, 69], [55, 73], [64, 68]]);
}

function drawMaverick(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#aab7b1', [[48, 24], [65, 34], [77, 32], [71, 47], [57, 55], [48, 64], [39, 55], [25, 47], [19, 32], [31, 34]]);
  poly(context, '#d7e0dc', [[48, 30], [58, 38], [48, 49], [38, 38]]);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(48, 40, 4, 0, Math.PI * 2);
  context.fill();
  line(context, accent, 3, [[39, 63], [48, 75], [57, 63]]);
  for (const x of [28, 68]) {
    line(context, '#d7e0dc', 2, [[x, 39], [x + (x < 48 ? -8 : 8), 49]]);
  }
}

function drawLumberjack(context: CanvasRenderingContext2D, accent: string): void {
  line(context, '#7b4b26', 6, [[28, 75], [43, 22]]);
  poly(context, '#aab7b1', [[43, 22], [67, 28], [64, 45], [42, 37]]);
  poly(context, '#d7e0dc', [[65, 29], [72, 31], [70, 43], [64, 42]]);
  poly(context, '#3f7a4c', [[22, 31], [9, 42], [20, 47], [9, 56], [24, 57], [17, 68], [32, 59], [40, 65], [38, 48], [29, 37]]);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(52, 16, 7, 0, Math.PI * 2);
  context.stroke();
}

function drawDestructor(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#354143', [[22, 27], [57, 27], [64, 39], [57, 55], [22, 55]]);
  poly(context, '#727c77', [[57, 32], [52, 48], [68, 41]]);
  poly(context, '#d7e0dc', [[55, 35], [63, 38], [57, 44]]);
  line(context, '#202728', 4, [[22, 34], [14, 34], [14, 50]]);
  context.fillStyle = '#e2a247';
  context.fillRect(28, 58, 24, 3);
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(44, 41, 22, 8, 0.2, 0, Math.PI * 2);
  context.stroke();
}

function drawMule(context: CanvasRenderingContext2D, accent: string): void {
  poly(context, '#6d4526', [[22, 29], [65, 29], [68, 62], [19, 62]]);
  poly(context, '#8a5528', [[27, 23], [60, 23], [63, 36], [24, 36]]);
  context.strokeStyle = '#d7e0dc';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(19, 62);
  context.lineTo(68, 62);
  context.stroke();
  context.fillStyle = '#202728';
  for (const x of [26, 42, 58]) {
    context.fillRect(x, 42, 6, 12);
  }
  context.fillStyle = accent;
  context.fillRect(44, 17, 4, 10);
  context.fillRect(40, 20, 12, 4);
  line(context, '#59625e', 2, [[34, 32], [54, 32]]);
}

function drawGeneralist(context: CanvasRenderingContext2D, accent: string): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const x = 48 + Math.cos(angle) * 22;
    const y = 44 + Math.sin(angle) * 22;
    line(context, accent, 3, [[48, 44], [x, y]]);
  }
  ring(context, 48, 44, 12, '#d7e0dc', 3);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(48, 44, 5, 0, Math.PI * 2);
  context.fill();
  strokeOutline(context, 1.4);
}

export function professionAccent(id: ProfessionId): string {
  return ACCENTS[id] ?? '#e2a247';
}

export function professionEmblemUrl(id: ProfessionId): string {
  const cached = cache.get(id);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const accent = ACCENTS[id] ?? '#e2a247';
  badgeBase(context, accent);
  switch (id) {
    case 'internship':
      drawIntern(context, accent);
      break;
    case 'shaman':
      drawShaman(context, accent);
      break;
    case 'gunslinger':
      drawGunslinger(context, accent);
      break;
    case 'shotgunner':
      drawShotgunner(context, accent);
      break;
    case 'wizard':
      drawWizard(context, accent);
      break;
    case 'barbarian':
      drawBarbarian(context, accent);
      break;
    case 'martialArtist':
      drawMartial(context, accent);
      break;
    case 'loneRanger':
      drawRanger(context, accent);
      break;
    case 'demolitionist':
      drawDemolition(context, accent);
      break;
    case 'waterbender':
      drawWater(context, accent);
      break;
    case 'maverick':
      drawMaverick(context, accent);
      break;
    case 'lumberjack':
      drawLumberjack(context, accent);
      break;
    case 'destructor':
      drawDestructor(context, accent);
      break;
    case 'mule':
      drawMule(context, accent);
      break;
    default:
      drawGeneralist(context, accent);
  }
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}
