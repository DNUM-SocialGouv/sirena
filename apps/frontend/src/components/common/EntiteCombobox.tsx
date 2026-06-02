import { useEffect, useId, useRef, useState } from 'react';
import styles from './EntiteCombobox.module.css';

interface EntiteComboboxProps {
  entites: Array<{ id: string; nomComplet: string }>;
  value: string;
  onChange: (entiteId: string) => void;
  label: string;
  disabled?: boolean;
  state?: 'default' | 'error';
  stateRelatedMessage?: string;
  required?: boolean;
  'aria-invalid'?: 'true' | undefined;
}

const MIN_FILTER_LENGTH = 3;

export function EntiteCombobox({
  entites,
  value,
  onChange,
  label,
  disabled = false,
  state = 'default',
  stateRelatedMessage,
  required,
  'aria-invalid': ariaInvalid,
}: EntiteComboboxProps) {
  const uid = useId();
  const inputId = `combobox-${uid}`;
  const listboxId = `listbox-${uid}`;
  const errorId = `error-${uid}`;

  const selectedEntite = entites.find((e) => e.id === value);
  const [inputValue, setInputValue] = useState(selectedEntite?.nomComplet ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasTyped, setHasTyped] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const entite = entites.find((e) => e.id === value);
    setInputValue(entite?.nomComplet ?? '');
  }, [value, entites]);

  const filteredEntites =
    hasTyped && inputValue.length >= MIN_FILTER_LENGTH
      ? entites.filter((e) => e.nomComplet.toLowerCase().includes(inputValue.toLowerCase()))
      : entites;

  const activeEntiteId = activeIndex >= 0 ? filteredEntites[activeIndex]?.id : undefined;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        // Restore display value to the currently selected entite
        const entite = entites.find((ent) => ent.id === value);
        setInputValue(entite?.nomComplet ?? '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, entites]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`#option-${uid}-${activeIndex}`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, uid]);

  const selectEntite = (entite: { id: string; nomComplet: string }) => {
    setInputValue(entite.nomComplet);
    onChange(entite.id);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHasTyped(true);
    setIsOpen(true);
    setActiveIndex(-1);
    if (e.target.value === '') {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((prev) => Math.min(prev + 1, filteredEntites.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && filteredEntites[activeIndex]) {
          selectEntite(filteredEntites[activeIndex]);
        }
        break;
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        // Restore previously selected value
        const entite = entites.find((ent) => ent.id === value);
        setInputValue(entite?.nomComplet ?? '');
        break;
      }
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const hasError = state === 'error';
  const inputGroupClass = ['fr-input-group', hasError ? 'fr-input-group--error' : ''].filter(Boolean).join(' ');
  const inputClass = ['fr-input', hasError ? 'fr-input--error' : ''].filter(Boolean).join(' ');

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={inputGroupClass}>
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>

        <input
          ref={inputRef}
          id={inputId}
          className={inputClass}
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeEntiteId !== undefined ? `option-${uid}-${activeIndex}` : undefined}
          aria-required={required || undefined}
          aria-invalid={ariaInvalid}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setHasTyped(false);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setHasTyped(false);
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {hasError && stateRelatedMessage && (
          <p id={errorId} className="fr-message fr-message--error">
            {stateRelatedMessage}
          </p>
        )}
      </div>

      {isOpen && !disabled && (
        <div ref={listRef} id={listboxId} role="listbox" aria-label={label} className={styles.dropdown}>
          {filteredEntites.length === 0 ? (
            <output className={styles.empty}>Aucun résultat</output>
          ) : (
            filteredEntites.map((entite, index) => (
              <div
                key={entite.id}
                id={`option-${uid}-${index}`}
                role="option"
                aria-selected={entite.id === value}
                tabIndex={-1}
                className={`${styles.item} ${index === activeIndex ? styles.active : ''}`}
                onMouseDown={(e) => {
                  // onMouseDown instead of onClick to fire before onBlur
                  e.preventDefault();
                  selectEntite(entite);
                }}
              >
                {entite.nomComplet}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
