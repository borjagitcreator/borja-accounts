import { useState } from 'react';
import { AccountMark } from '../../components/AccountMark';
import { KpiCards } from '../kpis/KpiCards';
import { PeriodSelector } from '../kpis/PeriodSelector';
import { useAccountKpis } from '../kpis/useAccountKpis';
import type { KpiPeriod } from '../../api/types';

export function OpenbankView() {
  const [period, setPeriod] = useState<KpiPeriod>('mes');
  const kpi = useAccountKpis('openbank', period);

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
    </>
  );
}
