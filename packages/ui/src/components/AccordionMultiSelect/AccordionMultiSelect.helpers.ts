import type { AccordionMultiSelectOption } from './AccordionMultiSelect.types';

export const buildFullValue = (parentValue: string | undefined, optionValue: string): string =>
  parentValue ? `${parentValue}/${optionValue}` : optionValue;

export const getSelectedCountInCategory = (category: AccordionMultiSelectOption, selectedValues: string[]): number => {
  if (!category.children) {
    return 0;
  }
  return category.children.filter((child) => selectedValues.includes(buildFullValue(category.value, child.value)))
    .length;
};

export const getSummaryText = (
  selectedCount: number,
  placeholder: string,
  itemNoun: { singular: string; plural: string; feminine?: boolean },
): string => {
  if (selectedCount === 0) {
    return placeholder;
  }
  const isPlural = selectedCount > 1;
  const noun = isPlural ? itemNoun.plural : itemNoun.singular;
  // Agree the past participle in gender (feminine noun) and number.
  const participle = `sélectionné${itemNoun.feminine ? 'e' : ''}${isPlural ? 's' : ''}`;
  return `${selectedCount} ${noun} ${participle}`;
};
