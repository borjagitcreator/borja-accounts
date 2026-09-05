import type { KpiPeriod } from '../../api/types';

const OPTIONS: { value: KpiPeriod; label: string }[] = [
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'año', label: 'Año' },
];

export function PeriodSelector({ period, onChange }: { period: KpiPeriod; onChange: (period: KpiPeriod) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`fbtn kpi-period-btn ${period === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
