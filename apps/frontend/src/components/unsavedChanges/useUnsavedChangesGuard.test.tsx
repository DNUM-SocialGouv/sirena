import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ChangeEvent, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  closeDsfrModalNatively,
  mockDsfrModals,
  OTHER_PAGE_HEADING,
  OTHER_PAGE_LINK,
  renderWithRouter,
} from '@/test-utils/renderWithRouter';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

const TestForm = () => {
  const [value, setValue] = useState('');
  useUnsavedChangesGuard({ isDirty: value !== '' });
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value);

  return (
    <>
      <h1>Formulaire</h1>
      <label>
        Nom
        <input value={value} onChange={handleChange} />
      </label>
    </>
  );
};

const renderForm = () => renderWithRouter(<TestForm />);

const TestPanel = () => {
  const [value, setValue] = useState('');
  const [closeAnswer, setCloseAnswer] = useState('');
  const { confirmLeave } = useUnsavedChangesGuard({ isDirty: value !== '' });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value);
  const handleClose = async () => setCloseAnswer((await confirmLeave()) ? 'fermé' : 'resté ouvert');

  return (
    <>
      <label>
        Nom
        <input value={value} onChange={handleChange} />
      </label>
      <button type="button" onClick={handleClose}>
        Fermer le panneau
      </button>
      <output>{closeAnswer}</output>
    </>
  );
};

beforeEach(() => {
  mockDsfrModals();
});

afterEach(() => {
  cleanup();
});

describe('useUnsavedChangesGuard', () => {
  it('asks for confirmation when the user follows a link with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    expect(
      within(dialog).getByText(
        'Si vous quittez ce formulaire sans enregistrer, les informations saisies seront effacées.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Formulaire' })).toBeInTheDocument();
  });

  it('keeps the user on the form with their input when they choose Annuler', async () => {
    const user = userEvent.setup();
    const router = await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  });

  it('gives the focus back to the element the user activated when they stay on the form', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    const link = screen.getByRole('link', { name: OTHER_PAGE_LINK });
    link.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(link).toHaveFocus());
  });

  it('completes the navigation when the user chooses Quitter sans enregistrer', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Formulaire' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Fermer, Escape and the backdrop are handled by the DSFR vanilla JS, which only reports the closing.
  it('keeps the user on the form when the modal is closed with Fermer, Escape or the backdrop', async () => {
    const user = userEvent.setup();
    const router = await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    act(() => closeDsfrModalNatively(dialog));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('asks for confirmation when the user goes back in the browser history with unsaved changes', async () => {
    const user = userEvent.setup();
    const router = await renderWithRouter(<TestForm />, { previousPath: '/home' });

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    act(() => router.history.back());

    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  });

  // An expired session or an inactive account can no longer save: asking would only trap the user.
  it.each(['/login', '/inactive'] as const)('lets SIRENA redirect to %s without confirmation', async (to) => {
    const user = userEvent.setup();
    const router = await renderForm();

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await act(() => router.navigate({ to }));

    expect(router.state.location.pathname).toBe(to);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets the user leave without confirmation when nothing was changed', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('confirmLeave', () => {
  it('lets the user leave right away when nothing was changed', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TestPanel />);

    await user.click(screen.getByRole('button', { name: 'Fermer le panneau' }));

    expect(await screen.findByText('fermé')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Données non enregistrées' })).not.toBeInTheDocument();
  });

  it('lets the user leave once they choose Quitter sans enregistrer', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TestPanel />);

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('button', { name: 'Fermer le panneau' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));

    expect(await screen.findByText('fermé')).toBeInTheDocument();
  });

  it('keeps the user where they are when they choose Annuler', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TestPanel />);

    await user.type(screen.getByLabelText('Nom'), 'Dupont');
    await user.click(screen.getByRole('button', { name: 'Fermer le panneau' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(await screen.findByText('resté ouvert')).toBeInTheDocument();
  });
});
