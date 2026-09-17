import { REQUETE_MESSAGE_MAX_LENGTH } from '@sirena/common/constants';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageComposer } from './MessageComposer';

const postMessage = vi.fn();

vi.mock('@/hooks/mutations/postRequeteMessage.hook', () => ({
  usePostRequeteMessage: () => ({ mutateAsync: postMessage, isPending: false }),
}));

const getForm = (container: HTMLElement) => {
  const form = container.querySelector('form');
  if (!form) throw new Error('The composer form is missing');
  return form;
};

describe('MessageComposer', () => {
  beforeEach(() => {
    postMessage.mockReset().mockResolvedValue({ id: 'M1' });
  });

  it('asks for a message instead of sending an empty one', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Veuillez saisir un message');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects a message longer than the maximum length', () => {
    const { container } = render(<MessageComposer requestId="REQ" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a'.repeat(REQUETE_MESSAGE_MAX_LENGTH + 1) } });

    expect(screen.getByText(/ne doit pas dépasser/)).toBeInTheDocument();

    fireEvent.submit(getForm(container));

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('posts the message and resets the field', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ contenu: 'Bonjour', fileIds: [] }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  });

  it('gives the focus back to the field once the message is sent', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('notifies the parent once the message is sent', async () => {
    const onSent = vi.fn();
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" onSent={onSent} />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it('names the failure as an error and keeps the message when it cannot be posted', async () => {
    postMessage.mockRejectedValue(new Error("Le message n'a pas pu être envoyé."));
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText(/^Erreur : /)).toHaveTextContent("Le message n'a pas pu être envoyé.");
    expect(screen.getByRole('textbox')).toHaveValue('Bonjour');
  });
});
