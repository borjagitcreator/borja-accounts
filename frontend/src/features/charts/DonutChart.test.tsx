import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendFixture, rawFrontendSnapshot } from '../../test/goldenMaster';
import { DonutChart } from './DonutChart';

const newPlot = vi.fn();
vi.mock('plotly.js-dist-min', () => ({
  default: { newPlot: (...args: unknown[]) => newPlot(...args), purge: vi.fn() },
}));

describe('DonutChart', () => {
  beforeEach(() => newPlot.mockClear());

  it('coincide con el golden master', () => {
    const donut = backendFixture.openbank_gastos_ranking_all_media.donut;
    render(<DonutChart donut={donut} />);
    const [, traces, layout] = newPlot.mock.calls[0];
    const expected = rawFrontendSnapshot.openbank_charts_all['c-donut'];
    expect(traces).toEqual(expected.traces);
    expect(layout).toEqual(expected.layout);
  });
});
