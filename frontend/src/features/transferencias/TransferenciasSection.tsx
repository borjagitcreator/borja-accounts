import { fetchTransferencias } from '../../api/client';
import type { Movement } from '../../api/types';
import { RangeFilterBar } from '../filters/RangeFilterBar';
import type { RangeFilter } from '../filters/RangeFilter';
import { useRangeReport } from '../filters/useRangeReport';
import { TransferenciasBody } from './TransferenciasBody';

interface Props {
  allData: Movement[];
  filter: RangeFilter;
  onFilterChange: (f: RangeFilter) => void;
  onOpenTransferModal: () => void;
}

export function TransferenciasSection({ allData, filter, onFilterChange, onOpenTransferModal }: Props) {
  const { report } = useRangeReport(fetchTransferencias, filter);

  if (!report) return null;

  return (
    <div className="section" style={{ marginBottom: 14, overflow: 'visible' }}>
      <div className="section-head">
        <span className="section-title">Transferencias · Openbank ↔ IBKR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RangeFilterBar data={allData} filter={filter} onChange={onFilterChange} />
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onOpenTransferModal}>
            ⇄ Nueva
          </button>
        </div>
      </div>
      <TransferenciasBody report={report} />
    </div>
  );
}
