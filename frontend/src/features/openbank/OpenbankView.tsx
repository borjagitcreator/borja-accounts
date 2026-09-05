import { forwardRef, useImperativeHandle, useState } from 'react';
import { AccountMark } from '../../components/AccountMark';
import { KpiCards } from '../kpis/KpiCards';
import { PeriodSelector } from '../kpis/PeriodSelector';
import { useAccountKpis } from '../kpis/useAccountKpis';
import { MovimientosSection } from '../movimientos/MovimientosSection';
import { useAccountData } from '../movimientos/useAccountData';
import { ApuestasSection } from '../apuestas/ApuestasSection';
import { DEFAULT_RANGE_FILTER, type RangeFilter } from '../filters/RangeFilter';
import type { AccountViewHandle } from '../shared/viewHandle';
import type { KpiPeriod } from '../../api/types';

export const OpenbankView = forwardRef<AccountViewHandle, { onDataChanged: () => void }>(function OpenbankView(
  { onDataChanged },
  ref,
) {
  const [period, setPeriod] = useState<KpiPeriod>('mes');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(DEFAULT_RANGE_FILTER);
  const { kpi, reload: reloadKpis } = useAccountKpis('openbank', period);
  const { data, reload: reloadData } = useAccountData('openbank');

  function refreshAll() {
    reloadKpis();
    reloadData();
    onDataChanged();
  }

  useImperativeHandle(ref, () => ({ refreshAll }));

  return (
    <>
      <div className="account-hero">
        <AccountMark kind="ob" />
        <div>
          <h2>Openbank</h2>
          <p>Día a día · gastos, nómina y apuestas</p>
        </div>
        <div className="spacer" />
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>
      <div className="kpis">{kpi && <KpiCards kpi={kpi} period={period} />}</div>

      {data && <ApuestasSection allData={data} filter={rangeFilter} onFilterChange={setRangeFilter} onDataChanged={refreshAll} />}

      {data && <MovimientosSection account="openbank" data={data} onDataChanged={refreshAll} />}
    </>
  );
});
