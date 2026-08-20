import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { Processing } from './processing';

type RequeteEtapeFixture = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

let processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: true };
let canEditRequest = false;
const foreignEtapePartagee = {
  id: 'foreign-closure',
  requeteId: 'REQ-1',
  entiteId: 'OTHER-ENTITY',
  entiteAdministrative: {
    id: 'OTHER-ENTITY',
    nomComplet: 'CD du Calvados',
    entiteTypeId: 'CD',
  },
  timelineItemType: 'ENTITY_STEP',
  attributedEntiteAdministrative: {
    id: 'OTHER-ENTITY',
    nomComplet: 'CD du Calvados',
    entiteTypeId: 'CD',
  },
  nom: 'Clôture étrangère',
  type: REQUETE_ETAPE_TYPES.MANUAL,
  estPartagee: true,
  rappelDate: null,
  rappelType: null,
  acknowledgmentSendMode: null,
  acknowledgmentSendOperationId: null,
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
} satisfies RequeteEtapeFixture;
let requeteEtapes: RequeteEtapeFixture[] = [foreignEtapePartagee];

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...original, useNavigate: () => vi.fn() };
});

vi.mock('@/hooks/queries/processingSteps.hook', () => ({
  useProcessingSteps: () => ({
    data: {
      data: requeteEtapes,
      meta: processingMeta,
    },
    error: null,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteOtherEntitiesAffected: () => ({ data: { subAdministrativeEntites: [] } }),
}));

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: canEditRequest, hasEditRole: canEditRequest }),
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

vi.mock('./processing/AddFilesClotureDrawer', () => ({
  AddFilesClotureDrawer: forwardRef(() => null),
}));

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'test-modal',
    open: vi.fn(),
    close: vi.fn(),
    Component: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
}));

vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();
  return {
    ...original,
    Toast: {
      ...original.Toast,
      useToastManager: () => ({ add: vi.fn() }),
    },
  };
});

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useDisableStepRappel: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useDeleteUploadedFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useModalFocusRestore', () => ({
  useModalFocusRestore: () => ({ registerTrigger: vi.fn() }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: { role: string }) => string) => selector({ role: 'WRITER' }),
}));

vi.mock('./processing/StepFormPanel', () => ({ StepFormPanel: () => null }));
vi.mock('./processing/SendAcknowledgmentDrawer', () => ({ SendAcknowledgmentDrawer: () => null }));
vi.mock('./processing/CloseRequeteModal', () => ({ CloseRequeteModal: () => null }));
vi.mock('./processing/ReopenRequeteModal', () => ({ ReopenRequeteModal: () => null }));
vi.mock('./sections/OtherEntitesAffected', () => ({ OtherEntitiesAffected: () => null }));

