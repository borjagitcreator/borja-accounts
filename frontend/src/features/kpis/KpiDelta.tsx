import type { Delta } from '../../api/types';
import { eur } from '../../lib/format';

export function KpiDelta({ delta, inverse = false }: { delta: Delta; inverse?: boolean }) {
  const goodDir = inverse ? delta.diff <= 0 : delta.diff >= 0;
  if (delta.diff === 0) {
    return <div className="kpi-delta neu">= igual al período anterior</div>;
  }
  const cls = goodDir ? 'pos' : 'neg';
  const arrow = delta.diff > 0 ? '↑' : '↓';
  const sign = delta.diff > 0 ? '+' : '';
  return <div className={`kpi-delta ${cls}`}>{`${arrow} ${sign}${eur(delta.diff)} vs ant.`}</div>;
}
