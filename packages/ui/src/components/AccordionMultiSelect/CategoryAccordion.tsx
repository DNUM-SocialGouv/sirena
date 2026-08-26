import type { ReactNode } from 'react';
import styles from './AccordionMultiSelect.module.css';
import type { AccordionMultiSelectOption } from './AccordionMultiSelect.types';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

interface CategoryAccordionProps {
  category: AccordionMultiSelectOption;
  panelId: string;
  isExpanded: boolean;
  selectedCount: number;
  headingLevel: HeadingLevel;
  onToggleExpand: () => void;
  children: ReactNode;
}

export const CategoryAccordion = ({
  category,
  panelId,
  isExpanded,
  selectedCount,
  headingLevel,
  onToggleExpand,
  children,
}: CategoryAccordionProps) => {
  const Heading = `h${headingLevel}` as const;

  return (
    <li className={styles.categoryItem}>
      <Heading className={styles.categoryHeading}>
        <button
          type="button"
          className={styles.categoryButton}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={onToggleExpand}
        >
          <span className={styles.categoryLabel}>
            {category.label}
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
          </span>
          <span className={isExpanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'} aria-hidden="true" />
        </button>
      </Heading>

      <fieldset id={panelId} className={styles.categoryPanel} hidden={!isExpanded}>
        <legend className="fr-sr-only">Motifs : {category.label}</legend>
        {children}
      </fieldset>
    </li>
  );
};
