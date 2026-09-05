import type { GastoAlert as GastoAlertData } from '../../api/types';
import { eur } from '../../lib/format';

export function GastoAlert({ alert }: { alert: GastoAlertData | null }) {
  if (!alert) return null;
  if (!alert.isWarning) {
    return (
      <div className="soft-alert ok">
        {`Gastos este mes ${eur(alert.curTotal)} · ${Math.abs(alert.pct).toFixed(0)}% por debajo de la media de los ${alert.monthsCount} meses anteriores (${eur(alert.avg)})`}
      </div>
    );
  }
  return (
    <div className="soft-alert warn">
      {`Gastos este mes ${eur(alert.curTotal)} · ${alert.pct.toFixed(0)}% por encima de la media de los ${alert.monthsCount} meses anteriores (${eur(alert.avg)})`}
    </div>
  );
}
