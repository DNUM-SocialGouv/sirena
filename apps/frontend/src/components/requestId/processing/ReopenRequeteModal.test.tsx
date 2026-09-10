import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { fetchRequeteOtherEntitiesAffected } from '@/lib/api/fetchRequetesEntite';
import { type ReopenRequeteModalRef, ReopenRequeteModal as ReopenRequeteModalView } from './ReopenRequeteModal';

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

vi.mock('@/lib/api/fetchRequetesEntite', () => ({
  fetchRequeteOtherEntitiesAffected: vi.fn(),
}));

const ReopenRequeteModal = forwardRef<ReopenRequeteModalRef, { requestId: string }>(({ requestId }, ref) => {
  const otherEntitiesQuery = useRequeteOtherEntitiesAffected(requestId);
  return (
    <ReopenRequeteModalView
      ref={ref}
      requestId={requestId}
      otherEntitiesQuery={otherEntitiesQuery}
      onRefreshRecipients={otherEntitiesQuery.refetch}
    />
  );
});

const ModalWithTrigger = () => {
  const modal = useRef<ReopenRequeteModalRef>(null);
  const handleOpen = () => modal.current?.openModal();
  return (
    <>
      <button type="button" onClick={handleOpen}>
        Ouvrir la confirmation
      </button>
      <ReopenRequeteModal ref={modal} requestId="REQ-354" />
    </>
  );
};

