import { MIS_EN_CAUSE_ETABLISSEMENT_PRECISION, MIS_EN_CAUSE_TYPE } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MisEnCause } from './MisEnCause';

vi.mock('@/lib/api/fetchPractitioners', () => ({
  fetchPractitioners: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/fetchOrganizations', () => ({
  fetchOrganizations: vi.fn().mockResolvedValue([]),
}));

function renderMisEnCause(misEnCause: SituationData['misEnCause']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MisEnCause formData={{ misEnCause } as SituationData} setFormData={vi.fn()} isSaving={false} />
    </QueryClientProvider>,
  );
}

describe('MisEnCause — RGAA 3.2 read-only fields', () => {
  it('renders the RPPS search field as read-only (not disabled) when "no RPPS" is checked', () => {
    // No rpps + an existing identity initialises the "no RPPS" checkbox as checked.
    renderMisEnCause({
      misEnCauseType: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE,
      nom: 'Dupont',
    });

    const search = screen.getByLabelText(/Rechercher le professionnel par numéro RPPS/);
    expect(search).toHaveAttribute('readonly');
    expect(search).not.toBeDisabled();
  });

  it('renders identity fields as read-only (not disabled) when a RPPS is selected', () => {
    renderMisEnCause({
      misEnCauseType: MIS_EN_CAUSE_TYPE.PROFESSIONNEL_SANTE,
      rpps: '10101010101',
      civilite: 'MME',
      nom: 'Dupont',
      prenom: 'Marie',
    });

    for (const label of [/Civilité/, /Nom/, /Prénom/]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute('readonly');
      expect(field).not.toBeDisabled();
    }
  });

  it('renders the FINESS search field as read-only (not disabled) when "no FINESS" is checked', () => {
    renderMisEnCause({
      misEnCauseType: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
      misEnCauseTypePrecision: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAD_MIXTE,
      nomService: 'Service de test',
    });

    const search = screen.getByLabelText(/Rechercher le service par numéro FINESS/);
    expect(search).toHaveAttribute('readonly');
    expect(search).not.toBeDisabled();
  });

  it('renders service fields as read-only (not disabled) when a FINESS is selected', () => {
    renderMisEnCause({
      misEnCauseType: MIS_EN_CAUSE_TYPE.ETABLISSEMENT,
      misEnCauseTypePrecision: MIS_EN_CAUSE_ETABLISSEMENT_PRECISION.SAD_MIXTE,
      finess: '490000031',
      nomService: 'Service de test',
      codePostal: '76000',
      ville: 'Rouen',
    });

    for (const label of [/Nom du service/, /Code postal/, /Ville/]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute('readonly');
      expect(field).not.toBeDisabled();
    }
  });
});
