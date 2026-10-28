import { GRENADE_TIERS, WEAPONS } from '../config';
import type {
  EmployeeKind,
  GrenadeTierId,
  MineralId,
  UpgradeId,
  WeaponId,
} from '../types';
import { cssHex, mineralIconUrl } from './MineralIcon';

const cache = new Map<string, string>();

function canvasFor(key: string, draw: (context: CanvasRenderingContext2D) => void): string {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }
  draw(context);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

function outline(context: CanvasRenderingContext2D): void {
  context.strokeStyle = 'rgba(3, 7, 8, 0.92)';
  context.lineWidth = 2.2;
  context.stroke();
}

function drawPickaxe(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#6d4526';
  context.lineWidth = 7;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(20, 54);
  context.lineTo(43, 19);
  context.stroke();
  context.strokeStyle = '#aebbb8';
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(25, 29);
  context.lineTo(48, 13);
  context.stroke();
  context.fillStyle = '#d7e0dc';
  context.beginPath();
  context.moveTo(21, 35);
  context.lineTo(8, 43);
  context.lineTo(27, 30);
  context.closePath();
  context.fill();
  outline(context);
  context.beginPath();
  context.moveTo(45, 16);
  context.lineTo(58, 23);
  context.lineTo(43, 23);
  context.closePath();
  context.fill();
  outline(context);
}

function drawTesla(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#2c383a';
  context.lineWidth = 8;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(32, 54);
  context.lineTo(32, 26);
  context.stroke();
  context.strokeStyle = '#6edfd5';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(31, 10);
  context.lineTo(22, 30);
  context.lineTo(34, 30);
  context.lineTo(25, 53);
  context.stroke();
  context.fillStyle = '#c7fff9';
  context.beginPath();
  context.moveTo(29, 10);
  context.lineTo(21, 32);
  context.lineTo(31, 32);
  context.lineTo(23, 52);
  context.lineTo(41, 26);
  context.lineTo(33, 26);
  context.closePath();
  context.fill();
  outline(context);
}

function drawDrill(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#303c3e';
  context.fillRect(15, 26, 30, 18);
  outline(context);
  context.fillStyle = '#7d8a87';
  context.beginPath();
  context.moveTo(45, 28);
  context.lineTo(58, 35);
  context.lineTo(45, 42);
  context.closePath();
  context.fill();
  outline(context);
  context.strokeStyle = '#e2a247';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(22, 50);
  context.lineTo(38, 50);
  context.stroke();
}

function drawShotgun(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#7d8a87';
  context.lineWidth = 7;
  context.lineCap = 'butt';
  context.beginPath();
  context.moveTo(10, 25);
  context.lineTo(48, 25);
  context.stroke();
  context.strokeStyle = '#202728';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(10, 34);
  context.lineTo(38, 34);
  context.stroke();
  context.fillStyle = '#6d4526';
  context.beginPath();
  context.moveTo(44, 20);
  context.lineTo(58, 27);
  context.lineTo(53, 40);
  context.lineTo(42, 37);
  context.closePath();
  context.fill();
  outline(context);
}

function drawLadder(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#8a5528';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(22, 10);
  context.lineTo(22, 54);
  context.moveTo(42, 10);
  context.lineTo(42, 54);
  context.stroke();
  context.strokeStyle = '#c08a4d';
  context.lineWidth = 3.4;
  for (let y = 16; y <= 48; y += 8) {
    context.beginPath();
    context.moveTo(22, y);
    context.lineTo(42, y);
    context.stroke();
  }
  context.strokeStyle = 'rgba(3,7,8,0.9)';
  context.lineWidth = 1.2;
  context.strokeRect(19, 8, 26, 48);
}

