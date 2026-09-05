import type { AccountKpis, KpiPeriod, Patrimonio } from './types';

export async function fetchPatrimonio(): Promise<Patrimonio> {
  const res = await fetch('/api/patrimonio');
  return res.json();
}

export async function fetchAccountKpis(cuenta: string, period: KpiPeriod): Promise<AccountKpis> {
  const res = await fetch(`/api/accounts/${cuenta}/kpis?period=${encodeURIComponent(period)}`);
  return res.json();
}
