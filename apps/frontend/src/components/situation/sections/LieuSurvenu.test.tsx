import { LIEU_TYPE } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LieuSurvenu } from './LieuSurvenu';

vi.mock('@/lib/api/fetchOrganizations', () => ({
  fetchOrganizations: vi.fn().mockResolvedValue([]),
}));

function renderLieu(lieuDeSurvenue: SituationData['lieuDeSurvenue']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LieuSurvenu formData={{ lieuDeSurvenue } as SituationData} setFormData={vi.fn()} isSaving={false} />
    </QueryClientProvider>,
  );
}

describe('LieuSurvenu — RGAA 3.2 read-only fields', () => {
  it('renders establishment fields as read-only (not disabled) when a FINESS is selected', () => {
    renderLieu({
      lieuType: LIEU_TYPE.ETABLISSEMENT_SANTE,
      finess: '490000031',
      adresse: { label: 'CHU de Rouen', codePostal: '76000', ville: 'Rouen' },
    });

    for (const label of [/Nom de l'établissement/, /Code postal/, /Ville/]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute('readonly');
      expect(field).not.toBeDisabled();
    }
  });

  it('renders the FINESS search field as read-only (not disabled) when "no FINESS" is checked', () => {
    // No finess + an existing address name initialises the "no FINESS" checkbox as checked.
    renderLieu({
      lieuType: LIEU_TYPE.ETABLISSEMENT_SANTE,
      adresse: { label: 'Clinique de test' },
    });

    const search = screen.getByLabelText(/Rechercher l'établissement par numéro FINESS/);
    expect(search).toHaveAttribute('readonly');
    expect(search).not.toBeDisabled();
  });
});
