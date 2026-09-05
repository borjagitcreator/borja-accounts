import type { KpiPeriod } from '../../api/types';

export function kpiLabel(period: KpiPeriod): string {
  if (period === 'trimestre') return 'últimos 3 meses';
  if (period === 'año') return 'este año';
  return 'este mes';
}
