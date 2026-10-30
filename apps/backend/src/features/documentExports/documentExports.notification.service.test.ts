import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENT_EXPORT_READY_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { notifyDocumentExportReady } from './documentExports.notification.service.js';

vi.mock('../../libs/mail/tipimail.js', () => ({
  sendTipimailEmail: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../../config/env.js', () => ({
  envVars: { FRONTEND_URI: 'https://sirena.example.gouv.fr' },
}));

const readyExport = {
  id: 'export-1',
  type: 'REQUETES_CSV',
  fileName: 'export_requetes_01-01-2026_31-01-2026.csv',
  expiresAt: new Date('2026-10-28T10:30:00Z'),
  user: { id: 'user-1', email: 'agent@example.gouv.fr', prenom: 'Camille', nom: 'Martin' },
};

describe('notifyDocumentExportReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the download link to the requester with the dedicated template', async () => {
    await notifyDocumentExportReady(readyExport);

    expect(sendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'agent@example.gouv.fr', template: DOCUMENT_EXPORT_READY_TEMPLATE_NAME }),
    );
  });

  it('only passes the link and the requester name to the template', async () => {
    await notifyDocumentExportReady(readyExport);

    const [{ substitutions }] = vi.mocked(sendTipimailEmail).mock.calls[0];
    expect(substitutions).toEqual([
      {
        email: 'agent@example.gouv.fr',
        values: {
          prenom: 'Camille',
          nom: 'Martin',
          urlsirena: 'https://sirena.example.gouv.fr/telechargement/export-1',
          signature: '',
        },
      },
    ]);
  });

  it('lets a sending failure reach the caller', async () => {
    vi.mocked(sendTipimailEmail).mockRejectedValueOnce(new Error('tipimail down'));

    await expect(notifyDocumentExportReady(readyExport)).rejects.toThrow('tipimail down');
  });
});
