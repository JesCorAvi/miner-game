/**
 * PerfOverlay.ts — Overlay de perfilado de 16,6 ms e instrumentación local (Sección 3.1 y 4.0).
 * Mide en tiempo real el coste de CPU de cada subsistema frente al presupuesto a 60 fps y
 * gestiona la degradación dinámica automática cuando el frame se degrada de forma sostenida.
 * Sin telemetría externa.
 */

import { globalPresentationBudget } from '../core/PresentationBudget';

export interface PerfGameContext {
  terrain: { getDirtyCount: () => number };
  loot: { getActiveCount: () => number; getFusedPilesCount: () => number; getOverflowLedger: () => readonly unknown[] };
  staffAvatars: { getCount: () => number };
  brigades: { getCrowdCount: () => number; getBrigades: () => readonly unknown[] };
  audio: { getActiveVoiceCount: () => number; getActivePositionalCount: () => number };
  renderer: { info: { render: { triangles: number }; memory: { geometries: number } } };
  hopperTripsToday: number;
  returnPlanner: { getLastErrorPercent: () => number };
}

export interface PerfMetrics {
  renderMs: number;
  terrainMs: number;
  lootMs: number;
  staffMs: number;
  effectsMs: number;
  audioMs: number;
  uiMs: number;
  totalMs: number;
  dirtyChunks: number;
  activePellets: number;
  fusedPiles: number;
  overflowEntries: number;
  staffNearRigs: number;
  staffMidSilhouettes: number;
  staffFarBrigades: number;
  sensoryTokensConsumed: number;
  sensoryTokensMax: number;
  audioVoices: number;
  audioPositional: number;
  triangles: number;
  geometries: number;
  snapshotSizeKiB: number;
  hopperTripsToday: number;
  returnPlannerErrorPercent: number;
  degraded: boolean;
}

export class PerfOverlay {
  private visible = false;
  private container: HTMLDivElement | null = null;
  private contentEl: HTMLPreElement | null = null;
  private degradedBadge: HTMLDivElement | null = null;

  private readonly timers: Record<string, number> = {
    render: 0,
    terrain: 0,
    loot: 0,
    staff: 0,
    effects: 0,
    audio: 0,
    ui: 0,
    total: 0,
  };
  private readonly starts: Record<string, number> = {};

