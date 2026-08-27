import type { ReactNode } from 'react';
import { getItemNounPhrase } from './AccordionMultiSelect.helpers';
import styles from './AccordionMultiSelect.module.css';
import type { AccordionMultiSelectOption } from './AccordionMultiSelect.types';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

interface CategoryAccordionProps {
  category: AccordionMultiSelectOption;
  panelId: string;
  isExpanded: boolean;
  selectedCount: number;
  itemNoun: { singular: string; plural: string; feminine?: boolean };
  headingLevel?: HeadingLevel;
  onToggleExpand: () => void;
  children: ReactNode;
}

export const CategoryAccordion = ({
  category,
  panelId,
  isExpanded,
  selectedCount,
  itemNoun,
  headingLevel,
  onToggleExpand,
  children,
}: CategoryAccordionProps) => {
  const Heading = headingLevel ? (`h${headingLevel}` as const) : null;

  const toggleButton = (
    <button
      type="button"
      className={styles.categoryButton}
      aria-expanded={isExpanded}
      aria-controls={panelId}
      onClick={onToggleExpand}
    >
      <span className={styles.categoryLabel}>
        {category.label}
        {selectedCount > 0 ? (
          <>
            {' '}
            ({selectedCount}) <span className="fr-sr-only">{getItemNounPhrase(selectedCount, itemNoun)}</span>
          </>
        ) : null}
      </span>
      <span
        className={`fr-icon-arrow-down-s-line ${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`}
        aria-hidden="true"
      />
    </button>
  );

  return (
    <li className={styles.categoryItem}>
      {Heading ? <Heading className={styles.categoryHeading}>{toggleButton}</Heading> : toggleButton}

      <fieldset id={panelId} className={styles.categoryPanel} hidden={!isExpanded}>
        <legend className="fr-sr-only">Motifs : {category.label}</legend>
        {children}
      </fieldset>
    </li>
  );
};
