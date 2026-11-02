import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ChangeEvent, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
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

  it('lets the user leave without confirmation when nothing was changed', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
