import { useCallback, useEffect, useRef, useState } from 'react';
import type { RangeFilter } from './RangeFilter';

/** Fetch de un reporte filtrado por rango, con refetch automático al
 * cambiar el filtro (o cualquier valor en `extraDeps`, p.ej. gastosMode) y
 * un `reload()` explícito para tras una mutación (p.ej. cerrar una
 * posición). `fetcher` se lee de un ref para que un closure nuevo en cada
 * render del padre no dispare refetchs de más -- solo filter.type/
 * filter.year/extraDeps re-disparan el efecto. */
export function useRangeReport<T>(fetcher: (filter: RangeFilter) => Promise<T>, filter: RangeFilter, extraDeps: unknown[] = []) {
  const [report, setReport] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => {
    fetcherRef.current(filter).then(setReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.type, filter.year, ...extraDeps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { report, reload };
}
