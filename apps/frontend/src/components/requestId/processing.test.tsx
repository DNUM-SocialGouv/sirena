import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Processing } from './processing';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/queries/processingSteps.hook', () => ({
  useProcessingSteps: () => ({
    data: {
      data: [
        {
          id: 'foreign-closure',
          requeteId: 'REQ-1',
          entiteId: 'OTHER-ENTITY',
          nom: 'Clôture étrangère',
          type: REQUETE_ETAPE_TYPES.MANUAL,
          estPartagee: true,
          statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
          dateRealisation: null,
          clotureEffectiveDate: '2026-07-31',
          createdAt: '2026-07-31T10:00:00.000Z',
          updatedAt: '2026-07-31T10:00:00.000Z',
          editable: false,
          canOnlyEditNotes: false,
          notes: [],
          uploadedFiles: [],
          clotureReason: [],
          createdBy: null,
          requete: {
            createdById: null,
            dematSocialId: null,
            sirecId: null,
            thirdPartyAccountId: null,
            createdBy: null,
          },
        },
      ],
    },
    error: null,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteOtherEntitiesAffected: () => ({ data: { subAdministrativeEntites: [] } }),
}));

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: false, hasEditRole: false }),
}));

vi.mock('@/components/queryStateHandler/queryStateHandler', () => ({
  QueryStateHandler: ({
    children,
    query,
  }: {
    children: (value: { data: unknown }) => React.ReactNode;
    query: { data: unknown };
  }) => children({ data: query.data }),
}));

vi.mock('@/components/common/EntiteTypeBadge', () => ({
  EntiteTypeBadge: () => null,
}));

vi.mock('@/components/requestId/processing/Step', () => ({
  Step: () => <div>Étape étrangère</div>,
}));

vi.mock('./processing/StepFormPanel', () => ({ StepFormPanel: () => null }));
vi.mock('./processing/SendAcknowledgmentDrawer', () => ({ SendAcknowledgmentDrawer: () => null }));
vi.mock('./processing/CloseRequeteModal', () => ({ CloseRequeteModal: () => null }));
vi.mock('./processing/ReopenRequeteModal', () => ({ ReopenRequeteModal: () => null }));
vi.mock('./sections/OtherEntitesAffected', () => ({ OtherEntitiesAffected: () => null }));

describe('Processing', () => {
  it("does not treat another entity's shared closure step as the current entity's closed status", () => {
    render(
      <Processing
        requestId="REQ-1"
        requestQuery={
          {
            data: {
              entiteId: 'CURRENT-ENTITY',
              statutId: REQUETE_STATUT_TYPES.EN_COURS,
              entite: { entiteTypeId: 'ARS', nomComplet: 'ARS courante' },
              requete: { createdById: null },
            },
            error: null,
          } as never
        }
      />,
    );

    expect(
      screen.getByText("Accès en lecture seule : l'édition n'est pas disponible avec vos autorisations actuelles."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cette requête est clôturée/)).not.toBeInTheDocument();
  });
});
