import { REQUETE_STATUT_TYPES, requeteStatutType } from '@sirena/common/constants';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const STATUT_OPTIONS = [
  REQUETE_STATUT_TYPES.NOUVEAU,
  REQUETE_STATUT_TYPES.EN_COURS,
  REQUETE_STATUT_TYPES.CLOTUREE,
  REQUETE_STATUT_TYPES.TRAITEE,
].map((id) => ({ value: id, label: requeteStatutType[id] }));

export function StatutFilter({ selectedIds, onChange, onOpen, onClose }: Props) {
  return (
    <DropdownCheckboxFilter
      buttonLabel="Statut"
      selectedValuesLabel={(count) => `statut${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`}
      legend="Filtrer les requêtes par statut"
      hintText="Statut de la requête"
      options={STATUT_OPTIONS}
      selectedValues={selectedIds}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
