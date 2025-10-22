import { useState } from 'react';
import type { SelectWithChildrenOption } from './SelectWithChildren.types';

export const useSelectNavigation = () => {
  const [navigationPath, setNavigationPath] = useState<SelectWithChildrenOption[]>([]);
  const [parentFocusStack, setParentFocusStack] = useState<number[]>([]);

  const navigateInto = (option: SelectWithChildrenOption, currentFocusIndex: number) => {
    if (option.children && option.children.length > 0) {
      setNavigationPath([...navigationPath, option]);
      setParentFocusStack([...parentFocusStack, currentFocusIndex]);
      return 1;
    }
    return currentFocusIndex;
  };

  const navigateBack = () => {
    const newPath = navigationPath.slice(0, -1);
    const newStack = parentFocusStack.slice(0, -1);
    const restoredFocusIndex = parentFocusStack[parentFocusStack.length - 1] ?? 0;

    setNavigationPath(newPath);
    setParentFocusStack(newStack);
    return restoredFocusIndex;
  };

  const resetNavigation = () => {
    setNavigationPath([]);
    setParentFocusStack([]);
  };

  return {
    navigationPath,
    navigateInto,
    navigateBack,
    resetNavigation,
  };
};
