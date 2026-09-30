import { LIEU_DOMICILE_PRECISION, LIEU_TYPE } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Address, fetchAddresses } from '@/lib/api/fetchAddresses';
import { LieuSurvenu } from './LieuSurvenu';

vi.mock('@/lib/api/fetchOrganizations', () => ({
  fetchOrganizations: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/fetchAddresses', () => ({
  fetchAddresses: vi.fn(),
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

const makeAddress = (overrides: Partial<Address>): Address => ({
  id: 'a1',
  label: '',
  type: 'housenumber',
  name: '',
  postcode: '',
  citycode: '',
  city: '',
  context: '',
  ...overrides,
});

function renderStatefulLieu(lieuDeSurvenue: SituationData['lieuDeSurvenue']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let latest = { lieuDeSurvenue } as SituationData;
  function Harness() {
    const [formData, setFormData] = useState<SituationData>(latest);
    latest = formData;
    return <LieuSurvenu formData={formData} setFormData={setFormData} isSaving={false} />;
  }
  render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
  return { getFormData: () => latest };
}

describe('LieuSurvenu — BAN address search', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(fetchAddresses).mockReset().mockResolvedValue([]);
  });

  it.each([
    undefined,
    LIEU_DOMICILE_PRECISION.CHEZ_TIERS,
    LIEU_DOMICILE_PRECISION.HABITAT_INCLUSIF,
    LIEU_DOMICILE_PRECISION.AUTRE,
  ])('shows the address search for a domicile with precision %s', (lieuPrecision) => {
    renderLieu({ lieuType: LIEU_TYPE.DOMICILE, lieuPrecision });

    expect(screen.getByRole('combobox', { name: /Domicile/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: "Remplir l'adresse manuellement" })).toBeInTheDocument();
  });

  it.each([
    LIEU_DOMICILE_PRECISION.PERSONNE_CONCERNEE,
    LIEU_DOMICILE_PRECISION.REQUERANT,
    LIEU_DOMICILE_PRECISION.EQUIPES_MOBILES,
  ])('hides the address for a domicile with precision %s', (lieuPrecision) => {
    renderLieu({ lieuType: LIEU_TYPE.DOMICILE, lieuPrecision });

    expect(screen.queryByRole('combobox', { name: /Domicile/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: "Remplir l'adresse manuellement" })).not.toBeInTheDocument();
  });

  it('keeps the establishment name and adds the address search for other establishments', () => {
    renderLieu({ lieuType: LIEU_TYPE.AUTRES_ETABLISSEMENTS });

    expect(screen.getByRole('textbox', { name: "Nom de l'établissement" })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Adresse de l'établissement/ })).toBeInTheDocument();
  });

  it('does not add the address search to FINESS establishments', () => {
    renderLieu({ lieuType: LIEU_TYPE.ETABLISSEMENT_SANTE });

    expect(screen.queryByRole('combobox', { name: /Domicile|Adresse de l'établissement/ })).not.toBeInTheDocument();
  });

  it('fills only the postcode and city when a city is selected', async () => {
    vi.mocked(fetchAddresses).mockResolvedValue([
      makeAddress({ type: 'municipality', name: 'Lille', postcode: '59000', city: 'Lille' }),
    ]);
    const { getFormData } = renderStatefulLieu({ lieuType: LIEU_TYPE.DOMICILE });

    await userEvent.type(screen.getByRole('combobox', { name: /Domicile/ }), 'lill');
    await userEvent.click(await screen.findByRole('option', { name: /Lille/ }));

    expect(getFormData().lieuDeSurvenue?.adresse).toMatchObject({ rue: '', codePostal: '59000', ville: 'Lille' });
  });

  it('fills the street, postcode and city and keeps the establishment name when an address is selected', async () => {
    vi.mocked(fetchAddresses).mockResolvedValue([
      makeAddress({ name: '8 Rue de Magny', postcode: '77700', city: 'Bailly-Romainvilliers' }),
    ]);
    const { getFormData } = renderStatefulLieu({
      lieuType: LIEU_TYPE.AUTRES_ETABLISSEMENTS,
      adresse: { label: 'Salon Beauté' },
    });

    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'établissement/ }), '8 rue de mag');
    await userEvent.click(await screen.findByRole('option', { name: /8 Rue de Magny/ }));

    expect(getFormData().lieuDeSurvenue?.adresse).toEqual({
      label: 'Salon Beauté',
      rue: '8 Rue de Magny',
      codePostal: '77700',
      ville: 'Bailly-Romainvilliers',
    });
  });
});
