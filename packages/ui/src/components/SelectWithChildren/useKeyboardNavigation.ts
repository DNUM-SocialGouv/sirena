import type { SelectWithChildrenOption } from './SelectWithChildren.types';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number | ((prev: number) => number)) => void;
  totalOptions: number;
  currentOptions: SelectWithChildrenOption[];
  navigationPath: SelectWithChildrenOption[];
  navigateInto: (option: SelectWithChildrenOption, currentFocusIndex: number) => number;
  navigateBack: () => number;
  toggleSelection: (value: string) => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export const useKeyboardNavigation = ({
  isOpen,
  setIsOpen,
  focusedIndex,
  setFocusedIndex,
  totalOptions,
  currentOptions,
  navigationPath,
  navigateInto,
  navigateBack,
  toggleSelection,
  buttonRef,
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalOptions);
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const prevIndex = prev - 1;
          return prevIndex < 0 ? totalOptions - 1 : prevIndex;
        });
        break;

      case 'ArrowRight': {
        const adjustedIndex = navigationPath.length > 0 ? focusedIndex - 1 : focusedIndex;
        if (adjustedIndex >= 0 && adjustedIndex < currentOptions.length) {
          const option = currentOptions[adjustedIndex];
          if (option?.children && option.children.length > 0) {
            event.preventDefault();
            const newFocusIndex = navigateInto(option, focusedIndex);
            setFocusedIndex(newFocusIndex);
          }
        }
        break;
      }

      case 'ArrowLeft':
        if (navigationPath.length > 0) {
          event.preventDefault();
          const restoredIndex = navigateBack();
          setFocusedIndex(restoredIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(totalOptions - 1);
        break;

      case 'Enter':
      case ' ': {
        const adjustedIndex = navigationPath.length > 0 ? focusedIndex - 1 : focusedIndex;
        if (adjustedIndex >= 0 && adjustedIndex < currentOptions.length) {
          const option = currentOptions[adjustedIndex];
          if (option?.children && option.children.length > 0) {
            event.preventDefault();
            const newFocusIndex = navigateInto(option, focusedIndex);
            setFocusedIndex(newFocusIndex);
          } else {
            event.preventDefault();
            toggleSelection(option.value);
          }
        } else if (navigationPath.length > 0 && focusedIndex === 0) {
          event.preventDefault();
          const restoredIndex = navigateBack();
          setFocusedIndex(restoredIndex);
        }
        break;
      }
    }
  };

  return { handleKeyDown };
};
