import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { MovimientosTable } from './MovimientosTable';
import { EMPTY_SEARCH, searchedMovs } from './search';
import type { Movement } from '../../api/types';

const noop = () => {};

describe('MovimientosTable', () => {
  it.each([
    ['openbank' as const, 'initial_data_openbank' as const, 'openbank_movimientos_default' as const],
    ['ibkr' as const, 'initial_data_ibkr' as const, 'ibkr_movimientos_default' as const],
  ])('coincide con el golden master para %s', (_account, fixtureKey, expectedKey) => {
    const data: Movement[] = backendFixture[fixtureKey];
    const rows = searchedMovs(data, EMPTY_SEARCH);
    const { container } = render(
      <MovimientosTable rows={rows} onFilterByConcept={noop} onDuplicate={noop} onEdit={noop} />,
    );
    expect(extractVisibleText(container)).toEqual(expectedValues[expectedKey]);
  });
});
