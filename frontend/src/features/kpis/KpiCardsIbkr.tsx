import type { IbkrKpis, KpiPeriod } from '../../api/types';
import { eur } from '../../lib/format';
import { kpiLabel } from './kpiLabel';
import { KpiDelta } from './KpiDelta';

export function KpiCardsIbkr({ kpi, period }: { kpi: IbkrKpis; period: KpiPeriod }) {
  const lbl = kpiLabel(period);
  return (
    <>
      <div className="kpi">
        <div className="kpi-label">Saldo</div>
        <div className="kpi-value">{eur(kpi.saldo)}</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">{`Aportado neto · ${lbl}`}</div>
        <div className={`kpi-value ${kpi.aportado >= 0 ? 'pos' : 'neg'}`}>{eur(kpi.aportado)}</div>
        <KpiDelta delta={kpi.aportadoDelta} />
      </div>
      <div className="kpi">
        <div className="kpi-label">En carteras</div>
        <div className="kpi-value">{eur(kpi.enCarteras)}</div>
        <div className="kpi-delta neu">
          {kpi.enCarterasCount ? `${kpi.enCarterasCount} abierta${kpi.enCarterasCount !== 1 ? 's' : ''}` : 'ninguna abierta'}
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">{`P&L cerrado · ${lbl}`}</div>
        <div className={`kpi-value ${kpi.pnl >= 0 ? 'pos' : 'neg'}`}>{eur(kpi.pnl)}</div>
        <KpiDelta delta={kpi.pnlDelta} />
      </div>
    </>
  );
}
