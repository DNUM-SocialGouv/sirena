import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateRequetesExport } from '@/hooks/mutations/createRequetesExport.hook';
import { useRequetesExportStatus } from '@/hooks/queries/statistics.hook';
import { HttpError } from '@/lib/api/tanstackQuery';
import { ExportRequetesMenu } from './ExportRequetesMenu';

const openModal = vi.hoisted(() => vi.fn());

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: ({ id }: { id: string }) => ({
    id,
    open: openModal,
    close: vi.fn(),
    Component: ({
      title,
      children,
      buttons,
    }: {
      title: React.ReactNode;
      children: React.ReactNode;
      buttons?: { children: React.ReactNode; type?: 'button' }[];
    }) => (
      <div id={id} role="dialog" aria-label={String(title)}>
        <button type="button" className="fr-btn--close">
          Fermer
        </button>
        <h1>{title}</h1>
        {children}
        {buttons?.map((button) => (
          <button key={String(button.children)} type={button.type}>
            {button.children}
          </button>
        ))}
      </div>
    ),
  }),
}));

vi.mock('@/hooks/mutations/createRequetesExport.hook', () => ({
  useCreateRequetesExport: vi.fn(),
}));

vi.mock('@/hooks/queries/statistics.hook', () => ({
  useRequetesExportStatus: vi.fn(),
}));

type MutateOptions = { onSuccess?: (data: { id: string; email: string }) => void; onError?: (error: unknown) => void };

const mutate = vi.fn();

const mockMutation = (isPending = false) => {
  vi.mocked(useCreateRequetesExport).mockReturnValue({ mutate, isPending } as unknown as ReturnType<
    typeof useCreateRequetesExport
  >);
};

const mockStatus = (inProgress: boolean) => {
  vi.mocked(useRequetesExportStatus).mockReturnValue({ data: { inProgress } } as ReturnType<
    typeof useRequetesExportStatus
  >);
};

const getDateInputs = () => screen.getAllByLabelText('Date au format jj/mm/aaaa') as HTMLInputElement[];

const openPanel = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Exporter les requêtes' }));
  await waitFor(() => expect(getDateInputs()[0]).toHaveFocus());
};

