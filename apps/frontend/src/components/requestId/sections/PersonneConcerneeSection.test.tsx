import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonneConcerneeSection } from './PersonneConcerneeSection.js';

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: true }),
}));

describe('PersonneConcerneeSection', () => {
  it('shows positive Mesure de protection with request detail wording', () => {
    const sectionId = 'personne-concernee';

    render(<PersonneConcerneeSection id={sectionId} personne={{ mesureProtection: 'MANDATAIRE_JUDICIAIRE' }} />);

    expect(screen.getByText('Il/elle est en mesure de protection : mandataire judiciaire')).toBeInTheDocument();
  });
});
