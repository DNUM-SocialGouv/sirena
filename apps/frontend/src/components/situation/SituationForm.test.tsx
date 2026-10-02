import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SituationForm } from './SituationForm';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...original,
    useNavigate: () => vi.fn(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  };
});

vi.mock('@/hooks/queries/entites.hook', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/queries/entites.hook')>();
  return { ...original, useEntites: () => ({ data: { data: [] } }) };
});
vi.mock('@/hooks/queries/profile.hook', () => ({ useProfile: () => ({ data: undefined }) }));
vi.mock('@/lib/api/fetchAddresses', () => ({ fetchAddresses: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/api/fetchOrganizations', () => ({ fetchOrganizations: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/api/fetchPractitioners', () => ({ fetchPractitioners: vi.fn().mockResolvedValue([]) }));

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SituationForm mode="create" onSave={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe('SituationForm — RGAA 11.10', () => {
  it('announces upfront that fields are optional unless stated otherwise', () => {
    renderForm();

    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeVisible();
    expect(screen.queryByText('Tous les champs sont facultatifs')).not.toBeInTheDocument();
  });

  it('describes the expected format of the fact dates', () => {
    renderForm();

    for (const label of [/^Date de début des faits/, /^Date de fin des faits/]) {
      expect(screen.getByLabelText(label)).toHaveAccessibleName(/Format attendu : JJ\/MM\/AAAA/);
    }
  });
});
