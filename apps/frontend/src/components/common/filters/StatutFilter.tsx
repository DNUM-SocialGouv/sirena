import { REQUETE_STATUT_TYPES, requeteStatutType } from '@sirena/common/constants';
import { useMemo } from 'react';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

type CountsMap = Record<string, number>;

type Props = {
  selectedIds: string[];
  counts: CountsMap | null;
  onChange: (ids: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const BASE_STATUTS = [REQUETE_STATUT_TYPES.NOUVEAU, REQUETE_STATUT_TYPES.EN_COURS, REQUETE_STATUT_TYPES.CLOTUREE];

const selectedValuesLabel = (count: number) => `statut${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

export function StatutFilter({ selectedIds, counts, onChange, onOpen, onClose }: Props) {
  const options = useMemo(() => {
    const requetesTraiteeCount = counts?.[REQUETE_STATUT_TYPES.TRAITEE];
    const showRequeteTraitee = (requetesTraiteeCount ?? 0) > 0 || selectedIds.includes(REQUETE_STATUT_TYPES.TRAITEE);
    const statuts = showRequeteTraitee ? [...BASE_STATUTS, REQUETE_STATUT_TYPES.TRAITEE] : BASE_STATUTS;

    return statuts.map((id) => {
      const count = counts?.[id];
      return {
        value: id,
        label: `${requeteStatutType[id]}${count !== undefined ? ` (${count})` : ''}`,
      };
    });
  }, [counts, selectedIds]);

  return (
    <DropdownCheckboxFilter
      buttonLabel="Statut"
      selectedValuesLabel={selectedValuesLabel}
      legend="Filtrer les requêtes par statut"
      hintText="Statut de la requête (nombre de requêtes)"
      options={options}
      selectedValues={selectedIds}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
