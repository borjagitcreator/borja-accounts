import type { Data, Layout } from 'plotly.js-dist-min';
import type { GastosDonutSection } from '../../api/types';
import { PlotlyChart } from '../../components/PlotlyChart';

export function DonutChart({ donut }: { donut: GastosDonutSection }) {
  if (!donut.hasGastos) {
    return <PlotlyChart traces={null} layout={{}} height={480} />;
  }

  const traces: Data[] = [
    {
      type: 'pie',
      hole: 0.48,
      labels: donut.labels.map((l) => `<b>${l}</b>`),
      values: donut.values,
      sort: false,
      customdata: donut.labels,
      hovertemplate: '<b>%{customdata}</b><br>%{value:,.2f}€  ·  %{percent}<extra></extra>',
      texttemplate: '<b>%{percent}</b>',
      textfont: { size: 13, color: '#ffffff' },
      insidetextorientation: 'horizontal',
      marker: { line: { color: '#ffffff', width: 1.5 } },
    } as Data,
  ];

  const layout: Partial<Layout> = {
    paper_bgcolor: '#ffffff',
    font: { family: 'Outfit, system-ui', color: '#1c1917', size: 11 },
    margin: { l: 10, r: 10, t: 10, b: 10 },
    legend: { orientation: 'v', x: 1.02, y: 0.5, xanchor: 'left', yanchor: 'middle', font: { size: 12 }, bgcolor: 'rgba(0,0,0,0)' },
    showlegend: true,
  };

  return <PlotlyChart traces={traces} layout={layout} height={480} />;
}
