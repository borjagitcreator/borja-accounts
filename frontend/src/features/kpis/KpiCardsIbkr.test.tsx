import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { KpiCardsIbkr } from './KpiCardsIbkr';
import type { KpiPeriod } from '../../api/types';

describe('KpiCardsIbkr', () => {
  it.each(['mes', 'trimestre', 'año'] satisfies KpiPeriod[])(
    'coincide con el golden master para period=%s',
    (period) => {
      const kpi = backendFixture.ibkr_kpis_by_period[period];
      const { container } = render(<KpiCardsIbkr kpi={kpi} period={period} />);
      expect(extractVisibleText(container)).toEqual(expectedValues.ibkr_kpis[period]);
    },
  );
});
