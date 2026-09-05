import { useState } from 'react';
import { AccountMark } from '../../components/AccountMark';
import { KpiCardsIbkr } from '../kpis/KpiCardsIbkr';
import { PeriodSelector } from '../kpis/PeriodSelector';
import { useIbkrKpis } from '../kpis/useIbkrKpis';
import { MovimientosSection } from '../movimientos/MovimientosSection';
import { useAccountData } from '../movimientos/useAccountData';
import { InversionesSection } from '../inversiones/InversionesSection';
import { DEFAULT_RANGE_FILTER, type RangeFilter } from '../filters/RangeFilter';
import type { KpiPeriod } from '../../api/types';

export function IbkrView({ onDataChanged }: { onDataChanged: () => void }) {
  const [period, setPeriod] = useState<KpiPeriod>('mes');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(DEFAULT_RANGE_FILTER);
  const { kpi, reload: reloadKpis } = useIbkrKpis(period);
  const { data, reload: reloadData } = useAccountData('ibkr');

  function refreshAll() {
    reloadKpis();
    reloadData();
    onDataChanged();
  }

  return (
    <>
      <div className="account-hero">
        <AccountMark kind="ik" />
        <div>
          <h2>Tu cartera</h2>
          <p>Capital, carteras y puente con Openbank</p>
        </div>
        <div className="spacer" />
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>
      <div className="kpis">{kpi && <KpiCardsIbkr kpi={kpi} period={period} />}</div>

      {data && (
        <InversionesSection allData={data} filter={rangeFilter} onFilterChange={setRangeFilter} onDataChanged={refreshAll} />
      )}

      {data && <MovimientosSection account="ibkr" data={data} onDataChanged={refreshAll} />}
    </>
  );
}
