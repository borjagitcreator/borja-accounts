import type { RankingMode } from '../../api/types';

export function RankingModeToggle({
  mode,
  onChange,
  btnClass,
}: {
  mode: RankingMode;
  onChange: (mode: RankingMode) => void;
  btnClass: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className={`fbtn ${btnClass} ${mode === 'media' ? 'active' : ''}`} onClick={() => onChange('media')}>
        Media/mes
      </button>
      <button className={`fbtn ${btnClass} ${mode === 'total' ? 'active' : ''}`} onClick={() => onChange('total')}>
        Total
      </button>
    </div>
  );
}
