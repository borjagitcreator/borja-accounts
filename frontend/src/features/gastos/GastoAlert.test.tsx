import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { GastoAlert } from './GastoAlert';

describe('GastoAlert', () => {
  it('coincide con el golden master', () => {
    const alert = backendFixture.openbank_gastos_mes_actual.alert;
    const { container } = render(<GastoAlert alert={alert} />);
    expect(extractVisibleText(container)).toEqual(expectedValues.openbank_gasto_alert);
  });
});
