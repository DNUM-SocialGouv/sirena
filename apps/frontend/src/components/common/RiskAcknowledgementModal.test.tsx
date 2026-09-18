import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskAcknowledgementModal, type RiskAcknowledgementModalHandle } from './RiskAcknowledgementModal';

const discloseModal = vi.fn();
const concealModal = vi.fn();
const onConfirm = vi.fn();

const content = {
  title: 'Fichier dangereux',
  message: 'Ce fichier présente un risque.',
  details: <p>Le téléchargement utilise la version originale.</p>,
  acknowledgementLabel: 'Je comprends les risques',
  confirmLabel: 'Télécharger malgré le risque',
};

const renderModal = () => {
  const modalRef = createRef<RiskAcknowledgementModalHandle>();
  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    modalRef.current?.open({ trigger: event.currentTarget, content, onConfirm });
  };
  render(
    <>
      <button type="button" onClick={handleOpen}>
        Ouvrir
      </button>
      <RiskAcknowledgementModal ref={modalRef} />
    </>,
  );
};

beforeEach(() => {
  Object.defineProperty(window, 'dsfr', {
    configurable: true,
    writable: true,
    value: (element: HTMLElement | null) => ({
      modal: {
        disclose: () => {
          element?.classList.add('fr-modal--opened');
          element?.setAttribute('open', '');
          discloseModal();
        },
        conceal: () => {
          element?.classList.remove('fr-modal--opened');
          element?.removeAttribute('open');
          concealModal();
        },
      },
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RiskAcknowledgementModal', () => {
  it('keeps the unaccepted confirmation focusable and blocks its action and closure', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const dialog = screen.getByRole('dialog', { hidden: true });
    const checkbox = within(dialog).getByRole('checkbox', { hidden: true });
    const confirm = within(dialog).getByRole('button', {
      name: 'Télécharger malgré le risque',
      hidden: true,
    });

    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    expect(confirm).not.toBeDisabled();
    expect(confirm.className).toContain('unavailable');
    expect(confirm).not.toHaveAttribute('aria-controls');

    checkbox.focus();
    await user.tab();
    expect(confirm).toHaveFocus();

    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(concealModal).not.toHaveBeenCalled();
  });

  it('confirms and closes once after acceptance, then resets its action', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));

    const confirm = within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' });
    expect(confirm).not.toHaveAttribute('aria-disabled');

    await user.dblClick(confirm);

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(concealModal).toHaveBeenCalledOnce();
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
  });

  it('resets acceptance when the user cancels', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('resets acceptance and restores focus after an external closure', async () => {
    const user = userEvent.setup();
    renderModal();

    const trigger = screen.getByRole('button', { name: 'Ouvrir' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));
    expect(within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' })).not.toHaveAttribute(
      'aria-disabled',
    );

    dialog.dispatchEvent(new CustomEvent('dsfr.conceal'));
    await vi.waitFor(() => expect(trigger).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(trigger);
    expect(within(dialog).getByRole('button', { name: 'Télécharger malgré le risque' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
