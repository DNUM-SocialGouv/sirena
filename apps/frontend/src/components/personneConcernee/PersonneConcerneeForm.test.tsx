import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PersonneConcerneeForm } from './PersonneConcerneeForm';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...original,
    useNavigate: () => vi.fn(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  };
});

const renderForm = (props: Partial<React.ComponentProps<typeof PersonneConcerneeForm>> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PersonneConcerneeForm mode="create" onSave={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
};

const setInputValidity = (input: HTMLInputElement, valid: boolean) => {
  Object.defineProperty(input, 'validity', {
    configurable: true,
    value: { valid },
  });
};

describe('PersonneConcerneeForm', () => {
  it('shows an error, focuses the birth date and does not save when the date is invalid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderForm({ onSave });

    const dateNaissanceInput = screen.getByLabelText('Date de naissance') as HTMLInputElement;
    setInputValidity(dateNaissanceInput, false);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(dateNaissanceInput).toHaveFocus();
    expect(dateNaissanceInput).toHaveClass('fr-input--error');
    expect(
      screen.getByText('Le champ “Date de naissance” n’est pas valide. Format attendu : JJ/MM/AAAA'),
    ).toBeInTheDocument();
  });

  it('saves when the birth date is valid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderForm({ onSave });

    const dateNaissanceInput = screen.getByLabelText('Date de naissance') as HTMLInputElement;
    setInputValidity(dateNaissanceInput, true);
    await user.type(screen.getByLabelText('Nom'), 'Dupont');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Le champ “Date de naissance” n’est pas valide. Format attendu : JJ/MM/AAAA'),
    ).not.toBeInTheDocument();
  });
});
