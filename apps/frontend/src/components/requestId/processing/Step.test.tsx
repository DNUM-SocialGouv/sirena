import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, ROLES } from '@sirena/common/constants';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Step } from './Step';

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

vi.mock('@/components/common/statusMenu', () => ({
  StatusMenu: () => null,
}));

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useDeleteProcessingStep: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProcessingStepStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/mutations/updateProcessingStepName.hook', () => ({
  useUpdateProcessingStepName: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/mutations/updateProcessingStepDateRealisation.hook', () => ({
  useUpdateProcessingStepDateRealisation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

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

describe('Step', () => {
  it('displays a closed step using the Date de clôture instead of the technical creation date', () => {
    const closureStep: React.ComponentProps<typeof Step> = {
      requestId: 'REQ-354',
      requeteId: 'REQ-354',
      entiteId: 'ENTITE-1',
      id: 'step-1',
      nom: null,
      type: REQUETE_ETAPE_TYPES.MANUAL,
      statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
      createdAt: '2024-05-20T12:00:00.000Z',
      updatedAt: '2024-05-20T12:00:00.000Z',
      clotureEffectiveDate: '2024-05-18',
      createdBy: { prenom: 'camille', nom: 'dupont' },
      notes: [],
      requete: {
        dematSocialId: null,
        thirdPartyAccountId: null,
        createdBy: null,
      },
      clotureReason: [],
    };

    render(<Step {...closureStep} />);

    expect(screen.getByText(/Requête clôturée le 18\/05\/2024/)).toBeInTheDocument();
    expect(screen.queryByText(/Requête clôturée le 20\/05\/2024/)).not.toBeInTheDocument();
  });
});
