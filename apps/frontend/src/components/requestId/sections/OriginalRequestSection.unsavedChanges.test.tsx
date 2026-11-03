import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { OriginalRequestSection } from './OriginalRequestSection';

const createRequete = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useCanEdit', () => ({ useCanEdit: () => ({ canEdit: true, hasEditRole: true }) }));
vi.mock('@/hooks/mutations/createRequeteEntite.hook', () => ({
  useCreateRequeteEntite: () => ({ mutateAsync: createRequete }),
}));
vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { 'date-type': { $patch: vi.fn() } } } },
}));
vi.mock('@/lib/api/tanstackQuery', () => ({
  HttpError: class HttpError extends Error {},
  handleRequestErrors: vi.fn(async (response: Response) => {
    if (!response.ok) throw new Error('boom');
  }),
}));
vi.mock('@/lib/api/saveError', () => ({
  notifyAutoMerge: vi.fn(),
  notifyConflictPersistent: vi.fn(),
  notifyConflictRefreshed: vi.fn(),
  notifyConflictUnusable: vi.fn(),
  notifySaveFailure: vi.fn(),
  notifySaveNetworkFailure: vi.fn(),
}));

const patch = vi.mocked(client['requetes-entite'][':id']['date-type'].$patch);

const SAVED_DATA = { receptionDate: '2026-01-10T00:00:00.000Z', receptionTypeId: 'COURRIER' as const };

const renderSection = (props: Partial<ComponentProps<typeof OriginalRequestSection>> = {}) =>
  renderWithRouter(<OriginalRequestSection requestId="req-1" data={SAVED_DATA} {...props} />);

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const changeReceptionDate = async (user: ReturnType<typeof userEvent.setup>) => {
  const input = screen.getByLabelText(/^Date de réception/);
  await user.clear(input);
  await user.type(input, '2026-02-03');
};

const expectLeftWithoutConfirmation = async () => {
  expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  expect(unsavedChangesDialog()).not.toBeInTheDocument();
};

beforeEach(() => {
  mockDsfrModals();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OriginalRequestSection unsaved changes', () => {
  it('asks for confirmation when the user leaves after changing a field', async () => {
    const user = userEvent.setup();
    await renderSection();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the user leave an opened form they did not change without confirmation', async () => {
    const user = userEvent.setup();
    await renderSection();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    await expectLeftWithoutConfirmation();
  });

  it('lets the user leave without confirmation once Valider saved the changes', async () => {
    const user = userEvent.setup();
    patch.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }) as never);
    await renderWithRouter(<OriginalRequestSection requestId="req-1" data={SAVED_DATA} />, {
      formPath: '/request/req-1',
    });

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    await screen.findByRole('button', { name: 'Modifier' });
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    await expectLeftWithoutConfirmation();
  });

  it('still asks for confirmation after a Valider that hit a conflict', async () => {
    const user = userEvent.setup();
    patch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Conflict', cause: { kind: 'BUSINESS' } }), { status: 409 }) as never,
    );
    await renderSection();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(patch).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('keeps the input after a Valider that failed', async () => {
    const user = userEvent.setup();
    patch.mockResolvedValueOnce(new Response(null, { status: 500 }) as never);
    await renderSection();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(patch).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date de réception/)).toHaveValue('2026-02-03');
  });

  it('tells the user when the request could not be created for lack of network', async () => {
    const user = userEvent.setup();
    createRequete.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await renderSection({ requestId: undefined, data: undefined });

    await user.click(screen.getByRole('button', { name: 'Compléter' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(notifySaveNetworkFailure).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/^Date de réception/)).toHaveValue('2026-02-03');
  });

  it('opens the created request without confirmation once Valider created it', async () => {
    const user = userEvent.setup();
    createRequete.mockResolvedValueOnce({ id: 'req-9' });
    const router = await renderSection({ requestId: undefined, data: undefined });

    await user.click(screen.getByRole('button', { name: 'Compléter' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await expectLeftWithoutConfirmation();
    expect(router.state.location.pathname).toBe('/request/req-9');
  });
});

describe('OriginalRequestSection server data', () => {
  type SectionData = ComponentProps<typeof OriginalRequestSection>['data'];

  // Stands for the request query: a refetch hands the section new data through its props.
  const renderWithServerData = async () => {
    let deliver: (data: SectionData) => void = () => {};

    const WithServerData = () => {
      const [data, setData] = useState<SectionData>(SAVED_DATA);
      deliver = setData;

      return <OriginalRequestSection requestId="req-1" data={data} />;
    };

    await renderWithRouter(<WithServerData />, { formPath: '/request/req-1' });

    return (data: SectionData) => act(() => deliver(data));
  };

  const OTHER_USER_DATA = { ...SAVED_DATA, receptionDate: '2026-03-15T00:00:00.000Z' };

  it('keeps the input when new server data arrives during the edit', async () => {
    const user = userEvent.setup();
    const deliverServerData = await renderWithServerData();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    deliverServerData(OTHER_USER_DATA);

    expect(screen.getByLabelText(/^Date de réception/)).toHaveValue('2026-02-03');
  });

  it('keeps an opened form on the version it started from when new server data arrives', async () => {
    const user = userEvent.setup();
    const deliverServerData = await renderWithServerData();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    deliverServerData(OTHER_USER_DATA);

    expect(screen.getByLabelText(/^Date de réception/)).toHaveValue('2026-01-10');
  });

  it('shows new server data outside the edit', async () => {
    const deliverServerData = await renderWithServerData();

    deliverServerData(OTHER_USER_DATA);

    expect(screen.getByText(/Reçue le 15\/03\/2026/)).toBeInTheDocument();
  });

  it('keeps showing the saved values once Valider saved them', async () => {
    const user = userEvent.setup();
    patch.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }) as never);
    await renderWithServerData();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(await screen.findByText(/Reçue le 03\/02\/2026/)).toBeInTheDocument();
  });

  it('shows the arbitrated value once a conflict was resolved on the other user version', async () => {
    const user = userEvent.setup();
    patch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Conflict',
            cause: {
              kind: 'BUSINESS',
              serverData: OTHER_USER_DATA,
              serverUpdatedAt: '2026-01-01T11:00:00.000Z',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ) as never,
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }) as never);
    const deliverServerData = await renderWithServerData();

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await changeReceptionDate(user);
    // The other user's write reaches the section while the form is open, so the refetch is held back.
    deliverServerData(OTHER_USER_DATA);
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    const dialog = await screen.findByRole('dialog', { name: 'Résolution des conflits' });
    await user.click(within(dialog).getByRole('radio', { name: /Modifications de l'autre utilisateur/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Résoudre et sauvegarder' }));

    expect(await screen.findByText(/Reçue le 15\/03\/2026/)).toBeInTheDocument();
  });
});
