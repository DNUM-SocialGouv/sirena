// Drawer.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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
  const PanelContent = ({ onClose }: { onClose?: () => void }) => (
    <div style={{ padding: 16 }}>
      <h2>Drawer Title</h2>
      <input aria-label="focus-first" />
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );

  it('opens on trigger click and renders a dialog', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
              <PanelContent onClose={() => setOpen(false)} />
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByText('Open'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes on outside click when mask=true & maskClosable=true', async () => {
    vi.useFakeTimers();

    const outside = document.createElement('div');
    outside.setAttribute('data-testid', 'outside');
    document.body.appendChild(outside);

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} mask maskClosable>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(outside);

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does NOT close on outside click when mask=false', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} mask={false}>
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

  it('does NOT close on backdrop/outside or Esc when closable=false', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} closable={false} mask>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
              <PanelContent />
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }
    render(<Harness />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /close drawer/i })).not.toBeInTheDocument();
  });

  it('respects maskClosable=false (backdrop click ignored)', () => {
    vi.useRealTimers();

    const outside = document.createElement('div');
    document.body.appendChild(outside);

    const onClickOutside = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Drawer.Root open={open} onOpenChange={setOpen} mask maskClosable={false} onClickOutside={onClickOutside}>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
              <div>content</div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }

    render(<Harness />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(outside);

    expect(onClickOutside).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
