import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownTree, type TreeNode } from './DropdownTree';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const NODES: TreeNode[] = [
  {
    value: 'FR',
    label: 'France',
    children: [
      {
        value: 'FR:IDF',
        label: 'Île-de-France',
        children: [
          { value: 'FR:IDF:75', label: 'Paris' },
          { value: 'FR:IDF:92', label: 'Hauts-de-Seine' },
        ],
      },
      {
        value: 'FR:BRE',
        label: 'Bretagne',
        children: [{ value: 'FR:BRE:35', label: 'Ille-et-Vilaine' }],
      },
    ],
  },
];

const renderTree = (selectedValues: string[], onChange = vi.fn()) => {
  render(
    <DropdownTree
      buttonLabel="Territoire"
      selectedValuesLabel={(count) => `${count} territoire(s)`}
      legend="Filtrer par territoire"
      nodes={NODES}
      selectedValues={selectedValues}
      labels={{
        selectAll: (label) => `Toute la catégorie ${label}`,
        selectAllHint: 'Permet de sélectionner ou désélectionner toute la catégorie.',
        optionsLegend: (label) => `Options de la catégorie ${label}`,
        lockedHint: (label) => `${label} est sélectionnée en entier.`,
      }}
      onChange={onChange}
    />,
  );
  return onChange;
};

const openMenu = () => userEvent.click(screen.getByRole('button', { name: /Territoire/ }));
const expand = (label: string) => userEvent.click(screen.getByRole('button', { name: label }));
const category = (label: string) => screen.getByRole('checkbox', { name: `Toute la catégorie ${label}` });

