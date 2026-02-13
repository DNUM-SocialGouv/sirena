import { Input } from '@codegouvfr/react-dsfr/Input';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps<T> {
  value?: string;
  onChange: (value: string, item?: T) => void;
  label: string;
  hintText?: string;
  state?: 'default' | 'success' | 'info' | 'error';
  stateRelatedMessage?: React.ReactNode;
  disabled?: boolean;
  queryKey: string;
  fetchFn: (searchTerm: string) => Promise<T[]>;
  formatDisplay: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string;
  getItemId: (item: T) => string;
  noResultsMessage?: string;
  minSearchLength?: number;
  debounceMs?: number;
}

export function SearchField<T>({
  value = '',
  onChange,
  label,
  hintText,
  state = 'default',
  stateRelatedMessage,
  disabled,
  queryKey,
  fetchFn,
  formatDisplay,
  renderItem,
  getItemKey,
  getItemId,
  noResultsMessage = 'Aucun résultat trouvé',
  minSearchLength = 3,
  debounceMs = 300,
}: SearchFieldProps<T>) {
  const defaultHintText = `Saisir au moins ${minSearchLength} caractère${minSearchLength > 1 ? 's' : ''} pour rechercher`;
  const displayHintText = hintText ?? defaultHintText;
  const [searchTerm, setSearchTerm] = useState(value);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValueRef = useRef(value);

  const isSearchEnabled = debouncedSearchTerm.length >= minSearchLength && !hasSelected;

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    failureCount,
  } = useQuery({
    queryKey: [queryKey, debouncedSearchTerm],
    queryFn: () => fetchFn(debouncedSearchTerm),
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (value !== initialValueRef.current) {
      setSearchTerm(value);
      if (value.length < minSearchLength) {
        setDebouncedSearchTerm(value);
      }
      initialValueRef.current = value;
      setHasSelected(true);
    }
  }, [value, minSearchLength]);

  useEffect(() => {
    if (hasSelected) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, debounceMs, hasSelected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowSuggestions(newValue.length >= minSearchLength);
    setSelectedIndex(-1);
    setHasSelected(false);
    if (newValue === '') {
      onChange('');
    }
  };

  const handleSelectItem = (item: T) => {
    const displayValue = formatDisplay(item);
    const itemId = getItemId(item);
    setSearchTerm(displayValue);
    setHasSelected(true);
    onChange(itemId, item);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          handleSelectItem(items[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const showDropdown = showSuggestions && searchTerm.length >= minSearchLength && !disabled;
  const hasSuggestions = items.length > 0;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <Input
        label={label}
        hintText={displayHintText}
        state={state}
        stateRelatedMessage={stateRelatedMessage}
        disabled={disabled}
        nativeInputProps={{
          ref: inputRef,
          value: searchTerm,
          onChange: handleInputChange,
          onFocus: () => searchTerm.length >= minSearchLength && setShowSuggestions(true),
          onKeyDown: handleKeyDown,
          autoComplete: 'off',
        }}
      />
      {showDropdown && (
        <div className={styles.dropdown}>
          {isLoading && (
            <div className={styles.message}>
              <span
                className="fr-icon-refresh-line fr-icon--sm"
                aria-hidden="true"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              Recherche en cours...{failureCount > 0 && ' (nouvelle tentative)'}
            </div>
          )}
          {isError && (
            <div className={styles.message} style={{ color: 'var(--text-default-error)' }}>
              <span className="fr-icon-error-warning-line fr-icon--sm" aria-hidden="true" />
              <div style={{ textAlign: 'center' }}>
                <div>
                  {error instanceof Error && error.message.includes('timed out')
                    ? 'Le moteur de recherche ne répond pas. Veuillez réessayer.'
                    : 'Une erreur est survenue lors de la recherche.'}
                </div>
                {searchTerm.length > minSearchLength && (
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-mention-grey)' }}>
                    Essayez avec moins de caractères pour des résultats plus larges.
                  </div>
                )}
              </div>
            </div>
          )}
          {!isLoading && !isError && !hasSuggestions && <div className={styles.message}>{noResultsMessage}</div>}
          {!isLoading && !isError && hasSuggestions && (
            <div className={styles.list} role="listbox">
              {items.map((item, index) => (
                <div
                  key={getItemKey(item)}
                  className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
                  onClick={() => handleSelectItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectItem(item);
                    }
                  }}
                  role="option"
                  aria-selected={index === selectedIndex}
                  tabIndex={0}
                >
                  {renderItem(item)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
