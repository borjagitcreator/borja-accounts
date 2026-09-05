import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendFixture, rawFrontendSnapshot } from '../../test/goldenMaster';
import { GastosChart } from './GastosChart';

const newPlot = vi.fn();
vi.mock('plotly.js-dist-min', () => ({
  default: { newPlot: (...args: unknown[]) => newPlot(...args), purge: vi.fn() },
}));

describe('GastosChart', () => {
  beforeEach(() => newPlot.mockClear());

  it('coincide con el golden master (mode=media, default de la vista)', () => {
    const ranking = backendFixture.openbank_gastos_ranking_all_media.ranking;
    render(<GastosChart ranking={ranking} />);
    const [, traces, layout] = newPlot.mock.calls[0];
    const expected = rawFrontendSnapshot.openbank_charts_all['c-gastos'];
    expect(traces).toEqual(expected.traces);
    expect(layout).toEqual(expected.layout);
  });
});
