import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { REQUETE_STATUT_TYPES, requeteStatutType } from '@sirena/common/constants';
import { Drawer } from '@sirena/ui';
import { type RefObject, useCallback, useId, useState } from 'react';
import styles from './MoreFiltersDrawer.module.css';

const STATUT_OPTIONS = [
  REQUETE_STATUT_TYPES.NOUVEAU,
  REQUETE_STATUT_TYPES.EN_COURS,
  REQUETE_STATUT_TYPES.CLOTUREE,
  REQUETE_STATUT_TYPES.TRAITEE,
].map((id) => ({ value: id, label: requeteStatutType[id] }));

type Props = {
  selectedStatutIds: string[];
  onApply: (statutIds: string[]) => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

export function MoreFiltersDrawer({ selectedStatutIds, onApply, triggerRef }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStatutIds, setDraftStatutIds] = useState<string[]>(selectedStatutIds);
  const titleId = useId();

  const open = useCallback(() => {
    setDraftStatutIds(selectedStatutIds);
    setIsOpen(true);
  }, [selectedStatutIds]);

  const handleStatutToggle = useCallback((value: string, checked: boolean) => {
    setDraftStatutIds((prev) => (checked ? [...prev, value] : prev.filter((id) => id !== value)));
  }, []);

  const handleApply = useCallback(() => {
    onApply(draftStatutIds);
    setIsOpen(false);
  }, [draftStatutIds, onApply]);

  const activeCount = selectedStatutIds.length;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        priority="tertiary"
        iconId="fr-icon-filter-line"
        onClick={open}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        Plus de filtres
        {activeCount > 0 && (
          <>
            {' '}({activeCount})
            <span className="fr-sr-only">
              {' '}
              filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </Button>

      <Drawer.Root
        variant="modal"
        withCloseButton={false}
        open={isOpen}
        onOpenChange={setIsOpen}
        width="min(90vw, 420px)"
      >
        <Drawer.Portal>
          <Drawer.Backdrop onInteract={() => setIsOpen(false)} />
          <Drawer.Panel titleId={titleId} className={styles.panel}>
            <div className={styles.body}>
              <div className={styles.closeRow}>
                <Button
                  type="button"
                  priority="tertiary no outline"
                  iconId="fr-icon-close-line"
                  iconPosition="right"
                  onClick={() => setIsOpen(false)}
                >
                  Fermer
                </Button>
              </div>

              <h2 id={titleId} className="fr-h6">
                Plus de filtres
              </h2>

              <Checkbox
                legend="Statut"
                orientation="horizontal"
                options={STATUT_OPTIONS.map((option) => ({
                  label: option.label,
                  nativeInputProps: {
                    value: option.value,
                    checked: draftStatutIds.includes(option.value),
                    onChange: (e) => handleStatutToggle(option.value, e.target.checked),
                  },
                }))}
              />
            </div>

            <div className={styles.footer}>
              <Button type="button" priority="secondary" onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleApply}>
                Filtrer les requêtes
              </Button>
            </div>
          </Drawer.Panel>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
