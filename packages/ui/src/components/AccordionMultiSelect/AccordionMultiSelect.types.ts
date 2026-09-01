export interface AccordionMultiSelectOption {
  label: string;
  value: string;
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
  readOnly?: boolean;
  state?: 'default' | 'error';
  stateRelatedMessage?: string;
  placeholder?: string;
  itemNoun?: { singular: string; plural: string; feminine?: boolean };
  categoryHeadingLevel?: 2 | 3 | 4 | 5 | 6;
}
