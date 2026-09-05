import type { BettingReport, ClosedBetPosition, OpenBetPosition } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { SectionKpis, type SectionKpiItem } from '../../components/SectionKpis';
import { eur, fd } from '../../lib/format';
import type { ClosePositionRequest } from '../positions/ClosePositionModal';

function sectionKpis(report: BettingReport): SectionKpiItem[] {
  return [
    {
      label: 'Total apostado',
      value: eur(report.totalApostado),
      sub: `${report.totalBets} apuesta${report.totalBets !== 1 ? 's' : ''}`,
    },
    {
      label: 'P&L neto',
      value: eur(report.totalPnL),
      valueClass: report.totalPnL >= 0 ? 'num-pos' : 'num-neg',
    },
    {
      label: 'Win rate',
      value: report.closedCount ? `${report.winRate.toFixed(1)}%` : '—',
      valueClass: report.closedCount ? (report.winRate >= 50 ? 'num-pos' : 'num-neg') : '',
      sub: report.closedCount ? `${report.wins} de ${report.closedCount} cerradas` : undefined,
    },
    {
      label: 'En juego ahora',
      value: report.openCount ? `${report.openCount} pos.` : '—',
      valueStyle: report.openCount ? { color: 'var(--blue)' } : undefined,
      sub: report.openCount ? eur(report.openTotal) : undefined,
    },
  ];
}

const openColumns = (onClose: (req: ClosePositionRequest) => void): Column<OpenBetPosition>[] => [
  { header: 'Concepto', render: (p) => <b>{p.concepto}</b> },
  { header: 'Inicio', render: (p) => fd(p.fi), cellClass: () => 'nowrap' },
  { header: 'Banca', headerClass: 'r', render: (p) => eur(p.banca), cellClass: () => 'r' },
  {
    header: 'Acción',
    headerClass: 'r',
    cellClass: () => 'r',
    render: (p) => (
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, padding: '3px 10px', whiteSpace: 'nowrap' }}
        onClick={() => onClose({ tipo: 'Apuestas', concepto: p.concepto, monto: p.banca })}
      >
        Cerrar
      </button>
    ),
  },
];

const closedColumns: Column<ClosedBetPosition>[] = [
  { header: 'Concepto', render: (r) => r.Concepto, cellClass: () => 'nowrap' },
  { header: 'Inicio', render: (r) => fd(r.fi), cellClass: () => 'nowrap' },
  { header: 'Cierre', render: (r) => fd(r.fr), cellClass: () => 'nowrap' },
  { header: 'Banca', headerClass: 'r', render: (r) => eur(r.banca), cellClass: () => 'r' },
  { header: 'Devuelto', headerClass: 'r', render: (r) => eur(r.devuelto), cellClass: () => 'r' },
  { header: 'Balance', headerClass: 'r', render: (r) => eur(r.bal), cellClass: (r) => `r ${r.bal >= 0 ? 'num-pos' : 'num-neg'}` },
  {
    header: 'Crec.',
    headerClass: 'r',
    render: (r) => `${r.crec.toFixed(2)}%`,
    cellClass: (r) => `r ${r.crec >= 0 ? 'num-pos' : 'num-neg'}`,
  },
  // Bal. Hist. / Crec. Hist. eliminadas -- ver docs/ARCHITECTURE.md §0.
];

interface Props {
  report: BettingReport;
  onClosePosition: (req: ClosePositionRequest) => void;
}

/** Equivalente exacto de apuestasBody() en el vanilla -- KPIs de sección +
 * tabla de abiertas + tabla de historial, sin el título de sección ni el
 * filtro de rango (eso vive en ApuestasSection). Esta separación es la que
 * permite testear contra snapshot_frontend_values.json, que capturó
 * apuestasBody() aislada, no renderApuestas() completo. */
export function ApuestasBody({ report, onClosePosition }: Props) {
  if (!report.openCount && !report.closedCount) {
    return <div className="empty">No hay apuestas registradas todavía.</div>;
  }
  return (
    <>
      <SectionKpis items={sectionKpis(report)} />

      {report.openCount > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="open-pos-header">{`● Posiciones abiertas · ${report.openCount}`}</div>
          <div style={{ overflowX: 'auto' }}>
            <DataTable columns={openColumns(onClosePosition)} rows={report.openPositions} rowKey={(p) => p.concepto} />
          </div>
        </div>
      )}

      {report.closedPositions.length > 0 && (
        <div>
          <div className="closed-pos-header">{`Historial cerrado · ${report.closedPositions.length}`}</div>
          <div style={{ overflowX: 'auto' }}>
            <DataTable columns={closedColumns} rows={report.closedPositions} rowKey={(r, i) => `${r.Concepto}-${i}`} />
          </div>
        </div>
      )}
    </>
  );
}
