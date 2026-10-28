/**
 * PresentationBudget.ts — Presupuesto sensorial por frame (Sección 3.5.2).
 * Evita la saturación de partículas, luces dinámicas, voces de audio y temblor.
 */

export type SensoryEventType = 'spark' | 'debris' | 'light' | 'sound' | 'shake';

export const EVENT_COSTS: Record<SensoryEventType, number> = {
  spark: 1,
  debris: 2,
  sound: 3,
  shake: 4,
  light: 8,
};

export class PresentationBudget {
  private static readonly NORMAL_FRAME_TOKENS = 120;
  private static readonly MASSIVE_EXPLOSION_TOKENS = 60;
  private static readonly DEGRADED_FRAME_TOKENS = 60;
  private static readonly MAX_EVENT_DISTANCE = 60.0;

  private availableTokens = PresentationBudget.NORMAL_FRAME_TOKENS;
  private isMassiveExplosion = false;
  private degraded = false;

  resetFrame(massiveExplosion = false): void {
    this.isMassiveExplosion = massiveExplosion;
    const base = this.degraded ? PresentationBudget.DEGRADED_FRAME_TOKENS : PresentationBudget.NORMAL_FRAME_TOKENS;
    this.availableTokens = massiveExplosion
      ? PresentationBudget.MASSIVE_EXPLOSION_TOKENS
      : base;
  }

  setDegraded(degraded: boolean): void {
    this.degraded = degraded;
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  getConsumedTokens(): number {
    return Math.max(0, this.getMaxTokens() - this.availableTokens);
  }

  getMaxTokens(): number {
    if (this.isMassiveExplosion) return PresentationBudget.MASSIVE_EXPLOSION_TOKENS;
    return this.degraded ? PresentationBudget.DEGRADED_FRAME_TOKENS : PresentationBudget.NORMAL_FRAME_TOKENS;
  }

  request(type: SensoryEventType, count = 1, distance?: number): boolean {
    if (distance !== undefined && distance > PresentationBudget.MAX_EVENT_DISTANCE) {
      return false;
    }
    const cost = EVENT_COSTS[type] * count;
    if (this.availableTokens < cost) {
      return false;
    }
    this.availableTokens -= cost;
    return true;
  }

  getAvailableTokens(): number {
    return this.availableTokens;
  }

  isMassive(): boolean {
    return this.isMassiveExplosion;
  }
}

export const globalPresentationBudget = new PresentationBudget();
