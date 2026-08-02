import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { type Address, fetchAddresses } from '@/lib/api/fetchAddresses';
import styles from './AddressSearchField.module.css';

/**
 * Turns a BAN address into the single-line value shown in the input once selected.
 * Cities only expose their postcode + city, streets/housenumbers prepend the street.
 */
export const formatAddressDisplay = (address: Address): string => {
  const location = `${address.postcode} ${address.city}`.trim();
  if (address.type === 'municipality' || !address.name) {
    return location;
  }
  return location ? `${address.name}, ${location}` : address.name;
};

/** Single label shared by the visible dropdown and the screen-reader announcement. */
const NO_RESULTS_MESSAGE = 'Aucune adresse trouvée';

interface AddressSearchFieldProps {
  value?: string;
  onSelect: (address: Address) => void;
  /** Called when the input is cleared, so the caller can reset any stored address. */
  onClear?: () => void;
  /**
   * Called on blur with the raw text when the user typed an address but never picked a
   * suggestion, so free-text input is preserved instead of silently dropped.
   */
  onTextCommit?: (text: string) => void;
  label: string;
  hintText?: string;
  disabled?: boolean;
  /** Locks the field while keeping normal text contrast and screen-reader support (unlike disabled). */
  readOnly?: boolean;
  state?: 'default' | 'error';
  stateRelatedMessage?: string;
  minSearchLength?: number;
  debounceMs?: number;
}

