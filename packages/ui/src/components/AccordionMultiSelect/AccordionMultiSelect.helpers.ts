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

export const getItemNounPhrase = (
  selectedCount: number,
  itemNoun: { singular: string; plural: string; feminine?: boolean },
): string => {
  const isPlural = selectedCount > 1;
  const noun = isPlural ? itemNoun.plural : itemNoun.singular;
  const participle = `sélectionné${itemNoun.feminine ? 'e' : ''}${isPlural ? 's' : ''}`;
  return `${noun} ${participle}`;
};

export const getSelectedCountText = (
  selectedCount: number,
  itemNoun: { singular: string; plural: string; feminine?: boolean },
): string => `${selectedCount} ${getItemNounPhrase(selectedCount, itemNoun)}`;

export const getSummaryText = (
  selectedCount: number,
  placeholder: string,
  itemNoun: { singular: string; plural: string; feminine?: boolean },
): string => (selectedCount === 0 ? placeholder : getSelectedCountText(selectedCount, itemNoun));
