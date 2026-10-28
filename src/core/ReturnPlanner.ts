import { formatTime } from '../ui/format';

export type ReturnRouteStatus = 'safe' | 'warning' | 'danger' | 'no_route';

export interface ReturnPlanResult {
  hasRoute: boolean;
  estimatedSeconds: number;
  status: ReturnRouteStatus;
  statusLabel: string;
  horizontalDistance: number;
  verticalDiff: number;
  bearingText: string;
  verticalText: string;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface LadderLike {
  x: number;
  y: number;
  z: number;
  height: number;
}

export interface WinchLike {
  x: number;
  topY: number;
  bottomY: number;
  z: number;
}

/**
 * Heurística inicial de retorno (Fase 1 / MVP).
 *
 * t_return = (longitudRuta / velocidadBase)
 *          + (desnivelPositivo / velocidadEscalada)
 *          + (nEscaleras * 0.8 s)
 *          + 1.0 s de margen
 * Factor de seguridad: 1.15.
 * Multiplicador de lastre si la mochila supera el 80 % de capacidad.
 */
export function estimateReturnTime(
  distanceHorizontal: number,
  verticalAscent: number,
  ladderCount: number,
  cargoWeight: number,
  maxCargoWeight: number,
  hasWinchAccess = false,
): number {
  const walkSpeed = 4.5;
  const climbSpeed = hasWinchAccess ? 8.0 : 3.3;
  const routeLength = Math.max(0, distanceHorizontal) * 1.2;
  const walkTime = routeLength / walkSpeed;
  const climbTime = Math.max(0, verticalAscent) / climbSpeed;
  const ladderTransitions = hasWinchAccess ? 0.5 : Math.max(0, ladderCount) * 0.8;
  let baseEstimate = walkTime + climbTime + ladderTransitions + 1.0;

  if (maxCargoWeight > 0) {
    const loadRatio = cargoWeight / maxCargoWeight;
    if (loadRatio > 0.8) {
      const ballast = 1.0 + Math.min(0.5, (loadRatio - 0.8) * 0.5);
      baseEstimate *= ballast;
    }
  }

  return Math.max(1, Math.round(baseEstimate * 1.15));
}

/**
 * Determina el icono de flecha direccional en función del ángulo relativo
 * entre la mirada del operario y la tolva en el plano XZ.
 */
export function computeBearingArrow(diffAngleRad: number): string {
  // Normalizar a [-PI, PI]
  let angle = diffAngleRad % (Math.PI * 2);
  if (angle > Math.PI) angle -= Math.PI * 2;
  if (angle < -Math.PI) angle += Math.PI * 2;

  const deg = (angle * 180) / Math.PI;
  if (deg >= -22.5 && deg <= 22.5) return '▲';
  if (deg > 22.5 && deg <= 67.5) return '↗';
  if (deg > 67.5 && deg <= 112.5) return '▶';
  if (deg > 112.5 && deg <= 157.5) return '↘';
  if (deg < -22.5 && deg >= -67.5) return '↖';
  if (deg < -67.5 && deg >= -112.5) return '◀';
  if (deg < -112.5 && deg >= -157.5) return '↙';
  return '▼';
}

export class ReturnPlanner {
  private lastCalculationTime = 0;
  private cachedResult: ReturnPlanResult = {
    hasRoute: true,
    estimatedSeconds: 2,
    status: 'safe',
    statusLabel: 'REGRESO 00:02',
    horizontalDistance: 0,
    verticalDiff: 0,
    bearingText: '▲ TOLVA 0 m',
    verticalText: '0 m',
  };

  calculate(
    now: number,
    playerPosition: Position3D,
    playerYaw: number,
    hopperPosition: Position3D,
    ladders: readonly LadderLike[],
    hasJetpack: boolean,
    cargoWeight: number,
    maxCargoWeight: number,
    timeLeft: number,
    force = false,
    winches: readonly WinchLike[] = [],
  ): ReturnPlanResult {
    if (!force && now - this.lastCalculationTime < 500) {
      return this.cachedResult;
    }
    this.lastCalculationTime = now;

    const dx = hopperPosition.x - playerPosition.x;
    const dz = hopperPosition.z - playerPosition.z;
    const horizontalDistance = Math.hypot(dx, dz);
    const verticalDiff = hopperPosition.y - playerPosition.y;
    const verticalAscent = Math.max(0, verticalDiff);

    const hasWinchAccess = winches.some(
      (w) => w.topY >= hopperPosition.y - 2.0 && w.bottomY <= playerPosition.y + 3.0,
    );
    const hasRoute = hasJetpack || verticalAscent <= 2.5 || ladders.length > 0 || hasWinchAccess;

    const nLaddersNeeded = Math.ceil(verticalAscent / 3.0);
    const effectiveLadders = hasJetpack ? 0 : nLaddersNeeded;
    const estimatedSeconds = estimateReturnTime(
      horizontalDistance,
      verticalAscent,
      effectiveLadders,
      cargoWeight,
      maxCargoWeight,
      hasWinchAccess,
    );

    let status: ReturnRouteStatus = 'safe';
    if (!hasRoute) {
      status = 'no_route';
    } else if (timeLeft < estimatedSeconds) {
      status = 'danger';
    } else if (timeLeft < estimatedSeconds * 1.35) {
      status = 'warning';
    }

    const statusLabel = hasRoute
      ? `REGRESO ${formatTime(estimatedSeconds)}`
      : 'SIN RUTA · BUSCA ESCALERA';

    // Cálculo del rumbo
    // En THREE.js, yaw = 0 mira hacia -Z. Conforme gira a la derecha, yaw disminuye o aumenta según convención.
    // Vector horizontal a la tolva: ángulo respecto a -Z
    const angleToHopper = Math.atan2(dx, -dz);
    const diffAngle = angleToHopper - playerYaw;
    const arrow = computeBearingArrow(diffAngle);
    const roundedDist = Math.max(0, Math.round(horizontalDistance));
    const bearingText = `${arrow} TOLVA ${roundedDist} m`;

    const roundedVert = Math.round(verticalDiff);
    const verticalSign = roundedVert > 0 ? '+' : '';
    const verticalText = `${verticalSign}${roundedVert} m`;

    this.cachedResult = {
      hasRoute,
      estimatedSeconds,
      status,
      statusLabel,
      horizontalDistance,
      verticalDiff,
      bearingText,
      verticalText,
    };

    if (verticalDiff < -4 && this.tripStartEstimate === null) {
      this.tripStartEstimate = estimatedSeconds;
      this.tripStartTime = now;
    }

    return this.cachedResult;
  }

  private lastRecordedErrorPercent = 8.5;
  private tripStartEstimate: number | null = null;
  private tripStartTime: number | null = null;

  recordTripArrival(): void {
    if (this.tripStartEstimate !== null && this.tripStartTime !== null) {
      const elapsed = Math.max(1, (performance.now() - this.tripStartTime) / 1000);
      this.lastRecordedErrorPercent = Math.min(
        99.9,
        (Math.abs(elapsed - this.tripStartEstimate) / elapsed) * 100,
      );
      this.tripStartEstimate = null;
      this.tripStartTime = null;
    }
  }

  getLastErrorPercent(): number {
    return this.lastRecordedErrorPercent;
  }
}
