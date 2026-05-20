import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { CloseRequeteModal } from './CloseRequeteModal';

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'close-requete-modal',
    open: vi.fn(),
    close: vi.fn(),
    Component: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
}));

vi.mock('@/hooks/mutations/closeRequete.hook', () => ({
  useCloseRequete: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteOtherEntitiesAffected: vi.fn(),
}));

const singleActiveEntity = { id: 'ars', nomComplet: 'ARS Bretagne', entiteTypeId: 'ARS', statutId: 'NOUVEAU' };

const mockOtherEntitiesAffectedQuery = (
  query: Pick<ReturnType<typeof useRequeteOtherEntitiesAffected>, 'data' | 'isLoading' | 'error'>,
) => query as unknown as ReturnType<typeof useRequeteOtherEntitiesAffected>;

describe('CloseRequeteModal', () => {
  it('displays a single info alert with the standard closing context', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [singleActiveEntity], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(
      screen.getByText(
        "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/les autres entités administratives affectées ne seront pas impactées par la clôture/),
    ).not.toBeInTheDocument();
  });

  it('loads the standard closing context from other affected entities only', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [singleActiveEntity], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354');
    expect(screen.queryByText(/reçue le/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mis en cause/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('displays multiple active other entities as a bullet list', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: {
          otherEntites: [
            singleActiveEntity,
            { id: 'ddets', nomComplet: 'DDETS 35', entiteTypeId: 'DD', statutId: 'EN_COURS' },
          ],
          subAdministrativeEntites: [],
        },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative :"),
    ).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('ARS Bretagne')).toBeInTheDocument();
    expect(screen.getByText('DDETS 35')).toBeInTheDocument();
  });

  it('displays a non-blocking loading message while the closing context is loading', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({ data: undefined, isLoading: true, error: null }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Chargement des informations de la requête...')).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture (obligatoire)')).toBeInTheDocument();
  });

  it('displays a non-blocking fallback message when the closing context cannot be loaded', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({ data: undefined, isLoading: false, error: new Error('error') }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(
      screen.getByText(
        "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture (obligatoire)')).toBeInTheDocument();
  });

  it('uses provided other affected entities when the query cannot be loaded', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({ data: undefined, isLoading: false, error: new Error('error') }),
    );

    render(<CloseRequeteModal requestId="REQ-354" otherEntitiesAffected={[singleActiveEntity]} />);

    expect(
      screen.getByText(
        "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('uses provided other affected entities immediately for the close proposal flow', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({ data: undefined, isLoading: true, error: null }),
    );

    render(
      <CloseRequeteModal
        requestId="REQ-354"
        otherEntitiesAffected={[{ ...singleActiveEntity, statutId: 'EN_COURS' }]}
      />,
    );

    expect(screen.queryByText('Chargement des informations de la requête...')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Information : votre entité n'est plus en charge du traitement d'aucune situation, vous pouvez clôturer la requête REQ-354.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
