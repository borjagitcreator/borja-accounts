import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendFixture, rawFrontendSnapshot } from '../../test/goldenMaster';
import { CarterasChart } from './CarterasChart';

const newPlot = vi.fn();
vi.mock('plotly.js-dist-min', () => ({
  default: { newPlot: (...args: unknown[]) => newPlot(...args), purge: vi.fn() },
}));

describe('CarterasChart', () => {
  beforeEach(() => newPlot.mockClear());

  it('coincide con el golden master (mode=total, default de la vista)', () => {
    const report = backendFixture.ibkr_carteras_ranking_all_total;
    render(<CarterasChart report={report} />);
    const [, traces, layout] = newPlot.mock.calls[0];
    const expected = rawFrontendSnapshot.ibkr_charts_all['c-carteras'];
    expect(traces).toEqual(expected.traces);
    expect(layout).toEqual(expected.layout);
  });
});
