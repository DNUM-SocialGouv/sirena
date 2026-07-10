import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { CloseRequeteModal } from './CloseRequeteModal';

const closeRequeteMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'close-requete-modal',
    open: vi.fn(),
    close: vi.fn(),
    Component: ({
      children,
      buttons,
    }: {
      children: React.ReactNode;
      buttons: { children: React.ReactNode; onClick: () => void }[];
    }) => (
      <div>
        {children}
        {buttons.map((button) => (
          <button key={String(button.children)} type="button" onClick={button.onClick}>
            {button.children}
          </button>
        ))}
      </div>
    ),
  }),
}));

vi.mock('@/hooks/mutations/closeRequete.hook', () => ({
  useCloseRequete: () => ({ mutateAsync: closeRequeteMutateAsync }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteOtherEntitiesAffected: vi.fn(),
}));

const singleActiveEntity = {
  id: 'ars',
  label: 'ARS BRET',
  nomComplet: 'ARS Bretagne',
  entiteTypeId: 'ARS',
  statutId: 'NOUVEAU',
} as const;

const mockOtherEntitiesAffectedQuery = (
  query: Pick<ReturnType<typeof useRequeteOtherEntitiesAffected>, 'data' | 'isLoading' | 'error'>,
) => query as unknown as ReturnType<typeof useRequeteOtherEntitiesAffected>;

describe('CloseRequeteModal', () => {
  beforeEach(() => {
    closeRequeteMutateAsync.mockClear();
  });
  it('displays a single info alert with the direct closing context from the treatment tab', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [singleActiveEntity], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Information : vous allez clôturer la requête REQ-354.')).toBeInTheDocument();
    expect(screen.queryByText(/votre entité n'est plus en charge du traitement/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Le traitement de la requête sera toujours en cours pour l'entité administrative ARS Bretagne."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/les autres entités administratives affectées ne seront pas impactées par la clôture/),
    ).not.toBeInTheDocument();
  });

  it('loads the direct closing context from other affected entities only', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [singleActiveEntity], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354', { enabled: true });
    expect(screen.queryByText(/reçue le/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mis en cause/)).not.toBeInTheDocument();
    expect(screen.getByText('Information : vous allez clôturer la requête REQ-354.')).toBeInTheDocument();
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
            { id: 'ddets', nomComplet: 'DDETS 35', label: 'DDETS 35', entiteTypeId: 'DD', statutId: 'EN_COURS' },
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
    expect(screen.getByText('Raisons de la clôture')).toBeInTheDocument();
  });

  it('displays a non-blocking direct fallback message when the closing context cannot be loaded', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({ data: undefined, isLoading: false, error: new Error('error') }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Information : vous allez clôturer la requête REQ-354.')).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture')).toBeInTheDocument();
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
    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354', { enabled: false });
  });

  it('displays the required-fields legend and expected field labels', () => {
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByText('Sauf mention contraire, tous les champs sont obligatoires.')).toBeInTheDocument();
    expect(screen.getByText('Raisons de la clôture')).toBeInTheDocument();
    expect(screen.getByText('Précisions (facultatif)')).toBeInTheDocument();
    expect(screen.getByText('Pièces jointes (facultatif)')).toBeInTheDocument();
  });

  it('displays a required Date de clôture field defaulting to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-20T22:30:00.000Z'));
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    expect(screen.getByLabelText(/^Date de clôture/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/^Date de clôture/)).toHaveValue('2024-05-21');

    vi.useRealTimers();
  });

  it('shows a field-level error and does not close when Date de clôture is empty', async () => {
    const user = userEvent.setup();
    closeRequeteMutateAsync.mockResolvedValue({});
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    await user.clear(screen.getByLabelText(/^Date de clôture/));
    await user.click(screen.getByRole('button', { name: 'Clôturer la requête' }));

    expect(screen.getByText('Vous devez renseigner une date de clôture pour clôturer la requête.')).toBeInTheDocument();
    expect(closeRequeteMutateAsync).not.toHaveBeenCalled();
  });

  it('submits the Date de clôture with selected reasons', async () => {
    const user = userEvent.setup();
    closeRequeteMutateAsync.mockResolvedValue({});
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    await user.click(screen.getByText('Sélectionner une ou plusieurs options'));
    await user.click(
      screen.getByRole('checkbox', { name: "Mesures correctives prises par l'établissement / le mis en cause" }),
    );
    await user.clear(screen.getByLabelText(/^Date de clôture/));
    await user.type(screen.getByLabelText(/^Date de clôture/), '2024-05-19');
    await user.click(screen.getByRole('button', { name: 'Clôturer la requête' }));

    expect(closeRequeteMutateAsync).toHaveBeenCalledWith({
      reasonIds: ['MESURES_CORRECTIVES'],
      clotureEffectiveDate: '2024-05-19',
      precision: undefined,
      fileIds: undefined,
    });
  });

  it('shows a field-level error and does not close when Date de clôture is in the future', async () => {
    const user = userEvent.setup();
    closeRequeteMutateAsync.mockResolvedValue({});
    vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(
      mockOtherEntitiesAffectedQuery({
        data: { otherEntites: [], subAdministrativeEntites: [] },
        isLoading: false,
        error: null,
      }),
    );

    render(<CloseRequeteModal requestId="REQ-354" />);

    await user.clear(screen.getByLabelText(/^Date de clôture/));
    await user.type(screen.getByLabelText(/^Date de clôture/), '2999-01-01');
    await user.click(screen.getByRole('button', { name: 'Clôturer la requête' }));

    expect(screen.getByText('La date de clôture ne peut pas être dans le futur.')).toBeInTheDocument();
    expect(closeRequeteMutateAsync).not.toHaveBeenCalled();
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
    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354', { enabled: false });
  });
});
