import type { ClosedInvestPosition, OpenInvestPosition, PortfolioReport } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { SectionKpis, type SectionKpiItem } from '../../components/SectionKpis';
import { eur, fd } from '../../lib/format';
import type { ClosePositionRequest } from '../positions/ClosePositionModal';

function sectionKpis(report: PortfolioReport): SectionKpiItem[] {
  return [
    {
      label: 'Total en carteras',
      value: eur(report.totalInv),
      sub: `${report.totalCarteras} cartera${report.totalCarteras !== 1 ? 's' : ''}`,
    },
    {
      label: 'P&L neto',
      value: eur(report.totalPnL),
      valueClass: report.totalPnL >= 0 ? 'num-pos' : 'num-neg',
    },
    {
      label: 'ROI total',
      value: report.closedCount ? `${report.totalRoi.toFixed(2)}%` : '—',
      valueClass: report.closedCount ? (report.totalRoi >= 0 ? 'num-pos' : 'num-neg') : '',
      sub: report.closedCount ? `${report.closedCount} cerrada${report.closedCount !== 1 ? 's' : ''}` : undefined,
    },
    {
      label: 'Abiertas ahora',
      value: report.openCount ? `${report.openCount} cart.` : '—',
      valueStyle: report.openCount ? { color: 'var(--accent)' } : undefined,
      sub: report.openCount ? eur(report.openTotal) : undefined,
    },
  ];
}

const openColumns = (onClose: (req: ClosePositionRequest) => void): Column<OpenInvestPosition>[] => [
  { header: 'Cartera', render: (p) => <b>{p.concepto}</b> },
  { header: 'Inicio', render: (p) => fd(p.fi), cellClass: () => 'nowrap' },
  { header: 'Capital', headerClass: 'r', render: (p) => eur(p.invertido), cellClass: () => 'r' },
  {
    header: 'Acción',
    headerClass: 'r',
    cellClass: () => 'r',
    render: (p) => (
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, padding: '3px 10px', whiteSpace: 'nowrap' }}
        onClick={() => onClose({ tipo: 'Inversión', concepto: p.concepto, monto: p.invertido })}
      >
        Cerrar
      </button>
    ),
  },
];

const closedColumns: Column<ClosedInvestPosition>[] = [
  { header: 'Cartera', render: (r) => r.Concepto, cellClass: () => 'nowrap' },
  { header: 'Inicio', render: (r) => fd(r.fi), cellClass: () => 'nowrap' },
  { header: 'Cierre', render: (r) => fd(r.fr), cellClass: () => 'nowrap' },
  { header: 'Capital', headerClass: 'r', render: (r) => eur(r.invertido), cellClass: () => 'r' },
  { header: 'Devuelto', headerClass: 'r', render: (r) => eur(r.devuelto), cellClass: () => 'r' },
  { header: 'Balance', headerClass: 'r', render: (r) => eur(r.bal), cellClass: (r) => `r ${r.bal >= 0 ? 'num-pos' : 'num-neg'}` },
  {
    header: 'ROI',
    headerClass: 'r',
    render: (r) => `${r.roi.toFixed(2)}%`,
    cellClass: (r) => `r ${r.roi >= 0 ? 'num-pos' : 'num-neg'}`,
  },
  // Bal. Hist. / ROI Hist. eliminadas -- ver docs/ARCHITECTURE.md §0.
];

interface Props {
  report: PortfolioReport;
  onClosePosition: (req: ClosePositionRequest) => void;
}

/** Equivalente exacto de inversionesBody() en el vanilla -- ver el mismo
 * comentario en ApuestasBody.tsx sobre por qué esto vive separado de la
 * sección con título + filtro. */
export function InversionesBody({ report, onClosePosition }: Props) {
  if (!report.openCount && !report.closedCount) {
    return <div className="empty">No hay carteras registradas todavía.</div>;
  }
  return (
    <>
      <SectionKpis items={sectionKpis(report)} />

      {report.openCount > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="open-pos-header">{`● Carteras abiertas · ${report.openCount}`}</div>
          <div style={{ overflowX: 'auto' }}>
            <DataTable columns={openColumns(onClosePosition)} rows={report.openPositions} rowKey={(p) => p.concepto} />
          </div>
        </div>
      )}

      {report.closedPositions.length > 0 && (
        <div>
          <div className="closed-pos-header">{`Historial de carteras · ${report.closedPositions.length}`}</div>
          <div style={{ overflowX: 'auto' }}>
            <DataTable columns={closedColumns} rows={report.closedPositions} rowKey={(r, i) => `${r.Concepto}-${i}`} />
          </div>
        </div>
      )}
    </>
  );
}
