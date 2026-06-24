import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
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
  const [start, setStart] = useState(value.startDate ?? '');
  const [end, setEnd] = useState(value.endDate ?? '');
  const endInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  const syncDraft = useCallback(() => {
    setStart(value.startDate ?? '');
    setEnd(value.endDate ?? '');
  }, [value.startDate, value.endDate]);

  const { isOpen, toggle, close, triggerRef, panelRef } = useDisclosureMenu({ onOpen: syncDraft });

  useEffect(() => setStart(value.startDate ?? ''), [value.startDate]);
  useEffect(() => setEnd(value.endDate ?? ''), [value.endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    // Fermeture si le focus clavier sort du panneau (WCAG-safe).
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (!next || !panel?.contains(next)) close();
    };
    panel?.addEventListener('focusout', onFocusOut);

    requestAnimationFrame(() => {
      const checked = panel?.querySelector<HTMLInputElement>('input[type="radio"]:checked');
      const target = checked ?? panel?.querySelector<HTMLInputElement>('input[type="radio"]');
      target?.focus();
    });

    return () => panel?.removeEventListener('focusout', onFocusOut);
  }, [isOpen, panelRef, close]);

  const isInvalid = start !== '' && end !== '' && start > end;
  const activeLabel = describePeriod(value);

  const applyPreset = (preset: PeriodPreset) => {
    onChange({ period: preset, startDate: undefined, endDate: undefined });
  };

  const applyCustom = (e: FormEvent) => {
    e.preventDefault();
    if (isInvalid) {
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
            <RadioButtons
              className={styles.period__presets}
              legend={<span className={fr.cx('fr-text--bold')}>Période prédéfinie</span>}
              name={`period-preset-${menuId}`}
              options={PERIOD_PRESETS.map((preset) => ({
                label: PERIOD_PRESET_LABELS[preset],
                nativeInputProps: {
                  value: preset,
                  checked: value.period === preset,
                  onChange: () => applyPreset(preset),
                },
              }))}
            />

            <form className={styles.period__custom} onSubmit={applyCustom}>
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
                  Appliquer <span className="fr-sr-only">le filtre de période personnalisée</span>
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
