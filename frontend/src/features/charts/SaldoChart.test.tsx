import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendFixture, rawFrontendSnapshot } from '../../test/goldenMaster';
import { SaldoChart } from './SaldoChart';

const newPlot = vi.fn();
const purge = vi.fn();
vi.mock('plotly.js-dist-min', () => ({
  default: {
    newPlot: (...args: unknown[]) => newPlot(...args),
    purge: (...args: unknown[]) => purge(...args),
  },
}));

describe('SaldoChart', () => {
  beforeEach(() => {
    newPlot.mockClear();
    purge.mockClear();
  });

  it('IBKR: coincide 1:1 con el golden master (sin media móvil, el backend nunca la calcula para IBKR)', () => {
    const report = backendFixture.ibkr_saldo_evolucion_all;
    render(<SaldoChart account="ibkr" report={report} />);
    expect(newPlot).toHaveBeenCalledTimes(1);
    const [, traces, layout] = newPlot.mock.calls[0];
    const expected = rawFrontendSnapshot.ibkr_charts_all['c-saldo'];
    expect(traces).toEqual(expected.traces);
    expect(layout).toEqual(expected.layout);
  });

  it('Openbank: omite a propósito la traza "Media 30d" (limpieza de UI, ver docs/ARCHITECTURE.md §0)', () => {
    const report = backendFixture.openbank_saldo_evolucion_all;
    render(<SaldoChart account="openbank" report={report} />);
    const [, traces, layout] = newPlot.mock.calls[0];
    const expected = rawFrontendSnapshot.openbank_charts_all['c-saldo'];
    expect(expected.traces).toHaveLength(2); // el vanilla sí emitía Saldo + Media 30d
    expect(traces).toHaveLength(1); // React solo emite la traza de Saldo
    expect(traces[0]).toEqual(expected.traces[0]);
    expect(layout).toEqual(expected.layout);
  });
});
