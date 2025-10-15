import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectWithChildren, type SelectWithChildrenOption } from './SelectWithChildren';

const TEST_OPTIONS: SelectWithChildrenOption[] = [
  {
    label: 'Catégorie A',
    value: 'cat-a',
    children: [
      { label: 'Option A1', value: 'opt-a1' },
      { label: 'Option A2', value: 'opt-a2' },
    ],
  },
  {
    label: 'Catégorie B',
    value: 'cat-b',
    children: [
      { label: 'Option B1', value: 'opt-b1' },
      { label: 'Option B2', value: 'opt-b2' },
    ],
  },
];

const RECURSIVE_OPTIONS: SelectWithChildrenOption[] = [
  {
    label: 'Level 1',
    value: 'level-1',
    children: [
      {
        label: 'Level 2',
        value: 'level-2',
        children: [
          { label: 'Leaf 2.1', value: 'leaf-2-1' },
          {
            label: 'Level 3',
            value: 'level-3',
            children: [
              { label: 'Leaf 3.1', value: 'leaf-3-1' },
              { label: 'Leaf 3.2', value: 'leaf-3-2' },
            ],
          },
        ],
      },
      { label: 'Leaf 1.1', value: 'leaf-1-1' },
    ],
  },
];

describe('SelectWithChildren', () => {
  describe('Rendering', () => {
    it('should render with default label', () => {
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);
      expect(screen.getByText("Motifs qualifiés par l'agent")).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} label="Custom Label" />);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should show placeholder text when no selection', () => {
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);
      expect(screen.getByText('Sélectionner une ou plusieurs options')).toBeInTheDocument();
    });

    it('should show selected count when items are selected', () => {
      render(<SelectWithChildren value={['opt-a1', 'opt-b1']} onChange={vi.fn()} options={TEST_OPTIONS} />);
      expect(screen.getByText('2 options sélectionnées')).toBeInTheDocument();
    });

    it('should display selected items list', () => {
      render(<SelectWithChildren value={['opt-a1', 'opt-b1']} onChange={vi.fn()} options={TEST_OPTIONS} />);
      expect(screen.getByText('Sélectionnés :')).toBeInTheDocument();
      expect(screen.getByText('Option A1')).toBeInTheDocument();
      expect(screen.getByText('Option B1')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when clicking button', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      expect(screen.getByText('Catégorie A')).toBeInTheDocument();
      expect(screen.getByText('Catégorie B')).toBeInTheDocument();
    });

    it('should close dropdown when clicking button again', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);
      expect(screen.getByText('Catégorie A')).toBeInTheDocument();

      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Catégorie A')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate into category when clicking', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      const categoryButton = screen.getByRole('option', { name: /catégorie a/i });
      await user.click(categoryButton);

      expect(screen.getByText('Retour')).toBeInTheDocument();
      expect(screen.getByText('Option A1')).toBeInTheDocument();
      expect(screen.getByText('Option A2')).toBeInTheDocument();
    });

    it('should navigate back when clicking Retour button', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      const categoryButton = screen.getByRole('option', { name: /catégorie a/i });
      await user.click(categoryButton);

      const backButton = screen.getByRole('button', { name: /retour/i });
      await user.click(backButton);

      expect(screen.getByText('Catégorie A')).toBeInTheDocument();
      expect(screen.getByText('Catégorie B')).toBeInTheDocument();
    });

    it('should display category title when navigated into', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      const categoryButton = screen.getByRole('option', { name: /catégorie a/i });
      await user.click(categoryButton);

      expect(screen.getByText('Retour')).toBeInTheDocument();
      expect(screen.getByText('Option A1')).toBeInTheDocument();
    });
  });

  describe('Recursive Navigation', () => {
    it('should navigate through multiple levels', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={RECURSIVE_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      await user.click(screen.getByRole('option', { name: /level 1/i }));
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Leaf 1.1')).toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: /level 2/i }));
      expect(screen.getByText('Leaf 2.1')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: /level 3/i }));
      expect(screen.getByText('Leaf 3.1')).toBeInTheDocument();
      expect(screen.getByText('Leaf 3.2')).toBeInTheDocument();
    });

    it('should navigate back through multiple levels', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={RECURSIVE_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      await user.click(screen.getByRole('option', { name: /level 1/i }));
      await user.click(screen.getByRole('option', { name: /level 2/i }));
      await user.click(screen.getByRole('option', { name: /level 3/i }));

      expect(screen.getByText('Leaf 3.1')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retour/i }));
      expect(screen.getByText('Level 3')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retour/i }));
      expect(screen.getByText('Level 2')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retour/i }));
      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onChange when selecting an option', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SelectWithChildren value={[]} onChange={onChange} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      await user.click(screen.getByRole('option', { name: /catégorie a/i }));

      const checkboxOption = screen.getByRole('option', { name: /option a1/i });
      const checkbox = checkboxOption.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(['opt-a1']);
    });

    it('should call onChange when deselecting an option', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SelectWithChildren value={['opt-a1']} onChange={onChange} options={TEST_OPTIONS} />);

      const buttons = screen.getAllByText('Option A1');
      await user.click(buttons[0]);

      await user.click(screen.getByRole('option', { name: /catégorie a/i }));

      const checkboxOption = screen.getByRole('option', { name: /option a1/i });
      const checkbox = checkboxOption.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('should support multi-select', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SelectWithChildren value={[]} onChange={onChange} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      await user.click(screen.getByRole('option', { name: /catégorie a/i }));

      const checkboxOption1 = screen.getByRole('option', { name: /option a1/i });
      const checkbox1 = checkboxOption1.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(checkbox1);
      expect(onChange).toHaveBeenLastCalledWith(['opt-a1']);

      const checkboxOption2 = screen.getByRole('option', { name: /option a2/i });
      const checkbox2 = checkboxOption2.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(checkbox2);
      expect(onChange).toHaveBeenLastCalledWith(['opt-a2']);
    });

    it('should maintain selection when navigating between categories', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SelectWithChildren value={['opt-a1']} onChange={onChange} options={TEST_OPTIONS} />);

      const buttons = screen.getAllByText('Option A1');
      await user.click(buttons[0]);

      await user.click(screen.getByRole('option', { name: /catégorie a/i }));
      const checkboxOption1 = screen.getByRole('option', { name: /option a1/i });
      const checkbox1 = checkboxOption1.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox1).toBeChecked();

      await user.click(screen.getByRole('button', { name: /retour/i }));
      await user.click(screen.getByRole('option', { name: /catégorie b/i }));

      const checkboxOption2 = screen.getByRole('option', { name: /option b1/i });
      const checkbox2 = checkboxOption2.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await user.click(checkbox2);
      expect(onChange).toHaveBeenCalledWith(['opt-a1', 'opt-b1']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={[]} />);
      expect(screen.getByText('Sélectionner une ou plusieurs options')).toBeInTheDocument();
    });

    it('should handle options without children', async () => {
      const user = userEvent.setup();
      const flatOptions: SelectWithChildrenOption[] = [
        { label: 'Flat Option 1', value: 'flat-1' },
        { label: 'Flat Option 2', value: 'flat-2' },
      ];
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={flatOptions} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      const option1 = screen.getByRole('option', { name: /flat option 1/i });
      const option2 = screen.getByRole('option', { name: /flat option 2/i });
      expect(option1).toBeInTheDocument();
      expect(option2).toBeInTheDocument();
    });

    it('should show fallback for unknown selected values', () => {
      render(<SelectWithChildren value={['unknown-value']} onChange={vi.fn()} options={TEST_OPTIONS} />);
      expect(screen.getAllByText('unknown-value')).toHaveLength(2);
    });

    it('should handle single option with children', async () => {
      const user = userEvent.setup();
      const singleOption: SelectWithChildrenOption[] = [
        {
          label: 'Only Category',
          value: 'only-cat',
          children: [{ label: 'Only Option', value: 'only-opt' }],
        },
      ];
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={singleOption} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);

      await user.click(screen.getByRole('option', { name: /only category/i }));
      expect(screen.getByText('Only Option')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);
      const button = screen.getByText('Sélectionner une ou plusieurs options').closest('button');
      expect(button).toHaveAttribute('id');
      const buttonId = button?.getAttribute('id');
      expect(buttonId).toBeTruthy();
      expect(buttonId).toContain('-button');
    });

    it('should have checkboxes with proper labels', async () => {
      const user = userEvent.setup();
      render(<SelectWithChildren value={[]} onChange={vi.fn()} options={TEST_OPTIONS} />);

      const button = screen.getByText('Sélectionner une ou plusieurs options');
      await user.click(button);
      await user.click(screen.getByRole('option', { name: /catégorie a/i }));

      const checkboxOption1 = screen.getByRole('option', { name: /option a1/i });
      const checkbox1 = checkboxOption1.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const checkboxOption2 = screen.getByRole('option', { name: /option a2/i });
      const checkbox2 = checkboxOption2.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox1).toBeInTheDocument();
      expect(checkbox2).toBeInTheDocument();
    });
  });
});
