import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadMenu } from './DownloadMenu';

const TRIGGER_NAME = 'Télécharger les documents';
const BROWSER_TIME_ZONE = 'Indian/Reunion';
const DOWNLOAD_URL = `/api/requetes-entite/req-1/files/download-all?timeZone=${encodeURIComponent(BROWSER_TIME_ZONE)}`;

const mockBrowserTimeZone = (timeZone: string) => {
  const ActualDateTimeFormat = Intl.DateTimeFormat;
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
    const formatter = new ActualDateTimeFormat(...args);
    return new Proxy(formatter, {
      get: (target, property, receiver) =>
        property === 'resolvedOptions'
          ? () => ({ ...target.resolvedOptions(), timeZone })
          : Reflect.get(target, property, receiver),
    });
  }) as never);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
  mockBrowserTimeZone(BROWSER_TIME_ZONE);

  Object.defineProperty(window, 'dsfr', {
    configurable: true,
    writable: true,
    value: () => ({ modal: { disclose: () => {}, conceal: () => {} } }),
  });
});

describe('DownloadMenu', () => {
  it('exposes a disclosure button instead of an application menu', async () => {
    render(<DownloadMenu requestId="req-1" />);

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.getElementById(trigger.getAttribute('aria-controls') as string)).toBeInTheDocument();
  });

  it('downloads the PDF and gives the focus back to the trigger', async () => {
    render(<DownloadMenu requestId="req-1" />);

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: /Télécharger le PDF de la requête/ }));

    expect(window.open).toHaveBeenCalledWith('/api/requetes-entite/req-1/export-pdf', '_blank');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('downloads the attachments archive when no file is unsafe', async () => {
    render(<DownloadMenu requestId="req-1" />);

    await userEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    await userEvent.click(screen.getByRole('button', { name: /Télécharger les pièces jointes/ }));

    expect(window.open).toHaveBeenCalledWith(DOWNLOAD_URL, '_blank');
  });

  it('keeps the attachments action focusable and announced when there is nothing to download', async () => {
    render(<DownloadMenu requestId="req-1" disabled />);

    await userEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));

    const attachmentsItem = screen.getByRole('button', { name: /Télécharger les pièces jointes/ });
    expect(attachmentsItem).toHaveAttribute('aria-disabled', 'true');
    expect(attachmentsItem).not.toBeDisabled();

    const hint = screen.getByText('Aucune pièce jointe disponible');
    expect(hint).not.toHaveClass('fr-sr-only');
    expect(attachmentsItem).toContainElement(hint);

    await userEvent.click(attachmentsItem);

    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes for good when the trigger is clicked while an item holds the focus', async () => {
    render(<DownloadMenu requestId="req-1" />);

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    await userEvent.click(trigger);

    screen.getByRole('button', { name: /Télécharger le PDF de la requête/ }).focus();
    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Télécharger le PDF de la requête/ })).not.toBeInTheDocument();
  });

  it('opens a warning dialog with named buttons instead of downloading unsafe attachments', async () => {
    render(<DownloadMenu requestId="req-1" hasUnsafeFiles />);

    await userEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }));
    await userEvent.click(screen.getByRole('button', { name: /Télécharger les pièces jointes/ }));

    expect(window.open).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(
      within(dialog).getByRole('heading', { name: /pièces jointes potentiellement dangereuses/, hidden: true }),
    ).toHaveAttribute('id', dialog.getAttribute('aria-labelledby'));

    for (const name of ['Fermer', 'Annuler', 'Télécharger malgré le risque']) {
      expect(within(dialog).getByRole('button', { name, hidden: true })).toBeInTheDocument();
    }

    const confirm = within(dialog).getByRole('button', { name: 'Télécharger malgré le risque', hidden: true });
    expect(confirm).toBeDisabled();

    await userEvent.click(within(dialog).getByRole('checkbox', { hidden: true }));
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(window.open).toHaveBeenCalledWith(DOWNLOAD_URL, '_blank');
  });

  it('lets the keyboard reach every action then closes when the focus leaves', async () => {
    render(
      <>
        <DownloadMenu requestId="req-1" />
        <button type="button">Après le menu</button>
      </>,
    );

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    trigger.focus();
    await userEvent.keyboard('{Enter}');

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Télécharger le PDF de la requête/ })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Télécharger les pièces jointes/ })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Après le menu' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the panel and restores the focus on Escape', async () => {
    render(<DownloadMenu requestId="req-1" />);

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await vi.waitFor(() => expect(trigger).toHaveFocus());
  });
});
