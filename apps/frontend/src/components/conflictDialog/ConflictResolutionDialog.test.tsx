import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflictInfo } from '@/lib/conflictResolution';
import { requeteDateTypeFieldMetadata } from '@/lib/fieldMetadata';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

const conflicts: ConflictInfo[] = [
  {
    field: 'receptionTypeId',
    originalValue: 'EMAIL',
    currentValue: 'COURRIER',
    serverValue: 'SIGNAL_CONSO',
  },
];

let originalDsfr: unknown;
const disclose = vi.fn();

const getDialog = (): HTMLElement => {
  const dialog = document.querySelector('dialog');
  if (!dialog) throw new Error('Modale absente du DOM');
  return dialog;
};

const concealFromDsfr = () => getDialog().dispatchEvent(new CustomEvent('dsfr.conceal'));

beforeEach(() => {
  originalDsfr = Reflect.get(window, 'dsfr');
  Reflect.set(
    window,
    'dsfr',
    vi.fn((element: HTMLElement) => ({
      modal: {
        disclose: () => {
          disclose();
          element.dispatchEvent(new CustomEvent('dsfr.disclose'));
        },
        conceal: () => element.dispatchEvent(new CustomEvent('dsfr.conceal')),
      },
    })),
  );
});

afterEach(() => {
  cleanup();
  Reflect.set(window, 'dsfr', originalDsfr);
  vi.clearAllMocks();
});

describe('ConflictResolutionDialog', () => {
  it('reports a native closing (Escape, backdrop, ✕) as a cancellation', async () => {
    const onCancel = vi.fn();
    const onResolve = vi.fn();

    render(
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={onResolve}
        onCancel={onCancel}
        isOpen
        fieldMetadata={requeteDateTypeFieldMetadata}
      />,
    );

    concealFromDsfr();

    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('opens again on the next conflict after a native closing', async () => {
    const onCancel = vi.fn();

    const { rerender } = render(
      <ConflictResolutionDialog conflicts={conflicts} onResolve={vi.fn()} onCancel={onCancel} isOpen />,
    );
    expect(disclose).toHaveBeenCalledOnce();

    concealFromDsfr();
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());

    rerender(<ConflictResolutionDialog conflicts={conflicts} onResolve={vi.fn()} onCancel={onCancel} isOpen={false} />);
    rerender(<ConflictResolutionDialog conflicts={conflicts} onResolve={vi.fn()} onCancel={onCancel} isOpen />);

    expect(disclose).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not report a cancellation once the conflicts have been resolved', async () => {
    const onCancel = vi.fn();
    const onResolve = vi.fn();

    render(
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={onResolve}
        onCancel={onCancel}
        isOpen
        fieldMetadata={requeteDateTypeFieldMetadata}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Résoudre et sauvegarder', hidden: true }));
    concealFromDsfr();

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith({ receptionTypeId: 'current' }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('gives the focus back to the element that was focused before opening', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    render(
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={vi.fn()}
        onCancel={vi.fn()}
        isOpen
        fieldMetadata={requeteDateTypeFieldMetadata}
      />,
    );

    trigger.blur();
    concealFromDsfr();

    await waitFor(() => expect(document.activeElement).toBe(trigger));

    trigger.remove();
  });

  it('names each group of radio buttons after the field in conflict and shows the displayed labels', () => {
    render(
      <ConflictResolutionDialog
        conflicts={conflicts}
        onResolve={vi.fn()}
        onCancel={vi.fn()}
        isOpen
        fieldMetadata={requeteDateTypeFieldMetadata}
      />,
    );

    expect(screen.getByRole('group', { name: 'Mode de réception', hidden: true })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Vos modifications\s*Courrier postal/, hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Modifications de l'autre utilisateur\s*Signal Conso/, hidden: true }),
    ).toBeInTheDocument();
    expect(screen.queryByText('COURRIER')).not.toBeInTheDocument();
  });
});
