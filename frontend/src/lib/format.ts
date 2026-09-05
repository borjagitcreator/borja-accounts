export function eur(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '€';
}

// Parsea solo los componentes de fecha y construye un Date local -- nunca
// Date(string), que en TZ Europe/Madrid puede cruzar medianoche hacia atrás
// (ver el fix del bug de zona horaria en domain/services/kpi.py).
export function fd(s: string | null | undefined): string {
  if (!s) return '—';
  const [y, mo, d] = s.replace('T', ' ').split(' ')[0].split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
