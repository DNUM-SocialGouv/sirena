import type { SelectWithChildrenOption } from './SelectWithChildren.types';

export const getAllLabelsMap = (options: SelectWithChildrenOption[]): Map<string, string> => {
  const map = new Map<string, string>();
  const traverse = (traverseOptions: SelectWithChildrenOption[], parentValue?: string) => {
    for (const opt of traverseOptions) {
      const fullValue = parentValue ? `${parentValue}/${opt.value}` : opt.value;
      map.set(fullValue, opt.label);
      if (opt.children) {
        traverse(opt.children, fullValue);
      }
    }
  };
  traverse(options);
  return map;
};

export const getSelectedCountInCategory = (option: SelectWithChildrenOption, selectedValues: string[]): number => {
  let count = 0;
  const traverse = (opt: SelectWithChildrenOption, parentValue?: string) => {
    const fullValue = parentValue ? `${parentValue}/${opt.value}` : opt.value;

    if (!opt.children || opt.children.length === 0) {
      if (selectedValues.includes(fullValue)) {
        count++;
      }
    } else {
      for (const child of opt.children) {
        traverse(child, fullValue);
      }
    }
  };
  traverse(option);
  return count;
};

export const getDisplayText = (selectedValues: string[], labelsMap: Map<string, string>): string => {
  const selectedCount = selectedValues.length;

  if (selectedCount === 1) {
    const [firstValue] = selectedValues;
    return labelsMap.get(firstValue) || firstValue;
  }

  if (selectedCount > 1) {
    return `${selectedCount} options sélectionnées`;
  }

  return 'Sélectionner une ou plusieurs options';
};

export const getCurrentOptions = (
  options: SelectWithChildrenOption[],
  navigationPath: SelectWithChildrenOption[],
): SelectWithChildrenOption[] => {
  return navigationPath.length === 0 ? options : navigationPath[navigationPath.length - 1].children || [];
};

export const getTotalOptionsCount = (
  currentOptions: SelectWithChildrenOption[],
  hasNavigationPath: boolean,
): number => {
  return hasNavigationPath ? currentOptions.length + 1 : currentOptions.length;
};