describe('DropdownTree', () => {
  it('walks down three levels of nesting', async () => {
    renderTree([]);

    await openMenu();
    expect(screen.queryByRole('checkbox', { name: `Toute la catégorie Île-de-France` })).not.toBeInTheDocument();

    await expand('France');
    expect(category('Île-de-France')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Paris' })).not.toBeInTheDocument();

    await expand('Île-de-France');
    expect(screen.getByRole('checkbox', { name: 'Paris' })).toBeInTheDocument();
  });

  it('absorbs the descendants of an intermediate node when it is checked', async () => {
    const onChange = renderTree(['FR:IDF:75']);

    await openMenu();
    await userEvent.click(category('Île-de-France'));

    expect(onChange).toHaveBeenCalledWith(['FR:IDF']);
  });

  it('absorbs grandchildren, not only direct children, when the root is checked', async () => {
    const onChange = renderTree(['FR:IDF:75', 'FR:BRE:35']);

    await openMenu();
    await userEvent.click(category('France'));

    expect(onChange).toHaveBeenCalledWith(['FR']);
  });

  it('drops the whole subtree when an intermediate node is unchecked', async () => {
    const onChange = renderTree(['FR:IDF', 'FR:BRE:35']);

    await openMenu();
    await userEvent.click(category('Île-de-France'));

    expect(onChange).toHaveBeenCalledWith(['FR:BRE:35']);
  });

  it('marks an ancestor as mixed when a grandchild is selected', async () => {
    renderTree(['FR:IDF:75']);

    await openMenu();
    const root = category('France') as HTMLInputElement;

    expect(root.checked).toBe(false);
    expect(root.indeterminate).toBe(true);
  });

  it('expands the whole ancestor chain of an already selected leaf', async () => {
    renderTree(['FR:IDF:75']);

    await openMenu();

    expect(screen.getByRole('checkbox', { name: 'Paris' })).toBeChecked();
  });

  it('locks every descendant, at any depth, when an ancestor is selected', async () => {
    renderTree(['FR']);

    await openMenu();
    await expand('France');
    const child = category('Île-de-France') as HTMLInputElement;
    expect(child.checked).toBe(true);
    expect(child.disabled).toBe(true);

    await expand('Île-de-France');
    const grandChild = screen.getByRole('checkbox', { name: 'Paris' }) as HTMLInputElement;
    expect(grandChild.checked).toBe(true);
    expect(grandChild.disabled).toBe(true);
  });

  it('keeps every aria-controls valid once the deepest level is open', async () => {
    renderTree([]);

    await openMenu();
    await expand('France');
    await expand('Île-de-France');

    const controllers = [...document.querySelectorAll('[aria-controls]')];
    expect(controllers.length).toBeGreaterThan(2);

    for (const element of controllers) {
      const id = element.getAttribute('aria-controls') as string;
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('renders a childless node as a plain checkbox, with no disclosure button', async () => {
    const onChange = vi.fn();
    render(
      <DropdownTree
        buttonLabel="Territoire"
        selectedValuesLabel={(count) => `${count} territoire(s)`}
        legend="Filtrer par territoire"
        nodes={[{ value: 'OM', label: 'Outre-mer' }]}
        selectedValues={[]}
        labels={{
          selectAll: (label) => `Toute la catégorie ${label}`,
          selectAllHint: 'Permet de sélectionner ou désélectionner toute la catégorie.',
          optionsLegend: (label) => `Options de la catégorie ${label}`,
          lockedHint: (label) => `${label} est sélectionnée en entier.`,
        }}
        onChange={onChange}
      />,
    );

    await openMenu();

    expect(screen.queryByRole('button', { name: 'Outre-mer' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Outre-mer' }));

    expect(onChange).toHaveBeenCalledWith(['OM']);
  });

  it('names each nested group after the node it details', async () => {
    renderTree([]);

    await openMenu();
    await expand('France');

    expect(screen.getByRole('group', { name: 'Options de la catégorie France' })).toBeInTheDocument();
  });

  it('announces the descendants absorbed when a branch is checked over them', async () => {
    renderTree(['FR:IDF:75', 'FR:BRE:35']);

    await openMenu();
    await userEvent.click(category('France'));

    expect(screen.getByRole('status')).toHaveTextContent(
      'France sélectionné en entier : 2 sélections plus précises remplacées.',
    );
  });

  it('announces what is left after a deselection', async () => {
    renderTree(['FR:IDF', 'FR:BRE:35']);

    await openMenu();
    await userEvent.click(category('Île-de-France'));

    expect(screen.getByRole('status')).toHaveTextContent('Île-de-France désélectionné. 1 sélection restante.');
  });

  it('keeps the status region outside the panel, so it exists before the change it announces', () => {
    renderTree([]);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  describe('structure DOM cible', () => {
    it('lists the categories, each as an item carrying a header and its options', async () => {
      renderTree([]);

      await openMenu();

      const item = category('France').closest('li');
      expect(item).not.toBeNull();
      expect(item?.parentElement?.tagName).toBe('UL');
    });

    it('keeps the select-all checkbox out of the expand button', async () => {
      renderTree([]);

      await openMenu();
      const checkbox = category('France');
      const trigger = screen.getByRole('button', { name: 'France' });

      expect(trigger.contains(checkbox)).toBe(false);
      expect(checkbox.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('describes what the select-all checkbox does, beyond naming it', async () => {
      renderTree([]);

      await openMenu();
      const description = document.getElementById(category('France').getAttribute('aria-describedby') as string);

      expect(description).toHaveTextContent('Permet de sélectionner ou désélectionner toute la catégorie.');
    });

    it('groups the options in a fieldset named after its category, hidden until expanded', async () => {
      renderTree([]);

      await openMenu();
      const optionsId = screen.getByRole('button', { name: 'France' }).getAttribute('aria-controls') as string;
      const options = document.getElementById(optionsId);

      expect(options?.tagName).toBe('FIELDSET');
      expect(options).toHaveAttribute('hidden');
      expect(options?.querySelector('legend')).toHaveTextContent('Options de la catégorie France');

      await expand('France');

      expect(document.getElementById(optionsId)).not.toHaveAttribute('hidden');
    });

    it('reads the header before the options it controls, styles or not', async () => {
      renderTree([]);

      await openMenu();
      await expand('France');
      const header = category('France').closest('[data-expanded]') as HTMLElement;
      const options = document.getElementById(
        screen.getByRole('button', { name: 'France' }).getAttribute('aria-controls') as string,
      ) as HTMLElement;

      expect(header.compareDocumentPosition(options) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('shows the lock explanation to sighted users, not only to screen readers', async () => {
    renderTree(['FR']);

    await openMenu();
    await expand('France');
    const locked = category('Île-de-France');
    const [, hintId] = (locked.getAttribute('aria-describedby') as string).split(' ');
    const hint = document.getElementById(hintId);

    expect(locked).toBeDisabled();
    expect(hint).toHaveTextContent('France est sélectionnée en entier.');
    expect(hint).not.toHaveClass('fr-sr-only');
  });

  it('exposes the expanded state on the header itself, without relying on :has()', async () => {
    renderTree([]);

    await openMenu();
    const header = () => category('France').closest('[data-expanded]');

    expect(header()).toHaveAttribute('data-expanded', 'false');

    await expand('France');

    expect(header()).toHaveAttribute('data-expanded', 'true');
  });

  it('indents each level while keeping the header row full width', async () => {
    renderTree([]);

    await openMenu();
    await expand('France');

    expect(category('France').closest('[data-expanded]')).toHaveStyle({ '--depth': '0' });
    expect(category('Île-de-France').closest('[data-expanded]')).toHaveStyle({ '--depth': '1' });
  });
});
