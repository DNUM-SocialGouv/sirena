import { Button } from '@codegouvfr/react-dsfr/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fragment, useState } from 'react';
import Drawer from './Drawer';

const meta: Meta<typeof Drawer.Root> = {
  title: 'Components/Drawer',
  component: Drawer.Root,
  // Show compound parts in Docs
  subcomponents: {
    Trigger: Drawer.Trigger,
    Portal: Drawer.Portal,
    Backdrop: Drawer.Backdrop,
    Panel: Drawer.Panel,
  },
  argTypes: {
    position: { control: 'radio', options: ['left', 'right'] },
    mask: { control: 'boolean' },
    maskClosable: { control: 'boolean' },
    closable: { control: 'boolean' },
    width: { control: 'number' },
    open: { table: { disable: true } },
    onOpenChange: { table: { disable: true } },
    onClickOutside: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: {
    position: 'right',
    mask: true,
    maskClosable: true,
    closable: true,
    width: 420,
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Drawer.Root>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Trigger priority="primary">Open drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel width={420}>
            <div style={{ padding: 16 }}>
              <h2 className="fr-h4">Demo Drawer</h2>
              <p className="fr-text">CSS Modules transitions, DSFR button, zero motion libs.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
};

export const LeftSide: Story = {
  args: { position: 'left' },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Trigger>Open left drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel>
            <div style={{ padding: 16 }}>Left panel content</div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
};

export const NoMask: Story = {
  args: { mask: false },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Fragment>
        <div style={{ padding: 12 }}>
          <p>Background content (scroll me when the drawer is open).</p>
          <div style={{ height: 800, background: 'var(--background-alt-grey, #f5f5f5)' }} />
        </div>
        <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen}>
          <Drawer.Trigger priority="primary">Open (no mask)</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Panel>
              <div style={{ padding: 16 }}>
                <p>No mask: you can scroll & click the page behind; outside click won’t close.</p>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              </div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      </Fragment>
    );
  },
};

export const Uncontrolled: Story = {
  render: () => {
    return (
      <Drawer.Root>
        <Drawer.Trigger priority="primary">Open (uncontrolled)</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel>
            <div style={{ padding: 16 }}>
              <p>Uncontrolled: no open/onOpenChange props.</p>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
};
