import { useCallback, useId } from 'react';
import { BackButton } from './BackButton';
import { CategoryButton } from './CategoryButton';
import { CheckboxOption } from './CheckboxOption';
import {
  getAllLabelsMap,
  getCurrentOptions,
  getDisplayText,
  getSelectedCountInCategory,
  getTotalOptionsCount,
} from './SelectWithChildren.helpers';
import styles from './SelectWithChildren.module.css';
import type { SelectWithChildrenOption, SelectWithChildrenProps } from './SelectWithChildren.types';
import { useDropdownState } from './useDropdownState';
import { useFocusManagement } from './useFocusManagement';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useSelectNavigation } from './useSelectNavigation';

export type { SelectWithChildrenOption, SelectWithChildrenProps };

type CategoryOptionItemProps = {
  option: SelectWithChildrenOption;
  adjustedIndex: number;
  selectedCount: number;
  isFocused: boolean;
  onNavigateInto: (option: SelectWithChildrenOption, currentFocusIndex: number) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  setRef: (el: HTMLButtonElement | null) => void;
};

const CategoryOptionItem = ({
  option,
  adjustedIndex,
  selectedCount,
  isFocused,
  onNavigateInto,
  onKeyDown,
  setRef,
}: CategoryOptionItemProps) => {
  const handleClick = useCallback(() => onNavigateInto(option, adjustedIndex), [onNavigateInto, option, adjustedIndex]);

  return (
    <CategoryButton
      option={option}
      selectedCount={selectedCount}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      setRef={setRef}
      isFocused={isFocused}
    />
  );
};

type CheckboxOptionItemProps = {
  option: SelectWithChildrenOption;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelection: (optionValue: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  setRef: (el: HTMLDivElement | null) => void;
};

const CheckboxOptionItem = ({
  option,
  isSelected,
  isFocused,
  onToggleSelection,
  onKeyDown,
  setRef,
}: CheckboxOptionItemProps) => {
  const handleToggle = useCallback(() => onToggleSelection(option.value), [onToggleSelection, option.value]);

  return (
    <CheckboxOption
      option={option}
      isSelected={isSelected}
      onToggle={handleToggle}
      onKeyDown={onKeyDown}
      setRef={setRef}
      isFocused={isFocused}
    />
  );
};

export function SelectWithChildren({
  value,
  onChange,
  label = "Motifs qualifiés par l'agent",
  hint,
  options,
  id,
  disabled = false,
  readOnly = false,
}: SelectWithChildrenProps) {
  const generatedId = useId();
  const componentId = id || generatedId;
  const buttonId = `${componentId}-button`;
  const dropdownId = `${componentId}-dropdown`;

  const { isOpen, setIsOpen, dropdownRef, buttonRef, handleBlur } = useDropdownState();
  const { navigationPath, navigateInto, navigateBack } = useSelectNavigation();
  const { focusedIndex, setFocusedIndex, setOptionRef } = useFocusManagement(isOpen);

  const currentOptions = getCurrentOptions(options, navigationPath);
  const totalOptions = getTotalOptionsCount(currentOptions, navigationPath.length > 0);

  const toggleSelection = useCallback(
    (optionValue: string) => {
      // Build full hierarchical value: PARENT/CHILD
      const fullValue =
        navigationPath.length > 0 ? `${navigationPath.map((p) => p.value).join('/')}/${optionValue}` : optionValue;

      if (value.includes(fullValue)) {
        onChange(value.filter((v) => v !== fullValue));
      } else {
        onChange([...value, fullValue]);
      }
    },
    [navigationPath, value, onChange],
  );

  const handleNavigateInto = useCallback(
    (option: SelectWithChildrenOption, currentFocusIndex: number) => {
      const newFocusIndex = navigateInto(option, currentFocusIndex);
      setFocusedIndex(newFocusIndex);
    },
    [navigateInto, setFocusedIndex],
  );

  const handleNavigateBack = useCallback(() => {
    const restoredIndex = navigateBack();
    setFocusedIndex(restoredIndex);
  }, [navigateBack, setFocusedIndex]);

  const { handleKeyDown } = useKeyboardNavigation({
    isOpen,
    setIsOpen,
    focusedIndex,
    setFocusedIndex,
    totalOptions,
    currentOptions,
    navigationPath,
    navigateInto,
    navigateBack,
    toggleSelection,
    buttonRef,
  });

  const handleButtonClick = useCallback(
    () => !disabled && !readOnly && setIsOpen(!isOpen),
    [disabled, readOnly, setIsOpen, isOpen],
  );

  const labelsMap = getAllLabelsMap(options);
  const displayText = getDisplayText(value, labelsMap);

  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={buttonId}>
        {label}
        {hint ? <span className="fr-hint-text">{hint}</span> : null}
      </label>

      <div className={styles.selectWrapper} ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          className={`${styles.selectButton} ${readOnly ? styles.selectButtonReadOnly : ''}`}
          id={buttonId}
          onClick={handleButtonClick}
          onKeyDown={disabled || readOnly ? undefined : handleKeyDown}
          onBlur={handleBlur}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={buttonId}
          aria-controls={dropdownId}
          aria-disabled={disabled || readOnly}
          disabled={disabled}
        >
          {displayText}
          <span className={isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} aria-hidden="true" />
        </button>

        {isOpen ? (
          <div
            id={dropdownId}
            className={styles.dropdown}
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
          >
            {navigationPath.length > 0 && (
              <BackButton
                onClick={handleNavigateBack}
                onKeyDown={handleKeyDown}
                setRef={setOptionRef(0)}
                isFocused={focusedIndex === 0}
              />
            )}

            {navigationPath.length > 0 && (
              <div className={styles.submotifTitle}>{navigationPath[navigationPath.length - 1].label}</div>
            )}

            <div className={navigationPath.length > 0 ? styles.submotifList : ''}>
              {currentOptions.map((option: SelectWithChildrenOption, index: number) => {
                const hasChildren = option.children && option.children.length > 0;
                const adjustedIndex = navigationPath.length > 0 ? index + 1 : index;

                if (hasChildren) {
                  const selectedInCategory = getSelectedCountInCategory(option, value);
                  return (
                    <CategoryOptionItem
                      key={option.value}
                      option={option}
                      adjustedIndex={adjustedIndex}
                      selectedCount={selectedInCategory}
                      isFocused={focusedIndex === adjustedIndex}
                      onNavigateInto={handleNavigateInto}
                      onKeyDown={handleKeyDown}
                      setRef={setOptionRef(adjustedIndex)}
                    />
                  );
                }

                // Build full hierarchical value for checking selection state
                const fullValue =
                  navigationPath.length > 0
                    ? `${navigationPath.map((p) => p.value).join('/')}/${option.value}`
                    : option.value;

                return (
                  <CheckboxOptionItem
                    key={option.value}
                    option={option}
                    isSelected={value.includes(fullValue)}
                    isFocused={focusedIndex === adjustedIndex}
                    onToggleSelection={toggleSelection}
                    onKeyDown={handleKeyDown}
                    setRef={setOptionRef(adjustedIndex)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
