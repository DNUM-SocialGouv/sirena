import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address } from '@/lib/api/fetchAddresses';
import { fetchAddresses } from '@/lib/api/fetchAddresses';
import { AddressSearchField } from './AddressSearchField';

vi.mock('@/lib/api/fetchAddresses', () => ({
  fetchAddresses: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchAddresses);

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: 'a1',
  label: 'Rue de Boulogne 59800 Lille',
  type: 'street',
  name: 'Rue de Boulogne',
  postcode: '59800',
  citycode: '59350',
  city: 'Lille',
  context: '59, Nord',
  ...overrides,
});

function renderField(props: Partial<Parameters<typeof AddressSearchField>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelect = vi.fn();
  const onClear = vi.fn();
  const onTextCommit = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <AddressSearchField
        label="Domicile"
        onSelect={onSelect}
        onClear={onClear}
        onTextCommit={onTextCommit}
        debounceMs={0}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onSelect, onClear, onTextCommit, ...utils };
}

describe('AddressSearchField', () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView, used when highlighting an option.
    Element.prototype.scrollIntoView = vi.fn();
    mockedFetch.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not query the BAN API when hydrated with an existing value', async () => {
    renderField({ value: 'Rue de Boulogne, 59800 Lille' });
    // Give the debounce + query a chance to run before asserting it never fired.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('preserves free text on blur when no suggestion was selected', async () => {
    const { onTextCommit, onSelect } = renderField();
    const input = screen.getByRole('combobox');

    await userEvent.type(input, '12 rue de la paix');
    await userEvent.tab();

    expect(onTextCommit).toHaveBeenCalledWith('12 rue de la paix');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clears the stored address when a selected value is edited', async () => {
    const { onClear } = renderField({ value: 'Rue de Boulogne, 59800 Lille' });
    const input = screen.getByRole('combobox');

    await userEvent.type(input, '!');

    expect(onClear).toHaveBeenCalled();
  });

  it('shows suggestions and selects one on click', async () => {
    mockedFetch.mockResolvedValue([makeAddress()]);
    const { onSelect } = renderField();

    await userEvent.type(screen.getByRole('combobox'), 'boulogne');
    const option = await screen.findByRole('option');
    await userEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rue de Boulogne' }));
  });

  it('highlights an option with ArrowDown and selects it with Enter', async () => {
    mockedFetch.mockResolvedValue([makeAddress()]);
    const { onSelect } = renderField();
    const input = screen.getByRole('combobox');

    await userEvent.type(input, 'boulogne');
    await screen.findByRole('option');

    await userEvent.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant');

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not open suggestions or query when readOnly', async () => {
    renderField({ readOnly: true, value: 'Rue de Boulogne, 59800 Lille' });
    const input = screen.getByRole('combobox');

    expect(input).toHaveAttribute('readonly');
    await userEvent.click(input);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
