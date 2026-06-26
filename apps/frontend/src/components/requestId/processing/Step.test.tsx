import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, ROLES } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: false }),
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
  it('displays a closed step using the Date de clôture instead of the technical creation date', () => {
    const closureStep: React.ComponentProps<typeof Step> = {
      requestId: 'REQ-354',
      requeteId: 'REQ-354',
      entiteId: 'ENTITE-1',
      id: 'step-1',
      nom: '',
      type: REQUETE_ETAPE_TYPES.MANUAL,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: { prenom: 'camille', nom: 'dupont' },
      dateRealisation: null,
      notes: [],
      uploadedFiles: [],
      editable: false,
      ackNotesOnly: false,
      requete: {
        dematSocialId: null,
        createdById: null,
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
      requeteId: 'REQ-354',
      entiteId: 'ENTITE-1',
      id: 'step-1',
      nom: '',
      type: REQUETE_ETAPE_TYPES.MANUAL,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: { prenom: 'camille', nom: 'dupont' },
      dateRealisation: null,
      notes: [],
      uploadedFiles: [],
      editable: false,
      ackNotesOnly: false,
      requete: {
        dematSocialId: null,
        createdById: null,
        thirdPartyAccountId: null,
        createdBy: null,
      },
      clotureReason: [],
    };

    render(<Step {...closureStep} />);

    expect(screen.getByRole('button', { name: /Ajouter un fichier/ })).toBeInTheDocument();
  });

  const makeFile = (overrides: Partial<StepFile> = {}): StepFile => ({
    id: 'file-1',
    size: 22528,
    metadata: { originalName: 'doc.pdf' },
    status: 'READY',
    scanStatus: 'CLEAN',
    sanitizeStatus: 'COMPLETED',
    safeFilePath: null,
    canDelete: true,
    createdAt: '2026-05-19T10:00:00.000Z',
    uploadedBy: { prenom: 'jeanne', nom: 'Moulon' },
    ...overrides,
  });

  const makeStep = (overrides: Partial<StepProps> = {}): StepProps => ({
    requestId: 'REQ-1',
    requeteId: 'REQ-1',
    entiteId: 'ENTITE-1',
    id: 'step-1',
    nom: 'Analyse du MSIP',
    type: REQUETE_ETAPE_TYPES.MANUAL,
    statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
    createdAt: '2026-05-19T10:00:00.000Z',
    updatedAt: '2026-05-19T10:00:00.000Z',
    clotureEffectiveDate: null,
    createdBy: { prenom: 'jeanne', nom: 'moulon' },
    dateRealisation: '2026-05-19T10:00:00.000Z',
    notes: [],
    uploadedFiles: [],
    editable: false,
    ackNotesOnly: false,
    requete: { dematSocialId: null, createdById: 'AGENT-1', thirdPartyAccountId: null, createdBy: null },
    clotureReason: [],
    ...overrides,
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
              uploadedFiles: [],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Note rédigée le 19\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Texte de la note')).toBeInTheDocument();
  });

  it('renders each step-level file as its own "Fichier ajouté le … par …" event', () => {
    render(
      <Step
        {...makeStep({
          uploadedFiles: [
            makeFile({ id: 'f1', metadata: { originalName: 'a.pdf' } }),
            makeFile({ id: 'f2', metadata: { originalName: 'b.pdf' } }),
          ],
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
              metadata: { originalName: 'AR.pdf' },
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
          requete: { dematSocialId: 1, createdById: null, thirdPartyAccountId: null, createdBy: null },
          uploadedFiles: [
            makeFile({
              id: 'ar',
              canDelete: false,
              createdAt: '2026-05-20T10:00:00.000Z',
              uploadedBy: null,
              metadata: { originalName: 'AR.pdf' },
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText(/Envoyé automatiquement le 20\/05\/2026/)).toBeInTheDocument();
  });
});
