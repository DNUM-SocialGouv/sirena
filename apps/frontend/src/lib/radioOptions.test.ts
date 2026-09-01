import { describe, expect, it, vi } from 'vitest';
import { buildNonRenseigneOption, buildOuiNonOptions, NON_RENSEIGNE_LABEL } from './radioOptions';

describe('buildOuiNonOptions', () => {
  it('exposes a neutral option next to Oui and Non', () => {
    const options = buildOuiNonOptions(undefined, vi.fn());

    expect(options.map((option) => option.label)).toEqual(['Oui', 'Non', NON_RENSEIGNE_LABEL]);
  });

  it.each([
    [true, 'Oui'],
    [false, 'Non'],
    [null, NON_RENSEIGNE_LABEL],
    [undefined, NON_RENSEIGNE_LABEL],
  ] as const)('checks the option matching the value %s', (value, expectedLabel) => {
    const options = buildOuiNonOptions(value, vi.fn());
    const checked = options.filter((option) => option.nativeInputProps.checked);

    expect(checked).toHaveLength(1);
    expect(checked[0].label).toBe(expectedLabel);
  });

  it.each([
    ['Oui', true],
    ['Non', false],
    [NON_RENSEIGNE_LABEL, null],
  ] as const)('reports %s as %s', (label, expectedValue) => {
    const onChange = vi.fn();
    const options = buildOuiNonOptions(true, onChange);

    options.find((option) => option.label === label)?.nativeInputProps.onChange();

    expect(onChange).toHaveBeenCalledWith(expectedValue);
  });
});

describe('buildNonRenseigneOption', () => {
  it('builds a standalone neutral option', () => {
    const onChange = vi.fn();
    const option = buildNonRenseigneOption(true, onChange);

    expect(option.label).toBe(NON_RENSEIGNE_LABEL);
    expect(option.nativeInputProps.checked).toBe(true);

    option.nativeInputProps.onChange();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
