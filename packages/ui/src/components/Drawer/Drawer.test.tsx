// Drawer.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useId, useState } from 'react';
import Drawer from './Drawer';

// Polyfill rAF
beforeAll(() => {
  global.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
});

afterAll(() => {
  // @ts-expect-error
  delete global.requestAnimationFrame;
});

describe('Drawer', () => {
  const PanelContent = ({ onClose }: { onClose?: () => void }) => {
    const titleId = useId();
    return (
      <div style={{ padding: 16 }}>
        <h2 id={titleId}>Drawer Title</h2>
        <input aria-label="focus-first" />
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  it('opens on trigger click and exposes accessible dialog name', async () => {
    const user = userEvent.setup();

    function Harness() {
      const titleId = useId();
      const [open, setOpen] = useState(false);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel titleId={titleId}>
              <h2 id={titleId}>Drawer Title</h2>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    await user.click(screen.getByText('Open'));

    const dialog = await screen.findByRole('dialog', { name: 'Drawer Title' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute('aria-modal'); // nonModal par défaut
  });

  it('restores focus to trigger on close', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Panel>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    const trigger = screen.getByText('Open');

    await user.click(trigger);
    await user.click(screen.getByText('Close'));

    expect(trigger).toHaveFocus();
  });

  it('nonModal: closes on outside click and calls onClickOutside', () => {
    vi.useFakeTimers();
    const onClickOutside = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root
          open={open}
          onOpenChange={setOpen}
          onClickOutside={() => {
            onClickOutside();
            setOpen(false);
          }}
        >
          <Drawer.Portal>
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    fireEvent.mouseDown(document.body);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClickOutside).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('sets aria-modal=true in modal mode', () => {
    function Harness() {
      const [open] = useState(true);
      return (
        <Drawer.Root open={open} variant="modal">
          <Drawer.Portal>
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('modal: makes background inert and aria-hidden', () => {
    const outside = document.createElement('div');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    function Harness() {
      return (
        <Drawer.Root open variant="modal">
          <Drawer.Portal>
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    expect(outside).toHaveAttribute('aria-hidden', 'true');
  });

  it('does NOT close on outside click if onClickOutside is not provided', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} overlay={false}>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            {/* pas de Backdrop */}
            <Drawer.Panel>
              <PanelContent onClose={() => setOpen(false)} />
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }
    render(<Harness />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on ESC regardless of withCloseButton', () => {
    vi.useFakeTimers();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} withCloseButton={false}>
          <Drawer.Portal>
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    fireEvent.keyDown(document, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides close button when withCloseButton=false', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} withCloseButton={false}>
          <Drawer.Portal>
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /annuler et fermer/i })).not.toBeInTheDocument();
  });
});
