import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LieuTypeFilter } from './LieuTypeFilter';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Type de lieu de survenue/ }));
};

const expandGroup = async (label: string) => {
  await userEvent.click(screen.getByRole('button', { name: label }));
};

const categoryCheckbox = (label: string) =>
  screen.getByRole('checkbox', { name: `Tous les lieux de la catégorie ${label}` });

describe('LieuTypeFilter', () => {
  it('opens the list and selects a whole lieu type', async () => {
    const onChange = vi.fn();
    render(<LieuTypeFilter selectedTokens={[]} onChange={onChange} />);

    await openMenu();
    await userEvent.click(categoryCheckbox('Etablissements de santé'));

    expect(onChange).toHaveBeenCalledWith(['ETABLISSEMENT_SANTE']);
  });

  it('keeps the precisions collapsed until the type is expanded', async () => {
    render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

    await openMenu();
    expect(screen.queryByRole('checkbox', { name: 'Chez un tiers' })).not.toBeInTheDocument();

    await expandGroup('Domicile');

    expect(screen.getByRole('checkbox', { name: 'Chez un tiers' })).toBeInTheDocument();
  });

  it('collapses an expanded type again', async () => {
    render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

    await openMenu();
    await expandGroup('Domicile');
    await expandGroup('Domicile');

    expect(screen.queryByRole('checkbox', { name: 'Chez un tiers' })).not.toBeInTheDocument();
  });

  it('expands on its own the types that already carry a selected precision', async () => {
    render(<LieuTypeFilter selectedTokens={['DOMICILE:CHEZ_TIERS']} onChange={vi.fn()} />);

    await openMenu();

    expect(screen.getByRole('checkbox', { name: 'Chez un tiers' })).toBeChecked();
  });

  it('leaves out the lieu types that have no precision in the référentiel', async () => {
    render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

    await openMenu();

    expect(
      screen.queryByRole('checkbox', { name: 'Tous les lieux de la catégorie Etablissement fictif' }),
    ).not.toBeInTheDocument();
  });

  it('selects a precision of a lieu type', async () => {
    const onChange = vi.fn();
    render(<LieuTypeFilter selectedTokens={[]} onChange={onChange} />);

    await openMenu();
    await expandGroup('Domicile');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chez un tiers' }));

    expect(onChange).toHaveBeenCalledWith(['DOMICILE:CHEZ_TIERS']);
  });

  it('marks the parent as mixed when only a precision is selected', async () => {
    render(<LieuTypeFilter selectedTokens={['DOMICILE:CHEZ_TIERS']} onChange={vi.fn()} />);

    await openMenu();
    const parent = categoryCheckbox('Domicile') as HTMLInputElement;

    expect(parent.checked).toBe(false);
    expect(parent.indeterminate).toBe(true);
  });

  it('replaces selected precisions by the whole type when the parent is checked', async () => {
    const onChange = vi.fn();
    render(<LieuTypeFilter selectedTokens={['DOMICILE:CHEZ_TIERS', 'ETABLISSEMENT_SANTE:CHU']} onChange={onChange} />);

    await openMenu();
    await userEvent.click(categoryCheckbox('Domicile'));

    expect(onChange).toHaveBeenCalledWith(['ETABLISSEMENT_SANTE:CHU', 'DOMICILE']);
  });

  it('clears the whole type and its precisions when the parent is unchecked', async () => {
    const onChange = vi.fn();
    render(<LieuTypeFilter selectedTokens={['DOMICILE', 'ETABLISSEMENT_SANTE:CHU']} onChange={onChange} />);

    await openMenu();
    await userEvent.click(categoryCheckbox('Domicile'));

    expect(onChange).toHaveBeenCalledWith(['ETABLISSEMENT_SANTE:CHU']);
  });

  it('unselects a precision', async () => {
    const onChange = vi.fn();
    render(<LieuTypeFilter selectedTokens={['DOMICILE:CHEZ_TIERS', 'DOMICILE:REQUERANT']} onChange={onChange} />);

    await openMenu();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chez un tiers' }));

    expect(onChange).toHaveBeenCalledWith(['DOMICILE:REQUERANT']);
  });

  it('carries the selection count in the accessible name, not only in the visible badge', () => {
    render(<LieuTypeFilter selectedTokens={['DOMICILE', 'ETABLISSEMENT_SANTE:CHU']} onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Type de lieu de survenue, 2 types de lieu sélectionnés' });

    expect(trigger).toHaveTextContent('(2)');
  });

  it('disables the precisions while the whole type is selected', async () => {
    render(<LieuTypeFilter selectedTokens={['DOMICILE']} onChange={vi.fn()} />);

    await openMenu();
    await expandGroup('Domicile');
    const child = screen.getByRole('checkbox', { name: 'Chez un tiers' }) as HTMLInputElement;

    expect(child.checked).toBe(true);
    expect(child.disabled).toBe(true);
  });
  describe('accessibilité', () => {
    it('exposes the expanded state of each lieu type on its disclosure button', async () => {
      render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

      await openMenu();
      const disclosure = screen.getByRole('button', { name: 'Domicile' });

      expect(disclosure).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(disclosure);

      expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    });

    it('points every aria-controls at an element that exists in the document', async () => {
      render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

      const trigger = screen.getByRole('button', { name: /Type de lieu de survenue/ });
      expect(trigger).not.toHaveAttribute('aria-controls');

      await openMenu();

      const controllers = [...document.querySelectorAll('[aria-controls]')];
      expect(controllers.length).toBeGreaterThan(1);

      for (const element of controllers) {
        const id = element.getAttribute('aria-controls') as string;
        expect(document.getElementById(id)).not.toBeNull();
      }
    });

    it('keeps the collapsed precisions out of the accessibility tree', async () => {
      render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

      await openMenu();
      const precisions = document.getElementById(
        screen.getByRole('button', { name: 'Domicile' }).getAttribute('aria-controls') as string,
      );

      expect(precisions).toBeInTheDocument();
      expect(precisions).toHaveAttribute('hidden');
      expect(screen.queryByRole('checkbox', { name: 'Chez un tiers' })).not.toBeInTheDocument();
    });

    it('names each group of precisions after its lieu type', async () => {
      render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

      await openMenu();
      await expandGroup('Domicile');

      expect(screen.getByRole('group', { name: 'Lieux de la catégorie Domicile' })).toBeInTheDocument();
    });

    it('explains, on each frozen option, why it cannot be changed', async () => {
      render(<LieuTypeFilter selectedTokens={['DOMICILE']} onChange={vi.fn()} />);

      await openMenu();
      await expandGroup('Domicile');
      const option = screen.getByRole('checkbox', { name: 'Chez un tiers' });
      expect(option).toBeDisabled();

      const hint = document.getElementById(option.getAttribute('aria-describedby') as string);

      expect(hint).toHaveTextContent(/La catégorie Domicile est sélectionnée en entier/);
    });

    it('closes on Escape and hands the focus back to the trigger', async () => {
      render(<LieuTypeFilter selectedTokens={[]} onChange={vi.fn()} />);

      await openMenu();
      await userEvent.keyboard('{Escape}');

      const trigger = screen.getByRole('button', { name: /Type de lieu de survenue/ });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await vi.waitFor(() => expect(trigger).toHaveFocus());
    });
  });
});
