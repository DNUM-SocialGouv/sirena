import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TraitementDesFaitsSection from './TraitementDesFaits';

vi.mock('@/hooks/queries/entites.hook', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/queries/entites.hook')>();
  return { ...original, useEntiteDescendants: () => ({ data: [], isLoading: false }) };
});

const entites = [
  { id: 'entite-1', nomComplet: 'ARS Normandie' },
  { id: 'entite-2', nomComplet: "Conseil départemental de L'Eure" },
];

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TraitementDesFaitsSection entites={entites} topEntiteId="entite-1" onChange={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe('TraitementDesFaitsSection — RGAA 11.5', () => {
  it('groups the fields of each entity under a numbered legend', async () => {
    const user = userEvent.setup();

    renderSection();
    expect(screen.getByRole('group', { name: 'Entité en charge n°1' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ajouter une autre entité/ }));

    expect(screen.getByRole('group', { name: 'Entité en charge n°2' })).toBeInTheDocument();
  });

  it('keeps the entity fields inside their own group', () => {
    renderSection();

    const group = screen.getByRole('group', { name: 'Entité en charge n°1' });
    expect(group).toContainElement(screen.getByRole('combobox', { name: /Entité administrative/ }));
  });
});
