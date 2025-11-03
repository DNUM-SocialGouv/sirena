import { useId } from 'react';
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

export function SelectWithChildren({
  value,
  onChange,
  label = "Motifs qualifiés par l'agent",
  options,
  id,
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

  const toggleSelection = (optionValue: string) => {
    // Build full hierarchical value: PARENT/CHILD
    const fullValue =
      navigationPath.length > 0 ? `${navigationPath.map((p) => p.value).join('/')}/${optionValue}` : optionValue;

    if (value.includes(fullValue)) {
      onChange(value.filter((v) => v !== fullValue));
    } else {
      onChange([...value, fullValue]);
    }
  };

  const handleNavigateInto = (option: SelectWithChildrenOption, currentFocusIndex: number) => {
    const newFocusIndex = navigateInto(option, currentFocusIndex);
    setFocusedIndex(newFocusIndex);
  };

  const handleNavigateBack = () => {
    const restoredIndex = navigateBack();
    setFocusedIndex(restoredIndex);
  };

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

  const labelsMap = getAllLabelsMap(options);
  const displayText = getDisplayText(value, labelsMap);

  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={buttonId}>
        {label}
      </label>

      <div className={styles.selectWrapper} ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.selectButton}
          id={buttonId}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={buttonId}
          aria-controls={dropdownId}
        >
          {displayText}
          <span className={isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} aria-hidden="true" />
        </button>

        {isOpen && (
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
                    <CategoryButton
                      key={option.value}
                      option={option}
                      selectedCount={selectedInCategory}
                      onClick={() => handleNavigateInto(option, adjustedIndex)}
                      onKeyDown={handleKeyDown}
                      setRef={setOptionRef(adjustedIndex)}
                      isFocused={focusedIndex === adjustedIndex}
                    />
                  );
                }

                // Build full hierarchical value for checking selection state
                const fullValue =
                  navigationPath.length > 0
                    ? `${navigationPath.map((p) => p.value).join('/')}/${option.value}`
                    : option.value;

                return (
                  <CheckboxOption
                    key={option.value}
                    option={option}
                    isSelected={value.includes(fullValue)}
                    onToggle={() => toggleSelection(option.value)}
                    onKeyDown={handleKeyDown}
                    setRef={setOptionRef(adjustedIndex)}
                    isFocused={focusedIndex === adjustedIndex}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
