import { useCallback, useId, useState } from 'react';
import { buildFullValue, getSelectedCountInCategory, getSummaryText } from './AccordionMultiSelect.helpers';
import styles from './AccordionMultiSelect.module.css';
import type { AccordionMultiSelectOption, AccordionMultiSelectProps } from './AccordionMultiSelect.types';
import { CategoryAccordion } from './CategoryAccordion';
import { OptionCheckbox } from './OptionCheckbox';
import { useDropdownState } from './useDropdownState';

export type { AccordionMultiSelectOption, AccordionMultiSelectProps };

const DEFAULT_PLACEHOLDER = 'Sélectionner une ou plusieurs options';
const DEFAULT_ITEM_NOUN = { singular: 'option', plural: 'options', feminine: true };

export function AccordionMultiSelect({
  value,
  onChange,
  label = "Motifs qualifiés par l'agent",
  hint,
  options,
  id,
  disabled = false,
  readOnly = false,
  state = 'default',
  stateRelatedMessage,
  placeholder = DEFAULT_PLACEHOLDER,
  itemNoun = DEFAULT_ITEM_NOUN,
  categoryHeadingLevel = 2,
}: AccordionMultiSelectProps) {
  const generatedId = useId();
  const componentId = id || generatedId;
  const labelId = `${componentId}-label`;
  const triggerId = `${componentId}-trigger`;
  const summaryId = `${componentId}-summary`;
  const panelId = `${componentId}-panel`;
  const errorId = `${componentId}-error`;
  const hasError = state === 'error';
  const isInteractive = !disabled && !readOnly;

  const { isOpen, setIsOpen, containerRef, triggerRef } = useDropdownState();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback(
    (fullValue: string) => {
      if (value.includes(fullValue)) {
        onChange(value.filter((v) => v !== fullValue));
      } else {
        onChange([...value, fullValue]);
      }
    },
    [value, onChange],
  );

  const toggleCategory = useCallback((categoryValue: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryValue)) {
        next.delete(categoryValue);
      } else {
        next.add(categoryValue);
      }
      return next;
    });
  }, []);

  const handleTriggerClick = useCallback(() => {
    if (isInteractive) {
      setIsOpen(!isOpen);
    }
  }, [isInteractive, isOpen, setIsOpen]);

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    },
    [isOpen, setIsOpen, triggerRef],
  );

  const handleContainerBlur = useCallback(
    (event: React.FocusEvent) => {
      const nextFocus = event.relatedTarget as Node | null;
      const focusLeftComponent =
        nextFocus != null && nextFocus !== document.body && !containerRef.current?.contains(nextFocus);
      if (focusLeftComponent) {
        setIsOpen(false);
      }
    },
    [containerRef, setIsOpen],
  );

  const summaryText = getSummaryText(value.length, placeholder, itemNoun);

  const renderOption = (option: AccordionMultiSelectOption, parentValue?: string) => {
    const fullValue = buildFullValue(parentValue, option.value);
    return (
      <OptionCheckbox
        key={fullValue}
        option={option}
        inputId={`${componentId}-opt-${fullValue.replace(/\//g, '-')}`}
        name={`${componentId}-options`}
        checked={value.includes(fullValue)}
        disabled={disabled}
        hasError={hasError}
        onToggle={() => toggleSelection(fullValue)}
      />
    );
  };

  return (
    <div className={`fr-select-group${hasError ? ' fr-select-group--error' : ''}`} ref={containerRef}>
      <fieldset className={styles.fieldset} onKeyDown={handleContainerKeyDown} onBlur={handleContainerBlur}>
        <legend id={labelId} className="fr-label">
          {label}
          {hint ? <span className="fr-hint-text">{hint}</span> : null}
        </legend>

        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          className={`${styles.trigger} ${readOnly ? styles.triggerReadOnly : ''}`}
          onClick={handleTriggerClick}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-labelledby={`${labelId} ${summaryId}`}
          aria-disabled={disabled || readOnly}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError && stateRelatedMessage ? errorId : undefined}
          disabled={disabled}
        >
          <span id={summaryId}>{summaryText}</span>
          <span className={isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} aria-hidden="true" />
        </button>

        <div id={panelId} className={styles.panel} hidden={!isOpen}>
          {isOpen ? (
            <ul className={styles.categoriesList}>
              {options.map((option) => {
                const hasChildren = option.children && option.children.length > 0;

                if (!hasChildren) {
                  return (
                    <li key={option.value} className={styles.optionItem}>
                      {renderOption(option)}
                    </li>
                  );
                }

                return (
                  <CategoryAccordion
                    key={option.value}
                    category={option}
                    panelId={`${componentId}-cat-${option.value}`}
                    isExpanded={expandedCategories.has(option.value)}
                    selectedCount={getSelectedCountInCategory(option, value)}
                    headingLevel={categoryHeadingLevel}
                    onToggleExpand={() => toggleCategory(option.value)}
                  >
                    {option.children?.map((child) => renderOption(child, option.value))}
                  </CategoryAccordion>
                );
              })}
            </ul>
          ) : null}
        </div>
      </fieldset>

      {hasError && stateRelatedMessage ? (
        <p id={errorId} className="fr-message fr-message--error">
          {stateRelatedMessage}
        </p>
      ) : null}
    </div>
  );
}
