import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, ROLES } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Step } from './Step';

vi.mock('./AddFilesClotureDrawer', () => ({
  AddFilesClotureDrawer: forwardRef(() => null),
}));

vi.mock('@/components/common/FileDownloadLink', () => ({
  FileDownloadLink: ({ fileName }: { fileName: string }) => <a href="#test">{fileName}</a>,
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

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useDeleteUploadedFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

let canEditRequest = false;
vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: canEditRequest }),
}));

vi.mock('@/hooks/useModalFocusRestore', () => ({
  useModalFocusRestore: () => ({ registerTrigger: vi.fn() }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: { role: string }) => string) => selector({ role: ROLES.WRITER }),
}));

type StepProps = React.ComponentProps<typeof Step>;
type StepFile = StepProps['uploadedFiles'][number];

describe('Step', () => {
  beforeEach(() => {
    canEditRequest = false;
  });

  it('displays a closed step using the Date de clôture instead of the technical creation date', () => {
    const closureStep: React.ComponentProps<typeof Step> = {
      requestId: 'REQ-354',
      isOwner: true,
      isMultiEntite: false,
      requeteId: 'REQ-354',
      entiteId: 'ENTITE-1',
      entiteAdministrative: { id: 'ENTITE-1', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
      id: 'step-1',
      nom: '',
      type: REQUETE_ETAPE_TYPES.MANUAL,
      acknowledgmentSendMode: null,
      acknowledgmentSendOperationId: null,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      dateRealisation: null,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: { prenom: 'camille', nom: 'dupont' },
      notes: [],
      uploadedFiles: [],
      editable: false,
      canOnlyEditNotes: false,
      requete: {
        createdById: null,
        dematSocialId: null,
        sirecId: null,
        thirdPartyAccountId: null,
        createdBy: null,
      },
      clotureReason: [],
    };

    render(<Step {...closureStep} />);

    expect(screen.getByText(/Requête clôturée le 18\/05\/2024/)).toBeInTheDocument();
    expect(screen.queryByText(/Requête clôturée le 20\/05\/2024/)).not.toBeInTheDocument();
  });

  it('shows the "Ajouter un fichier" button on a closure step without note (no precision)', () => {
    const closureStep: React.ComponentProps<typeof Step> = {
      requestId: 'REQ-354',
      isOwner: true,
      isMultiEntite: false,
      requeteId: 'REQ-354',
      entiteId: 'ENTITE-1',
      entiteAdministrative: { id: 'ENTITE-1', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
      id: 'step-1',
      nom: '',
      type: REQUETE_ETAPE_TYPES.MANUAL,
      acknowledgmentSendMode: null,
      acknowledgmentSendOperationId: null,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: { prenom: 'camille', nom: 'dupont' },
      dateRealisation: null,
      notes: [],
      uploadedFiles: [],
      editable: false,
      canOnlyEditNotes: false,
      requete: {
        dematSocialId: null,
        sirecId: null,
        createdById: null,
        thirdPartyAccountId: null,
        createdBy: null,
      },
      clotureReason: [],
    };

    render(<Step {...closureStep} />);

    expect(screen.getByRole('button', { name: /Ajouter un fichier/ })).toBeInTheDocument();
  });

  it('hides every closure file mutation action on a foreign Étape partagée', () => {
    canEditRequest = true;

    const foreignEtapePartagee: React.ComponentProps<typeof Step> = {
      requestId: 'REQ-354',
      isOwner: false,
      isMultiEntite: true,
      requeteId: 'REQ-354',
      entiteId: 'FOREIGN-ENTITE',
      entiteAdministrative: {
        id: 'FOREIGN-ENTITE',
        nomComplet: 'CD du Calvados',
        entiteTypeId: 'CD',
      },
      timelineItemType: 'ENTITY_STEP',
      attributedEntiteAdministrative: {
        id: 'FOREIGN-ENTITE',
        nomComplet: 'CD du Calvados',
        entiteTypeId: 'CD',
      },
      id: 'step-foreign',
      nom: '',
      type: REQUETE_ETAPE_TYPES.MANUAL,
      acknowledgmentSendMode: null,
      acknowledgmentSendOperationId: null,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: null,
      dateRealisation: null,
      notes: [
        {
          id: 'closure-precision',
          texte: 'Contrôles terminés sans anomalie.',
          createdAt: '2024-05-20T12:00:00.000Z',
          author: { prenom: 'camille', nom: 'dupont' },
        },
      ],
      uploadedFiles: [
        {
          id: 'foreign-file',
          size: 10,
          fileName: 'preuve.pdf',
          status: 'READY',
          scanStatus: 'CLEAN',
          sanitizeStatus: 'COMPLETED',
          canDelete: true,
          createdAt: '2024-05-20T12:00:00.000Z',
          uploadedBy: null,
        },
      ],
      editable: false,
      canOnlyEditNotes: false,
      requete: {
        dematSocialId: null,
        sirecId: null,
        createdById: null,
        thirdPartyAccountId: null,
        createdBy: null,
      },
      clotureReason: [{ id: 'HORS_COMPETENCE', label: 'Hors compétence' }],
    };

    render(<Step {...foreignEtapePartagee} />);

    expect(screen.getByText(/Requête clôturée le 18\/05\/2024 par Camille/)).toHaveTextContent(
      /Requête clôturée le 18\/05\/2024 par Camille Dupont \(CD du Calvados\)/,
    );
    expect(screen.getByText('Hors compétence')).toBeInTheDocument();
    expect(screen.getByText('Contrôles terminés sans anomalie.')).toBeInTheDocument();
    expect(screen.getByText('preuve.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajouter un fichier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supprimer le fichier preuve\.pdf/ })).not.toBeInTheDocument();
  });

  const makeFile = (overrides: Partial<StepFile> = {}): StepFile => ({
    id: 'file-1',
    size: 22528,
    fileName: 'doc.pdf',
    status: 'READY',
    scanStatus: 'CLEAN',
    sanitizeStatus: 'COMPLETED',
    canDelete: true,
    createdAt: '2026-05-19T10:00:00.000Z',
    uploadedBy: { prenom: 'jeanne', nom: 'Moulon' },
    ...overrides,
  });

  const makeStep = (overrides: Partial<StepProps> = {}): StepProps => ({
    requestId: 'REQ-1',
    isOwner: true,
    isMultiEntite: false,
    requeteId: 'REQ-1',
    entiteId: 'ENTITE-1',
    entiteAdministrative: { id: 'ENTITE-1', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
    timelineItemType: 'ENTITY_STEP',
    attributedEntiteAdministrative: { id: 'ENTITE-1', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
    id: 'step-1',
    nom: 'Analyse du MSIP',
    type: REQUETE_ETAPE_TYPES.MANUAL,
    acknowledgmentSendMode: null,
    acknowledgmentSendOperationId: null,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    createdAt: '2026-05-19T10:00:00.000Z',
    updatedAt: '2026-05-19T10:00:00.000Z',
    clotureEffectiveDate: null,
    createdBy: { prenom: 'jeanne', nom: 'moulon' },
    dateRealisation: '2026-05-19T10:00:00.000Z',
    notes: [],
    uploadedFiles: [],
    editable: false,
    canOnlyEditNotes: false,
    requete: { dematSocialId: null, sirecId: null, createdById: 'AGENT-1', thirdPartyAccountId: null, createdBy: null },
    clotureReason: [],
    ...overrides,
  });

  it('shows the edit action to another agent from the owner root perimeter', () => {
    canEditRequest = true;

    render(
      <Step
        {...makeStep({
          editable: true,
          createdBy: { prenom: 'autre', nom: 'agent' },
          estPartagee: true,
        })}
      />,
    );

    expect(screen.getByRole('button', { name: "Modifier l'étape" })).toBeInTheDocument();
  });

  it('hides every mutation action on an automatically sent acknowledgment', () => {
    canEditRequest = true;

    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          acknowledgmentSendMode: 'AUTOMATIC',
          acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
          editable: false,
          notes: [
            {
              id: 'system-note',
              texte: 'Information envoyée',
              createdAt: '2026-05-19T10:00:00.000Z',
              author: null,
            },
          ],
          uploadedFiles: [makeFile({ canDelete: false, uploadedBy: null })],
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: "Modifier l'étape" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
    expect(screen.getByText('Information envoyée')).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('attributes a foreign Étape partagée without relying on color', () => {
    canEditRequest = true;

    const { container } = render(
      <Step
        {...makeStep({
          isOwner: false,
          isMultiEntite: true,
          entiteId: 'FOREIGN-ENTITE',
          entiteAdministrative: {
            id: 'FOREIGN-ENTITE',
            nomComplet: 'CD du Calvados',
            entiteTypeId: 'CD',
          },
          attributedEntiteAdministrative: {
            id: 'FOREIGN-ENTITE',
            nomComplet: 'CD du Calvados',
            entiteTypeId: 'CD',
          },
          estPartagee: true,
          editable: false,
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'CD - Analyse du MSIP' })).toBeInTheDocument();
    expect(screen.getByText('CD', { selector: 'p' })).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('CD', { selector: 'p' })).toHaveAttribute('data-entity-relation', 'foreign');
    expect(screen.getByText('CD', { selector: 'p' })).toHaveClass('color-yellow-moutarde');
    expect(screen.getByText(/Ajouté par Jeanne/)).toHaveTextContent(
      /Ajouté par Jeanne Moulon \(CD du Calvados\) le 19\/05\/2026/,
    );
    expect(container.querySelector('[data-entity-relation="foreign"]')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-dot')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: "Modifier l'étape" })).not.toBeInTheDocument();
  });

  it('uses the owner relationship treatment in multi-entity mode', () => {
    const { container } = render(<Step {...makeStep({ isMultiEntite: true })} />);

    expect(screen.getByRole('heading', { name: 'ARS - Analyse du MSIP' })).toBeInTheDocument();
    expect(screen.getByText('ARS', { selector: 'p' })).toHaveAttribute('data-entity-relation', 'owner');
    expect(screen.getByText('ARS', { selector: 'p' })).toHaveClass('color-pink-tuile');
    expect(screen.getByText(/Ajouté par Jeanne/)).toHaveTextContent(
      /Ajouté par Jeanne Moulon \(ARS Normandie\) le 19\/05\/2026/,
    );
    expect(container.querySelector('[data-entity-relation="owner"]')).toBeInTheDocument();
  });

  it('renders the unique creation event neutrally without entity attribution', () => {
    const { container } = render(
      <Step
        {...makeStep({
          id: 'neutral-creation',
          type: REQUETE_ETAPE_TYPES.CREATION,
          isMultiEntite: true,
          timelineItemType: 'NEUTRAL_EVENT',
          attributedEntiteAdministrative: null,
          createdAt: '2026-01-02T08:00:00.000Z',
          requete: {
            dematSocialId: null,
            sirecId: null,
            createdById: 'AGENT-1',
            thirdPartyAccountId: null,
            createdBy: { prenom: 'camille', nom: 'dupont' },
          },
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Création de la requête' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ARS|CD/ })).not.toBeInTheDocument();
    expect(screen.queryByText('ARS', { selector: 'p' })).not.toBeInTheDocument();
    const subtitle = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' && element.textContent === 'Requête créée le 02/01/2026 par Camille Dupont',
    );
    expect(subtitle).not.toHaveTextContent('ARS Normandie');
    expect(container.querySelector('[data-entity-relation="neutral"]')).toHaveAttribute(
      'data-timeline-item-type',
      'NEUTRAL_EVENT',
    );
  });

  it('attributes an Étape d’Accusé de réception à envoyer to its owner Entité administrative', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
          isMultiEntite: true,
          isOwner: false,
          entiteId: 'FOREIGN-ENTITE',
          entiteAdministrative: {
            id: 'FOREIGN-ENTITE',
            nomComplet: 'CD Seine-Maritime',
            entiteTypeId: 'CD',
          },
          attributedEntiteAdministrative: {
            id: 'FOREIGN-ENTITE',
            nomComplet: 'CD Seine-Maritime',
            entiteTypeId: 'CD',
          },
          createdBy: null,
          dateRealisation: null,
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: "CD - Envoi de l'accusé de réception" })).toBeInTheDocument();
    expect(screen.getByText(/Ajouté automatiquement \(CD Seine-Maritime\) le 19\/05\/2026/)).toBeInTheDocument();
  });

  it('keeps the historical title and subtitle in mono-entity mode', () => {
    const { container } = render(<Step {...makeStep()} />);

    expect(screen.getByRole('heading', { name: 'Analyse du MSIP' })).toBeInTheDocument();
    expect(screen.queryByText('ARS', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.getByText(/Ajouté par Jeanne/)).toHaveTextContent(/Ajouté par Jeanne Moulon le 19\/05\/2026/);
    expect(screen.queryByText(/ARS Normandie/)).not.toBeInTheDocument();
    expect(container.querySelector('[data-entity-relation]')).not.toBeInTheDocument();
  });

  it('renders a note block with the "Note rédigée le … par …" wording', () => {
    render(
      <Step
        {...makeStep({
          notes: [
            {
              id: 'note-1',
              texte: 'Texte de la note',
              createdAt: '2026-05-19T10:00:00.000Z',
              author: { prenom: 'jeanne', nom: 'Moulon' },
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Note rédigée le 19\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Texte de la note')).toBeInTheDocument();
  });

  it('hides empty notes (legacy notes that only held files)', () => {
    const author = { prenom: 'jeanne', nom: 'Moulon' };
    render(
      <Step
        {...makeStep({
          notes: [
            { id: 'has-text', texte: 'Contenu réel', createdAt: '2026-05-19T10:00:00.000Z', author },
            { id: 'empty', texte: '', createdAt: '2026-05-18T10:00:00.000Z', author },
            { id: 'whitespace', texte: '   ', createdAt: '2026-05-17T10:00:00.000Z', author },
          ],
        })}
      />,
    );

    expect(screen.getByText('Contenu réel')).toBeInTheDocument();
    // The two empty notes are not rendered — only one note block remains.
    expect(screen.getAllByText(/Note rédigée le/)).toHaveLength(1);
  });

  it('renders each step-level file as its own "Fichier ajouté le … par …" event', () => {
    render(
      <Step
        {...makeStep({
          uploadedFiles: [makeFile({ id: 'f1', fileName: 'a.pdf' }), makeFile({ id: 'f2', fileName: 'b.pdf' })],
        })}
      />,
    );

    expect(screen.getAllByText(/Fichier ajouté le 19\/05\/2026/)).toHaveLength(2);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('derives the manual ACR subtitle from the AR file (Envoyé le … par …)', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          uploadedFiles: [
            makeFile({
              id: 'ar',
              canDelete: false,
              createdAt: '2026-05-20T10:00:00.000Z',
              uploadedBy: { prenom: 'jeanne', nom: 'Moulon' },
              fileName: 'AR.pdf',
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText(/Envoyé le 20\/05\/2026/)).toBeInTheDocument();
  });

  it('shows "Envoyé automatiquement" for an automatic ACR file (no uploadedBy)', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          requete: { dematSocialId: 1, sirecId: null, createdById: null, thirdPartyAccountId: null, createdBy: null },
          uploadedFiles: [
            makeFile({
              id: 'ar',
              canDelete: false,
              createdAt: '2026-05-20T10:00:00.000Z',
              uploadedBy: null,
              fileName: 'AR.pdf',
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText(/Envoyé automatiquement le 20\/05\/2026/)).toBeInTheDocument();
  });

  it('labels the creation step of an automatically-created request as "Fait automatiquement le …"', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.CREATION,
          requete: { dematSocialId: 1, sirecId: null, createdById: null, thirdPartyAccountId: null, createdBy: null },
        })}
      />,
    );

    expect(screen.getByText(/Fait automatiquement le 19\/05\/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Requête créée le/)).not.toBeInTheDocument();
  });

  it('labels the creation step of a manually-created request as "Requête créée le … par …"', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.CREATION,
          requete: {
            dematSocialId: null,
            sirecId: null,
            createdById: 'AGENT-1',
            thirdPartyAccountId: null,
            createdBy: { prenom: 'jeanne', nom: 'moulon' },
          },
        })}
      />,
    );

    expect(screen.getByText(/Requête créée le 19\/05\/2026 par/)).toBeInTheDocument();
    expect(screen.queryByText(/Fait automatiquement/)).not.toBeInTheDocument();
  });

  it('keeps "Requête créée le" (without agent) for a manual request whose author account was deleted', () => {
    render(
      <Step
        {...makeStep({
          type: REQUETE_ETAPE_TYPES.CREATION,
          // No ingestion source id, but createdBy is null (createdById SET NULL on user deletion).
          requete: {
            dematSocialId: null,
            sirecId: null,
            createdById: null,
            thirdPartyAccountId: null,
            createdBy: null,
          },
        })}
      />,
    );

    expect(screen.getByText(/Requête créée le 19\/05\/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Fait automatiquement/)).not.toBeInTheDocument();
  });
});
