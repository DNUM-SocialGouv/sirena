import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type TabDescriptor, Tabs, type TabsProps } from './Tabs';

const description = `
# Tabs

A fully accessible, animated tabbed interface component that supports keyboard navigation, dynamic height adjustment, and smooth slide transitions between panels.

## Overview

The \`Tabs\` component renders a list of tab headers and a corresponding panel for each tab. Only the currently active panel is visible at any time. Switching tabs triggers a slide animation, with content sliding in from the right when moving forward (higher index) and from the left when moving backward (lower index). The container’s height adjusts automatically to match the combined height of the tab list and the active panel.

## Usage

\`\`\`tsx
import { Tabs, type TabDescriptor } from './Tabs';

const sampleTabs: TabDescriptor[] = [
  { label: 'Tab 1', tabPanelId: 'panel-1', tabId: 'tab-1' },
  { label: 'Tab 2', tabPanelId: 'panel-2', tabId: 'tab-2' },
  { label: 'Tab 3', tabPanelId: 'panel-3', tabId: 'tab-3' },
];

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const panels = [
    <div key="1">Content 1</div>,
    <div key="2">Content 2</div>,
    <div key="3">Content 3</div>,
  ];

  return (
    <Tabs
      tabs={sampleTabs}
      activeTab={activeTab}
      onUpdateActiveTab={setActiveTab}
    >
      {panels[activeTab]}
    </Tabs>
  );
}
\`\`\`

## Props

- \`tabs: TabDescriptor[]\`  
  An array of objects describing each tab.  
  - \`label\`: The visible text for the tab header.  
  - \`tabPanelId\`: The \`id\` attribute for the corresponding panel \`<div>\`.  
  - \`tabId\`: The \`id\` attribute for the tab \`<button>\`.  

- \`activeTab: number\`  
  The index of the currently selected tab (0-based). Only the panel at this index is rendered/visible.

- \`onUpdateActiveTab: (newIndex: number) => void\`  
  Callback invoked when the user selects a different tab (by click or keyboard). Should update the parent component’s state to the new active index.

- \`children: ReactNode\`  
  The content to render inside the active panel. Typically, pass a single JSX element or fragment corresponding to \`tabs[activeTab]\`.

`;

export default {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: description,
      },
    },
  },
} as Meta;

const sampleTabs: TabDescriptor[] = [
  { label: 'Onglet 1', tabPanelId: 'panel-1', tabId: 'tab-1' },
  { label: 'Onglet 2', tabPanelId: 'panel-2', tabId: 'tab-2' },
  { label: 'Onglet 3', tabPanelId: 'panel-3', tabId: 'tab-3' },
];

const sampleContent = [
  <div key="panel-1">
    <h2>Contenu de l’onglet 1</h2>
    <p>
      Voici le contenu du premier panneau. Vous pouvez y mettre n’importe quel JSX : texte, images, formulaires, etc.
    </p>
  </div>,
  <div key="panel-2">
    <h2>Contenu de l’onglet 2</h2>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
    <p>
      Deuxième panneau pour montrer la navigation. Utilisez les flèches gauche/droite ou Home/End pour naviguer au
      clavier.
    </p>
  </div>,
  <div key="panel-3">
    <h2>Contenu de l’onglet 3</h2>
    <p>Troisième panneau : vous pourriez y afficher un graphique, une table de données, ou tout autre composant.</p>
  </div>,
];

type Story = StoryObj<Omit<TabsProps, 'children'>>;

export const Default: Story = {
  args: {
    tabs: sampleTabs,
    activeTab: 0,
  },
  render: (args) => {
    const [activeIndex, setActiveIndex] = useState(args.activeTab ?? 0);

    return (
      <Tabs {...args} activeTab={activeIndex} onUpdateActiveTab={(newIndex) => setActiveIndex(newIndex)}>
        {sampleContent[activeIndex]}
      </Tabs>
    );
  },
};
