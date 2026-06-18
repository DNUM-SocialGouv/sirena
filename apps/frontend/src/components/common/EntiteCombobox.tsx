import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
}

const MIN_FILTER_LENGTH = 1;

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .toLowerCase();

const matchesSearch = (nomComplet: string, search: string) => {
  const terms = normalizeSearchText(search).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const searchable = normalizeSearchText(nomComplet);
  return terms.every((term) => searchable.includes(term));
};

export function EntiteCombobox({
  entites,
  value,
  onChange,
  label,
  disabled = false,
  state = 'default',
  stateRelatedMessage,
  required,
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
  const skipNextFocus = useRef(false);

  useEffect(() => {
    const entite = entites.find((e) => e.id === value);
    setInputValue(entite?.nomComplet ?? '');
  }, [value, entites]);

  const filteredEntites = useMemo(
    () =>
      hasTyped && inputValue.length >= MIN_FILTER_LENGTH
        ? entites.filter((e) => matchesSearch(e.nomComplet, inputValue))
        : entites,
    [hasTyped, inputValue, entites],
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        const entite = entites.find((ent) => ent.id === value);
        // Restaurer uniquement si une entité était sélectionnée ; sinon préserver la saisie partielle
        if (entite) setInputValue(entite.nomComplet);
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
    // Empêche onFocus de rouvrir le dropdown sur mobile (focus programmatique)
    skipNextFocus.current = true;
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Nettoyer le flag ici : si la sélection s'est faite au clavier (Enter), .focus() était
    // un no-op et skipNextFocus serait resté true indéfiniment sans ce reset.
    skipNextFocus.current = false;
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
      setActiveIndex(-1);
      const entite = entites.find((ent) => ent.id === value);
      // Restaurer uniquement si une entité était sélectionnée ; sinon préserver la saisie partielle
      if (entite) setInputValue(entite.nomComplet);
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
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(filteredEntites.length - 1);
        } else if (activeIndex <= 0) {
          setActiveIndex(-1);
        } else {
          setActiveIndex((prev) => prev - 1);
        }
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
        const entite = entites.find((ent) => ent.id === value);
        setInputValue(entite?.nomComplet ?? '');
        break;
      }
      case 'Home':
        if (isOpen && filteredEntites.length > 0) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen && filteredEntites.length > 0) {
          e.preventDefault();
          setActiveIndex(filteredEntites.length - 1);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const hasError = state === 'error';
  const inputGroupClass = ['fr-input-group', hasError ? 'fr-input-group--error' : ''].filter(Boolean).join(' ');
  const inputClass = ['fr-input', hasError ? 'fr-input--error' : ''].filter(Boolean).join(' ');

  const statusMessage =
    isOpen && hasTyped && inputValue.length >= MIN_FILTER_LENGTH
      ? filteredEntites.length === 0
        ? 'Aucun résultat'
        : `${filteredEntites.length} résultat${filteredEntites.length > 1 ? 's' : ''} disponible${filteredEntites.length > 1 ? 's' : ''}`
      : '';

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={inputGroupClass}>
        <label className="fr-label" htmlFor={inputId}>
          {label}
          <span className="fr-hint-text">Commencez à saisir le nom puis sélectionnez dans la liste</span>
        </label>

        <div className="fr-input-wrap fr-icon-search-line">
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
            aria-activedescendant={activeIndex >= 0 ? `option-${uid}-${activeIndex}` : undefined}
            aria-required={required || undefined}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => {
              if (skipNextFocus.current) {
                skipNextFocus.current = false;
                return;
              }
              if (!disabled) {
                setIsOpen(true);
                setHasTyped(!value && inputValue.length >= MIN_FILTER_LENGTH);
              }
            }}
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                setHasTyped(!value && inputValue.length >= MIN_FILTER_LENGTH);
              }
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {hasError && stateRelatedMessage && (
          <p id={errorId} className="fr-message fr-message--error">
            {stateRelatedMessage}
          </p>
        )}
      </div>

      {/* Toujours dans le DOM pour que aria-controls soit toujours résolu */}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        className={styles.dropdown}
        hidden={!isOpen || disabled}
      >
        {filteredEntites.length === 0 ? (
          <div role="option" aria-disabled="true" aria-selected="false" tabIndex={-1} className={styles.empty}>
            Aucun résultat
          </div>
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
                // onMouseDown plutôt que onClick pour précéder le onBlur de l'input
                e.preventDefault();
                selectEntite(entite);
              }}
            >
              {entite.nomComplet}
            </div>
          ))
        )}
      </div>

      <output aria-live="polite" className={styles.srOnly}>
        {statusMessage}
      </output>
    </div>
  );
}
