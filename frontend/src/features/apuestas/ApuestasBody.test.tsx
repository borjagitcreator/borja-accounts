import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backendFixture, expectedValues } from '../../test/goldenMaster';
import { extractVisibleText } from '../../test/extractVisibleText';
import { ApuestasBody } from './ApuestasBody';

describe('ApuestasBody', () => {
  it('coincide con el golden master (rango 3m del fixture)', () => {
    const report = backendFixture.openbank_apuestas_report_3m;
    const { container } = render(<ApuestasBody report={report} onClosePosition={() => {}} />);
    expect(extractVisibleText(container)).toEqual(expectedValues.openbank_apuestas_body);
  });
});
