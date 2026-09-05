import { useEffect, useState } from 'react';
import { fetchAccountKpis } from '../../api/client';
import type { AccountKpis, KpiPeriod } from '../../api/types';

export function useAccountKpis(cuenta: string, period: KpiPeriod) {
  const [kpi, setKpi] = useState<AccountKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccountKpis(cuenta, period).then((data) => {
      if (!cancelled) setKpi(data);
    });
    return () => {
      cancelled = true;
    };
  }, [cuenta, period]);

  return kpi;
}
