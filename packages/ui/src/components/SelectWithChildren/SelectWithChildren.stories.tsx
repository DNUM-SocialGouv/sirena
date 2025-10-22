import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SelectWithChildren, type SelectWithChildrenOption } from './SelectWithChildren';

const SAMPLE_OPTIONS: SelectWithChildrenOption[] = [
  {
    label: "Activités d'esthétique non réglementées",
    value: 'activites-esthetique-non-reglementees',
    children: [
      { label: 'Autres', value: 'activites-esthetique-autres' },
      { label: "Défaut de déclaration d'activité", value: 'activites-esthetique-defaut-declaration' },
      {
        label:
          'Non respect des règles (hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, formations…)',
        value: 'activites-esthetique-non-respect-regles',
      },
    ],
  },
  {
    label: 'Médicaments',
    value: 'medicaments',
    children: [
      { label: 'Problématique de circuit du médicament', value: 'medicaments-circuit' },
      { label: 'Stockage des médicaments', value: 'medicaments-stockage' },
      { label: 'Vente de médicaments sur internet', value: 'medicaments-vente-internet' },
    ],
  },
  {
    label: 'Facturations et honoraires',
    value: 'facturations-honoraires',
    children: [
      { label: 'Autres', value: 'facturations-autres' },
      { label: "Problème d'honoraires", value: 'facturations-probleme-honoraires' },
      { label: 'Problème de facturation', value: 'facturations-probleme-facturation' },
      { label: 'Honoraires professions libérales', value: 'facturations-honoraires-liberales' },
    ],
  },
  {
    label: 'Qualité des soins',
    value: 'qualite-soins',
    children: [
      { label: 'Absence ou insuffisance de soins médicaux', value: 'qualite-soins-absence-medicaux' },
      {
        label: 'Absence ou insuffisance de soins paramédicaux (repas, hygiène…)',
        value: 'qualite-soins-absence-paramedicaux',
      },
      {
        label: 'Défaillance ou incident lié aux soins ou à la surveillance (complications, incapacité, décès)',
        value: 'qualite-soins-defaillance',
      },
      { label: 'Délais de prise en charge', value: 'qualite-soins-delais' },
      { label: 'Prise en charge de la douleur', value: 'qualite-soins-douleur' },
    ],
  },
];

const RECURSIVE_OPTIONS: SelectWithChildrenOption[] = [
  {
    label: 'Catégorie 1',
    value: 'cat-1',
    children: [
      {
        label: 'Sous-catégorie 1.1',
        value: 'cat-1-1',
        children: [
          { label: 'Option 1.1.1', value: 'opt-1-1-1' },
          { label: 'Option 1.1.2', value: 'opt-1-1-2' },
          {
            label: 'Sous-catégorie 1.1.3',
            value: 'cat-1-1-3',
            children: [
              { label: 'Option profonde 1.1.3.1', value: 'opt-1-1-3-1' },
              { label: 'Option profonde 1.1.3.2', value: 'opt-1-1-3-2' },
            ],
          },
        ],
      },
      {
        label: 'Sous-catégorie 1.2',
        value: 'cat-1-2',
        children: [
          { label: 'Option 1.2.1', value: 'opt-1-2-1' },
          { label: 'Option 1.2.2', value: 'opt-1-2-2' },
        ],
      },
    ],
  },
  {
    label: 'Catégorie 2',
    value: 'cat-2',
    children: [
      { label: 'Option 2.1', value: 'opt-2-1' },
      { label: 'Option 2.2', value: 'opt-2-2' },
      {
        label: 'Sous-catégorie 2.3',
        value: 'cat-2-3',
        children: [
          { label: 'Option 2.3.1', value: 'opt-2-3-1' },
          { label: 'Option 2.3.2', value: 'opt-2-3-2' },
        ],
      },
    ],
  },
];

const meta: Meta<typeof SelectWithChildren> = {
  title: 'Components/SelectWithChildren',
  component: SelectWithChildren,
  tags: ['autodocs'],
  argTypes: {
    value: {
      description: 'Array of selected option values',
      control: { type: 'object' },
    },
    onChange: {
      description: 'Callback fired when selection changes',
      action: 'onChange',
      table: { disable: true },
    },
    label: {
      description: 'Label for the select field',
      control: { type: 'text' },
    },
    options: {
      description: 'Recursive data structure: array of options with label, value, and optional children',
      control: { type: 'object' },
    },
  },
  args: {
    label: "Motifs qualifiés par l'agent",
    options: SAMPLE_OPTIONS,
  },
};

export default meta;
type Story = StoryObj<typeof SelectWithChildren>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <SelectWithChildren {...args} value={value} onChange={setValue} />;
  },
};

export const WithSelection: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([
      'medicaments-circuit',
      'qualite-soins-absence-medicaux',
      'qualite-soins-douleur',
    ]);
    return <SelectWithChildren {...args} value={value} onChange={setValue} />;
  },
};

export const RecursiveStructure: Story = {
  args: {
    options: RECURSIVE_OPTIONS,
    label: 'Navigation récursive multi-niveaux',
  },
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--background-alt-grey)' }}>
          <p>
            <strong>🔄 Recursive Navigation:</strong>
          </p>
          <ul style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            <li>Navigate through multiple nesting levels</li>
            <li>Categories can contain sub-categories or options</li>
            <li>Use "Retour" button to go back one level</li>
            <li>Select options at any depth level</li>
          </ul>
        </div>
        <SelectWithChildren {...args} value={value} onChange={setValue} />
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'var(--background-contrast-info)' }}>
          <strong>Selected values:</strong>
          <pre style={{ marginTop: '8px', fontSize: '0.875rem' }}>{JSON.stringify(value, null, 2)}</pre>
        </div>
      </div>
    );
  },
};
