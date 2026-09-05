export function eur(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '€';
}
