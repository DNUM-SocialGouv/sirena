import { REPONSE_NON_RENSEIGNE_LABEL } from '@sirena/common/utils';
import { render, screen } from '@testing-library/react';
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

describe('groupLabel', () => {
  it("laisse les libellés bruts quand aucun rappel de question n'est fourni", () => {
    const options = buildOuiNonOptions(undefined, vi.fn());

    expect(options.map((option) => option.label)).toEqual(['Oui', 'Non', REPONSE_NON_RENSEIGNE_LABEL]);
  });

  it('ajoute à chaque option un rappel de la question, masqué visuellement', () => {
    const options = buildOuiNonOptions(undefined, vi.fn(), 'situation de handicap');

    for (const option of options) {
      const { container, unmount } = render(<>{option.label}</>);
      const suffix = container.querySelector('.fr-sr-only');

      expect(suffix).not.toBeNull();
      expect(suffix?.textContent).toContain('situation de handicap');
      unmount();
    }
  });

  it('conserve le libellé visible en tête du nom accessible', () => {
    const [oui] = buildOuiNonOptions(undefined, vi.fn(), 'situation de handicap');
    render(<span data-testid="label">{oui.label}</span>);

    expect(screen.getByTestId('label').textContent).toBe('Oui — situation de handicap');
  });
});