describe('Processing', () => {
  beforeEach(() => {
    processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: true };
    canEditRequest = false;
    requeteEtapes = [foreignEtapePartagee];
  });

  const requestQuery = {
    data: {
      entiteId: 'CURRENT-ENTITY',
      statutId: REQUETE_STATUT_TYPES.EN_COURS,
      entite: { entiteTypeId: 'ARS', nomComplet: 'ARS courante' },
      requete: { createdById: null },
    },
    error: null,
  } as never;

  it("does not treat another entity's shared closure step as the current entity's closed status", () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      screen.getByText("Accès en lecture seule : l'édition n'est pas disponible avec vos autorisations actuelles."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cette requête est clôturée/)).not.toBeInTheDocument();
    expect(document.querySelector('[data-entity-relation="foreign"]')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-line')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders one neutral creation event in the order supplied by the backend', () => {
    processingMeta = { total: 3, isMultiEntite: true, etapePartageeEnabled: true };
    requeteEtapes = [
      {
        ...foreignEtapePartagee,
        id: 'oldest-step',
        nom: 'Étape la plus ancienne',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      },
      {
        ...foreignEtapePartagee,
        id: 'neutral-creation',
        type: REQUETE_ETAPE_TYPES.CREATION,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
      },
      {
        ...foreignEtapePartagee,
        id: 'newest-step',
        nom: 'Étape la plus récente',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      },
    ];

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      [...document.querySelectorAll('[data-timeline-item-type] h3')].map((heading) => heading.textContent?.trim()),
    ).toEqual(['CD - Étape la plus ancienne', 'Création de la requête', 'CD - Étape la plus récente']);
    expect(screen.getAllByRole('heading', { name: 'Création de la requête' })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Création de la requête' }).closest('[data-timeline-item-type]'),
    ).toHaveAttribute('data-timeline-item-type', 'NEUTRAL_EVENT');
    expect(document.querySelector('[data-entity-relation="neutral"]')).toBeInTheDocument();
  });

  it('renders a pending acknowledgment from an automatic request without mutation actions', () => {
    canEditRequest = true;
    processingMeta = { total: 1, isMultiEntite: false, etapePartageeEnabled: true };
    requeteEtapes = [
      {
        ...foreignEtapePartagee,
        id: 'pending-automatic-acknowledgment',
        entiteId: 'CURRENT-ENTITY',
        entiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
        type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
        statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        attributedEntiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
        editable: false,
        canOnlyEditNotes: false,
        requete: {
          createdById: null,
          dematSocialId: 123,
          sirecId: null,
          thirdPartyAccountId: null,
          createdBy: null,
        },
      },
    ];

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getByRole('heading', { name: "Envoi de l'accusé de réception" })).toBeInTheDocument();
    expect(screen.getByText('À faire')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Modifier l'étape" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
  });

  it('renders each automatic send as one neutral immutable event with one exact source document', () => {
    processingMeta = { total: 3, isMultiEntite: true, etapePartageeEnabled: true };
    const makeAutomaticAcknowledgment = (
      id: string,
      operationId: string,
      fileId: string,
      fileName: string,
    ): RequeteEtapeFixture => ({
      ...foreignEtapePartagee,
      id,
      type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
      statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      acknowledgmentSendMode: 'AUTOMATIC' as const,
      acknowledgmentSendOperationId: operationId,
      timelineItemType: 'NEUTRAL_EVENT',
      attributedEntiteAdministrative: null,
      editable: false,
      canOnlyEditNotes: false,
      uploadedFiles: [
        {
          id: fileId,
          fileName,
          size: 1024,
          status: 'READY',
          scanStatus: 'CLEAN',
          sanitizeStatus: 'COMPLETED',
          canDelete: false,
          createdAt: '2026-06-01T08:00:00.000Z',
          uploadedBy: null,
        },
      ],
    });
    requeteEtapes = [
      makeAutomaticAcknowledgment(
        'later-automatic-acknowledgment',
        '22222222-2222-4222-8222-222222222222',
        'later-document',
        'accuse-reception-later.pdf',
      ),
      makeAutomaticAcknowledgment(
        'first-grouped-automatic-acknowledgment',
        '11111111-1111-4111-8111-111111111111',
        'first-document',
        'accuse-reception-first.pdf',
      ),
      {
        ...foreignEtapePartagee,
        id: 'neutral-creation',
        type: REQUETE_ETAPE_TYPES.CREATION,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
      },
    ];

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getAllByRole('heading', { name: "Envoi de l'accusé de réception" })).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: /CD - Envoi de l'accusé de réception/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('accuse-reception-first.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('accuse-reception-later.pdf').length).toBeGreaterThan(0);
    expect(
      document.querySelector(
        'a[href="/api/requete-etapes/first-grouped-automatic-acknowledgment/file/first-document/safe"]',
      ),
    ).toBeInTheDocument();
    expect(
      document.querySelector('a[href="/api/requete-etapes/later-automatic-acknowledgment/file/later-document/safe"]'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Modifier l'étape" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-entity-relation="neutral"]')).toHaveLength(3);
  });

  it('keeps the historical presentation when the rollout flag is disabled', () => {
    processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: false };

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(document.querySelector('[data-entity-relation]')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clôture' })).toBeInTheDocument();
  });
});
