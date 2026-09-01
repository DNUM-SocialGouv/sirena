import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AccordionMultiSelect, type AccordionMultiSelectOption } from './AccordionMultiSelect';

const SAMPLE_OPTIONS: AccordionMultiSelectOption[] = [
  {
    label: "Activités d'esthétique non réglementées",
    value: 'ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES',
    children: [
      { label: "Défaut de déclaration d'activité", value: 'DEFAUT_DECLARATION_ACTIVITE' },
      {
        label: 'Non respect des règles',
        description: 'Hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, etc.',
        value: 'NON_RESPECT_REGLES',
      },
      { label: 'Autres', value: 'AUTRES' },
    ],
  },
  {
    label: 'Hôtellerie locaux restauration',
    value: 'HOTELLERIE_LOCAUX_RESTAURATION',
    children: [
      {
        label: 'Configuration des locaux',
        description: 'Équipement sanitaire, superficie des chambres, équipements divers',
        value: 'CONFIGURATION_LOCAUX',
      },
      {
        label: 'Entretien',
        description: 'Fenêtre endommagé, digicode non fonctionnel, etc.',
        value: 'ENTRETIEN',
      },
      { label: 'Accueil', value: 'ACCUEIL' },
    ],
  },
];

const FLAT_OPTIONS: AccordionMultiSelectOption[] = [
  { label: 'Décès', value: 'DECES' },
  { label: 'Incapacité permanente', value: 'INCAPACITE_PERMANENTE' },
  { label: 'Incapacité temporaire', value: 'INCAPACITE_TEMPORAIRE' },
];

const meta: Meta<typeof AccordionMultiSelect> = {
  title: 'Components/AccordionMultiSelect',
  component: AccordionMultiSelect,
};

export default meta;
type Story = StoryObj<typeof AccordionMultiSelect>;

export const Motifs: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <AccordionMultiSelect
        options={SAMPLE_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Sélectionner un ou plusieurs motifs"
        itemNoun={{ singular: 'motif', plural: 'motifs' }}
      />
    );
  },
};

export const WithPreselection: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['HOTELLERIE_LOCAUX_RESTAURATION/CONFIGURATION_LOCAUX']);
    return (
      <AccordionMultiSelect
        options={SAMPLE_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Sélectionner un ou plusieurs motifs"
        itemNoun={{ singular: 'motif', plural: 'motifs' }}
      />
    );
  },
};

export const FlatList: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <AccordionMultiSelect
        label="Conséquences sur la personne"
        options={FLAT_OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <AccordionMultiSelect
        options={SAMPLE_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Sélectionner un ou plusieurs motifs"
        itemNoun={{ singular: 'motif', plural: 'motifs' }}
        state="error"
        stateRelatedMessage="Veuillez sélectionner au moins un motif."
      />
    );
  },
};
