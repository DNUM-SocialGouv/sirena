import { useEffect, useRef, useState } from 'react';

export const useOverflowX = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setIsOverflowing(element.scrollWidth > element.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isOverflowing };
};
