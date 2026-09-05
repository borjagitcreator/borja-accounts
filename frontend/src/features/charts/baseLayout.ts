import type { Layout } from 'plotly.js-dist-min';

export function baseLayout(): Partial<Layout> {
  return {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Outfit, system-ui', color: '#1c1917', size: 11 },
    margin: { l: 50, r: 16, t: 10, b: 36 },
    xaxis: { gridcolor: 'rgba(0,0,0,0.07)', tickfont: { color: '#57606a', size: 10 } },
    yaxis: { gridcolor: 'rgba(0,0,0,0.07)', tickfont: { color: '#57606a', size: 10 } },
    legend: { orientation: 'h', y: 1.1, x: 0, font: { size: 11 } },
    hovermode: 'x unified',
  };
}
