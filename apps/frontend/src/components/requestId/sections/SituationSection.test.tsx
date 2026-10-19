import { LIEU_TYPE } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SituationSection } from './SituationSection.js';

type SituationProp = ComponentProps<typeof SituationSection>['situation'];

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: true }),
}));

const sectionId = 'situation';

const renderWithLieu = (lieuTypeId: string, adresse: { label?: string; rue?: string } | null) =>
  render(
    <SituationSection
      id={sectionId}
      receptionType={null}
      situation={
        {
          id: 'situation-1',
          faits: [],
          lieuDeSurvenue: {
            lieuTypeId,
            lieuType: { id: lieuTypeId, label: lieuTypeId },
            adresse: adresse && { label: '', rue: '', codePostal: '', ville: '', ...adresse },
          },
        } as unknown as SituationProp
      }
    />,
  );

const ADDRESS_LABELS = ['Rue :', 'Adresse :', "Nom de l'établissement :"];

// Address lines in display order, so that a missing or an orphan line fails the comparison.
const getAddressLines = () =>
  [...document.querySelectorAll('p')]
    .filter((p) => ADDRESS_LABELS.includes(p.querySelector('span')?.textContent ?? ''))
    .map((p) => p.textContent?.replace(/\s+/g, ' ').trim());

describe('SituationSection', () => {
  it.each([
    {
      name: 'the street of a trajet place',
      lieuTypeId: LIEU_TYPE.TRAJET,
      adresse: { rue: 'Rue de la Gare' },
      lines: ['Rue : Rue de la Gare'],
    },
    {
      name: 'the label of a trajet place without a street as an address',
      lieuTypeId: LIEU_TYPE.TRAJET,
      adresse: { label: '3 avenue Foch 75016 Paris' },
      lines: ['Adresse : 3 avenue Foch 75016 Paris'],
    },
    {
      name: 'the address of a domicile place',
      lieuTypeId: LIEU_TYPE.DOMICILE,
      adresse: { rue: '12 rue des Lilas' },
      lines: ['Adresse : 12 rue des Lilas'],
    },
    {
      name: 'the street of an establishment without a name',
      lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
      adresse: { rue: '1 place du Parvis' },
      lines: ['Rue : 1 place du Parvis'],
    },
    {
      name: 'the name of an establishment without a street',
      lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
      adresse: { label: 'CHU de Nantes' },
      lines: ["Nom de l'établissement : CHU de Nantes"],
    },
    {
      name: 'the name and the street of an establishment',
      lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
      adresse: { label: 'CHU de Nantes', rue: '1 place du Parvis' },
      lines: ["Nom de l'établissement : CHU de Nantes", 'Rue : 1 place du Parvis'],
    },
    {
      name: 'the name and the street of another kind of establishment',
      lieuTypeId: LIEU_TYPE.AUTRES_ETABLISSEMENTS,
      adresse: { label: 'Crèche Les Lutins', rue: '8 rue Pasteur' },
      lines: ["Nom de l'établissement : Crèche Les Lutins", 'Rue : 8 rue Pasteur'],
    },
    {
      name: 'no address line for an empty address',
      lieuTypeId: LIEU_TYPE.TRAJET,
      adresse: {},
      lines: [],
    },
    {
      name: 'no address line without an address',
      lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
      adresse: null,
      lines: [],
    },
  ])('shows $name', ({ lieuTypeId, adresse, lines }) => {
    renderWithLieu(lieuTypeId, adresse);

    expect(screen.getByText('Type de lieu :')).toBeInTheDocument();
    expect(getAddressLines()).toEqual(lines);
  });
});
