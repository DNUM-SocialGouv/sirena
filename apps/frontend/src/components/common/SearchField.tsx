import { Input } from '@codegouvfr/react-dsfr/Input';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps<T> {
  value?: string;
  onChange: (value: string, item?: T) => void;
  label: string;
  hintText?: string;
  disabled?: boolean;
  queryKey: string;
  fetchFn: (searchTerm: string, isNumeric: boolean) => Promise<T[]>;
  formatDisplay: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string;
  getItemId: (item: T) => string;
  noResultsMessage?: string;
  minSearchLength?: number;
}

export function SearchField<T>({
  value = '',
  onChange,
  label,
  hintText = 'Saisir au moins 3 caractères pour rechercher',
  disabled,
  queryKey,
  fetchFn,
  formatDisplay,
  renderItem,
  getItemKey,
  getItemId,
  noResultsMessage = 'Aucun résultat trouvé',
  minSearchLength = 3,
}: SearchFieldProps<T>) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNumericSearch = /^\d+$/.test(searchTerm.trim());
  const isSearchEnabled = searchTerm.length >= minSearchLength && !hasSelected;

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey, searchTerm, isNumericSearch],
    queryFn: () => fetchFn(searchTerm, isNumericSearch),
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!hasSelected) {
      setSearchTerm(value);
    }
  }, [value, hasSelected]);

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
    onChange(newValue);
    setShowSuggestions(newValue.length >= minSearchLength);
    setSelectedIndex(-1);
    setHasSelected(false);
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
        hintText={hintText}
        nativeInputProps={{
          ref: inputRef,
          value: searchTerm,
          onChange: handleInputChange,
          onFocus: () => searchTerm.length >= minSearchLength && setShowSuggestions(true),
          onKeyDown: handleKeyDown,
          disabled,
          autoComplete: 'off',
        }}
      />
      {showDropdown && (
        <div className={styles.dropdown}>
          {isLoading && (
            <div className={styles.message}>
              <span className="fr-icon-refresh-line fr-icon--sm" aria-hidden="true" />
              Recherche en cours...
            </div>
          )}
          {!isLoading && !hasSuggestions && <div className={styles.message}>{noResultsMessage}</div>}
          {!isLoading && hasSuggestions && (
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
