import { useEffect, useRef, useState } from 'react';

export const useFocusManagement = (isOpen: boolean) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const optionRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const focusTarget = optionRefs.current[focusedIndex];
      if (focusTarget) {
        requestAnimationFrame(() => {
          focusTarget.focus();
        });
      }
    }
  }, [focusedIndex, isOpen]);

  const setOptionRef = (index: number) => (el: HTMLButtonElement | HTMLDivElement | null) => {
    optionRefs.current[index] = el;
  };

  return {
    focusedIndex,
    setFocusedIndex,
    setOptionRef,
  };
};
