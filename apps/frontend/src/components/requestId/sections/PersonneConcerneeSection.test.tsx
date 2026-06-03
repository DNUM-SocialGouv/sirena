import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonneConcerneeSection } from './PersonneConcerneeSection.js';

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: true }),
}));

describe('PersonneConcerneeSection', () => {
  it('shows positive Mesure de protection with neutral wording in request details', () => {
    const sectionId = 'personne-concernee';

    render(<PersonneConcerneeSection id={sectionId} personne={{ mesureProtection: 'MANDATAIRE_JUDICIAIRE' }} />);

    expect(screen.getByText('Il/Elle est sous mesure de protection : mandataire judiciaire')).toBeInTheDocument();
  });
});
