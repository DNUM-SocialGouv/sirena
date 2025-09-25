import { Badge } from '@codegouvfr/react-dsfr/Badge';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoSection } from './InfoSection';

const meta: Meta<typeof InfoSection> = {
  component: InfoSection,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InfoSection>;

export const EmptyState: Story = {
  args: {
    id: 'info-section-empty',
    title: 'Déclarant',
    onEdit: () => {
      console.log('onEdit');
    },
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
      <Badge key="badge-2" severity="info">
        Priorité basse
      </Badge>,
    ],
  },
};

export const FullState: Story = {
  args: {
    id: 'info-section-full',
    title: 'Déclarant',
    onEdit: () => {
      console.log('onEdit');
    },
    renderSummary: () => <div>Summary DIV</div>,
    renderDetails: () => <div>Details DIV</div>,
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
    ],
  },
};

export const OnlySummaryState: Story = {
  args: {
    id: 'info-section-only-summary',
    title: 'Déclarant',
    onEdit: () => {
      console.log('onEdit');
    },
    renderSummary: () => <div>Summary DIV</div>,
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
    ],
  },
};

export const OnlyDetailsState: Story = {
  args: {
    id: 'info-section-only-details',
    title: 'Déclarant',
    onEdit: () => {
      console.log('onEdit');
    },
    renderDetails: () => <div>Details DIV</div>,
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
    ],
  },
};

export const ReplaceSummaryWithDetails: Story = {
  args: {
    id: 'info-section-replace-summary-with-details',
    title: 'Déclarant',
    onEdit: () => {
      console.log('onEdit');
    },
    renderSummary: () => <div>Summary DIV - sera remplacé par les détails</div>,
    renderDetails: () => <div>Details DIV - remplace le summary quand ouvert</div>,
    replaceSummaryWithDetails: true,
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
    ],
  },
};

export const NoEdit: Story = {
  args: {
    id: 'info-section-no-edit',
    title: 'Déclarant',
    onEdit: undefined,
    renderSummary: () => <div>Summary DIV</div>,
    renderDetails: () => <div>Details DIV</div>,
    emptyLabel: 'Aucune information',
    badges: [
      <Badge key="badge-1" severity="error">
        Priorité haute
      </Badge>,
    ],
  },
};