const setDates = (startDate: string, endDate: string) => {
  const [startInput, endInput] = getDateInputs();
  fireEvent.change(startInput, { target: { value: startDate } });
  fireEvent.change(endInput, { target: { value: endDate } });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: "Générer l'export" }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  // 31 March: the previous month has no 31st (CA2).
  vi.setSystemTime(new Date('2026-03-31T10:00:00.000Z'));
  mockMutation();
  mockStatus(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ExportRequetesMenu', () => {
  it('opens a panel with the creation-date note and the e-mail information', async () => {
    render(<ExportRequetesMenu />);

    const trigger = screen.getByRole('button', { name: 'Exporter les requêtes' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await openPanel();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText('Les dates prises en compte sont les dates de création des requêtes dans SIRENA.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: "Début de l'export" })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: "Fin de l'export" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Générer l'export" })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button', { name: "Générer l'export" })).toHaveAccessibleDescription(
      "Vous recevrez un lien par e-mail pour télécharger l'export au format CSV.",
    );
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveAttribute('type', 'button');
  });

  it('defaults to today and the same day of the previous month, or its last day (CA2)', async () => {
    render(<ExportRequetesMenu />);
    await openPanel();

    const [startInput, endInput] = getDateInputs();
    expect(startInput).toHaveValue('2026-02-28');
    expect(endInput).toHaveValue('2026-03-31');
  });

  it('launches the export with the dates the user typed (CA3)', async () => {
    render(<ExportRequetesMenu />);
    await openPanel();

    setDates('2026-01-01', '2026-03-15');
    submit();

    expect(mutate).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-03-15' }, expect.any(Object));
  });

  it.each([
    {
      name: 'a start date after the end date (CA5)',
      dates: ['2026-03-20', '2026-03-10'],
      message: 'La date de début doit être antérieure ou égale à la date de fin',
      fieldIndex: 0,
    },
    {
      name: 'an end date after today (CA6)',
      dates: ['2026-03-01', '2026-04-01'],
      message: 'La date de début doit être antérieure ou égale à la date de fin',
      fieldIndex: 1,
    },
    {
      name: 'a period longer than 36 months (CA7)',
      dates: ['2023-03-30', '2026-03-31'],
      message: 'La période sélectionnée ne peut pas dépasser 36 mois.',
      fieldIndex: 0,
    },
  ])('shows the ticket message and does not launch the export for $name', async ({ dates, message, fieldIndex }) => {
    render(<ExportRequetesMenu />);
    await openPanel();

    setDates(dates[0], dates[1]);
    submit();

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(getDateInputs()[fieldIndex]).toHaveFocus();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('launches the export for a period of exactly 36 months (CA8)', async () => {
    render(<ExportRequetesMenu />);
    await openPanel();

    setDates('2023-03-31', '2026-03-31');
    submit();

    expect(mutate).toHaveBeenCalledOnce();
  });

  it('closes the panel, opens the confirmation with the recipient and moves the focus to Fermer (CA19)', async () => {
    mutate.mockImplementation((_period, options: MutateOptions) =>
      options.onSuccess?.({ id: 'export-1', email: 'agent@sante.gouv.fr' }),
    );
    render(<ExportRequetesMenu />);
    await openPanel();

    submit();

    expect(openModal).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: "Générer l'export" })).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: "L'export a été envoyé" });
    expect(dialog).toHaveTextContent(
      "L'export a été envoyé à l'adresse agent@sante.gouv.fr. Le lien est valable 30 minutes.",
    );
    expect(screen.getByRole('heading', { level: 1, name: "L'export a été envoyé" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai compris" })).toHaveAttribute('type', 'button');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus());
  });

  it('gives the focus back to the trigger when the confirmation closes', async () => {
    mutate.mockImplementation((_period, options: MutateOptions) =>
      options.onSuccess?.({ id: 'export-1', email: 'agent@sante.gouv.fr' }),
    );
    render(<ExportRequetesMenu />);
    await openPanel();
    submit();

    document.getElementById('requetes-export-confirmation-modal')?.dispatchEvent(new Event('dsfr.conceal'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toHaveFocus());
  });

  it('shows the ticket message when no requête matches the period (CA20)', async () => {
    mutate.mockImplementation((_period, options: MutateOptions) =>
      options.onError?.(new HttpError('HTTP 400', 400, { message: 'x', cause: { code: 'NO_REQUETE' } })),
    );
    render(<ExportRequetesMenu />);
    await openPanel();

    submit();

    expect(screen.getByRole('alert')).toHaveTextContent('Aucune requête ne correspond à la période sélectionnée');
    expect(openModal).not.toHaveBeenCalled();
  });

  it('shows a generic message when the export cannot be launched', async () => {
    mutate.mockImplementation((_period, options: MutateOptions) => options.onError?.(new Error('network')));
    render(<ExportRequetesMenu />);
    await openPanel();

    submit();

    expect(screen.getByRole('alert')).toHaveTextContent("Le lancement de l'export a échoué. Veuillez réessayer.");
  });

  it('keeps the button focusable but disabled while the export is being sent (CA17)', async () => {
    mockMutation(true);
    render(<ExportRequetesMenu />);
    await openPanel();

    const button = screen.getByRole('button', { name: 'Génération en cours…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('keeps the button disabled while a previous export is still in progress (CA17)', async () => {
    mockStatus(true);
    render(<ExportRequetesMenu />);
    await openPanel();

    const button = screen.getByRole('button', { name: "Générer l'export" });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Un export est déjà en cours.');

    submit();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('closes the panel with Annuler and gives the focus back to the trigger', async () => {
    render(<ExportRequetesMenu />);
    await openPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('button', { name: "Générer l'export" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toHaveFocus());
  });

  it('only polls the export status while the panel is open', async () => {
    render(<ExportRequetesMenu />);
    expect(useRequetesExportStatus).toHaveBeenLastCalledWith(false);

    await openPanel();

    expect(useRequetesExportStatus).toHaveBeenLastCalledWith(true);
    expect(getDateInputs()).toHaveLength(2);
  });
});
