import { useState } from 'react';
import { fetchApuestas } from '../../api/client';
import type { RangeFilter } from '../filters/RangeFilter';
import { useRangeReport } from '../filters/useRangeReport';
import { ClosePositionModal, type ClosePositionRequest } from '../positions/ClosePositionModal';
import { ApuestasBody } from './ApuestasBody';

interface Props {
  filter: RangeFilter;
  onDataChanged: () => void;
}

// El filtro de rango se muestra una única vez a nivel de vista (ver
// OpenbankView) -- ver docs/ARCHITECTURE.md §0, "filtro único global".
export function ApuestasSection({ filter, onDataChanged }: Props) {
  const { report, reload } = useRangeReport(fetchApuestas, filter);
  const [closing, setClosing] = useState<ClosePositionRequest | null>(null);

  if (!report) return null;

  return (
    <div className="section" style={{ marginBottom: 14 }}>
      <div className="section-head">
        <span className="section-title">Análisis de Apuestas</span>
      </div>
      <ApuestasBody report={report} onClosePosition={setClosing} />

      <ClosePositionModal
        request={closing}
        onClose={() => setClosing(null)}
        onSaved={() => {
          reload();
          onDataChanged();
        }}
      />
    </div>
  );
}
