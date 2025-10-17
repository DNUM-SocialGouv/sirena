import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './SelectWithChildren.module.css';

export interface SelectWithChildrenOption {
  label: string;
  value: string;
  children?: SelectWithChildrenOption[];
}

export interface SelectWithChildrenProps {
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  options: SelectWithChildrenOption[];
  id?: string;
}

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

  const [navigationPath, setNavigationPath] = useState<SelectWithChildrenOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [parentFocusStack, setParentFocusStack] = useState<number[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([]);

  const currentOptions =
    navigationPath.length === 0 ? options : navigationPath[navigationPath.length - 1].children || [];

  const navigateInto = (option: SelectWithChildrenOption, currentFocusIndex: number) => {
    if (option.children && option.children.length > 0) {
      setNavigationPath([...navigationPath, option]);
      setParentFocusStack([...parentFocusStack, currentFocusIndex]);
      setFocusedIndex(1);
    }
  };

  const navigateBack = () => {
    const newPath = navigationPath.slice(0, -1);
    const newStack = parentFocusStack.slice(0, -1);
    const restoredFocusIndex = parentFocusStack[parentFocusStack.length - 1] ?? 0;

    setNavigationPath(newPath);
    setParentFocusStack(newStack);
    setFocusedIndex(restoredFocusIndex);
  };

  const toggleSelection = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const getAllLabelsMap = (opts: SelectWithChildrenOption[]): Map<string, string> => {
    const map = new Map<string, string>();
    const traverse = (traverseOptions: SelectWithChildrenOption[]) => {
      for (const opt of traverseOptions) {
        map.set(opt.value, opt.label);
        if (opt.children) {
          traverse(opt.children);
        }
      }
    };
    traverse(opts);
    return map;
  };

  const getSelectedCountInCategory = (option: SelectWithChildrenOption): number => {
    let count = 0;
    const traverse = (opt: SelectWithChildrenOption) => {
      if (!opt.children || opt.children.length === 0) {
        if (value.includes(opt.value)) {
          count++;
        }
      } else {
        for (const child of opt.children) {
          traverse(child);
        }
      }
    };
    traverse(option);
    return count;
  };

  const labelsMap = getAllLabelsMap(options);
  const selectedCount = value.length;
  const displayText =
    selectedCount === 1
      ? labelsMap.get(value[0]) || value[0]
      : selectedCount > 1
        ? `${selectedCount} options sélectionnées`
        : 'Sélectionner une ou plusieurs options';

  const totalOptions = navigationPath.length > 0 ? currentOptions.length + 1 : currentOptions.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const focusTarget = optionRefs.current[focusedIndex];
      if (focusTarget) {
        requestAnimationFrame(() => {
          focusTarget.focus();
        });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = (prev + 1) % totalOptions;
          return nextIndex;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const prevIndex = prev - 1;
          return prevIndex < 0 ? totalOptions - 1 : prevIndex;
        });
        break;

      case 'ArrowRight': {
        const adjustedIndex = navigationPath.length > 0 ? focusedIndex - 1 : focusedIndex;
        if (adjustedIndex >= 0 && adjustedIndex < currentOptions.length) {
          const option = currentOptions[adjustedIndex];
          if (option?.children && option.children.length > 0) {
            event.preventDefault();
            navigateInto(option, focusedIndex);
          }
        }
        break;
      }

      case 'ArrowLeft':
        if (navigationPath.length > 0) {
          event.preventDefault();
          navigateBack();
        }
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(totalOptions - 1);
        break;

      case 'Enter':
      case ' ': {
        const adjustedIndex = navigationPath.length > 0 ? focusedIndex - 1 : focusedIndex;
        if (adjustedIndex >= 0 && adjustedIndex < currentOptions.length) {
          const option = currentOptions[adjustedIndex];
          if (option?.children && option.children.length > 0) {
            event.preventDefault();
            navigateInto(option, focusedIndex);
          } else {
            event.preventDefault();
            toggleSelection(option.value);
          }
        } else if (navigationPath.length > 0 && focusedIndex === 0) {
          event.preventDefault();
          navigateBack();
        }
        break;
      }
    }
  };

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
              <button
                ref={(el) => {
                  optionRefs.current[0] = el;
                }}
                type="button"
                onClick={navigateBack}
                onKeyDown={handleKeyDown}
                className={styles.backButton}
                aria-label="Retour au niveau précédent"
                tabIndex={focusedIndex === 0 ? 0 : -1}
              >
                <span className="fr-icon-arrow-left-line" aria-hidden="true" />
                Retour
              </button>
            )}

            {navigationPath.length > 0 && (
              <h2 className={styles.submotifTitle}>{navigationPath[navigationPath.length - 1].label}</h2>
            )}

            <div className={navigationPath.length > 0 ? styles.submotifList : ''}>
              {currentOptions.map((option: SelectWithChildrenOption, index: number) => {
                const hasChildren = option.children && option.children.length > 0;
                const adjustedIndex = navigationPath.length > 0 ? index + 1 : index;

                if (hasChildren) {
                  const selectedInCategory = getSelectedCountInCategory(option);
                  return (
                    <button
                      key={option.value}
                      ref={(el) => {
                        optionRefs.current[adjustedIndex] = el;
                      }}
                      type="button"
                      onClick={() => navigateInto(option, adjustedIndex)}
                      onKeyDown={handleKeyDown}
                      className={styles.motifButton}
                      role="option"
                      aria-selected="false"
                      aria-label={`${option.label}, sous-menu avec ${option.children?.length || 0} options`}
                      tabIndex={focusedIndex === adjustedIndex ? 0 : -1}
                    >
                      <span>
                        {option.label}
                        {selectedInCategory > 0 ? ` (${selectedInCategory})` : ''}
                      </span>
                      <span className="fr-icon-arrow-right-s-line" aria-hidden="true" />
                    </button>
                  );
                }

                return (
                  <div
                    key={option.value}
                    ref={(el) => {
                      optionRefs.current[adjustedIndex] = el;
                    }}
                    className={styles.submotifItem}
                    role="option"
                    aria-selected={value.includes(option.value)}
                    tabIndex={focusedIndex === adjustedIndex ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelection(option.value);
                      } else {
                        handleKeyDown(e);
                      }
                    }}
                  >
                    <Checkbox
                      options={[
                        {
                          label: option.label,
                          nativeInputProps: {
                            checked: value.includes(option.value),
                            onChange: () => toggleSelection(option.value),
                            'aria-label': option.label,
                          },
                        },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
