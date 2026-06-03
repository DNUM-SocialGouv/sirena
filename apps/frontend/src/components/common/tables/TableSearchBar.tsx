import { Button } from '@codegouvfr/react-dsfr/Button';
import { SearchBar } from '@codegouvfr/react-dsfr/SearchBar';
import { useCallback, useEffect, useRef } from 'react';

type TableSearchBarProps = {
  label: string;
  value: string;
  activeSearch?: string;
  total?: number;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  onClear: () => void;
  inputContainerClassName?: string;
};

export function TableSearchBar({
  label,
  value,
  activeSearch,
  total,
  onValueChange,
  onSearch,
  onClear,
  inputContainerClassName = 'fr-col-12 fr-col-md-5',
}: TableSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFocusRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeSearch is used as a trigger to restore focus after navigation
  useEffect(() => {
    if (pendingFocusRef.current) {
      pendingFocusRef.current = false;
      inputRef.current?.focus();
    }
  }, [activeSearch]);

  const handleSearch = useCallback(
    (val: string) => {
      pendingFocusRef.current = true;
      onSearch(val);
    },
    [onSearch],
  );

  return (
    <div className="fr-mb-1w">
      <p className="fr-label fr-mb-1v" aria-hidden="true">
        {label}
      </p>
      <div className="fr-grid-row">
        <div className={inputContainerClassName}>
          <SearchBar
            label={label}
            allowEmptySearch
            onButtonClick={handleSearch}
            renderInput={(inputProps) => (
              <input
                {...inputProps}
                ref={inputRef}
                placeholder=""
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
              />
            )}
          />
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {activeSearch && total !== undefined && (
          <div className="fr-mt-2w">
            <div className="fr-grid-row fr-grid-row--middle">
              <div className="fr-col-auto">
                <p className="fr-text--md fr-mb-0">
                  <span className="fr-text--bold">{total}</span> résultat{total !== 1 ? 's' : ''} pour "{activeSearch}"
                </p>
              </div>
              <div className="fr-col-auto fr-ml-1w">
                <Button
                  type="button"
                  priority="secondary"
                  iconId="fr-icon-delete-line"
                  iconPosition="right"
                  size="small"
                  onClick={onClear}
                  title="Effacer la recherche"
                >
                  Effacer la recherche
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
