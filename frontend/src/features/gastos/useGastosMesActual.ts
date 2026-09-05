import { useCallback, useEffect, useState } from 'react';
import { fetchGastosMesActual } from '../../api/client';
import type { GastosMesActualReport } from '../../api/types';

// gastos-mes-actual no acepta filtro de rango -- siempre es el mes en
// curso (ver domain/services/gastos.py), por eso no usa useRangeReport.
export function useGastosMesActual() {
  const [report, setReport] = useState<GastosMesActualReport | null>(null);

  const reload = useCallback(() => {
    fetchGastosMesActual().then(setReport);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { report, reload };
}
