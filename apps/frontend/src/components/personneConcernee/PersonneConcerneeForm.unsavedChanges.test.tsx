import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { PersonneConcerneeForm } from './PersonneConcerneeForm';

const renderForm = (props: Partial<ComponentProps<typeof PersonneConcerneeForm>> = {}) =>
  renderWithRouter(
    <PersonneConcerneeForm mode="edit" requestId="req-1" initialData={{ nom: 'Dupont' }} onSave={vi.fn()} {...props} />,
  );

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

beforeEach(() => {
  mockDsfrModals();
});

afterEach(() => {
  cleanup();
});

describe('PersonneConcerneeForm unsaved changes', () => {
  it('asks for confirmation when the user leaves after changing a field', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText(/^Prénom/), 'Jean');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('still asks for confirmation after a save that did not go through', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    await renderForm({ onSave });

    await user.type(screen.getByLabelText(/^Prénom/), 'Jean');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the user leave without confirmation when the values match the saved ones', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText(/^Prénom/), 'Jean');
    await user.clear(screen.getByLabelText(/^Prénom/));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it.each([
    { mode: 'edit' as const, requestId: 'req-1', destination: '/request/req-1' },
    { mode: 'create' as const, requestId: undefined, destination: '/request/create' },
  ])(
    'discards the changes without confirmation when the user clicks the form’s Annuler in $mode mode',
    async ({ mode, requestId, destination }) => {
      const user = userEvent.setup();
      const router = await renderForm({ mode, requestId });

      await user.type(screen.getByLabelText(/^Prénom/), 'Jean');
      await user.click(screen.getByRole('button', { name: 'Annuler' }));

      expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(destination);
      expect(unsavedChangesDialog()).not.toBeInTheDocument();
    },
  );
});
