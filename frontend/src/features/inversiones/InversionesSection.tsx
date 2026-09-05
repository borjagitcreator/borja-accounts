import { useState } from 'react';
import { fetchCarteras } from '../../api/client';
import type { RangeFilter } from '../filters/RangeFilter';
import { useRangeReport } from '../filters/useRangeReport';
import { ClosePositionModal, type ClosePositionRequest } from '../positions/ClosePositionModal';
import { InversionesBody } from './InversionesBody';

interface Props {
  filter: RangeFilter;
  onDataChanged: () => void;
}

export function InversionesSection({ filter, onDataChanged }: Props) {
  const { report, reload } = useRangeReport(fetchCarteras, filter);
  const [closing, setClosing] = useState<ClosePositionRequest | null>(null);

  if (!report) return null;

  return (
    <div className="section" style={{ marginBottom: 14 }}>
      <div className="section-head">
        <span className="section-title">Análisis de carteras</span>
      </div>
      <InversionesBody report={report} onClosePosition={setClosing} />

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
