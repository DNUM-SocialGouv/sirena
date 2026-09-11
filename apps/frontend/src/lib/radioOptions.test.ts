import { REPONSE_NON_RENSEIGNE_LABEL } from '@sirena/common/utils';
import { describe, expect, it, vi } from 'vitest';
import { buildNonRenseigneOption, buildOuiNonOptions } from './radioOptions';

describe('buildOuiNonOptions', () => {
  it('exposes a neutral option next to Oui and Non', () => {
    const options = buildOuiNonOptions(undefined, vi.fn());

    expect(options.map((option) => option.label)).toEqual(['Oui', 'Non', REPONSE_NON_RENSEIGNE_LABEL]);
  });

  it.each([
    ['OUI', 'Oui'],
    ['NON', 'Non'],
    ['NON_RENSEIGNE', REPONSE_NON_RENSEIGNE_LABEL],
  ] as const)('checks the option matching the value %s', (value, expectedLabel) => {
    const options = buildOuiNonOptions(value, vi.fn());
    const checked = options.filter((option) => option.nativeInputProps.checked);

    expect(checked).toHaveLength(1);
    expect(checked[0].label).toBe(expectedLabel);
  });

  it.each([undefined, null] as const)('leaves every option unchecked while the answer is %s', (value) => {
    const options = buildOuiNonOptions(value, vi.fn());

    expect(options.every((option) => !option.nativeInputProps.checked)).toBe(true);
  });

  it.each([
    ['Oui', 'OUI'],
    ['Non', 'NON'],
    [REPONSE_NON_RENSEIGNE_LABEL, 'NON_RENSEIGNE'],
  ] as const)('reports %s as %s', (label, expectedValue) => {
    const onChange = vi.fn();
    const options = buildOuiNonOptions('OUI', onChange);

    options.find((option) => option.label === label)?.nativeInputProps.onChange();

    expect(onChange).toHaveBeenCalledWith(expectedValue);
  });
});

describe('buildNonRenseigneOption', () => {
  it('builds a standalone neutral option', () => {
    const onChange = vi.fn();
    const option = buildNonRenseigneOption(true, onChange);

    expect(option.label).toBe(REPONSE_NON_RENSEIGNE_LABEL);
    expect(option.nativeInputProps.checked).toBe(true);

    option.nativeInputProps.onChange();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
