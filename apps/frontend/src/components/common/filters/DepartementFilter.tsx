import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import './DepartementFilter.css';

type Departement = { code: string; label: string };
type CountsMap = Record<string, number>;

type Props = {
  departements: Departement[];
  selectedCodes: string[];
  counts: CountsMap | null;
  onChange: (codes: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DepartementFilter({ departements, selectedCodes, counts, onChange, onOpen, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const menuId = useId();

  const hasSelection = selectedCodes.length > 0;

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      const next = !v;
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
    (code: string, checked: boolean) => {
      const next = checked ? [...selectedCodes, code] : selectedCodes.filter((c) => c !== code);

      onChange(next);
    },
    [selectedCodes, onChange],
  );

  return (
    <div className="departement-filter">
      <button
        ref={triggerRef}
        type="button"
        className="departement-filter__button fr-btn fr-btn--tertiary"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggle}
      >
        <span>
          Département&nbsp;
          {hasSelection && (
            <span>
              <span>({selectedCodes.length})</span>
              <span className="fr-sr-only">départements sélectionnés</span>
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`fr-icon-arrow-down-s-line menu__trigger__icon${isOpen ? ' menu__trigger__icon--is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div id={menuId} ref={panelRef} className="departement-filter__dropdown fr-card fr-px-3w fr-py-2w">
          <Checkbox
            legend="Filtrer les requêtes par département"
            hintText="Code - Département (nombre de requêtes)"
            options={departements.map((dept) => {
              const count = counts?.[dept.code];

              return {
                label: `${dept.code} - ${dept.label}${count !== undefined ? ` (${count})` : ''}`,
                nativeInputProps: {
                  value: dept.code,
                  checked: selectedCodes.includes(dept.code),
                  onChange: (e) => handleCheckboxChange(dept.code, e.target.checked),
                },
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
