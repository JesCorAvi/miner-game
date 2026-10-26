const numberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

export function formatMoney(value: number): string {
  return `$ ${numberFormatter.format(Math.max(0, Math.round(value)))}`;
}

export function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`;
}

export function formatDepth(depth: number): string {
  return `${Math.max(0, Math.round(depth))} m`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
