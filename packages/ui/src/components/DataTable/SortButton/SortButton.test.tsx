import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortButton } from './SortButton';

describe('SortButton Component', () => {
  const defaultProps = {
    sort: '',
    sortKey: 'name',
    sortDirection: '' as const,
    onSortChange: vi.fn(),
    label: 'trier',
  };

  const clickSortButton = async (props: Partial<Parameters<typeof SortButton>[0]> = {}) => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<SortButton {...defaultProps} {...props} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button'));

    return onSortChange;
  };

  it('renders the button with default label and visually hidden sort information', () => {
    render(<SortButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trier/i });

    expect(button).toBeInTheDocument();
    expect(screen.getByText(/trier/i)).toHaveClass('fr-sr-only');
  });

  it.each([
    { props: {}, expected: { sort: 'name', sortDirection: 'asc' } },
    { props: { initialSortDirection: 'desc' as const }, expected: { sort: 'name', sortDirection: 'desc' } },
    {
      props: { sort: 'name' as const, sortDirection: 'asc' as const },
      expected: { sort: 'name', sortDirection: 'desc' },
    },
    {
      props: { sort: 'name' as const, sortDirection: 'desc' as const, initialSortDirection: 'desc' as const },
      expected: { sort: 'name', sortDirection: 'asc' },
    },
    { props: { sort: 'name' as const, sortDirection: 'desc' as const }, expected: { sort: '', sortDirection: '' } },
  ])('calls onSortChange with $expected', async ({ props, expected }) => {
    const onSortChange = await clickSortButton(props);

    expect(onSortChange).toHaveBeenCalledWith(expected);
  });
});
