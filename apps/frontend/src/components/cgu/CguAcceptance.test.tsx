import { CGU_VERSION } from '@sirena/common/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptCgu } from '@/lib/api/acceptCgu';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useUserStore } from '@/stores/userStore';
import { CguAcceptance } from './CguAcceptance';

const { openModal, closeModal } = vi.hoisted(() => ({ openModal: vi.fn(), closeModal: vi.fn() }));

type ModalButton = { children: ReactNode; onClick?: () => void; doClosesModal?: boolean };

// DSFR is not loaded in tests: closing the modal only dispatches the event DSFR would send
vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: ({ id }: { id: string }) => {
    const conceal = () => document.getElementById(id)?.dispatchEvent(new Event('dsfr.conceal'));
    return {
      id,
      buttonProps: { id: `${id}-control-button`, 'aria-controls': id, 'data-fr-opened': false },
      open: openModal,
      close: () => {
        closeModal();
        conceal();
      },
      Component: ({ title, children, buttons }: { title: ReactNode; children: ReactNode; buttons: ModalButton[] }) => (
        <dialog id={id} open aria-labelledby={`${id}-title`}>
          <h1 id={`${id}-title`}>{title}</h1>
          {children}
          {buttons.map(({ children: label, onClick, doClosesModal = true }) => (
            <button key={String(label)} type="button" onClick={doClosesModal ? conceal : onClick}>
              {label}
            </button>
          ))}
        </dialog>
      ),
    };
  },
}));

vi.mock('@/lib/api/acceptCgu', () => ({ acceptCgu: vi.fn() }));

vi.mock('@/lib/api/tanstackQuery', () => {
  class HttpError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
    }
  }
  return { HttpError };
});

const onAccepted = vi.fn();

const renderCguAcceptance = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(['profile'], { id: 'user-1', cguAcceptedVersion: null, cguAcceptedAt: null });
  render(
    <QueryClientProvider client={queryClient}>
      <CguAcceptance onAccepted={onAccepted} />
    </QueryClientProvider>,
  );
  return { queryClient };
};

describe('CguAcceptance', () => {
  beforeEach(() => {
    useUserStore.setState({ cguAcceptedVersion: null, hasRefusedCgu: false });
  });

  it('opens the CGU modal on its own when the user arrives at login', async () => {
    renderCguAcceptance();

    await waitFor(() => expect(openModal).toHaveBeenCalledOnce());
  });

  it('opens the CGU modal only once when the page renders again with a new callback', async () => {
    const queryClient = new QueryClient();
    const nextOnAccepted = vi.fn();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <CguAcceptance onAccepted={onAccepted} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(openModal).toHaveBeenCalledOnce());

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CguAcceptance onAccepted={nextOnAccepted} />
      </QueryClientProvider>,
    );

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(openModal).toHaveBeenCalledOnce();
  });

  it('does not open the CGU modal on its own again once the user refused it during the session', async () => {
    useUserStore.setState({ hasRefusedCgu: true });
    renderCguAcceptance();

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(openModal).not.toHaveBeenCalled();
  });

  it('explains that the CGU must be accepted, with a button that opens them again', () => {
    renderCguAcceptance();

    expect(screen.getByRole('heading', { level: 1, name: 'Attention' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Pour utiliser SIRENA vous devez obligatoirement prendre connaissance des conditions générales d’utilisation et les accepter.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir les conditions générales d’utilisation' })).toHaveAttribute(
      'aria-controls',
      'cgu-acceptance-modal',
    );
  });

  it('presents the whole CGU text under a title that ignores the decorative pictogram', () => {
    renderCguAcceptance();

    const dialog = screen.getByRole('dialog', { name: 'Conditions générales d’utilisation de SIRENA' });
    expect(dialog.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Préambule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Juridiction compétente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeInTheDocument();
  });

  it('records the acceptance of the CGU version in force before leaving the CGU page', async () => {
    const acceptance = { cguAcceptedVersion: CGU_VERSION, cguAcceptedAt: '2026-10-20T08:30:00.000Z' };
    vi.mocked(acceptCgu).mockResolvedValueOnce(acceptance);
    const { queryClient } = renderCguAcceptance();

    await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));

    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
    expect(useUserStore.getState().cguAcceptedVersion).toBe(CGU_VERSION);
    expect(acceptCgu).toHaveBeenCalledWith(CGU_VERSION);
    expect(closeModal).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(['profile'])).toEqual({ id: 'user-1', ...acceptance });
  });

  it('remembers the refusal and gives the focus to the button that opens the CGU again', async () => {
    renderCguAcceptance();

    await userEvent.click(screen.getByRole('button', { name: 'Refuser' }));

    expect(screen.getByRole('button', { name: 'Voir les conditions générales d’utilisation' })).toHaveFocus();
    expect(useUserStore.getState().hasRefusedCgu).toBe(true);
    expect(useUserStore.getState().cguAcceptedVersion).toBeNull();
    expect(acceptCgu).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('explains that new CGU were published when the accepted version is outdated', async () => {
    vi.mocked(acceptCgu).mockRejectedValueOnce(new HttpError('HTTP 409', 409));
    renderCguAcceptance();

    await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Une nouvelle version des conditions générales d’utilisation a été publiée. Rechargez la page pour la consulter.',
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(useUserStore.getState().cguAcceptedVersion).toBeNull();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('asks to try again when the acceptance could not be recorded', async () => {
    vi.mocked(acceptCgu).mockRejectedValueOnce(new Error('Network error'));
    renderCguAcceptance();

    await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Votre acceptation n’a pas pu être enregistrée. Veuillez réessayer.',
    );
    expect(closeModal).not.toHaveBeenCalled();
  });
});
