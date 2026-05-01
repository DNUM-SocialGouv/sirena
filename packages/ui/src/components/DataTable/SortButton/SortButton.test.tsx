import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortButton } from './SortButton';

describe('SortButton Component', () => {
  const defaultProps = {
    sort: '',
    sortKey: 'name',
    sortDirection: '' as const,
    onSortChange: vi.fn(),
  };

  it('renders the button with default label and visually hidden sort information', () => {
    render(<SortButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trier/i });

    expect(button).toBeInTheDocument();
    expect(screen.getByText(/trier/i)).toHaveClass('fr-sr-only');
  });

  it('calls onSortChange with asc when currently inactive', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'asc' });
  });

  it('calls onSortChange with desc when initial sort direction is desc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} initialSortDirection="desc" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'desc' });
  });

  it('cycles to desc when already sorted asc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} sort="name" sortDirection="asc" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'desc' });
  });

  it('cycles to asc when already sorted desc with initial sort direction desc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(
      <SortButton
        {...defaultProps}
        sort="name"
        sortDirection="desc"
        initialSortDirection="desc"
        onSortChange={onSortChange}
      />,
    );

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'asc' });
  });

  it('cycles to "" when already sorted desc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} sort="name" sortDirection="desc" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: '', sortDirection: '' });
  });
});
