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

const renderWithLieu = (lieuTypeId: string, adresse: { label?: string; rue?: string }) =>
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
            adresse: { label: '', rue: '', codePostal: '', ville: '', ...adresse },
          },
        } as unknown as SituationProp
      }
    />,
  );

const getLine = (label: string) => screen.getByText(label).closest('p');

describe('SituationSection', () => {
  it('shows the street of a trajet place', () => {
    renderWithLieu(LIEU_TYPE.TRAJET, { rue: 'Rue de la Gare' });

    expect(getLine('Rue :')).toHaveTextContent('Rue : Rue de la Gare');
  });

  it('shows the address of a domicile place', () => {
    renderWithLieu(LIEU_TYPE.DOMICILE, { rue: '12 rue des Lilas' });

    expect(getLine('Adresse :')).toHaveTextContent('Adresse : 12 rue des Lilas');
  });

  it('shows the street of an establishment without a name', () => {
    renderWithLieu(LIEU_TYPE.ETABLISSEMENT_SANTE, { rue: '1 place du Parvis' });

    expect(getLine('Adresse :')).toHaveTextContent('Adresse : 1 place du Parvis');
    expect(screen.queryByText("Nom de l'établissement :")).not.toBeInTheDocument();
  });

  it('shows the name and the street of an establishment', () => {
    renderWithLieu(LIEU_TYPE.ETABLISSEMENT_SANTE, { label: 'CHU de Nantes', rue: '1 place du Parvis' });

    expect(getLine("Nom de l'établissement :")).toHaveTextContent("Nom de l'établissement : CHU de Nantes");
    expect(getLine('Adresse :')).toHaveTextContent('Adresse : 1 place du Parvis');
  });
});
