import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRequeteDetails, useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
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
  useRequeteDetails: vi.fn(),
  useRequeteOtherEntitiesAffected: vi.fn(),
}));

describe('CloseRequeteModal', () => {
  it('displays a single info alert with the standard closing context', () => {
    vi.mocked(useRequeteDetails).mockReturnValue({ data: null, isLoading: false, error: null } as ReturnType<
      typeof useRequeteDetails
    >);
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useRequeteOtherEntitiesAffected>);
    render(
      <CloseRequeteModal
        requestId="REQ-354"
        receptionDate="2024-03-15T00:00:00.000Z"
        situations={[{ misEnCause: { nom: 'EHPAD Les Lilas' } }]}
        otherEntitiesAffected={[{ id: 'ars', nomComplet: 'ARS Bretagne', entiteTypeId: 'ARS', statutId: 'NOUVEAU' }]}
      />,
    );

    expect(screen.getByText(/Vous allez clôturer la requête REQ-354 reçue le 15\/03\/2024/)).toBeInTheDocument();
    expect(
      screen.getByText(/Le traitement de la requête sera toujours en cours au ARS Bretagne\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/les autres entités administratives affectées ne seront pas impactées par la clôture/),
    ).not.toBeInTheDocument();
  });

  it('loads the standard closing context from request details and other affected entities', () => {
    vi.mocked(useRequeteDetails).mockReturnValue({
      data: {
        requete: {
          receptionDate: '2024-03-15T00:00:00.000Z',
          situations: [{ misEnCause: { nom: 'EHPAD Les Lilas' } }],
        },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useRequeteDetails>);
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue({
      data: {
        otherEntites: [{ id: 'ars', nomComplet: 'ARS Bretagne', entiteTypeId: 'ARS', statutId: 'NOUVEAU' }],
        subAdministrativeEntites: [],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useRequeteOtherEntitiesAffected>);

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(useRequeteDetails).toHaveBeenCalledWith('REQ-354');
    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354');
    expect(screen.getByText(/Vous allez clôturer la requête REQ-354 reçue le 15\/03\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/avec pour mis en cause EHPAD Les Lilas/)).toBeInTheDocument();
    expect(
      screen.getByText(/Le traitement de la requête sera toujours en cours au ARS Bretagne\./),
    ).toBeInTheDocument();
  });

  it('displays a non-blocking loading message while the closing context is loading', () => {
    vi.mocked(useRequeteDetails).mockReturnValue({ data: undefined, isLoading: true, error: null } as ReturnType<
      typeof useRequeteDetails
    >);
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useRequeteOtherEntitiesAffected>);

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Chargement des informations de la requête...')).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture (obligatoire)')).toBeInTheDocument();
  });

  it('displays a non-blocking fallback message when the closing context cannot be loaded', () => {
    vi.mocked(useRequeteDetails).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('error'),
    } as ReturnType<typeof useRequeteDetails>);
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('error'),
    } as ReturnType<typeof useRequeteOtherEntitiesAffected>);

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Vous allez clôturer la requête REQ-354.')).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture (obligatoire)')).toBeInTheDocument();
  });
});
