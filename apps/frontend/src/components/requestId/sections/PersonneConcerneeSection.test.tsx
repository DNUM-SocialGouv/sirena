import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PersonneConcerneeSection } from './PersonneConcerneeSection.js';

type PersonneProp = ComponentProps<typeof PersonneConcerneeSection>['personne'];

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: true }),
}));

describe('PersonneConcerneeSection', () => {
  it('shows positive Mesure de protection with request detail wording', () => {
    const sectionId = 'personne-concernee';

    render(
      <PersonneConcerneeSection
        id={sectionId}
        personne={{ mesureProtection: 'MANDATAIRE_JUDICIAIRE' } as PersonneProp}
      />,
    );

    expect(screen.getByText('Il/elle est en mesure de protection : mandataire judiciaire')).toBeInTheDocument();
  });
});
