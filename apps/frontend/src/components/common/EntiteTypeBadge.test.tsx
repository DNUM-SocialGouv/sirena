import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EntiteTypeBadge } from './EntiteTypeBadge';

describe('EntiteTypeBadge', () => {
  it('keeps the historical color associated with the entity type by default', () => {
    render(<EntiteTypeBadge entiteTypeId="CD" label="CD Calvados" />);

    expect(screen.getByText('CD Calvados')).toHaveClass('color-green-archipel');
    expect(screen.getByText('CD Calvados')).not.toHaveAttribute('data-entity-relation');
  });

  it('uses the relationship color and forwards native attributes when a relation is provided', () => {
    render(
      <EntiteTypeBadge
        entiteTypeId="CD"
        label="CD"
        relation="foreign"
        aria-hidden="true"
        data-testid="foreign-entity-badge"
      />,
    );

    expect(screen.getByTestId('foreign-entity-badge')).toHaveClass('color-yellow-moutarde');
    expect(screen.getByTestId('foreign-entity-badge')).toHaveAttribute('data-entity-relation', 'foreign');
    expect(screen.getByTestId('foreign-entity-badge')).toHaveAttribute('aria-hidden', 'true');
  });
});
