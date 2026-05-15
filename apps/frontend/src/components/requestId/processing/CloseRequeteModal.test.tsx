import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('CloseRequeteModal', () => {
  it('displays a single info alert with the standard closing context', () => {
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
});
