import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeclarantForm } from './DeclarantForm';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...original,
    useNavigate: () => vi.fn(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  };
});

const renderForm = (props: Partial<React.ComponentProps<typeof DeclarantForm>> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeclarantForm mode="create" onSave={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
};

describe('DeclarantForm', () => {
  it('announces upfront that fields are optional unless stated otherwise', () => {
    renderForm();

    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeVisible();
  });

  // The phone hint wraps onto a second line well before the email one does, which offsets its
  // input below the email field unless both columns opt into the shared alignment.
  it('keeps the fields of the phone and email row aligned', () => {
    renderForm();

    for (const label of [/^Numéro de téléphone/, /^Courrier électronique/]) {
      expect(screen.getByLabelText(label).closest('[class*="alignedField"]')).not.toBeNull();
    }
  });

  describe('"le déclarant est la personne concernée" prompt', () => {
    const callOut = () => screen.queryByTestId('declarant-personne-concernee-callout');
    const warning = () => screen.queryByTestId('declarant-personne-concernee-warning');
    const checkbox = () => screen.getByTestId('declarant-est-personne-concernee');

    it('stays hidden when the form opens on an already saved checked box', () => {
      renderForm({ mode: 'edit', initialData: { estPersonneConcernee: true } });

      expect(callOut()).toBeNull();
      expect(warning()).toBeNull();
    });

    it('invites to save once the user checks the box on an empty form', async () => {
      renderForm();

      await userEvent.click(checkbox());

      expect(callOut()).toBeVisible();
      expect(warning()).toBeNull();
    });

    it('warns about the data loss instead when the user checks the box on a filled form', async () => {
      renderForm({ mode: 'edit', initialData: { nom: 'Dupont' } });

      await userEvent.click(checkbox());

      expect(warning()).toBeVisible();
      expect(callOut()).toBeNull();
    });

    it('invites to save again when the user unchecks then rechecks the box', async () => {
      renderForm({ mode: 'edit', initialData: { estPersonneConcernee: true } });

      await userEvent.click(checkbox());
      await userEvent.click(checkbox());

      expect(callOut()).toBeVisible();
    });

    it('warns again when the user rechecks the box over saved declarant data', async () => {
      renderForm({ mode: 'edit', initialData: { estPersonneConcernee: true, nom: 'Dupont' } });

      await userEvent.click(checkbox());
      await userEvent.click(checkbox());

      expect(warning()).toBeVisible();
      expect(callOut()).toBeNull();
    });
  });

  it('labels the lien precision field without a placeholder', () => {
    renderForm({ initialData: { lienAvecPersonneConcernee: 'AUTRE' } });

    const input = screen.getByLabelText('Précision du lien avec la personne concernée');

    expect(input).toBeVisible();
    expect(input).not.toHaveAttribute('placeholder');
  });
});
