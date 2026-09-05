import { fetchTransferencias } from '../../api/client';
import type { RangeFilter } from '../filters/RangeFilter';
import { useRangeReport } from '../filters/useRangeReport';
import { TransferenciasBody } from './TransferenciasBody';

interface Props {
  filter: RangeFilter;
  onOpenTransferModal: () => void;
}

export function TransferenciasSection({ filter, onOpenTransferModal }: Props) {
  const { report } = useRangeReport(fetchTransferencias, filter);

  if (!report) return null;

  return (
    <div className="section" style={{ marginBottom: 14, overflow: 'visible' }}>
      <div className="section-head">
        <span className="section-title">Transferencias · Openbank ↔ IBKR</span>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onOpenTransferModal}>
          ⇄ Nueva
        </button>
      </div>
      <TransferenciasBody report={report} />
    </div>
  );
}
