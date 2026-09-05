import type { Data, Layout } from 'plotly.js-dist-min';
import type { GastosRankingSection } from '../../api/types';
import { PlotlyChart } from '../../components/PlotlyChart';
import { baseLayout } from './baseLayout';

export function GastosChart({ ranking }: { ranking: GastosRankingSection }) {
  if (!ranking.hasGastos || !ranking.entries.length) {
    return <PlotlyChart traces={null} layout={{}} height={480} />;
  }

  const reversed = [...ranking.entries].reverse();
  const conceptos = reversed.map((e) => e.concepto);
  const valores = reversed.map((e) => e.valor);
  const maxV = Math.max(...valores);
  const L = baseLayout();

  const traces: Data[] = [
    {
      x: valores,
      y: conceptos.map((c) => `<b>${c}</b>`),
      type: 'bar',
      orientation: 'h',
      text: valores.map((t) => t.toFixed(2) + '€'),
      textposition: 'outside',
      cliponaxis: false,
      textfont: { color: '#24292f', size: 12 },
      constraintext: 'none',
      customdata: conceptos,
      marker: { color: valores, colorscale: 'Teal', showscale: false },
      hovertemplate: `%{customdata}: <b>%{x:,.2f}${ranking.hoverSuffix}</b><extra></extra>`,
    } as Data,
  ];

  const layout: Partial<Layout> = {
    ...L,
    hovermode: 'closest',
    margin: { l: 140, r: 120, t: 10, b: 36 },
    xaxis: { ...L.xaxis, type: 'linear', ticksuffix: '€', range: [0, maxV * 1.45] },
    yaxis: {
      ...L.yaxis,
      automargin: true,
      ticks: 'outside',
      ticklen: 14,
      tickcolor: 'rgba(0,0,0,0)',
      tickfont: { color: '#24292f', size: 13 },
    },
    showlegend: false,
  };

  return <PlotlyChart traces={traces} layout={layout} height={480} />;
}