const renderWithRecipientQuery = async (otherEntites: NonNullable<Query['data']>['otherEntites'] | null = [ars]) => {
  const actual = await vi.importActual<typeof import('@/hooks/queries/useRequeteDetails')>(
    '@/hooks/queries/useRequeteDetails',
  );
  vi.mocked(useRequeteOtherEntitiesAffected).mockImplementation(actual.useRequeteOtherEntitiesAffected);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (otherEntites !== null) {
    queryClient.setQueryData(['requeteOtherEntitiesAffected', 'REQ-354'], {
      otherEntites,
      subAdministrativeEntites: [],
    });
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <ModalWithTrigger />
    </QueryClientProvider>,
  );
};

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
    vi.mocked(fetchRequeteOtherEntitiesAffected).mockReset();
    mutateAsync.mockResolvedValue(undefined);
    setQuery({
      data: { otherEntites: [ars], subAdministrativeEntites: [] },
      isPlaceholderData: false,
      isError: false,
    });
  });

  it('displays the recipients supplied by the page and follows their updates', () => {
    const query = {
      data: { otherEntites: [{ ...ars, nomComplet: 'DDETS du Nord' }], subAdministrativeEntites: [] },
      isError: false,
      isPaused: false,
      isPlaceholderData: false,
    };
    const refresh = vi.fn();
    const { rerender } = render(
      <ReopenRequeteModalView requestId="REQ-354" otherEntitiesQuery={query} onRefreshRecipients={refresh} />,
    );

    expect(screen.getByText('Cette étape sera visible par DDETS du Nord.')).toBeInTheDocument();

    rerender(
      <ReopenRequeteModalView
        requestId="REQ-354"
        otherEntitiesQuery={{ ...query, data: { otherEntites: [], subAdministrativeEntites: [] } }}
        onRefreshRecipients={refresh}
      />,
    );

    expect(screen.queryByText(/Cette étape sera visible/)).not.toBeInTheDocument();
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
    {
      state: 'recipient names still loading',
      isPlaceholderData: true,
      isError: false,
      fallback: true,
      message: 'Chargement des entités concernées par le partage…',
    },
    { state: 'failed retrieval', isPlaceholderData: false, isError: true, fallback: true },
    { state: 'no other affected entity', isPlaceholderData: false, isError: false, fallback: false },
  ])('keeps reopening available with $state', async ({ isPlaceholderData, isError, fallback, message }) => {
    setQuery({
      data: { otherEntites: [], subAdministrativeEntites: [] },
      isPlaceholderData,
      isError,
    });
    render(<ReopenRequeteModal requestId="REQ-354" />);

    if (fallback) {
      expect(
        screen.getByText(
          message ?? 'Cette étape sera visible par les autres entités administratives affectées à la requête.',
        ),
      ).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Cette étape sera visible/)).not.toBeInTheDocument();
    }

    const submit = screen.getByRole('button', { name: 'Rouvrir la requête' });
    expect(submit).toBeEnabled();

    await userEvent.click(submit);

    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([
    { outcome: 'recipients are found', otherEntites: [ars], expected: 'Cette étape sera visible par ARS Bretagne.' },
    { outcome: 'no other entity is affected', otherEntites: [], expected: '' },
  ])('updates a persistent polite live region after initial loading: $outcome', async ({ otherEntites, expected }) => {
    const { promise, resolve } = Promise.withResolvers<Awaited<ReturnType<typeof fetchRequeteOtherEntitiesAffected>>>();
    vi.mocked(fetchRequeteOtherEntitiesAffected).mockReturnValueOnce(promise);
    await renderWithRecipientQuery(null);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Chargement des entités concernées par le partage…');
    expect(screen.getByRole('button', { name: 'Rouvrir la requête' })).toBeEnabled();

    resolve({ otherEntites, subAdministrativeEntites: [] });

    await waitFor(() => expect(status.textContent).toBe(expected));
    expect(screen.getByRole('status')).toBe(status);
    expect(screen.queryByText('Chargement des entités concernées par le partage…')).not.toBeInTheDocument();
  });

  it('updates the recipients on each opening, including when all other entities have been removed', async () => {
    vi.mocked(fetchRequeteOtherEntitiesAffected)
      .mockResolvedValueOnce({
        otherEntites: [{ ...ars, id: 'ddets', nomComplet: 'DDETS du Nord' }],
        subAdministrativeEntites: [],
      })
      .mockResolvedValueOnce({ otherEntites: [], subAdministrativeEntites: [] });
    await renderWithRecipientQuery();

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));
    expect(await screen.findByText('Cette étape sera visible par DDETS du Nord.')).toBeInTheDocument();
    expect(screen.queryByText('Cette étape sera visible par ARS Bretagne.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));
    await waitFor(() => expect(screen.queryByText(/Cette étape sera visible/)).not.toBeInTheDocument());
    expect(fetchRequeteOtherEntitiesAffected).toHaveBeenCalledTimes(2);
  });

  it.each([
    { change: 'a recipient is replaced', initialNames: ['ARS Bretagne'], updatedNames: ['DDETS du Nord'] },
    { change: 'the first recipient is added', initialNames: [], updatedNames: ['ARS Bretagne'] },
    { change: 'the last recipient is removed', initialNames: ['ARS Bretagne'], updatedNames: [] },
  ])(
    'keeps the visibility message stable until updated names arrive: $change',
    async ({ initialNames, updatedNames }) => {
      const { promise, resolve } =
        Promise.withResolvers<Awaited<ReturnType<typeof fetchRequeteOtherEntitiesAffected>>>();
      vi.mocked(fetchRequeteOtherEntitiesAffected).mockReturnValueOnce(promise);
      await renderWithRecipientQuery(initialNames.map((nomComplet) => ({ ...ars, nomComplet })));

      await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));

      expect(fetchRequeteOtherEntitiesAffected).toHaveBeenCalledOnce();
      expect(screen.queryByText(/Cette étape sera visible/)?.textContent ?? null).toBe(
        initialNames.length ? `Cette étape sera visible par ${initialNames[0]}.` : null,
      );
      expect(screen.getByRole('button', { name: 'Rouvrir la requête' })).toBeEnabled();

      resolve({
        otherEntites: updatedNames.map((nomComplet) => ({ ...ars, nomComplet })),
        subAdministrativeEntites: [],
      });

      await waitFor(() =>
        expect(screen.queryByText(/Cette étape sera visible/)?.textContent ?? null).toBe(
          updatedNames.length ? `Cette étape sera visible par ${updatedNames[0]}.` : null,
        ),
      );
    },
  );

  it('replaces initial loading with sharing information when retrieval fails, without blocking confirmation', async () => {
    const { promise, reject } = Promise.withResolvers<Awaited<ReturnType<typeof fetchRequeteOtherEntitiesAffected>>>();
    vi.mocked(fetchRequeteOtherEntitiesAffected).mockReturnValueOnce(promise);
    await renderWithRecipientQuery(null);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Chargement des entités concernées par le partage…');

    reject(new Error('recipient retrieval failed'));

    await waitFor(() =>
      expect(status).toHaveTextContent(
        'Cette étape sera visible par les autres entités administratives affectées à la requête.',
      ),
    );
    expect(screen.queryByText('Chargement des entités concernées par le partage…')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Rouvrir la requête' }));
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([
    { situation: 'before names are available', otherEntites: null },
    { situation: 'after names have been displayed', otherEntites: [ars] },
  ])('shows sharing information offline without blocking confirmation: $situation', async ({ otherEntites }) => {
    render(
      <ReopenRequeteModalView
        requestId="REQ-354"
        otherEntitiesQuery={{
          data: { otherEntites: otherEntites ?? [], subAdministrativeEntites: [] },
          isPlaceholderData: otherEntites === null,
          isPaused: true,
          isError: false,
        }}
        onRefreshRecipients={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cette étape sera visible par les autres entités administratives affectées à la requête.',
    );
    expect(screen.queryByText('Cette étape sera visible par ARS Bretagne.')).not.toBeInTheDocument();
    expect(screen.queryByText('Chargement des entités concernées par le partage…')).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Rouvrir la requête' });
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
  });

  it('shows generic visibility information when updating the recipients fails, without blocking confirmation', async () => {
    vi.mocked(fetchRequeteOtherEntitiesAffected).mockRejectedValueOnce(new Error('refresh failed'));
    await renderWithRecipientQuery();

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la confirmation' }));
    expect(
      await screen.findByText(
        'Cette étape sera visible par les autres entités administratives affectées à la requête.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Cette étape sera visible par ARS Bretagne.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Rouvrir la requête' }));
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

    await userEvent.click(submit);
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith();
    expect(close).toHaveBeenCalledOnce();
  });
});
