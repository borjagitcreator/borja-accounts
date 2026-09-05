import { useCallback, useEffect, useState } from 'react';
import { fetchIbkrKpis } from '../../api/client';
import type { IbkrKpis, KpiPeriod } from '../../api/types';

export function useIbkrKpis(period: KpiPeriod) {
  const [kpi, setKpi] = useState<IbkrKpis | null>(null);

  const reload = useCallback(() => {
    fetchIbkrKpis(period).then(setKpi);
  }, [period]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { kpi, reload };
}
