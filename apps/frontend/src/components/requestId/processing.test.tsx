import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { Processing } from './processing';

type RequeteEtapeFixture = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
type OtherEntityAffectedFixture = {
  id: string;
  statutId: string;
  label: string;
  nomComplet: string;
  entiteTypeId: string;
};

const affectedEntity = (id: string, nomComplet: string, entiteTypeId = 'ARS'): OtherEntityAffectedFixture => ({
  id,
  statutId: 'EN_COURS',
  label: nomComplet,
  nomComplet,
  entiteTypeId,
});

let processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: true };
let otherEntitiesAffected: {
  otherEntites: OtherEntityAffectedFixture[];
  subAdministrativeEntites: [];
} = { otherEntites: [], subAdministrativeEntites: [] };
const setOtherEntitiesAffected = (...otherEntites: OtherEntityAffectedFixture[]) => {
  otherEntitiesAffected = { otherEntites, subAdministrativeEntites: [] };
};

let canEditRequest = false;
let selectedEntityId: string | undefined;
let otherEntitiesQueryState = { isLoading: false, isError: false, isPlaceholderData: false };
const navigate = vi.fn();
const foreignEtapePartagee = {
  id: 'foreign-closure',
  requeteId: 'REQ-1',
  entiteId: 'OTHER-ENTITY',
  assignedEntiteId: null,
  assignedEntite: null,
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
  return {
    ...original,
    useNavigate: () => navigate,
    useSearch: () => ({ entiteId: selectedEntityId }),
  };
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
  useRequeteOtherEntitiesAffected: () => ({ data: otherEntitiesAffected, ...otherEntitiesQueryState }),
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
describe('Processing', () => {
  beforeEach(() => {
    processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: true };
    setOtherEntitiesAffected();
    canEditRequest = false;
    selectedEntityId = undefined;
    otherEntitiesQueryState = { isLoading: false, isError: false, isPlaceholderData: false };
    navigate.mockReset();
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

  it('labels the treatment chronology', () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const heading = screen.getByRole('heading', { name: 'Étapes de traitement' });
    expect(heading).toBeInTheDocument();
  });

  it('does not display the other affected entities panel', () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.queryByRole('heading', { name: 'Autres entités affectées' })).not.toBeInTheDocument();
  });

  it('uses the full grid width for the treatment chronology', () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const chronologyColumn = screen.getByRole('heading', { name: 'Étapes de traitement' }).closest('.fr-col-md-12');
    expect(chronologyColumn).toHaveClass('fr-col-lg-12');
  });

  it('shows the entity filter with all entities selected for an eligible request', () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getByRole('group', { name: 'Filtrer par entité' })).toBeInTheDocument();
    expect(screen.getByText('Filtrer par entité')).toHaveClass('fr-segmented__legend--inline');
    expect(screen.getByRole('radio', { name: 'Toutes les entités' })).toBeChecked();
    const currentEntityRadio = screen.getByRole('radio', { name: 'ARS ARS courante' });
    const currentEntityLabel = (currentEntityRadio as HTMLInputElement).labels?.[0];
    expect(currentEntityLabel).toBeTruthy();
    expect(within(currentEntityLabel as HTMLLabelElement).getByText('ARS')).toHaveClass('fr-tag');
    expect(currentEntityLabel?.querySelector('p')).not.toBeInTheDocument();
  });

  it('keeps the labeled filter before the chronology in source order', () => {
    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const filter = screen.getByRole('group', { name: 'Filtrer par entité' });
    const timeline = screen.getByTestId('timeline-line').parentElement as HTMLElement;
    expect(filter.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('supports native keyboard navigation through the labeled segmented group', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const allEntitiesRadio = screen.getByRole('radio', { name: 'Toutes les entités' });
    const currentEntityRadio = screen.getByRole('radio', { name: 'ARS ARS courante' });
    await user.tab();
    expect(allEntitiesRadio).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(currentEntityRadio).toHaveFocus();
    expect(navigate).toHaveBeenCalledOnce();

    selectedEntityId = 'CURRENT-ENTITY';
    rerender(<Processing requestId="REQ-1" requestQuery={requestQuery} />);
    expect(currentEntityRadio).toBeChecked();
  });

  it('replaces an unknown entity filter with the unfiltered URL without hiding the chronology', async () => {
    selectedEntityId = 'UNKNOWN-ENTITY';

    const { rerender } = render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getByRole('radio', { name: 'Toutes les entités' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'CD - Clôture' })).toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    const [{ search, replace }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace?: boolean },
    ];
    expect(search({ entiteId: 'UNKNOWN-ENTITY', preserved: 'value' })).toEqual({
      entiteId: undefined,
      preserved: 'value',
    });
    expect(replace).toBe(true);

    selectedEntityId = undefined;
    rerender(<Processing requestId="REQ-1" requestQuery={requestQuery} />);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('replaces an empty entity filter with the canonical unfiltered URL', async () => {
    selectedEntityId = '';

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getByRole('radio', { name: 'Toutes les entités' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'CD - Clôture' })).toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    const [{ search, replace }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace?: boolean },
    ];
    expect(search({ entiteId: '', preserved: 'value' })).toEqual({
      entiteId: undefined,
      preserved: 'value',
    });
    expect(replace).toBe(true);
  });

  it.each([
    ['the feature flag is disabled', { total: 1, isMultiEntite: true, etapePartageeEnabled: false }],
    ['the request becomes mono-entity', { total: 1, isMultiEntite: false, etapePartageeEnabled: true }],
  ])('removes a now-meaningless filter when %s', async (_scenario, meta) => {
    selectedEntityId = 'OTHER-ENTITY';
    processingMeta = meta;
    setOtherEntitiesAffected(affectedEntity('OTHER-ENTITY', 'CD du Calvados', 'CD'));

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.queryByText('Filtrer par entité')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clôture' })).toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(navigate.mock.calls[0]?.[0]).toMatchObject({ replace: true });
  });

  it('hides a partial filter and preserves the full chronology while affected entities load', () => {
    selectedEntityId = 'OTHER-ENTITY';
    otherEntitiesQueryState = { isLoading: true, isError: false, isPlaceholderData: true };

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.queryByText('Filtrer par entité')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CD - Clôture' })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hides the filter without duplicating errors or filtering chronology when affected entities fail', () => {
    selectedEntityId = 'OTHER-ENTITY';
    otherEntitiesQueryState = { isLoading: false, isError: true, isPlaceholderData: false };

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.queryByText('Filtrer par entité')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CD - Clôture' })).toBeInTheDocument();
    expect(screen.queryByText('Erreur lors du chargement des autres entités affectées.')).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stores a selected entity in the URL history', async () => {
    setOtherEntitiesAffected(affectedEntity('OTHER-ARS', 'ARS Île-de-France'));
    const user = userEvent.setup();

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);
    await user.click(screen.getByRole('radio', { name: 'ARS ARS Île-de-France' }));

    expect(navigate).toHaveBeenCalledOnce();
    const [{ search, replace }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace?: boolean },
    ];
    expect(search({ preserved: 'value' })).toEqual({ preserved: 'value', entiteId: 'OTHER-ARS' });
    expect(replace).not.toBe(true);
  });

  it('restores the URL selection and removes it when all entities are selected', async () => {
    selectedEntityId = 'OTHER-ARS';
    setOtherEntitiesAffected(affectedEntity('OTHER-ARS', 'ARS Île-de-France'));
    const user = userEvent.setup();

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getByRole('radio', { name: 'ARS ARS Île-de-France' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Toutes les entités' }));
    const [{ search }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown> },
    ];
    expect(search({ entiteId: 'OTHER-ARS', preserved: 'value' })).toEqual({
      entiteId: undefined,
      preserved: 'value',
    });
  });

  it('distinguishes the viewer entity color from another entity of the same type', () => {
    setOtherEntitiesAffected(affectedEntity('OTHER-ARS', 'ARS Île-de-France'));

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const currentEntityLabel = (screen.getByRole('radio', { name: 'ARS ARS courante' }) as HTMLInputElement)
      .labels?.[0];
    const otherEntityLabel = (screen.getByRole('radio', { name: 'ARS ARS Île-de-France' }) as HTMLInputElement)
      .labels?.[0];
    expect(within(currentEntityLabel as HTMLLabelElement).getByText('ARS')).toHaveClass('color-pink-tuile');
    expect(within(otherEntityLabel as HTMLLabelElement).getByText('ARS')).toHaveClass('color-yellow-moutarde');
  });

  it('lists the current entity first, then every other affected entity sorted by complete name', () => {
    setOtherEntitiesAffected(
      affectedEntity('ENTITY-Z', 'Conseil départemental du Rhône', 'CD'),
      affectedEntity('ENTITY-A', 'Direction départementale de l’Ain', 'DD'),
      affectedEntity('CURRENT-ENTITY', 'Entité courante en double'),
    );

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.getAllByRole('radio')).toEqual([
      screen.getByRole('radio', { name: 'Toutes les entités' }),
      screen.getByRole('radio', { name: 'ARS ARS courante' }),
      screen.getByRole('radio', { name: 'CD Conseil départemental du Rhône' }),
      screen.getByRole('radio', { name: 'DD Direction départementale de l’Ain' }),
    ]);
  });

  it('uses a Select with every typed option from five affected entities', () => {
    setOtherEntitiesAffected(
      affectedEntity('DREETS-GRAND-EST', 'DREETS Grand Est', 'DREETS'),
      affectedEntity('CD-CALVADOS', 'Conseil départemental du Calvados', 'CD'),
      affectedEntity('ARS-IDF', 'ARS Île-de-France'),
      affectedEntity('DDETS-RHONE', 'DDETS du Rhône', 'DDETS'),
    );

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'Filtrer par entité' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Toutes les entités',
      'ARS courante',
      'ARS Île-de-France',
      'Conseil départemental du Calvados',
      'DDETS du Rhône',
      'DREETS Grand Est',
    ]);
  });

  it('applies a Select URL selection and removes it with all entities', async () => {
    selectedEntityId = 'OTHER-ENTITY';
    setOtherEntitiesAffected(
      affectedEntity('OTHER-ENTITY', 'CD du Calvados', 'CD'),
      ...['A', 'B', 'C'].map((suffix) => affectedEntity(`ENTITY-${suffix}`, `Entité ${suffix}`)),
    );
    requeteEtapes = [
      {
        ...foreignEtapePartagee,
        id: 'current-step',
        nom: 'Étape courante',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        entiteId: 'CURRENT-ENTITY',
        attributedEntiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
      },
      foreignEtapePartagee,
    ];
    const user = userEvent.setup();

    const { rerender } = render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    const select = screen.getByRole('combobox', { name: 'Filtrer par entité' });
    expect(select).toHaveValue('OTHER-ENTITY');
    expect(screen.queryByRole('heading', { name: 'ARS - Étape courante' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CD - Clôture' })).toBeInTheDocument();

    await user.selectOptions(select, '');
    const [{ search, replace }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace?: boolean },
    ];
    expect(search({ entiteId: 'OTHER-ENTITY' })).toEqual({ entiteId: undefined });
    expect(replace).not.toBe(true);

    selectedEntityId = undefined;
    rerender(<Processing requestId="REQ-1" requestQuery={requestQuery} />);
    expect(screen.getByRole('heading', { name: 'ARS - Étape courante' })).toBeInTheDocument();
  });

  it('stores a Select entity change in URL history', async () => {
    setOtherEntitiesAffected(
      ...['A', 'B', 'C', 'D'].map((suffix) => affectedEntity(`ENTITY-${suffix}`, `Entité ${suffix}`)),
    );
    const user = userEvent.setup();

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrer par entité' }), 'ENTITY-C');

    const [{ search, replace }] = navigate.mock.calls[0] as [
      { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace?: boolean },
    ];
    expect(search({ preserved: 'value' })).toEqual({ preserved: 'value', entiteId: 'ENTITY-C' });
    expect(replace).not.toBe(true);
  });

  it('keeps the selected entity steps and every neutral event in backend order', () => {
    selectedEntityId = 'OTHER-ARS';
    setOtherEntitiesAffected(affectedEntity('OTHER-ARS', 'ARS Île-de-France'));
    requeteEtapes = [
      {
        ...foreignEtapePartagee,
        id: 'current-step',
        nom: 'Étape courante',
        entiteId: 'CURRENT-ENTITY',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        attributedEntiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
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
        id: 'selected-entity-step',
        nom: 'Étape étrangère sélectionnée',
        entiteId: 'OTHER-ARS',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        attributedEntiteAdministrative: {
          id: 'OTHER-ARS',
          nomComplet: 'ARS Île-de-France',
          entiteTypeId: 'ARS',
        },
      },
      {
        ...foreignEtapePartagee,
        id: 'neutral-automatic-acknowledgment',
        type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        acknowledgmentSendMode: 'AUTOMATIC',
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
      },
      {
        ...foreignEtapePartagee,
        id: 'other-foreign-step',
        nom: 'Étape d’une autre entité',
        entiteId: 'THIRD-ENTITY',
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        attributedEntiteAdministrative: {
          id: 'THIRD-ENTITY',
          nomComplet: 'CD du Calvados',
          entiteTypeId: 'CD',
        },
      },
    ];

    render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      [...document.querySelectorAll('[data-timeline-item-type] h3')].map((heading) => heading.textContent?.trim()),
    ).toEqual(['Création de la requête', 'ARS - Étape étrangère sélectionnée', "Envoi de l'accusé de réception"]);
  });

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

  it('keeps an immutable assignment under its source filter and hides it under its target filter', () => {
    canEditRequest = true;
    selectedEntityId = 'CURRENT-ENTITY';
    setOtherEntitiesAffected(affectedEntity('ASSIGNED-ENTITY', 'Conseil départemental de Seine-Maritime', 'CD'));
    requeteEtapes = [
      {
        ...foreignEtapePartagee,
        id: 'assignment-step',
        entiteId: 'CURRENT-ENTITY',
        entiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
        attributedEntiteAdministrative: {
          id: 'CURRENT-ENTITY',
          nomComplet: 'ARS courante',
          entiteTypeId: 'ARS',
        },
        assignedEntiteId: 'ASSIGNED-ENTITY',
        assignedEntite: {
          id: 'ASSIGNED-ENTITY',
          nomComplet: 'Conseil départemental de Seine-Maritime',
          entiteTypeId: 'CD',
        },
        nom: 'Affectation Ancien libellé',
        type: REQUETE_ETAPE_TYPES.ASSIGNMENT,
        statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
        dateRealisation: '2026-05-19T10:00:00.000Z',
        createdAt: '2026-05-19T10:00:00.000Z',
        updatedAt: '2026-05-19T10:00:00.000Z',
        createdBy: { prenom: 'jeanne', nom: 'moulon' },
        editable: false,
        canOnlyEditNotes: false,
      },
    ];

    const { rerender } = render(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      screen.getByRole('heading', { name: 'ARS - Affectation Conseil départemental de Seine-Maritime' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ajouté automatiquement (ARS courante) le 19/05/2026')).toBeInTheDocument();
    expect(screen.queryByText(/Jeanne Moulon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fait le/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Modifier l'étape" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Désactiver le rappel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajouter un fichier/ })).not.toBeInTheDocument();

    selectedEntityId = 'ASSIGNED-ENTITY';
    rerender(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      screen.queryByRole('heading', { name: 'ARS - Affectation Conseil départemental de Seine-Maritime' }),
    ).not.toBeInTheDocument();

    selectedEntityId = undefined;
    processingMeta = { total: 1, isMultiEntite: true, etapePartageeEnabled: false };
    rerender(<Processing requestId="REQ-1" requestQuery={requestQuery} />);

    expect(
      screen.getByRole('heading', { name: 'Affectation Conseil départemental de Seine-Maritime' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ajouté automatiquement (ARS courante) le 19/05/2026')).toBeInTheDocument();
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
    expect(screen.queryByRole('group', { name: 'Filtrer par entité' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('group', { name: 'Filtrer par entité' })).not.toBeInTheDocument();
  });
});
