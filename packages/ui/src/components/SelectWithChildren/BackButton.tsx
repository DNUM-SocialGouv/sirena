import styles from './SelectWithChildren.module.css';

interface BackButtonProps {
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  setRef: (el: HTMLButtonElement | null) => void;
  isFocused: boolean;
}

export const BackButton = ({ onClick, onKeyDown, setRef, isFocused }: BackButtonProps) => {
  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={styles.backButton}
      aria-label="Retour au niveau précédent"
      tabIndex={isFocused ? 0 : -1}
    >
      <span className="fr-icon-arrow-left-line" aria-hidden="true" />
      Retour
    </button>
  );
};
