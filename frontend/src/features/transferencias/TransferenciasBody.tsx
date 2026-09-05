import type { TransferItem, TransfersReport } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { SectionKpis, type SectionKpiItem } from '../../components/SectionKpis';
import { eur, fd } from '../../lib/format';

function sectionKpis(report: TransfersReport): SectionKpiItem[] {
  return [
    { label: 'Recibido', value: eur(report.lifetimeRec), valueClass: 'num-pos' },
    { label: 'Enviado', value: eur(report.lifetimeSent) },
    { label: 'Neto aportado', value: eur(report.lifetimeNet), valueClass: report.lifetimeNet >= 0 ? 'num-pos' : 'num-neg' },
  ];
}

// El signo usa MINUS SIGN (U+2212), no un hyphen normal -- así lo generaba
// transferenciasBody() en el vanilla.
const columns: Column<TransferItem>[] = [
  { header: 'Fecha', render: (r) => fd(r.Fecha), cellClass: () => 'nowrap' },
  {
    header: 'Dirección',
    render: (r) => <span className={`xfer-dir ${r.dir === 'in' ? 'xfer-in' : 'xfer-out'}`}>{r.label}</span>,
  },
  { header: 'Concepto', render: (r) => r.Concepto },
  {
    header: 'Importe',
    headerClass: 'r',
    render: (r) => `${r.dir === 'in' ? '+' : '−'}${r.Total.toFixed(2)}€`,
    cellClass: (r) => `r nowrap ${r.dir === 'in' ? 'num-pos' : ''}`,
  },
];

/** Equivalente exacto de transferenciasBody() -- ver el mismo comentario en
 * ApuestasBody.tsx sobre la separación body/section. */
export function TransferenciasBody({ report }: { report: TransfersReport }) {
  const kpis = <SectionKpis items={sectionKpis(report)} />;

  if (!report.totalCount) {
    return (
      <>
        {kpis}
        <div className="empty">Aún no hay transferencias con Openbank.</div>
      </>
    );
  }
  if (!report.items.length) {
    return (
      <>
        {kpis}
        <div className="empty">Sin transferencias en este período.</div>
      </>
    );
  }

  return (
    <>
      {kpis}
      <div style={{ overflowX: 'auto' }}>
        <DataTable columns={columns} rows={report.items} rowKey={(r, i) => `${r.Fecha}-${i}`} />
      </div>
    </>
  );
}
