import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type TabDescriptor, Tabs, type TabsProps } from './Tabs';

export default {
  title: 'Components/Tabs',
  component: Tabs,
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
    activeTab: 2,
  },
  render: (args) => {
    // On Storybook, onUpdateActiveTab doit gérer localement l'état
    const [activeIndex, setActiveIndex] = useState(args.activeTab ?? 2);

    return (
      <Tabs {...args} activeTab={activeIndex} onUpdateActiveTab={(newIndex) => setActiveIndex(newIndex)}>
        {sampleContent[activeIndex]}
      </Tabs>
    );
  },
};
