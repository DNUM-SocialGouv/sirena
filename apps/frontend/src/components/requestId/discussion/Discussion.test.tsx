import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import { Discussion } from './Discussion';

const fetchNextPage = vi.fn();

let messages: RequeteMessage[] = [];
let hasNextPage = false;
let isFetchingNextPage = false;

vi.mock('@/hooks/queries/requeteMessages.hook', () => ({
  requeteMessagesQueryKey: (requestId: string) => ['requeteMessages', requestId],
  useRequeteMessages: () => ({
    data: { pages: [{ data: messages, meta: { hasMore: hasNextPage, nextCursor: null } }] },
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: () => ({ data: { id: 'ME', topEntiteId: 'E1' } }),
}));

const makeMessage = (id: string, overrides: Partial<RequeteMessage> = {}): RequeteMessage => ({
  id,
  requeteId: 'REQ',
  contenu: `Message ${id}`,
  createdAt: '2026-01-15T10:30:00.000Z',
  entite: { id: 'E1', nomComplet: 'ARS Île-de-France', entiteTypeId: 'ARS' },
  author: { prenom: 'jean', nom: 'dupont' },
  isReadByCurrentUser: true,
  ...overrides,
});

Element.prototype.scrollIntoView = vi.fn();

describe('Discussion', () => {
  beforeEach(() => {
    messages = [];
    hasNextPage = false;
    isFetchingNextPage = false;
    fetchNextPage.mockReset();
  });

  it('renders no thread region when there is no message yet', () => {
    render(<Discussion requestId="REQ" />);

    expect(screen.queryByRole('region', { name: 'Messages de la discussion' })).not.toBeInTheDocument();
  });

  it('renders the messages chronologically, oldest first', () => {
    messages = [makeMessage('M2', { contenu: 'Le plus récent' }), makeMessage('M1', { contenu: 'Le plus ancien' })];

    render(<Discussion requestId="REQ" />);

    const rendered = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toContain('Le plus ancien');
    expect(rendered[1]).toContain('Le plus récent');
  });

  it('does not offer to load previous messages when the whole thread is already displayed', () => {
    messages = [makeMessage('M1')];

    render(<Discussion requestId="REQ" />);

    expect(screen.queryByRole('button', { name: 'Charger les messages précédents' })).not.toBeInTheDocument();
  });

  it('loads the previous messages on demand', async () => {
    messages = [makeMessage('M1')];
    hasNextPage = true;
    const user = userEvent.setup();

    render(<Discussion requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Charger les messages précédents' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('draws the unread separator before the first unread message', () => {
    messages = [
      makeMessage('M3', { isReadByCurrentUser: false }),
      makeMessage('M2', { isReadByCurrentUser: false }),
      makeMessage('M1'),
    ];

    render(<Discussion requestId="REQ" />);

    const items = screen.getAllByRole('listitem');
    const separatorIndex = items.findIndex((item) => item.textContent === 'Non lus');
    expect(separatorIndex).toBe(1);
    expect(items[separatorIndex - 1]?.textContent).toContain('Message M1');
    expect(items[separatorIndex + 1]?.textContent).toContain('Message M2');
  });

  it('draws no separator when everything is already read', () => {
    messages = [makeMessage('M2'), makeMessage('M1')];

    render(<Discussion requestId="REQ" />);

    expect(screen.queryByText('Non lus')).not.toBeInTheDocument();
  });
});