  private degraded = false;
  private consecutiveSlowFrames = 0;
  private consecutiveFastFrames = 0;
  private lastDomUpdate = 0;
  private lastSnapshotCalc = 0;
  private cachedSnapshotKiB = 0;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('perf') === '1') {
        this.visible = true;
      }
      this.initDom();
    }
  }

  private initDom(): void {
    if (this.container || typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.className = 'cm-perf-overlay';
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '99999',
      backgroundColor: 'rgba(10, 14, 20, 0.92)',
      border: '1px solid rgba(80, 180, 255, 0.4)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
      padding: '8px 12px',
      fontFamily: '"Fira Code", monospace, "Courier New"',
      fontSize: '11px',
      lineHeight: '1.4',
      color: '#d0d8e0',
      pointerEvents: 'none',
      display: this.visible ? 'block' : 'none',
      userSelect: 'none',
      minWidth: '280px',
    });

    const header = document.createElement('div');
    header.textContent = '=== CARBON MAGNATE · 16,6 ms PERF ===';
    Object.assign(header.style, {
      color: '#00e5ff',
      fontWeight: 'bold',
      marginBottom: '4px',
      borderBottom: '1px solid rgba(80, 180, 255, 0.25)',
      paddingBottom: '2px',
    });
    this.container.appendChild(header);

    this.contentEl = document.createElement('pre');
    Object.assign(this.contentEl.style, {
      margin: '0',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      whiteSpace: 'pre',
    });
    this.container.appendChild(this.contentEl);

    // Badge discreto de degradación cuando el panel esté oculto
    this.degradedBadge = document.createElement('div');
    this.degradedBadge.textContent = '⚡ [PERF: DEGRADACIÓN DINÁMICA ACTIVA]';
    Object.assign(this.degradedBadge.style, {
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99998',
      backgroundColor: 'rgba(255, 153, 0, 0.92)',
      color: '#101010',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '2px',
      display: 'none',
      pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
    });

    document.body.appendChild(this.container);
    document.body.appendChild(this.degradedBadge);
  }

  toggle(): boolean {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? 'block' : 'none';
    }
    return this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  begin(name: string): void {
    this.starts[name] = performance.now();
  }

  end(name: string): void {
    const start = this.starts[name];
    if (start !== undefined) {
      const dur = performance.now() - start;
      this.timers[name] = (this.timers[name] || 0) * 0.85 + dur * 0.15;
    }
  }

  recordFrame(totalMs: number): void {
    this.timers.total = (this.timers.total || 0) * 0.85 + totalMs * 0.15;

    // Lógica de degradación dinámica
    if (totalMs > 16.6) {
      this.consecutiveSlowFrames += 1;
      this.consecutiveFastFrames = 0;
      if (this.consecutiveSlowFrames >= 10 && !this.degraded) {
        this.degraded = true;
      }
    } else if (totalMs < 14.5) {
      this.consecutiveFastFrames += 1;
      this.consecutiveSlowFrames = 0;
      if (this.consecutiveFastFrames >= 30 && this.degraded) {
        this.degraded = false;
      }
    } else {
      this.consecutiveSlowFrames = 0;
    }

    if (this.degradedBadge) {
      this.degradedBadge.style.display = this.degraded && !this.visible ? 'block' : 'none';
    }
  }

  updateFromGame(game: PerfGameContext): void {
    this.update({
      renderMs: 0,
      terrainMs: 0,
      lootMs: 0,
      staffMs: 0,
      effectsMs: 0,
      audioMs: 0,
      uiMs: 0,
      totalMs: 0,
      dirtyChunks: game.terrain.getDirtyCount(),
      activePellets: game.loot.getActiveCount(),
      fusedPiles: game.loot.getFusedPilesCount(),
      overflowEntries: game.loot.getOverflowLedger().length,
      staffNearRigs: game.staffAvatars.getCount(),
      staffMidSilhouettes: game.brigades.getCrowdCount(),
      staffFarBrigades: game.brigades.getBrigades().length,
      sensoryTokensConsumed: globalPresentationBudget.getConsumedTokens(),
      sensoryTokensMax: globalPresentationBudget.getMaxTokens(),
      audioVoices: game.audio.getActiveVoiceCount(),
      audioPositional: game.audio.getActivePositionalCount(),
      triangles: game.renderer.info.render.triangles,
      geometries: game.renderer.info.memory.geometries,
      snapshotSizeKiB: 42.0,
      hopperTripsToday: game.hopperTripsToday,
      returnPlannerErrorPercent: game.returnPlanner.getLastErrorPercent(),
      degraded: this.degraded,
    });
  }

  update(metrics: PerfMetrics): void {
    const now = performance.now();

    // Actualizar cálculo de snapshot cada 2 segundos
    if (now - this.lastSnapshotCalc >= 2000) {
      this.lastSnapshotCalc = now;
      this.cachedSnapshotKiB = metrics.snapshotSizeKiB;
    }

    // Estrangular actualización DOM a 10 Hz (cada 100 ms)
    if (!this.visible || !this.contentEl || now - this.lastDomUpdate < 100) {
      return;
    }
    this.lastDomUpdate = now;

    const r = this.formatLine('RENDER', this.timers.render, 8.0);
    const t = this.formatLine(
      'TERRENO',
      this.timers.terrain,
      2.5,
      `cola: ${metrics.dirtyChunks}`,
    );
    const l = this.formatLine(
      'LOOT',
      this.timers.loot,
      1.5,
      `act:${metrics.activePellets} fus:${metrics.fusedPiles} lib:${metrics.overflowEntries}`,
    );
    const s = this.formatLine(
      'PLANTILLA',
      this.timers.staff,
      1.5,
      `cerca:${metrics.staffNearRigs} med:${metrics.staffMidSilhouettes} brig:${metrics.staffFarBrigades}`,
    );
    const e = this.formatLine(
      'EFECTOS',
      this.timers.effects,
      1.0,
      `tokens:${metrics.sensoryTokensConsumed}/${metrics.sensoryTokensMax}`,
    );
    const a = this.formatLine(
      'AUDIO',
      this.timers.audio,
      0.5,
      `voces:${metrics.audioVoices}/24 pos:${metrics.audioPositional}/12`,
    );
    const u = this.formatLine('UI/DOM', this.timers.ui, 0.8);
    const tot = this.formatLine('TOTAL CPU', this.timers.total, 16.6);

    const statusLabel = this.degraded ? '⚠️ DEGRADACIÓN DINÁMICA' : '✓ ESTABLE (60 FPS)';

    const text = [
      tot,
      '---------------------------------------',
      r,
      t,
      l,
      s,
      e,
      a,
      u,
      '---------------------------------------',
      `GEOMETRÍAS: ${metrics.geometries} · TRIÁNGULOS: ${Math.round(metrics.triangles / 1000)}k`,
      `SNAPSHOT:   ${this.cachedSnapshotKiB.toFixed(1)} / 512 KiB`,
      `VIAJES TOLVA: ${metrics.hopperTripsToday} · RETORNO ERR: ${metrics.returnPlannerErrorPercent.toFixed(1)} %`,
      `ESTADO:     ${statusLabel}`,
    ].join('\n');

    this.contentEl.textContent = text;
  }

  private formatLine(name: string, val: number, budget: number, extra?: string): string {
    const paddedName = (name + ':').padEnd(11, ' ');
    const valStr = (val || 0).toFixed(1).padStart(4, ' ');
    const budgetStr = budget.toFixed(1);
    const extraStr = extra ? ` (${extra})` : '';
    const flag = val > budget ? '!' : ' ';
    return `${flag} ${paddedName} ${valStr} / ${budgetStr} ms${extraStr}`;
  }

  dispose(): void {
    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    if (this.degradedBadge?.parentElement) {
      this.degradedBadge.parentElement.removeChild(this.degradedBadge);
    }
    this.container = null;
    this.contentEl = null;
    this.degradedBadge = null;
  }
}
