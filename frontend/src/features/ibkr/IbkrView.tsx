import { forwardRef, useImperativeHandle, useState } from 'react';
import { AccountMark } from '../../components/AccountMark';
import { fetchSaldoEvolucion, fetchCarterasRanking } from '../../api/client';
import { KpiCardsIbkr } from '../kpis/KpiCardsIbkr';
import { PeriodSelector } from '../kpis/PeriodSelector';
import { useIbkrKpis } from '../kpis/useIbkrKpis';
import { MovimientosSection } from '../movimientos/MovimientosSection';
import { useAccountData } from '../movimientos/useAccountData';
import { InversionesSection } from '../inversiones/InversionesSection';
import { TransferenciasSection } from '../transferencias/TransferenciasSection';
import { DEFAULT_RANGE_FILTER, type RangeFilter } from '../filters/RangeFilter';
import { RangeFilterBar } from '../filters/RangeFilterBar';
import { useRangeReport } from '../filters/useRangeReport';
import { SaldoChart } from '../charts/SaldoChart';
import { CarterasChart } from '../charts/CarterasChart';
import { RankingModeToggle } from '../charts/RankingModeToggle';
import type { AccountViewHandle } from '../shared/viewHandle';
import type { KpiPeriod, RankingMode } from '../../api/types';

interface Props {
  onDataChanged: () => void;
  onOpenTransferModal: () => void;
}

export const IbkrView = forwardRef<AccountViewHandle, Props>(function IbkrView({ onDataChanged, onOpenTransferModal }, ref) {
  const [period, setPeriod] = useState<KpiPeriod>('mes');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(DEFAULT_RANGE_FILTER);
  const [carterasMode, setCarterasMode] = useState<RankingMode>('total');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { kpi, reload: reloadKpis } = useIbkrKpis(period);
  const { data, reload: reloadData } = useAccountData('ibkr');
  const { report: saldoReport, reload: reloadSaldo } = useRangeReport((f) => fetchSaldoEvolucion('ibkr', f), rangeFilter);
  const { report: carterasReport, reload: reloadCarterasRanking } = useRangeReport(
    (f) => fetchCarterasRanking(f, carterasMode),
    rangeFilter,
    [carterasMode],
  );

  function refreshAll() {
    reloadKpis();
    reloadData();
    reloadSaldo();
    reloadCarterasRanking();
    setRefreshCounter((c) => c + 1);
    onDataChanged();
  }

  useImperativeHandle(ref, () => ({ refreshAll }));

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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <RangeFilterBar data={data} filter={rangeFilter} onChange={setRangeFilter} />
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-label">Evolución del saldo</div>
          <div style={{ height: 280 }}>{saldoReport && <SaldoChart account="ibkr" report={saldoReport} />}</div>
        </div>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="chart-label" style={{ marginBottom: 0 }}>
              Capital por cartera
            </div>
            <RankingModeToggle mode={carterasMode} onChange={setCarterasMode} btnClass="carteras-mode-btn" />
          </div>
          <div style={{ height: 280 }}>{carterasReport && <CarterasChart report={carterasReport} />}</div>
        </div>
      </div>

      {data && <TransferenciasSection key={refreshCounter} filter={rangeFilter} onOpenTransferModal={onOpenTransferModal} />}

      <InversionesSection filter={rangeFilter} onDataChanged={refreshAll} />

      {data && <MovimientosSection account="ibkr" data={data} onDataChanged={refreshAll} />}
    </>
  );
});
