import type { AccountKpis, KpiPeriod } from '../../api/types';
import { eur } from '../../lib/format';
import { kpiLabel } from './kpiLabel';
import { KpiDelta } from './KpiDelta';

export function KpiCards({ kpi, period }: { kpi: AccountKpis; period: KpiPeriod }) {
  const lbl = kpiLabel(period);
  return (
    <>
      <div className="kpi">
        <div className="kpi-label">Saldo actual</div>
        <div className="kpi-value">{eur(kpi.saldo)}</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">{`Ingresos · ${lbl}`}</div>
        <div className="kpi-value pos">{eur(kpi.ingresos)}</div>
        <KpiDelta delta={kpi.ingresosDelta} />
      </div>
      <div className="kpi">
        <div className="kpi-label">{`Gastos · ${lbl}`}</div>
        <div className="kpi-value neg">{eur(kpi.gastos)}</div>
        <KpiDelta delta={kpi.gastosDelta} inverse />
      </div>
      <div className="kpi">
        <div className="kpi-label">{`Balance · ${lbl}`}</div>
        <div className={`kpi-value ${kpi.balance >= 0 ? 'pos' : 'neg'}`}>{eur(kpi.balance)}</div>
        <KpiDelta delta={kpi.balanceDelta} />
      </div>
    </>
  );
}
