import { HOPPER_POSITION, PIT_SIZE, layerAtDepth } from '../config';
import type {
  NetworkBeaconState,
  NetworkFieldDepotState,
  NetworkWinchState,
} from '../types';

export interface GalleryMapData {
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  winches: NetworkWinchState[];
  fieldDepots: NetworkFieldDepotState[];
  beacons: NetworkBeaconState[];
  carvePoints?: Array<{ x: number; z: number; r: number }>;
  hasMapCert?: boolean;
}

export class GalleryMap {
  private visible = false;
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly depthLabel: HTMLElement;
  private lastRenderTime = 0;

  constructor() {
    this.container = document.getElementById('gallery-map-overlay') as HTMLElement;
    this.canvas = document.getElementById('gallery-map-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas?.getContext('2d')!;
    this.depthLabel = document.getElementById('gallery-map-depth-info') as HTMLElement;

    const closeBtn = document.getElementById('gallery-map-close');
    closeBtn?.addEventListener('click', () => this.hide());
  }

  toggle(): boolean {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  show(): void {
    this.visible = true;
    if (this.container) {
      this.container.removeAttribute('hidden');
      this.container.style.display = 'flex';
    }
  }

  hide(): void {
    this.visible = false;
    if (this.container) {
      this.container.setAttribute('hidden', '');
      this.container.style.display = 'none';
    }
  }

  isOpen(): boolean {
    return this.visible;
  }

  render(data: GalleryMapData): void {
    if (!this.visible) {
      return;
    }
    const now = performance.now();
    if (now - this.lastRenderTime < 100) {
      // Throttle a 10 Hz
      return;
    }
    this.lastRenderTime = now;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const halfPit = PIT_SIZE * 0.5;

    // Actualizar texto de cota
    const depth = Math.max(0, -data.playerY);
    const layer = layerAtDepth(depth);
    this.depthLabel.textContent = `COTA: -${depth.toFixed(1)} m · ${layer.name}${
      data.hasMapCert ? ' · [PLANO CARTOGRÁFICO DE ALTA PRECISIÓN]' : ''
    }`;

    // Limpiar fondo
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Dibujar cuadrícula de prospección
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const step = width / 8;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Perímetro del pozo (48x48 m)
    const margin = 16;
    const mapW = width - margin * 2;
    const mapH = height - margin * 2;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, mapW, mapH);

    // Helper de conversión mundo -> canvas
    const worldToMap = (wx: number, wz: number): { x: number; y: number } => {
      const u = (wx + halfPit) / PIT_SIZE;
      const v = (wz + halfPit) / PIT_SIZE;
      return {
        x: margin + Math.max(0, Math.min(1, u)) * mapW,
        y: margin + Math.max(0, Math.min(1, v)) * mapH,
      };
    };

    // Dibujar carves/excavaciones exploradas
    if (data.carvePoints && data.carvePoints.length > 0) {
      ctx.fillStyle = data.hasMapCert ? 'rgba(56, 189, 248, 0.40)' : 'rgba(79, 209, 197, 0.22)';
      for (const pt of data.carvePoints) {
        const p = worldToMap(pt.x, pt.z);
        const radius = (pt.r / PIT_SIZE) * mapW;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Línea guía vectorial hacia la tolva si tiene certificación
    const playerPos = worldToMap(data.playerX, data.playerZ);
    const hopperPos = worldToMap(HOPPER_POSITION.x, HOPPER_POSITION.z);
    if (data.hasMapCert) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(playerPos.x, playerPos.y);
      ctx.lineTo(hopperPos.x, hopperPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tolva principal (H)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(hopperPos.x, hopperPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', hopperPos.x, hopperPos.y);

    // Cabrias (W)
    ctx.fillStyle = '#38bdf8';
    for (const winch of data.winches) {
      const p = worldToMap(winch.x, winch.z);
      ctx.beginPath();
      ctx.rect(p.x - 5, p.y - 5, 10, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillText('W', p.x, p.y);
      ctx.fillStyle = '#38bdf8';
    }

    // Tolvas de campaña (D)
    ctx.fillStyle = '#f59e0b';
    for (const depot of data.fieldDepots) {
      const p = worldToMap(depot.x, depot.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillText('D', p.x, p.y);
      ctx.fillStyle = '#f59e0b';
    }

    // Balizas (B)
    for (const beacon of data.beacons) {
      const p = worldToMap(beacon.x, beacon.z);
      ctx.fillStyle = '#' + beacon.color.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jugador (Flecha con ángulo)
    ctx.save();
    ctx.translate(playerPos.x, playerPos.y);
    ctx.rotate(-data.playerYaw + Math.PI);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
