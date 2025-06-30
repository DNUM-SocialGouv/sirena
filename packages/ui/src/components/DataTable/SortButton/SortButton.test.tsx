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

  it('renders the button with default label and aria-sort', () => {
    render(<SortButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trier/i });

    expect(button).toBeInTheDocument();
  });

  it('calls onSortChange with asc when currently inactive', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'asc' });
  });

  it('cycles to desc when already sorted asc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} sort="name" sortDirection="asc" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: 'name', sortDirection: 'desc' });
  });

  it('cycles to "" when already sorted desc', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} sort="name" sortDirection="desc" onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ sort: '', sortDirection: '' });
  });
});
