import styles from './SelectWithChildren.module.css';
import type { SelectWithChildrenOption } from './SelectWithChildren.types';

interface CategoryButtonProps {
  option: SelectWithChildrenOption;
  selectedCount: number;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  setRef: (el: HTMLButtonElement | null) => void;
  isFocused: boolean;
}

export const CategoryButton = ({
  option,
  selectedCount,
  onClick,
  onKeyDown,
  setRef,
  isFocused,
}: CategoryButtonProps) => {
  const childrenCount = option.children?.length || 0;

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={styles.motifButton}
      role="option"
      aria-selected="false"
      aria-label={`${option.label}, sous-menu avec ${childrenCount} options`}
      tabIndex={isFocused ? 0 : -1}
    >
      <span>
        {option.label}
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
      </span>
      <span className="fr-icon-arrow-right-s-line" aria-hidden="true" />
    </button>
  );
};
