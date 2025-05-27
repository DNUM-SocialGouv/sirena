import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CheckboxCell } from './CheckboxCell';

describe('CheckBoxCell Component', () => {
  const mockRow = { id: 42 } as const;
  const defaultProps = {
    id: 'table-1',
    row: mockRow,
    rowIndex: 0,
    rowId: 'id',
    selected: false,
    onToggleSelect: vi.fn(),
  };

  const wrapWithTable = (children: React.ReactNode) => (
    <table>
      <thead>
        <tr>{children}</tr>
      </thead>
    </table>
  );

  it('renders the checkbox with the correct label and attributes', () => {
    render(wrapWithTable(<CheckboxCell {...defaultProps} />));
    const checkbox = screen.getByLabelText('Sélectionner la ligne 1') as HTMLInputElement;

    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    expect(checkbox).toHaveAttribute('id', 'table-1-checkbox-key-0');
    expect(checkbox).toHaveAttribute('value', '42');
  });

  it('calls onToggleSelect with the correct ID when clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(wrapWithTable(<CheckboxCell {...defaultProps} onToggleSelect={onToggleSelect} />));

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).toHaveBeenCalledWith(42);
  });

  it('renders the checkbox as checked when selected is true', () => {
    render(wrapWithTable(<CheckboxCell {...defaultProps} selected={true} />));
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
