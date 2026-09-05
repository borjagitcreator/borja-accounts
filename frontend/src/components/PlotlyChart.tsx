import Plotly from 'plotly.js-dist-min';
import { useEffect, useRef } from 'react';

interface Props {
  traces: Plotly.Data[] | null;
  layout: Partial<Plotly.Layout>;
  height?: number;
}

/** Wrapper imperativo fino sobre Plotly, sin estado propio de React --
 * chartSaldo/chartMensual/etc. en el vanilla ya eran solo construcción de
 * traces/layout + Plotly.newPlot(id, ...), así que se portan casi
 * literalmente. `traces: null` reproduce el caso Plotly.purge(id) del
 * vanilla (sin datos que graficar, ej. gastos-ranking vacío). */
export function PlotlyChart({ traces, layout, height = 280 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (traces === null) {
      Plotly.purge(el);
      return;
    }
    Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false });
    return () => {
      Plotly.purge(el);
    };
  }, [traces, layout]);

  return <div ref={ref} style={{ height }} />;
}
