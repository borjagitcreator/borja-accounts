import type { Data, Layout } from 'plotly.js-dist-min';
import type { MensualEvolucionReport } from '../../api/types';
import { PlotlyChart } from '../../components/PlotlyChart';
import { baseLayout } from './baseLayout';

export function MensualChart({ report }: { report: MensualEvolucionReport }) {
  const L = baseLayout();

  const traces: Data[] = [
    {
      x: report.meses,
      y: report.ingresos,
      type: 'bar',
      name: 'Ingresos',
      marker: { color: 'rgba(26,127,55,.65)' },
      hovertemplate: '%{y:,.2f}€<extra>Ingresos</extra>',
    } as Data,
    {
      x: report.meses,
      y: report.gastos.map((g) => -g),
      type: 'bar',
      name: 'Gastos',
      marker: { color: 'rgba(207,34,46,.55)' },
      customdata: report.gastos,
      hovertemplate: '%{customdata:,.2f}€<extra>Gastos</extra>',
    } as Data,
    {
      x: report.meses,
      y: report.balance,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Balance',
      line: { color: '#9a6700', width: 2, dash: 'dot' },
      marker: { size: 5 },
      hovertemplate: '%{y:,.2f}€<extra>Balance</extra>',
    } as Data,
  ];

  const layout: Partial<Layout> = {
    ...L,
    barmode: 'overlay',
    xaxis: { ...L.xaxis, type: 'category' },
    yaxis: { ...L.yaxis, ticksuffix: '€', zeroline: true, zerolinecolor: 'rgba(0,0,0,.1)' },
  };

  return <PlotlyChart traces={traces} layout={layout} />;
}
