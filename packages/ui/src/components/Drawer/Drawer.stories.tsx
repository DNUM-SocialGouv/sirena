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
    variant: { control: 'radio', options: ['modal', 'nonModal'] },
    position: { control: 'radio', options: ['left', 'right'] },
    overlay: { control: 'boolean' },
    withCloseButton: { control: 'boolean' },
    width: { control: 'number' },
    open: { table: { disable: true } },
    onOpenChange: { table: { disable: true } },
    onClickOutside: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: {
    variant: 'modal',
    overlay: true,
    position: 'right',
    width: 420,
    withCloseButton: true,
  },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
# 🇫🇷 Modes et accessibilité

Le panneau peut fonctionner en **modal** ou **non-modal**, avec ou sans overlay.

| Mode | Overlay | Focus trap | ESC | Interaction page derrière | Usage / UX | Role / Aria |
|------|--------|------------|-----|---------------------------|------------|-------------|
| modal | oui | oui | oui | non | Panneau principal, focus limité | role="dialog", aria-modal=true
| nonModal | paramétrable | non | oui | oui | Sidebar ou info complémentaire, page interactive | role="dialog", aria-modal non appliqué

**Notes / Remarques UX :**
- **Drawer variant="modal"** : pour les actions critiques ou interruptions UX : formulaire, confirmation, paramètres principaux, workflow bloquant.
- aria-modal="true" est appliqué uniquement pour les drawers modaux afin d’informer les lecteurs d’écran que le reste de la page est inactif.
- **Drawer variant="nonModal"** n’applique pas aria-modal : la page reste interactive. À utiliser pour des sidebars secondaires, info complémentaire, filtres, menu complémentaire.
- **Overlay** n’empêche jamais l’interaction dans les drawers non-modaux, il est purement visuel si présent.
- La touche ESC ferme le drawer, avec ou sans withCloseButton.
- **onClickOutside** est optionnel et permet de fermer le drawer via un clic extérieur.

---

# 🇬🇧 Modes & Accessibility

Drawer can work in **modal** or **non-modal**, with or without overlay.

| Mode | Overlay | Focus trap | ESC | Background interaction | UX Usage | Role / Aria |
|------|--------|------------|-----|----------------------|----------|-------------|
| modal | yes | yes | yes | no | Primary panel, focus restricted | role="dialog", aria-modal=true
| nonModal | configurable | no | yes | yes | Sidebar or additional info, page still interactive | role="dialog", aria-modal not applied

**UX Notes :**
- **Drawer variant="modal"**: for critical actions or UX interruptions: form, confirmation, main settings, blocking workflow.
- aria-modal="true" is only applied to modal drawers to inform screen readers that the rest of the page is inactive.
- **Drawer variant="nonModal"** does not apply aria-modal: the page remains interactive. Use for secondary sidebars, supplementary info, filters, or extra menus.
- **Overlay** never blocks interaction for non-modal drawers; it is purely visual if present.
- ESC key closes the drawer regardless of withCloseButton.
- **onClickOutside** is optional and allows closing the drawer via an outside click.
      `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer.Root>;

export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Trigger priority="primary">Open drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel width={args.width} titleId="Modal Drawer">
            <div style={{ padding: 16 }}>
              <h2 className="fr-h4">Modal Drawer (focus trap)</h2>
              <p className="fr-text">Focus is trapped inside the drawer for accessibility. Press Escape to close it.</p>
              <p className="fr-text">CSS Modules transitions, DSFR button, zero motion libs</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              </div>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },

  parameters: {
    docs: {
      description: {
        story:
          'Accessible modal drawer: role="dialog", aria-modal=true, focus is trapped, ESC closes. Overlay visually blocks background interaction.',
      },
    },
  },
};

export const LeftSide: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Trigger>Open left drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel titleId="Left Panel">
            <div style={{ padding: 16 }}>Left panel content</div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
  args: { position: 'left' },
  parameters: {
    docs: {
      description: {
        story: 'Drawer opening from the left side. Focus and accessibility behaviors remain the same as default.',
      },
    },
  },
};

export const NonModalWithoutOverlay: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Fragment>
        <div style={{ padding: 12 }}>
          <p>Background content (scrollable when the drawer is open).</p>
          <div style={{ height: 800, background: 'var(--background-alt-grey, #f5f5f5)' }} />
        </div>
        <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen}>
          <Drawer.Trigger priority="primary">Open non-modal drawer</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Panel width={args.width} titleId="Non-Modal Drawer">
              <div style={{ padding: 16 }}>
                <p>Focus is free, ESC closes, background interactive. Overlay purely visual.</p>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
              </div>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer.Root>
      </Fragment>
    );
  },
  args: { overlay: false, variant: 'nonModal' },
  parameters: {
    docs: {
      description: {
        story:
          'Non-modal drawer without overlay. Focus is free, users can scroll and click the page behind. aria-modal not applied. ESC still closes the drawer.',
      },
    },
  },
};

export const Uncontrolled: Story = {
  render: (args) => {
    return (
      <Drawer.Root {...args}>
        <Drawer.Trigger priority="primary">Open (uncontrolled)</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Panel width={args.width}>
            <div style={{ padding: 16 }}>
              <p>Uncontrolled: internal state only, no open/onOpenChange props.</p>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled drawer: shows default behavior, can be closed via Escape or close button.',
      },
    },
  },
};

export const CustomOutsideClick: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer.Root {...args} open={isOpen} onOpenChange={setIsOpen} onClickOutside={() => alert('Clicked outside!')}>
        <Drawer.Trigger priority="primary">Open drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Panel titleId="Outside Click Demo">
            <div style={{ padding: 16 }}>
              <p>Clicking outside triggers the onClickOutside callback and closes the drawer.</p>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates onClickOutside callback for custom behaviors when user clicks outside the drawer.',
      },
    },
  },
};
