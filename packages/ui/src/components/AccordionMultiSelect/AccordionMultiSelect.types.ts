export interface AccordionMultiSelectOption {
  label: string;
  value: string;
  /** Secondary descriptive text rendered in grey below the label. */
  description?: string;
  children?: AccordionMultiSelectOption[];
}

export interface AccordionMultiSelectProps {
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  hint?: string;
  options: AccordionMultiSelectOption[];
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  state?: 'default' | 'error';
  stateRelatedMessage?: string;
  /** Text shown in the trigger when nothing is selected. */
  placeholder?: string;
  itemNoun?: { singular: string; plural: string; feminine?: boolean };
  /** Heading level used for each category header button (accordion pattern). Defaults to 2. */
  categoryHeadingLevel?: 2 | 3 | 4 | 5 | 6;
}
