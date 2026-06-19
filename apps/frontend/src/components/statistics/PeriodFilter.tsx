import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import styles from './PeriodFilter.module.css';
import {
  describePeriod,
  PERIOD_PRESET_LABELS,
  PERIOD_PRESETS,
  type PeriodPreset,
  type PeriodSelection,
} from './period';

type Props = {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
};

export function PeriodFilter({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [start, setStart] = useState(value.startDate ?? '');
  const [end, setEnd] = useState(value.endDate ?? '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const presetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const endInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  useEffect(() => setStart(value.startDate ?? ''), [value.startDate]);
  useEffect(() => setEnd(value.endDate ?? ''), [value.endDate]);

  const isInvalid = start !== '' && end !== '' && start > end;
  const activeLabel = describePeriod(value);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((open) => {
      if (!open) {
        setStart(value.startDate ?? '');
        setEnd(value.endDate ?? '');
      }
      return !open;
    });
  }, [value.startDate, value.endDate]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [close],
  );

  const handleFocusOut = useCallback((e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && !panelRef.current?.contains(next) && !triggerRef.current?.contains(next)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    panel?.addEventListener('focusout', handleFocusOut);

    requestAnimationFrame(() => {
      const checked = panel?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]');
      const target = checked ?? panel?.querySelector<HTMLElement>('[role="menuitemradio"]');
      target?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      panel?.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen, handleClickOutside, handleKeyDown, handleFocusOut]);

  const focusPresetAt = (index: number) => {
    const count = PERIOD_PRESETS.length;
    presetRefs.current[(index + count) % count]?.focus();
  };

  const handlePresetKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        focusPresetAt(index + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        focusPresetAt(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusPresetAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusPresetAt(PERIOD_PRESETS.length - 1);
        break;
    }
  };

  const applyPreset = (preset: PeriodPreset) => {
    onChange({ period: preset, startDate: undefined, endDate: undefined });
    close();
  };

  const applyCustom = (e: FormEvent) => {
    e.preventDefault();
    if (isInvalid) {
      // Plutôt qu'un bouton désactivé (mauvais pour le contraste et la navigation),
      // on garde le bouton actif et on renvoie le focus sur le champ en erreur.
      endInputRef.current?.focus();
      return;
    }
    onChange({ period: undefined, startDate: start || undefined, endDate: end || undefined });
    close();
  };

  const reset = () => {
    setStart('');
    setEnd('');
    onChange({ period: undefined, startDate: undefined, endDate: undefined });
  };

  return (
    <div className={styles.period}>
      <div className={styles.period__bar}>
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.period__trigger} fr-btn fr-btn--tertiary fr-btn--icon-right ${isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
          aria-expanded={isOpen}
          aria-controls={menuId}
          onClick={toggle}
        >
          Période
        </button>

        {isOpen && (
          <div id={menuId} ref={panelRef} className={`${styles.period__panel} fr-card fr-px-3w fr-py-2w`}>
            <fieldset className={styles.period__section}>
              <legend className={fr.cx('fr-text--bold')}>Période prédéfinie</legend>
              <div className={styles.period__presets} role="menu" aria-label="Période prédéfinie">
                {PERIOD_PRESETS.map((preset, index) => {
                  const isActive = value.period === preset;
                  const isTabStop = value.period ? isActive : index === 0;
                  return (
                    <button
                      key={preset}
                      ref={(el) => {
                        presetRefs.current[index] = el;
                      }}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      tabIndex={isTabStop ? 0 : -1}
                      className={`${styles.period__preset} ${isActive ? styles['period__preset--active'] : ''}`}
                      onClick={() => applyPreset(preset)}
                      onKeyDown={(e) => handlePresetKeyDown(e, index)}
                    >
                      <span className={`${styles.period__check} fr-icon-check-line`} aria-hidden="true" />
                      {PERIOD_PRESET_LABELS[preset]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <form onSubmit={applyCustom}>
              <fieldset className={styles.period__section}>
                <legend className={fr.cx('fr-text--bold')}>Période personnalisée</legend>
                <Input
                  label="Date de début"
                  hintText="Format attendu : JJ/MM/AAAA"
                  nativeInputProps={{
                    type: 'date',
                    value: start,
                    max: end || undefined,
                    onChange: (e) => setStart(e.target.value),
                  }}
                />
                <Input
                  label="Date de fin"
                  hintText="Format attendu : JJ/MM/AAAA"
                  state={isInvalid ? 'error' : 'default'}
                  stateRelatedMessage={
                    isInvalid ? 'La date de fin doit être postérieure à la date de début.' : undefined
                  }
                  nativeInputProps={{
                    ref: endInputRef,
                    type: 'date',
                    value: end,
                    min: start || undefined,
                    onChange: (e) => setEnd(e.target.value),
                  }}
                />
              </fieldset>
              <div className={styles.period__actions}>
                <Button type="submit" iconId="fr-icon-search-line">
                  Appliquer <span className="fr-sr-only">le filtre de période</span>
                </Button>
                <Button type="button" priority="secondary" iconId="fr-icon-refresh-line" onClick={reset}>
                  Réinitialiser <span className="fr-sr-only">le filtre de période</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {activeLabel && (
        <Tag
          as="button"
          dismissible
          onClick={reset}
          nativeButtonProps={{ 'aria-label': `Période : ${activeLabel}, retirer le filtre` }}
        >
          Période : {activeLabel}
        </Tag>
      )}
    </div>
  );
}
