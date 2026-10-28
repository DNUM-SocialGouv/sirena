import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { hasFocusLeftMenu, useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import { useHasFeature } from '@/hooks/useHasFeature';
import styles from './PeriodFilter.module.css';
import { PERIOD_PRESET_LABELS, PERIOD_PRESETS, type PeriodPreset, type PeriodSelection } from './period';

type Props = {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
};

type DateField = 'start' | 'end';

const DATE_FIELD_LABELS: Record<DateField, string> = {
  start: 'Date de début',
  end: 'Date de fin',
};

const CREATION_DATE_NOTE = 'La date prise en compte est la date de création de la requête dans SIRENA.';

const END_BEFORE_START_MESSAGE = 'La date de fin doit être postérieure à la date de début.';

const getInvalidDateMessage = (field: DateField) =>
  `Le champ “${DATE_FIELD_LABELS[field]}” n’est pas valide. Format attendu : JJ/MM/AAAA`;

// `badInput` rather than `!validity.valid`: the two fields constrain each other through `min`/`max`,
// and that range conflict already has its own message.
const hasBadInput = (input: HTMLInputElement | null) => input?.validity?.badInput ?? false;

type DateErrors = Partial<Record<DateField, string>>;

export function PeriodFilter({ value, onChange }: Props) {
  const showPresets = useHasFeature(FEATURE_FLAGS.STATISTICS_PERIOD_PRESETS, false);
  const emptyErrorMessage = showPresets
    ? 'Sélectionnez une période prédéfinie ou renseignez une période personnalisée.'
    : 'Renseignez une période personnalisée.';
  const [draftPeriod, setDraftPeriod] = useState<PeriodPreset | undefined>(value.period);
  const [start, setStart] = useState(value.startDate ?? '');
  const [end, setEnd] = useState(value.endDate ?? '');
  const [isEmptyError, setIsEmptyError] = useState(false);
  const [dateErrors, setDateErrors] = useState<DateErrors>({});
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  const syncDraft = useCallback(() => {
    setDraftPeriod(value.period);
    setStart(value.startDate ?? '');
    setEnd(value.endDate ?? '');
    setIsEmptyError(false);
    setDateErrors({});
  }, [value.period, value.startDate, value.endDate]);

  const { isOpen, toggle, close, triggerRef, panelRef } = useDisclosureMenu({ onOpen: syncDraft });

  useEffect(() => setDraftPeriod(value.period), [value.period]);
  useEffect(() => setStart(value.startDate ?? ''), [value.startDate]);
  useEffect(() => setEnd(value.endDate ?? ''), [value.endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    const onFocusOut = (e: FocusEvent) => {
      // The focus already went to the next element: moving it back to the trigger would break the tab order.
      if (hasFocusLeftMenu(e.relatedTarget as Node | null, panel, triggerRef.current)) close({ restoreFocus: false });
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

  const focusFirstField = useCallback(() => {
    const panel = panelRef.current;
    const radio = panel?.querySelector<HTMLInputElement>('input[type="radio"]');
    (radio ?? panel?.querySelector<HTMLInputElement>('input[type="date"]'))?.focus();
  }, [panelRef]);

  // A partially typed date exposes an empty `value`, so clearing the state leaves the text in the
  // field and `badInput` true. Only writing to the DOM wipes both.
  const clearDateInputs = useCallback(() => {
    if (startInputRef.current) startInputRef.current.value = '';
    if (endInputRef.current) endInputRef.current.value = '';
  }, []);

  const selectPreset = (preset: PeriodPreset) => {
    setDraftPeriod(preset);
    setStart('');
    setEnd('');
    clearDateInputs();
    setIsEmptyError(false);
    setDateErrors({});
  };

  const handleDateChange = (field: DateField) => (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const next = input.value;
    if (field === 'start') setStart(next);
    else setEnd(next);
    setDraftPeriod(undefined);
    setIsEmptyError(false);
    if (hasBadInput(input)) return;
    setDateErrors((current) => ({ ...current, [field]: undefined }));
  };

  const apply = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (draftPeriod) {
        onChange({ period: draftPeriod, startDate: undefined, endDate: undefined });
        close();
        return;
      }

      const nextDateErrors: DateErrors = {
        start: hasBadInput(startInputRef.current) ? getInvalidDateMessage('start') : undefined,
        end: hasBadInput(endInputRef.current) ? getInvalidDateMessage('end') : undefined,
      };
      setDateErrors(nextDateErrors);

      // Focus the first field in error, in DOM order.
      if (nextDateErrors.start) {
        startInputRef.current?.focus();
        return;
      }
      if (nextDateErrors.end) {
        endInputRef.current?.focus();
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
    clearDateInputs();
    setIsEmptyError(false);
    setDateErrors({});
    onChange({ period: undefined, startDate: undefined, endDate: undefined });
  }, [onChange, clearDateInputs]);

  const endErrorMessage = dateErrors.end ?? (isInvalid ? END_BEFORE_START_MESSAGE : undefined);

  return (
    <div className={`${styles.period__bar} filter-dropdown`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.period__trigger} filter-dropdown__trigger fr-btn fr-btn--tertiary fr-btn--icon-right ${isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggle}
      >
        Période
      </button>

      {isOpen ? (
        <div
          id={menuId}
          ref={panelRef}
          className={`${styles.period__panel} filter-dropdown__panel fr-card fr-px-3w fr-py-2w`}
        >
          {/* `noValidate`: without it the browser cancels the submit on an unparsable date and the DSFR messages below never render. */}
          <form onSubmit={apply} noValidate>
            <p className={styles.period__note}>{CREATION_DATE_NOTE}</p>
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
              <Input
                label={DATE_FIELD_LABELS.start}
                hintText="Format attendu : JJ/MM/AAAA"
                state={dateErrors.start ? 'error' : 'default'}
                stateRelatedMessage={dateErrors.start}
                nativeInputProps={{
                  ref: startInputRef,
                  type: 'date',
                  value: start,
                  max: end || undefined,
                  onChange: handleDateChange('start'),
                }}
              />
              <Input
                label={DATE_FIELD_LABELS.end}
                hintText="Format attendu : JJ/MM/AAAA"
                state={endErrorMessage ? 'error' : 'default'}
                stateRelatedMessage={endErrorMessage}
                nativeInputProps={{
                  ref: endInputRef,
                  type: 'date',
                  value: end,
                  min: start || undefined,
                  onChange: handleDateChange('end'),
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
  );
}
