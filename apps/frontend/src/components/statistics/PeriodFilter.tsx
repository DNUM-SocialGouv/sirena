import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import { useHasFeature } from '@/hooks/useHasFeature';
import styles from './PeriodFilter.module.css';
import {
  describeCreatedPeriod,
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
  const showPresets = useHasFeature(FEATURE_FLAGS.STATISTICS_PERIOD_PRESETS, false);
  const emptyErrorMessage = showPresets
    ? 'Sélectionnez une période prédéfinie ou renseignez une période personnalisée.'
    : 'Renseignez une période personnalisée.';
  const [draftPeriod, setDraftPeriod] = useState<PeriodPreset | undefined>(value.period);
  const [start, setStart] = useState(value.startDate ?? '');
  const [end, setEnd] = useState(value.endDate ?? '');
  const [isEmptyError, setIsEmptyError] = useState(false);
  const endInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  const syncDraft = useCallback(() => {
    setDraftPeriod(value.period);
    setStart(value.startDate ?? '');
    setEnd(value.endDate ?? '');
    setIsEmptyError(false);
  }, [value.period, value.startDate, value.endDate]);

  const { isOpen, toggle, close, triggerRef, panelRef } = useDisclosureMenu({ onOpen: syncDraft });

  useEffect(() => setDraftPeriod(value.period), [value.period]);
  useEffect(() => setStart(value.startDate ?? ''), [value.startDate]);
  useEffect(() => setEnd(value.endDate ?? ''), [value.endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (!next) return;
      if (panel?.contains(next) || triggerRef.current?.contains(next)) return;
      close();
    };
    panel?.addEventListener('focusout', onFocusOut);

    requestAnimationFrame(() => {
      const checked = panel?.querySelector<HTMLInputElement>('input[type="radio"]:checked');
      const target = checked ?? panel?.querySelector<HTMLInputElement>('input[type="radio"], input[type="date"]');
      target?.focus();
    });

    return () => panel?.removeEventListener('focusout', onFocusOut);
  }, [isOpen, panelRef, triggerRef, close]);

  const isInvalid = start !== '' && end !== '' && start > end;
  const activeLabel = describeCreatedPeriod(value);

  const focusFirstField = useCallback(() => {
    const panel = panelRef.current;
    const radio = panel?.querySelector<HTMLInputElement>('input[type="radio"]');
    (radio ?? panel?.querySelector<HTMLInputElement>('input[type="date"]'))?.focus();
  }, [panelRef]);

  const selectPreset = (preset: PeriodPreset) => {
    setDraftPeriod(preset);
    setStart('');
    setEnd('');
    setIsEmptyError(false);
  };

  const handleStartChange = (next: string) => {
    setStart(next);
    setDraftPeriod(undefined);
    setIsEmptyError(false);
  };

  const handleEndChange = (next: string) => {
    setEnd(next);
    setDraftPeriod(undefined);
    setIsEmptyError(false);
  };

  const apply = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (draftPeriod) {
        onChange({ period: draftPeriod, startDate: undefined, endDate: undefined });
        close();
        return;
      }
      if (isInvalid) {
        endInputRef.current?.focus();
        return;
      }
      if (!start && !end) {
        setIsEmptyError(true);
        focusFirstField();
        return;
      }
      onChange({ period: undefined, startDate: start || undefined, endDate: end || undefined });
      close();
    },
    [draftPeriod, isInvalid, start, end, onChange, close, focusFirstField],
  );

  const reset = useCallback(() => {
    setDraftPeriod(undefined);
    setStart('');
    setEnd('');
    setIsEmptyError(false);
    onChange({ period: undefined, startDate: undefined, endDate: undefined });
  }, [onChange]);

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

        {isOpen ? (
          <div id={menuId} ref={panelRef} className={`${styles.period__panel} fr-card fr-px-3w fr-py-2w`}>
            <form onSubmit={apply}>
              {showPresets ? (
                <RadioButtons
                  className={styles.period__presets}
                  legend={<span className={fr.cx('fr-text--bold')}>Période prédéfinie</span>}
                  name={`period-preset-${menuId}`}
                  state={isEmptyError ? 'error' : 'default'}
                  stateRelatedMessage={isEmptyError ? emptyErrorMessage : undefined}
                  options={PERIOD_PRESETS.map((preset) => ({
                    label: PERIOD_PRESET_LABELS[preset],
                    nativeInputProps: {
                      value: preset,
                      checked: draftPeriod === preset,
                      onChange: () => selectPreset(preset),
                    },
                  }))}
                />
              ) : null}

              <fieldset className={`${styles.period__section} ${showPresets ? styles.period__custom : ''}`}>
                <legend className={fr.cx('fr-fieldset__legend', 'fr-text--regular')}>
                  <span className={fr.cx('fr-text--bold')}>Période personnalisée</span>
                </legend>
                <p className={styles.period__note}>
                  Le filtre porte sur la date de création de la requête dans SIRENA.
                </p>
                <Input
                  label="Date de début"
                  hintText="Format attendu : JJ/MM/AAAA"
                  nativeInputProps={{
                    type: 'date',
                    value: start,
                    max: end || undefined,
                    onChange: (e) => handleStartChange(e.target.value),
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
                    onChange: (e) => handleEndChange(e.target.value),
                  }}
                />
              </fieldset>
              {!showPresets && isEmptyError ? <p className={fr.cx('fr-error-text')}>{emptyErrorMessage}</p> : null}
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
        ) : null}
      </div>

      {activeLabel ? (
        <Tag
          as="button"
          dismissible
          onClick={reset}
          nativeButtonProps={{ 'aria-label': `${activeLabel}, retirer le filtre` }}
        >
          {activeLabel}
        </Tag>
      ) : null}
    </div>
  );
}
