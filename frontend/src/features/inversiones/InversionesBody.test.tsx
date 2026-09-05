import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { InversionesBody } from './InversionesBody';

describe('InversionesBody', () => {
  it('coincide con el golden master (rango 3m del fixture)', () => {
    const report = backendFixture.ibkr_carteras_report_3m;
    const { container } = render(<InversionesBody report={report} onClosePosition={() => {}} />);
    expect(extractVisibleText(container)).toEqual(expectedValues.ibkr_inversiones_body);
  });
});
