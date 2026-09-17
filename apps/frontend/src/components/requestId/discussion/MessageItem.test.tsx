import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import { MessageItem } from './MessageItem';

vi.mock('@/components/common/FileDownloadLink', () => ({
  FileDownloadLink: ({ href, fileName }: { href: string; fileName: string }) => <a href={href}>{fileName}</a>,
}));

const CREATED_AT = '2026-01-15T10:30:00.000Z';

const baseMessage: RequeteMessage = {
  id: 'M1',
  requeteId: 'REQ',
  contenu: 'Bonjour, pouvez-vous préciser ?',
  createdAt: CREATED_AT,
  entite: { id: 'E1', nomComplet: 'ARS Île-de-France', entiteTypeId: 'ARS' },
  author: { prenom: 'jean', nom: 'dupont' },
  uploadedFiles: [],
  isReadByCurrentUser: false,
};

const makeMessage = (overrides: Partial<RequeteMessage> = {}): RequeteMessage => ({ ...baseMessage, ...overrides });

const renderItem = (message: RequeteMessage, isOwnEntite = false) =>
  render(<MessageItem message={message} requestId="REQ" isOwnEntite={isOwnEntite} />);

describe('MessageItem', () => {
  it('displays the author, the entity name and the date', () => {
    const { container } = renderItem(makeMessage());

    const item = container.querySelector('li');
    expect(item?.textContent).toContain('Jean');
    expect(item?.textContent).toContain('Dupont');
    expect(screen.getByText('ARS')).toHaveClass('fr-tag');
    expect(item?.textContent).toContain('(ARS Île-de-France)');

    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', new Date(CREATED_AT).toISOString());
    const expectedDate = new Date(CREATED_AT).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    expect(time?.textContent).toContain(expectedDate);
  });

  it('falls back to "Auteur inconnu" when the author is unknown', () => {
    renderItem(makeMessage({ author: null }));

    expect(screen.getByText(/Auteur inconnu/)).toBeInTheDocument();
  });

  it('builds the attachment download link from the request and file ids', () => {
    renderItem(
      makeMessage({
        uploadedFiles: [
          {
            id: 'F1',
            fileName: 'rapport.pdf',
            size: 1024,
            status: 'COMPLETED',
            scanStatus: 'CLEAN',
            sanitizeStatus: 'COMPLETED',
            createdAt: CREATED_AT,
          },
        ],
      }),
    );

    expect(screen.getByRole('link', { name: 'rapport.pdf' })).toHaveAttribute(
      'href',
      '/api/requete-messages/REQ/file/F1',
    );
  });

  it('tells assistive technology, and only it, when the message comes from the current entity', () => {
    const { container } = renderItem(makeMessage(), true);

    expect(screen.getByText(', votre entité')).toHaveClass('fr-sr-only');
    expect(container.querySelector('li')?.textContent).toContain(', votre entité');
  });

  it('renders the content as text and never as markup', () => {
    const contenu = '<script>alert(1)</script>';
    const { container } = renderItem(makeMessage({ contenu }));

    expect(screen.getByText(contenu)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it.each([true, false])('never exposes a read indicator (isReadByCurrentUser=%s)', (isReadByCurrentUser) => {
    renderItem(makeMessage({ isReadByCurrentUser }));

    expect(screen.queryByText(/Lu par/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Non lu/i)).not.toBeInTheDocument();
  });
});
