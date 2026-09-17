import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageComposer } from './MessageComposer';

const postMessage = vi.fn();
const uploadFile = vi.fn();
const toastAdd = vi.fn();

vi.mock('@/hooks/mutations/postRequeteMessage.hook', () => ({
  usePostRequeteMessage: () => ({ mutateAsync: postMessage, isPending: false }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: uploadFile, isPending: false }),
}));

vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();
  return {
    ...original,
    Toast: {
      ...original.Toast,
      useToastManager: () => ({ add: toastAdd }),
    },
  };
});

const makeFile = (name: string) => new File(['contenu'], name, { type: 'application/pdf' });

const attachFiles = async (container: HTMLElement, files: File[]) => {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('The file input is missing');
  await userEvent.upload(input, files, { applyAccept: false });
};

const getForm = (container: HTMLElement) => {
  const form = container.querySelector('form');
  if (!form) throw new Error('The composer form is missing');
  return form;
};

describe('MessageComposer', () => {
  beforeEach(() => {
    postMessage.mockReset().mockResolvedValue({ id: 'M1' });
    uploadFile.mockReset().mockImplementation((file: File) => Promise.resolve({ id: `id-${file.name}` }));
    toastAdd.mockReset();
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

  it('posts a text-only message', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ contenu: 'Bonjour', fileIds: [] }));
  });

  it('uploads every attachment before posting the message', async () => {
    const user = userEvent.setup();
    const { container } = render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Voici les pièces');
    await attachFiles(container, [makeFile('premier.pdf'), makeFile('second.pdf')]);
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenCalledWith({
      contenu: 'Voici les pièces',
      fileIds: ['id-premier.pdf', 'id-second.pdf'],
    });
  });

  it('displays an inline alert when the message cannot be posted', async () => {
    postMessage.mockRejectedValue(new Error("Le message n'a pas pu être envoyé."));
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText("Le message n'a pas pu être envoyé.")).toBeInTheDocument();
  });

  it('submits the message with Ctrl + Enter', async () => {
    const user = userEvent.setup();
    render(<MessageComposer requestId="REQ" />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Bonjour');
    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ contenu: 'Bonjour', fileIds: [] }));
  });

  it('reuses the already uploaded attachments when the user retries after a failed post', async () => {
    postMessage.mockRejectedValueOnce(new Error("Le message n'a pas pu être envoyé."));
    const user = userEvent.setup();
    const { container } = render(<MessageComposer requestId="REQ" />);

    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await attachFiles(container, [makeFile('premier.pdf')]);
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText("Le message n'a pas pu être envoyé.")).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(2));
    // The file was uploaded once and reused: a second upload would orphan the first one server-side.
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenLastCalledWith({ contenu: 'Bonjour', fileIds: ['id-premier.pdf'] });
  });

  it('shows an inline error and skips the post when an upload fails', async () => {
    uploadFile.mockRejectedValue(new Error('upload failed'));
    const user = userEvent.setup();
    const { container } = render(<MessageComposer requestId="REQ" />);

    await attachFiles(container, [makeFile('premier.pdf')]);
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/erreur technique/i);
    expect(postMessage).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('refuses an unsupported format at selection and states why', async () => {
    const { container } = render(<MessageComposer requestId="REQ" />);

    await attachFiles(container, [new File(['x'], 'virus.exe', { type: 'application/x-msdownload' })]);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('virus.exe');
    expect(alert).toHaveTextContent(/format du fichier n'est pas supporté/);
    expect(screen.queryByText('virus.exe', { selector: 'li' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  });

  it('refuses a file above the size limit at selection and states why', async () => {
    const { container } = render(<MessageComposer requestId="REQ" />);
    const tooBig = new File([''], 'gros.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooBig, 'size', { value: 200 * 1024 * 1024 + 1 });

    await attachFiles(container, [tooBig]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/taille maximale autorisée de 200 Mo/);
  });

  it('lets the user remove an attachment before sending', async () => {
    const user = userEvent.setup();
    const { container } = render(<MessageComposer requestId="REQ" />);

    await attachFiles(container, [makeFile('premier.pdf'), makeFile('second.pdf')]);
    await user.click(screen.getByRole('button', { name: 'Supprimer premier.pdf' }));
    await user.type(screen.getByRole('textbox'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ contenu: 'Bonjour', fileIds: ['id-second.pdf'] });
  });

  it('does not list the same file name twice', async () => {
    const { container } = render(<MessageComposer requestId="REQ" />);

    await attachFiles(container, [makeFile('rapport.pdf')]);
    await attachFiles(container, [makeFile('rapport.pdf')]);

    expect(screen.getAllByRole('button', { name: 'Supprimer rapport.pdf' })).toHaveLength(1);
  });

  it('opens the file picker from the attachment button', async () => {
    const user = userEvent.setup();
    const { container } = render(<MessageComposer requestId="REQ" />);
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('The file input is missing');
    const click = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button', { name: 'Ajouter un fichier' }));

    expect(click).toHaveBeenCalledTimes(1);
  });
});
