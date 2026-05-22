import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import './DropdownCheckboxFilter.css';

type Option = {
  value: string;
  label: string;
};

type Props = {
  buttonLabel: string;
  legend: string;
  hintText: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DropdownCheckboxFilter({
  buttonLabel,
  legend,
  hintText,
  options,
  selectedValues,
  onChange,
  onOpen,
  onClose,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const hasSelection = selectedValues.length > 0;

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((value) => {
      const next = !value;
      next ? onOpen?.() : onClose?.();
      return next;
    });
  }, [onOpen, onClose]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Node;

      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        close();
      }
    },
    [close],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab' && !panelRef.current?.contains(document.activeElement)) {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLInputElement>('input:not([disabled])');
      first?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const handleCheckboxChange = useCallback(
    (value: string, checked: boolean) => {
      const next = checked
        ? [...selectedValues, value]
        : selectedValues.filter((selectedValue) => selectedValue !== value);
      onChange(next);
    },
    [selectedValues, onChange],
  );

  return (
    <div className="dropdown-checkbox-filter">
      <button
        ref={triggerRef}
        type="button"
        className="dropdown-checkbox-filter__button fr-btn fr-btn--tertiary"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={hasSelection ? `${buttonLabel} (${selectedValues.length})` : buttonLabel}
        onClick={toggle}
      >
        <span>
          {buttonLabel}
          {hasSelection && <span aria-hidden="true"> ({selectedValues.length})</span>}
        </span>
        <span
          aria-hidden="true"
          className={`fr-icon-arrow-down-s-line menu__trigger__icon${isOpen ? ' menu__trigger__icon--is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div id={menuId} ref={panelRef} className="dropdown-checkbox-filter__dropdown fr-card fr-px-3w fr-py-2w">
          <Checkbox
            legend={legend}
            hintText={hintText}
            options={options.map((option) => ({
              label: option.label,
              nativeInputProps: {
                value: option.value,
                checked: selectedValues.includes(option.value),
                onChange: (e) => handleCheckboxChange(option.value, e.target.checked),
              },
            }))}
          />
        </div>
      )}
    </div>
  );
}
