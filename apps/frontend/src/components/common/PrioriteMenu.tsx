import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { REQUETE_PRIORITE_TYPES, type RequetePrioriteType } from '@sirena/common/constants';
import { useId } from 'react';
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

export function PrioriteMenu({ value, onChange, disabled, onOpen, onClose }: PrioriteMenuProps) {
  const { isOpen, toggle, triggerRef, panelRef, onPanelBlur } = useDisclosureMenu({ onOpen, onClose });

  const menuId = useId();

  const badgeSelected = requetePrioriteBadges.find((b) => b.value === value);
  const label = badgeSelected ? 'Modifier la priorité :' : 'Définir une priorité';

  const prioriteClassMap: Record<string, string> = {
    [REQUETE_PRIORITE_TYPES.HAUTE]: prioriteStyles['priorite-haute'],
    [REQUETE_PRIORITE_TYPES.MOYENNE]: prioriteStyles['priorite-moyenne'],
    [REQUETE_PRIORITE_TYPES.BASSE]: prioriteStyles['priorite-basse'],
  };

  const options = [
    ...requetePrioriteBadges.map((badge) => ({
      label: badge.text,
      className: prioriteClassMap[badge.value],
      nativeInputProps: {
        value: badge.value,
        checked: value === badge.value,
        onChange: () => onChange(badge.value),
      },
    })),
    {
      label: 'Aucune',
      nativeInputProps: {
        value: '',
        checked: value === null,
        onChange: () => onChange(null),
      },
    },
  ];

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
                <RequetePrioriteTag statut={value as RequetePrioriteType} noIcon />
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
      {isOpen && (
        <div
          id={menuId}
          ref={panelRef}
          className={prioriteStyles['priorite-filter__dropdown']}
          onBlurCapture={onPanelBlur}
        >
          <RadioButtons legend="Choisir une priorité" name={`priorite-${menuId}`} options={options} />
        </div>
      )}
    </div>
  );
}