export function AddressSearchField({
  value = '',
  onSelect,
  onClear,
  onTextCommit,
  label,
  hintText = 'Saisir une adresse, une voie, un code postal ou une commune',
  disabled = false,
  readOnly = false,
  state = 'default',
  stateRelatedMessage,
  minSearchLength = 3,
  debounceMs = 300,
}: AddressSearchFieldProps) {
  const uid = useId();
  const inputId = `address-combobox-${uid}`;
  const listboxId = `address-listbox-${uid}`;
  const errorId = `address-error-${uid}`;

  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Start "selected" when hydrated with a value so opening an existing form never fires a BAN query.
  const [hasSelected, setHasSelected] = useState(value !== '');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const initialValueRef = useRef(value);
  // Set right before we push a value change to the parent (select/clear/commit) so the
  // echoed value prop is ignored by the hydration effect instead of clobbering local state.
  const isSelfUpdate = useRef(false);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  const isSearchEnabled = debouncedSearchTerm.length >= minSearchLength && !hasSelected;

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    failureCount,
  } = useQuery({
    queryKey: ['addresses', debouncedSearchTerm],
    queryFn: () => fetchAddresses(debouncedSearchTerm),
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Sync when the value is changed from the outside (e.g. edit mode hydration, manual-mode preview).
  // hasSelected keeps the query disabled so this hydration never triggers a search.
  useEffect(() => {
    if (value === initialValueRef.current) {
      return;
    }
    initialValueRef.current = value;
    // Ignore the value the parent echoes back from our own select/clear/commit calls; only
    // genuine external changes should re-sync the input, regardless of what onClear resets to.
    if (isSelfUpdate.current) {
      isSelfUpdate.current = false;
      return;
    }
    setSearchTerm(value);
    setHasSelected(true);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ordered list backing keyboard navigation, plus the grouped view for rendering.
  // Cities go under "Ville", everything else under "Adresse" so no result is dropped.
  const { groups, flatItems } = useMemo(() => {
    const grouped = [
      { key: 'ville', label: 'Ville', items: items.filter((item) => item.type === 'municipality') },
      { key: 'adresse', label: 'Adresse', items: items.filter((item) => item.type !== 'municipality') },
    ].filter((group) => group.items.length > 0);
    return {
      groups: grouped,
      flatItems: grouped.flatMap((group) => group.items),
    };
  }, [items]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`#address-option-${uid}-${activeIndex}`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, uid]);

  const handleSelect = useCallback(
    (address: Address) => {
      setSearchTerm(formatAddressDisplay(address));
      setHasSelected(true);
      setIsOpen(false);
      setActiveIndex(-1);
      isSelfUpdate.current = true;
      onSelect(address);
    },
    [onSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(newValue.length >= minSearchLength);
    setActiveIndex(-1);
    // Editing the text invalidates a previously selected address: clear the stored value so the
    // structured fields never keep stale data behind an edited label.
    if (hasSelected || newValue === '') {
      isSelfUpdate.current = true;
      onClear?.();
    }
    setHasSelected(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Without options there is nothing to focus: keep activeIndex at -1 so
        // aria-activedescendant never points to a non-existent option.
        if (flatItems.length === 0) break;
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          // APG combobox pattern: opening with ArrowUp lands the virtual focus on the last option.
          if (flatItems.length === 0) break;
          setIsOpen(true);
          setActiveIndex(flatItems.length - 1);
        } else {
          setActiveIndex((prev) => (prev <= 0 ? -1 : prev - 1));
        }
        break;
      case 'Enter':
        if (isOpen && activeIndex >= 0 && flatItems[activeIndex]) {
          e.preventDefault();
          handleSelect(flatItems[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Home':
        if (isOpen && flatItems.length > 0) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen && flatItems.length > 0) {
          e.preventDefault();
          setActiveIndex(flatItems.length - 1);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const showDropdown = isOpen && searchTerm.length >= minSearchLength && !disabled && !readOnly;
  const hasResults = flatItems.length > 0;

  const hasError = state === 'error';
  const inputGroupClass = ['fr-input-group', hasError ? 'fr-input-group--error' : ''].filter(Boolean).join(' ');
  const inputClass = ['fr-input', hasError ? 'fr-input--error' : ''].filter(Boolean).join(' ');

  const errorMessage =
    error instanceof Error && error.message.includes('timed out')
      ? 'Le service ne répond pas. Veuillez réessayer.'
      : 'Une erreur est survenue lors de la recherche.';

  // Single announcement covering every state so a screen reader hears the search
  // progress, failures and results, not only the final count.
  const statusMessage = !showDropdown
    ? ''
    : isLoading
      ? `Recherche en cours...${failureCount > 0 ? ' (nouvelle tentative)' : ''}`
      : isError
        ? errorMessage
        : hasResults
          ? `${flatItems.length} résultat${flatItems.length > 1 ? 's' : ''} disponible${flatItems.length > 1 ? 's' : ''}`
          : NO_RESULTS_MESSAGE;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={inputGroupClass} style={{ marginBottom: 0 }}>
        <label className="fr-label" htmlFor={inputId}>
          {label}
          {hintText ? <span className="fr-hint-text">{hintText}</span> : null}
        </label>

        <div className="fr-input-wrap fr-icon-search-line">
          <input
            ref={inputRef}
            id={inputId}
            className={inputClass}
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 && flatItems[activeIndex] ? `address-option-${uid}-${activeIndex}` : undefined
            }
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            readOnly={readOnly}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => !readOnly && !hasSelected && searchTerm.length >= minSearchLength && setIsOpen(true)}
            onBlur={() => {
              // Preserve free text the user typed but never turned into a selection.
              if (!disabled && !readOnly && !hasSelected && searchTerm !== '') {
                isSelfUpdate.current = true;
                onTextCommit?.(searchTerm);
              }
            }}
            onKeyDown={readOnly ? undefined : handleKeyDown}
          />
        </div>

        {hasError && stateRelatedMessage ? (
          <p id={errorId} className="fr-message fr-message--error">
            {stateRelatedMessage}
          </p>
        ) : null}
      </div>

      {/* Loading / error / empty feedback, kept OUTSIDE the listbox (which must only hold
          option/group). aria-hidden because the status region below carries the announcement. */}
      {showDropdown && (isLoading || isError || !hasResults) ? (
        <div className={styles.dropdown} aria-hidden="true">
          {isLoading ? (
            <div className={styles.message}>
              <span className={`fr-icon-refresh-line fr-icon--sm ${styles.spinner}`} aria-hidden="true" />
              Recherche en cours...{failureCount > 0 && ' (nouvelle tentative)'}
            </div>
          ) : isError ? (
            <div className={`${styles.message} ${styles.messageError}`}>
              <span className="fr-icon-error-warning-line fr-icon--sm" aria-hidden="true" />
              {errorMessage}
            </div>
          ) : (
            <div className={styles.message}>{NO_RESULTS_MESSAGE}</div>
          )}
        </div>
      ) : null}

      {/* Kept in the DOM so aria-controls always resolves; only ever holds option/group. */}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        className={styles.dropdown}
        hidden={!showDropdown || isLoading || isError || !hasResults}
      >
        {showDropdown && !isLoading && !isError && hasResults
          ? groups.map((group) => {
              const startIndex = flatItems.indexOf(group.items[0]);
              return (
                // biome-ignore lint/a11y/useSemanticElements: role="group" is the correct ARIA grouping inside a listbox; a <fieldset> would break the listbox structure.
                <div key={group.key} role="group" aria-label={group.label} className={styles.group}>
                  <div className={styles.groupLabel} aria-hidden="true">
                    {group.label}
                  </div>
                  {group.items.map((address, indexInGroup) => {
                    const flatIndex = startIndex + indexInGroup;
                    return (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation is handled on the combobox input (ArrowUp/Down + Enter, APG pattern); options are not tab stops.
                      <div
                        key={address.id}
                        id={`address-option-${uid}-${flatIndex}`}
                        role="option"
                        // The highlighted option is the "active" one (virtual focus), conveyed by
                        // aria-activedescendant + the .active class. Nothing is ever "selected" while
                        // the list is open (selecting closes it), so aria-selected stays false to keep
                        // the two states distinct — mixing them breaks announcements on some SR/browsers.
                        aria-selected={false}
                        tabIndex={-1}
                        className={`${styles.item} ${flatIndex === activeIndex ? styles.active : ''}`}
                        // onMouseDown only prevents the input blur; the actual selection runs on
                        // click so assistive tech that synthesizes clicks (VoiceOver, TalkBack…) works.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(address)}
                      >
                        <span className={styles.itemName}>
                          {address.type === 'municipality' ? address.city : address.name}
                        </span>
                        <span className={styles.itemMeta}>
                          {address.type === 'municipality'
                            ? address.context
                            : `${address.postcode} ${address.city}`.trim()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          : null}
      </div>

      <p role="status" aria-live="polite" className="fr-sr-only">
        {statusMessage}
      </p>
    </div>
  );
}
