import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { ReopenRequeteModal } from './ReopenRequeteModal';

const { mutateAsync, close } = vi.hoisted(() => ({ mutateAsync: vi.fn(), close: vi.fn() }));

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'reopen-requete-modal',
    open: vi.fn(),
    close,
    Component: ({
      children,
      buttons,
    }: {
      children: React.ReactNode;
      buttons: { children: React.ReactNode; onClick: () => void; disabled: boolean }[];
    }) => (
      <div>
        {children}
        {buttons.map((button) => (
          <button key={String(button.children)} type="button" onClick={button.onClick} disabled={button.disabled}>
            {button.children}
          </button>
        ))}
      </div>
    ),
  }),
}));

vi.mock('@/hooks/mutations/reopenRequete.hook', () => ({
  useReopenRequete: () => ({ mutateAsync }),
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteOtherEntitiesAffected: vi.fn(),
}));

type Query = ReturnType<typeof useRequeteOtherEntitiesAffected>;
const setQuery = (query: Pick<Query, 'data' | 'isPlaceholderData' | 'isError'>) =>
  vi.mocked(useRequeteOtherEntitiesAffected).mockReturnValue(query as Query);

const ars = {
  id: 'ars',
  label: 'ARS Bretagne',
  nomComplet: 'ARS Bretagne',
  entiteTypeId: 'ARS',
  statutId: 'NOUVEAU',
} as const;

const confirmation =
  'Êtes-vous sûr de vouloir rouvrir cette requête ? La requête repassera au statut « En cours » et sera de nouveau modifiable.';

describe('ReopenRequeteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
    setQuery({
      data: { otherEntites: [ars], subAdministrativeEntites: [] },
      isPlaceholderData: false,
      isError: false,
    });
  });

  it.each([
    { names: ['DDETS du Nord', 'ARS Bretagne'], expected: 'ARS Bretagne et DDETS du Nord' },
    {
      names: ['DDETS du Nord', 'Conseil départemental du Calvados', 'ARS Bretagne'],
      expected: 'ARS Bretagne, Conseil départemental du Calvados et DDETS du Nord',
    },
  ])('sorts and names every recipient, including closed treatments: $expected', ({ names, expected }) => {
    setQuery({
      data: {
        otherEntites: names.map((nomComplet) => ({ ...ars, id: nomComplet, nomComplet, statutId: 'CLOTUREE' })),
        subAdministrativeEntites: [],
      },
      isPlaceholderData: false,
      isError: false,
    });

    render(<ReopenRequeteModal requestId="REQ-354" />);

    expect(screen.getByText(`Cette étape sera visible par ${expected}.`)).toBeInTheDocument();
  });

  it.each([
    { state: 'loading with placeholder data', isPlaceholderData: true, isError: false, fallback: true },
    { state: 'failed retrieval', isPlaceholderData: false, isError: true, fallback: true },
    { state: 'no other affected entity', isPlaceholderData: false, isError: false, fallback: false },
  ])('keeps reopening available with $state', async ({ isPlaceholderData, isError, fallback }) => {
    setQuery({
      data: { otherEntites: [], subAdministrativeEntites: [] },
      isPlaceholderData,
      isError,
    });
    render(<ReopenRequeteModal requestId="REQ-354" />);

    if (fallback) {
      expect(
        screen.getByText('Cette étape sera visible par les autres entités administratives affectées à la requête.'),
      ).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Cette étape sera visible/)).not.toBeInTheDocument();
    }

    const submit = screen.getByRole('button', { name: 'Rouvrir la requête' });
    expect(submit).toBeEnabled();

    await userEvent.click(submit);

    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
  });

  it('cancels without reopening', async () => {
    render(<ReopenRequeteModal requestId="REQ-354" />);

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('disables both actions while reopening is pending', async () => {
    mutateAsync.mockReturnValueOnce(new Promise(() => {}));

    render(<ReopenRequeteModal requestId="REQ-354" />);

    await userEvent.click(screen.getByRole('button', { name: 'Rouvrir la requête' }));

    expect(screen.getByRole('button', { name: 'Réouverture en cours...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the visibility message and allows retry after a reopening failure', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('reopening failed'));

    render(<ReopenRequeteModal requestId="REQ-354" />);

    await userEvent.click(screen.getByRole('button', { name: 'Rouvrir la requête' }));

    expect(await screen.findByText('Une erreur est survenue. Veuillez réessayer.')).toBeInTheDocument();
    expect(screen.getByText('Cette étape sera visible par ARS Bretagne.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rouvrir la requête' })).toBeEnabled();
    expect(close).not.toHaveBeenCalled();
  });

  it('names the other affected entity after confirmation and before the action', async () => {
    render(<ReopenRequeteModal requestId="REQ-354" />);

    const message = screen.getByText('Cette étape sera visible par ARS Bretagne.');
    const submit = screen.getByRole('button', { name: 'Rouvrir la requête' });
    expect(
      screen.getByText(confirmation).compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(message.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(useRequeteOtherEntitiesAffected).toHaveBeenCalledWith('REQ-354');

    await userEvent.click(submit);
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
    expect(close).toHaveBeenCalledOnce();
  });
});
