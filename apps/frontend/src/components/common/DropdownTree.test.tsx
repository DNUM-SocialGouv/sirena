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

const SELECT_ALL_HINT = 'Permet de sélectionner ou désélectionner toute la catégorie.';

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
        selectAllHint: SELECT_ALL_HINT,
        optionsLegend: (label) => `Options de la catégorie ${label}`,
        allSelectedHint: (label) => `${label} est sélectionnée en entier.`,
      }}
      onChange={onChange}
    />,
  );
  return onChange;
};

const openMenu = () => userEvent.click(screen.getByRole('button', { name: /Territoire/ }));
const expand = (label: string) => userEvent.click(screen.getByRole('button', { name: label }));
const categoryName = (label: string) => `Toute la catégorie ${label}. ${SELECT_ALL_HINT}`;
const category = (label: string) => screen.getByRole('checkbox', { name: categoryName(label) });

describe('DropdownTree', () => {
  it('walks down three levels of nesting', async () => {
    renderTree([]);

    await openMenu();
    expect(screen.queryByRole('checkbox', { name: categoryName('Île-de-France') })).not.toBeInTheDocument();

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

  it('shows every descendant as checked, at any depth, when an ancestor is selected', async () => {
    renderTree(['FR']);

    await openMenu();
    await expand('France');
    const child = category('Île-de-France') as HTMLInputElement;
    expect(child.checked).toBe(true);
    expect(child.disabled).toBe(false);

    await expand('Île-de-France');
    const grandChild = screen.getByRole('checkbox', { name: 'Paris' }) as HTMLInputElement;
    expect(grandChild.checked).toBe(true);
    expect(grandChild.disabled).toBe(false);
  });

  it('replaces a branch selected as a whole by its siblings when one option is unchecked', async () => {
    const onChange = renderTree(['FR']);

    await openMenu();
    await expand('France');
    await expand('Île-de-France');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Paris' }));

    expect(onChange).toHaveBeenCalledWith(['FR:BRE', 'FR:IDF:92']);
  });

  it('collapses a branch back into its parent once its last option is checked again', async () => {
    const onChange = renderTree(['FR:BRE', 'FR:IDF:92']);

    await openMenu();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Paris' }));

    expect(onChange).toHaveBeenCalledWith(['FR']);
  });

  it('keeps a single category open at a time, like the motifs filter', async () => {
    renderTree([]);

    await openMenu();
    await expand('France');
    await expand('Île-de-France');
    expect(screen.getByRole('checkbox', { name: 'Paris' })).toBeInTheDocument();

    await expand('Bretagne');

    expect(screen.queryByRole('checkbox', { name: 'Paris' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ille-et-Vilaine' })).toBeInTheDocument();
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
          selectAllHint: SELECT_ALL_HINT,
          optionsLegend: (label) => `Options de la catégorie ${label}`,
          allSelectedHint: (label) => `${label} est sélectionnée en entier.`,
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

  it('counts the options behind a selected branch, not the branch itself', () => {
    renderTree(['FR:IDF']);

    const trigger = screen.getByRole('button', { name: 'Territoire, 2 territoire(s)' });

    expect(trigger).toHaveTextContent('(2)');
  });

  it('counts every option once the whole tree is selected', () => {
    renderTree(['FR']);

    expect(screen.getByRole('button', { name: /Territoire/ })).toHaveTextContent('(3)');
  });

  it('walks from the disclosure button to the first category, then to its select-all checkbox', async () => {
    renderTree([]);

    await openMenu();

    expect(screen.getByRole('button', { name: /Territoire/ })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'France' })).toHaveFocus();

    await userEvent.tab();

    expect(category('France')).toHaveFocus();
  });

  describe('structure DOM cible', () => {
    it('lists the categories, each as an item carrying a header and its options', async () => {
      renderTree([]);

      await openMenu();

      const item = category('France').closest('li');
      expect(item).not.toBeNull();
      expect(item?.parentElement?.tagName).toBe('UL');
    });

    it('keeps the select-all checkbox out of the expand button, and after it', async () => {
      renderTree([]);

      await openMenu();
      const checkbox = category('France');
      const trigger = screen.getByRole('button', { name: 'France' });

      expect(trigger.contains(checkbox)).toBe(false);
      expect(trigger.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('describes what the select-all checkbox does, beyond naming it', async () => {
      renderTree([]);

      await openMenu();
      const checkbox = category('France') as HTMLInputElement;
      const [label] = checkbox.labels ?? [];

      expect(checkbox).not.toHaveAttribute('aria-describedby');
      expect(label).toHaveTextContent(SELECT_ALL_HINT);
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

  it('states, for sighted users too, that a category is selected as a whole', async () => {
    renderTree(['FR']);

    await openMenu();
    await expand('France');
    const options = document.getElementById(
      screen.getByRole('button', { name: 'France' }).getAttribute('aria-controls') as string,
    ) as HTMLElement;
    const hint = options.querySelector('p');

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
