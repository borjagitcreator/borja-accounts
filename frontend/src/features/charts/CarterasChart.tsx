import type { Data, Layout } from 'plotly.js-dist-min';
import type { CarterasRankingReport } from '../../api/types';
import { PlotlyChart } from '../../components/PlotlyChart';
import { baseLayout } from './baseLayout';

export function CarterasChart({ report }: { report: CarterasRankingReport }) {
  const entries = [...report.entries].reverse();
  if (!entries.length) {
    return <PlotlyChart traces={null} layout={{}} />;
  }

  const conceptos = entries.map((e) => e.concepto);
  const valores = entries.map((e) => e.valor);
  const maxV = Math.max(...valores);
  const L = baseLayout();

  const traces: Data[] = [
    {
      x: valores,
      y: conceptos.map((c) => `<b>${c}</b>`),
      type: 'bar',
      orientation: 'h',
      text: valores.map((t) => t.toFixed(0) + '€'),
      textposition: 'outside',
      cliponaxis: false,
      textfont: { color: '#24292f', size: 11 },
      constraintext: 'none',
      customdata: conceptos,
      marker: { color: '#2F5D50' },
      hovertemplate: `%{customdata}: <b>%{x:,.2f}${report.hoverSuffix}</b><extra></extra>`,
    } as Data,
  ];

  const layout: Partial<Layout> = {
    ...L,
    hovermode: 'closest',
    margin: { l: 120, r: 70, t: 10, b: 36 },
    xaxis: { ...L.xaxis, type: 'linear', ticksuffix: '€', range: [0, maxV * 1.35] },
    yaxis: {
      ...L.yaxis,
      automargin: true,
      ticks: 'outside',
      ticklen: 10,
      tickcolor: 'rgba(0,0,0,0)',
      tickfont: { color: '#24292f', size: 12 },
    },
    showlegend: false,
  };

  return <PlotlyChart traces={traces} layout={layout} />;
}
