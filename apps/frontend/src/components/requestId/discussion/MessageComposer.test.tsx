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

  it('disables the submit button while the message is empty', () => {
    render(<MessageComposer requestId="REQ" />);

    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  });

  it('rejects a message longer than the maximum length', () => {
    const { container } = render(<MessageComposer requestId="REQ" />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a'.repeat(10_001) } });

    expect(screen.getByText(/ne doit pas dépasser/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();

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

  it('displays an inline alert when the message cannot be posted', async () => {
    postMessage.mockRejectedValue(new Error("Le message n'a pas pu être envoyé."));
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText("Le message n'a pas pu être envoyé.")).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Bonjour');
  });

  it('submits the message with Ctrl + Enter', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Bonjour');
    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ contenu: 'Bonjour', fileIds: [] }));
  });
});
