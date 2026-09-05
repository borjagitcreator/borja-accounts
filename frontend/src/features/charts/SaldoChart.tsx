import type { Data, Layout } from 'plotly.js-dist-min';
import type { AccountId, SaldoEvolucionReport } from '../../api/types';
import { PlotlyChart } from '../../components/PlotlyChart';
import { eur } from '../../lib/format';
import { baseLayout } from './baseLayout';

interface Props {
  account: AccountId;
  report: SaldoEvolucionReport;
}

// La traza "Media 30d" (report.mediaMovil, solo Openbank) se omite a
// propósito -- limpieza de UI acordada en docs/ARCHITECTURE.md §0. El
// backend la sigue calculando (with_media_movil=True para Openbank) pero
// ya no se representa.
export function SaldoChart({ account, report }: Props) {
  const L = baseLayout();
  const lineColor = account === 'ibkr' ? '#2F5D50' : '#0969da';

  const traces: Data[] = [
    {
      x: report.dates,
      y: report.saldos,
      type: 'scatter',
      mode: 'lines',
      name: `Saldo (${eur(report.actual)})`,
      line: { color: lineColor, width: 2.5 },
      hovertemplate: '%{x|%d/%m/%y}: <b>%{y:,.2f}€</b><extra></extra>',
    } as Data,
  ];

  const layout: Partial<Layout> = {
    ...L,
    xaxis: { ...L.xaxis, type: 'date' },
    yaxis: { ...L.yaxis, ticksuffix: '€', zeroline: true, zerolinecolor: 'rgba(0,0,0,.1)' },
  };

  return <PlotlyChart traces={traces} layout={layout} />;
}
