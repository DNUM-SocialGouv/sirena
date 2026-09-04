import { LIEU_TYPE, lieuTypeLabels } from '@sirena/common/constants';
import { lieuPrecisionLabelsByType } from '@sirena/common/utils';
import { DropdownTree, type DropdownTreeLabels, type TreeNode } from '../DropdownTree';

const selectedValuesLabel = (count: number) =>
  `${count} type${count > 1 ? 's' : ''} de lieu sélectionné${count > 1 ? 's' : ''}`;

const LABELS: DropdownTreeLabels = {
  selectAll: (label) => `Tous les lieux de la catégorie ${label}`,
  selectAllHint: 'Permet de sélectionner ou désélectionner tous les lieux de cette catégorie.',
  optionsLegend: (label) => `Lieux de la catégorie ${label}`,
  lockedHint: (label) =>
    `La catégorie ${label} est sélectionnée en entier : tous ses lieux sont inclus et ne sont pas modifiables.`,
};

export const lieuChildToken = (lieuTypeId: string, precision: string) => `${lieuTypeId}:${precision}`;

const LIEU_NODES: TreeNode[] = Object.values(LIEU_TYPE)
  .map((lieuTypeId) => ({
    value: lieuTypeId,
    label: lieuTypeLabels[lieuTypeId],
    children: Object.entries(lieuPrecisionLabelsByType[lieuTypeId] ?? {}).map(([precision, label]) => ({
      value: lieuChildToken(lieuTypeId, precision),
      label,
    })),
  }))
  .filter(({ children }) => children.length > 0);

type Props = {
  selectedTokens: string[];
  legend?: string;
  onChange: (tokens: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function LieuTypeFilter({
  selectedTokens,
  legend = 'Filtrer les requêtes par type de lieu de survenue',
  onChange,
  onOpen,
  onClose,
}: Props) {
  return (
    <DropdownTree
      buttonLabel="Type de lieu de survenue"
      selectedValuesLabel={selectedValuesLabel}
      legend={legend}
      nodes={LIEU_NODES}
      selectedValues={selectedTokens}
      labels={LABELS}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