function drawWinch(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#4a5568';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(16, 26);
  context.lineTo(32, 10);
  context.lineTo(48, 26);
  context.stroke();
  context.fillStyle = '#cbd5e0';
  context.beginPath();
  context.arc(32, 22, 8, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#2d3748';
  context.lineWidth = 2.5;
  context.stroke();
  context.strokeStyle = '#94a3b8';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(32, 30);
  context.lineTo(32, 44);
  context.stroke();
  context.fillStyle = '#e2a247';
  context.fillRect(20, 44, 24, 14);
  outline(context);
}

function drawFieldDepot(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#8a6234';
  context.fillRect(14, 24, 36, 28);
  outline(context);
  context.fillStyle = '#4a5568';
  context.fillRect(10, 52, 44, 5);
  context.fillStyle = '#4fd1c5';
  context.fillRect(22, 32, 20, 12);
  context.strokeStyle = '#2d3748';
  context.lineWidth = 1.5;
  context.strokeRect(22, 32, 20, 12);
  context.fillStyle = '#f59e0b';
  context.beginPath();
  context.arc(32, 16, 5, 0, Math.PI * 2);
  context.fill();
  outline(context);
}

function drawBeacon(context: CanvasRenderingContext2D): void {
  context.strokeStyle = '#334155';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(18, 54);
  context.lineTo(32, 44);
  context.lineTo(46, 54);
  context.stroke();
  context.strokeStyle = '#64748b';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(32, 44);
  context.lineTo(32, 18);
  context.stroke();
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.arc(32, 16, 6, 0, Math.PI * 2);
  context.fill();
  outline(context);
  context.strokeStyle = '#7dd3fc';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(32, 16, 12, -Math.PI * 0.75, -Math.PI * 0.25);
  context.stroke();
}

function drawGrenade(context: CanvasRenderingContext2D, tier: GrenadeTierId): void {
  const definition = GRENADE_TIERS[tier];
  context.fillStyle = cssHex(definition.color);
  context.beginPath();
  context.ellipse(31, 38, 15, 17, 0, 0, Math.PI * 2);
  context.fill();
  outline(context);
  context.fillStyle = cssHex(definition.glow, 0.75);
  context.beginPath();
  context.ellipse(26, 32, 5, 7, -0.4, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#242c2d';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(31, 21);
  context.lineTo(31, 13);
  context.lineTo(42, 12);
  context.stroke();
  context.fillStyle = '#f5e3b3';
  context.beginPath();
  context.arc(43, 12, 2.2, 0, Math.PI * 2);
  context.fill();
}

function drawUpgrade(context: CanvasRenderingContext2D, upgrade: UpgradeId): void {
  if (upgrade === 'damage') {
    context.strokeStyle = '#d7e0dc';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(18, 50);
    context.lineTo(40, 22);
    context.stroke();
    context.strokeStyle = '#e2a247';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(31, 15);
    context.lineTo(47, 27);
    context.moveTo(25, 24);
    context.lineTo(39, 11);
    context.stroke();
  } else if (upgrade === 'speed') {
    context.fillStyle = '#f2c14e';
    context.beginPath();
    context.moveTo(35, 8);
    context.lineTo(18, 33);
    context.lineTo(30, 33);
    context.lineTo(24, 56);
    context.lineTo(47, 27);
    context.lineTo(34, 27);
    context.closePath();
    context.fill();
    outline(context);
  } else if (upgrade === 'magnet') {
    context.strokeStyle = '#e46653';
    context.lineWidth = 10;
    context.lineCap = 'round';
    context.beginPath();
    context.arc(32, 32, 16, 0, Math.PI, true);
    context.stroke();
    context.strokeStyle = '#d7e0dc';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(16, 30);
    context.lineTo(16, 44);
    context.moveTo(48, 30);
    context.lineTo(48, 44);
    context.stroke();
  } else if (upgrade === 'jetpack') {
    context.fillStyle = '#6b7977';
    context.fillRect(22, 18, 20, 26);
    outline(context);
    context.fillStyle = '#e46653';
    context.fillRect(14, 24, 6, 20);
    context.fillRect(44, 24, 6, 20);
    outline(context);
    context.fillStyle = '#ffd36b';
    context.beginPath();
    context.moveTo(17, 46);
    context.lineTo(11, 57);
    context.lineTo(22, 47);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(47, 46);
    context.lineTo(53, 57);
    context.lineTo(42, 47);
    context.closePath();
    context.fill();
  } else if (upgrade === 'dayTime') {
    context.strokeStyle = '#d7b56b';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(18, 10);
    context.lineTo(46, 10);
    context.moveTo(18, 54);
    context.lineTo(46, 54);
    context.moveTo(21, 12);
    context.bezierCurveTo(21, 26, 43, 26, 43, 12);
    context.moveTo(21, 52);
    context.bezierCurveTo(21, 38, 43, 38, 43, 52);
    context.stroke();
    context.fillStyle = '#f2c14e';
    context.beginPath();
    context.moveTo(24, 50);
    context.lineTo(40, 50);
    context.lineTo(32, 37);
    context.closePath();
    context.fill();
  } else {
    context.fillStyle = '#9a6a3d';
    context.fillRect(12, 24, 40, 28);
    outline(context);
    context.strokeStyle = '#e2a247';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(12, 33);
    context.lineTo(52, 33);
    context.moveTo(30, 33);
    context.lineTo(30, 52);
    context.stroke();
    context.strokeStyle = '#c7d3ce';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(18, 24);
    context.lineTo(18, 18);
    context.moveTo(46, 24);
    context.lineTo(46, 18);
    context.stroke();
  }
}

function drawEmployee(context: CanvasRenderingContext2D, role: EmployeeKind): void {
  context.fillStyle = role === 'collector' ? '#6edfd5' : '#e2a247';
  context.beginPath();
  context.arc(32, 21, 11, Math.PI, Math.PI * 2);
  context.fill();
  context.fillRect(18, 21, 28, 5);
  outline(context);
  context.fillStyle = '#38484a';
  context.beginPath();
  context.arc(32, 39, 10, 0, Math.PI * 2);
  context.fill();
  context.fillRect(21, 43, 22, 12);
  outline(context);
  if (role === 'collector') {
    context.strokeStyle = '#c7d3ce';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(44, 31);
    context.lineTo(52, 48);
    context.stroke();
    context.fillStyle = '#d9ac3e';
    context.fillRect(47, 47, 10, 9);
    outline(context);
  } else {
    context.strokeStyle = '#c7d3ce';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(18, 47);
    context.lineTo(11, 34);
    context.stroke();
  }
}

function drawPatent(context: CanvasRenderingContext2D, tier: number): void {
  const colors = ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#c084fc', '#f43f5e'];
  const color = colors[Math.max(0, Math.min(5, (tier || 1) - 1))];
  context.fillStyle = '#182026';
  context.beginPath();
  context.arc(32, 30, 20, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 3.5;
  context.stroke();
  context.fillStyle = color;
  context.beginPath();
  context.arc(32, 30, 11, 0, Math.PI * 2);
  context.fill();
  outline(context);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(25, 46);
  context.lineTo(20, 58);
  context.lineTo(28, 53);
  context.lineTo(32, 48);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(39, 46);
  context.lineTo(44, 58);
  context.lineTo(36, 53);
  context.lineTo(32, 48);
  context.closePath();
  context.fill();
}

function drawCertification(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#1e293b';
  context.beginPath();
  context.rect(14, 10, 36, 44);
  context.fill();
  context.strokeStyle = '#38bdf8';
  context.lineWidth = 2.5;
  context.stroke();
  outline(context);

  context.fillStyle = '#38bdf8';
  context.fillRect(20, 18, 24, 4);
  context.fillRect(20, 26, 24, 3);
  context.fillRect(20, 33, 16, 3);

  context.fillStyle = '#f59e0b';
  context.beginPath();
  context.arc(32, 44, 5, 0, Math.PI * 2);
  context.fill();
}

export type ItemIconKind =
  | { kind: 'mineral'; mineral: MineralId }
  | { kind: 'tool'; weapon: WeaponId }
  | { kind: 'grenade'; tier: GrenadeTierId }
  | { kind: 'ladder' }
  | { kind: 'winch' }
  | { kind: 'field_depot' }
  | { kind: 'beacon' }
  | { kind: 'upgrade'; upgrade: UpgradeId }
  | { kind: 'employee'; role: EmployeeKind }
  | { kind: 'patent'; tier: number }
  | { kind: 'certification'; certId?: string };

export function itemIconUrl(item: ItemIconKind): string {
  switch (item.kind) {
    case 'mineral':
      return mineralIconUrl(item.mineral);
    case 'tool':
      return canvasFor(`tool-${item.weapon}`, (context) => {
        if (item.weapon === 'pickaxe') {
          drawPickaxe(context);
        } else if (item.weapon === 'tesla') {
          drawTesla(context);
        } else if (item.weapon === 'drill') {
          drawDrill(context);
        } else {
          drawShotgun(context);
        }
      });
    case 'grenade':
      return canvasFor(`grenade-${item.tier}`, (context) => drawGrenade(context, item.tier));
    case 'ladder':
      return canvasFor('ladder', drawLadder);
    case 'winch':
      return canvasFor('winch', drawWinch);
    case 'field_depot':
      return canvasFor('field_depot', drawFieldDepot);
    case 'beacon':
      return canvasFor('beacon', drawBeacon);
    case 'upgrade':
      return canvasFor(`upgrade-${item.upgrade}`, (context) =>
        drawUpgrade(context, item.upgrade),
      );
    case 'employee':
      return canvasFor(`employee-${item.role}`, (context) =>
        drawEmployee(context, item.role),
      );
    case 'patent':
      return canvasFor(`patent-${item.tier}`, (context) =>
        drawPatent(context, item.tier),
      );
    case 'certification':
      return canvasFor('cert-badge', drawCertification);
  }
}

export function itemIconKey(item: ItemIconKind): string {
  if (item.kind === 'mineral') {
    return `mineral-${item.mineral}`;
  }
  if (item.kind === 'tool') {
    return `tool-${item.weapon}`;
  }
  if (item.kind === 'grenade') {
    return `grenade-${item.tier}`;
  }
  if (item.kind === 'winch') {
    return 'winch';
  }
  if (item.kind === 'field_depot') {
    return 'field_depot';
  }
  if (item.kind === 'beacon') {
    return 'beacon';
  }
  if (item.kind === 'upgrade') {
    return `upgrade-${item.upgrade}`;
  }
  if (item.kind === 'employee') {
    return `employee-${item.role}`;
  }
  if (item.kind === 'patent') {
    return `patent-${item.tier}`;
  }
  if (item.kind === 'certification') {
    return `cert-${item.certId ?? 'badge'}`;
  }
  return 'ladder';
}

export function itemDisplayName(item: ItemIconKind): string {
  if (item.kind === 'mineral') {
    return item.mineral;
  }
  if (item.kind === 'tool') {
    return WEAPONS[item.weapon].name;
  }
  if (item.kind === 'grenade') {
    return GRENADE_TIERS[item.tier].name;
  }
  if (item.kind === 'winch') {
    return 'Cabria de contrapeso';
  }
  if (item.kind === 'field_depot') {
    return 'Tolva de campaña';
  }
  if (item.kind === 'beacon') {
    return 'Balizas de ruta';
  }
  if (item.kind === 'upgrade') {
    return item.upgrade;
  }
  if (item.kind === 'employee') {
    return item.role === 'collector' ? 'Recolector' : 'Minero';
  }
  if (item.kind === 'patent') {
    return `Patente ${item.tier}`;
  }
  return 'Escaleras de pared';
}
