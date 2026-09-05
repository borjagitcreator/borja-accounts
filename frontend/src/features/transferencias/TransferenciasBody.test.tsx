import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { TransferenciasBody } from './TransferenciasBody';

describe('TransferenciasBody', () => {
  it('coincide con el golden master (rango 3m del fixture)', () => {
    const report = backendFixture.ibkr_transferencias_report_3m;
    const { container } = render(<TransferenciasBody report={report} />);
    expect(extractVisibleText(container)).toEqual(expectedValues.ibkr_transferencias_body);
  });
});
