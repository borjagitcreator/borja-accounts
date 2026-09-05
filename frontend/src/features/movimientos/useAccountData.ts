import { useCallback, useEffect, useState } from 'react';
import { fetchAccountData } from '../../api/client';
import type { Movement } from '../../api/types';

export function useAccountData(cuenta: string) {
  const [data, setData] = useState<Movement[] | null>(null);

  const reload = useCallback(() => {
    fetchAccountData(cuenta).then(setData);
  }, [cuenta]);

  useEffect(() => {
    setData(null);
    reload();
  }, [cuenta, reload]);

  return { data, reload };
}
