import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { REQUETE_PRIORITE_TYPES, type RequetePrioriteType } from '@sirena/common/constants';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import { requetePrioriteBadges } from '@/utils/requeteStatutBadge.constant';
import prioriteStyles from './PrioriteMenu.module.css';
import { RequetePrioriteTag } from './RequeteStatutTag';

type PrioriteMenuProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

const prioriteClassMap: Record<string, string> = {
  [REQUETE_PRIORITE_TYPES.HAUTE]: prioriteStyles['priorite-haute'],
  [REQUETE_PRIORITE_TYPES.MOYENNE]: prioriteStyles['priorite-moyenne'],
  [REQUETE_PRIORITE_TYPES.BASSE]: prioriteStyles['priorite-basse'],
};

export function PrioriteMenu({ value, onChange, disabled, onOpen, onClose }: PrioriteMenuProps) {
  const { isOpen, toggle, triggerRef, panelRef } = useDisclosureMenu({ onOpen, onClose });
  const [selectedValue, setSelectedValue] = useState(value);
  const menuId = useId();

  const badgeSelected = requetePrioriteBadges.find((b) => b.value === selectedValue);
  const label = badgeSelected ? 'Modifier la priorité :' : 'Définir une priorité';

  // Required to avoid lag when updating DSFR RadioButtons,
  // because React Query propagation is not instantaneous.
  const handleSelect = useCallback(
    (v: string | null) => {
      setSelectedValue(v);
      onChange(v);
    },
    [onChange],
  );

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const options = useMemo(() => {
    return [
      ...requetePrioriteBadges.map((badge) => ({
        label: badge.text,
        className: prioriteClassMap[badge.value],
        nativeInputProps: {
          value: badge.value,
          checked: selectedValue === badge.value,
          onChange: () => {
            handleSelect(badge.value);
          },
        },
      })),
      {
        label: 'Aucune',
        nativeInputProps: {
          value: '',
          checked: selectedValue === null,
          onChange: () => handleSelect(null),
        },
      },
    ];
  }, [selectedValue, handleSelect]);

  return (
    <div className={prioriteStyles['priorite-filter']}>
      <button
        type="button"
        disabled={disabled}
        className="fr-btn fr-btn--tertiary"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggle}
        ref={triggerRef}
      >
        {badgeSelected ? (
          <span className={prioriteStyles['button-content']}>
            <span>{label}</span>
            {badgeSelected && (
              <>
                <span className="fr-sr-only">Priorité actuelle :</span>
                <RequetePrioriteTag statut={selectedValue as RequetePrioriteType} noIcon />
              </>
            )}
          </span>
        ) : (
          'Définir une priorité'
        )}
        <span
          aria-hidden="true"
          className={`fr-icon-arrow-down-s-line menu__trigger__icon${isOpen ? ' menu__trigger__icon--is-open' : ''}`}
        />
      </button>
      {isOpen ? (
        <div id={menuId} ref={panelRef} className={prioriteStyles['priorite-filter__dropdown']}>
          <RadioButtons legend="Choisir une priorité" name={`priorite-${menuId}`} options={options} />
        </div>
      ) : null}
    </div>
  );
}
