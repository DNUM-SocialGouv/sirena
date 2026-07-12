import { Button } from '@codegouvfr/react-dsfr/Button';
import { type RefObject, useCallback, useEffect, useState } from 'react';
import './ColumnScrollControls.css';

export type ColumnScrollControlsProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  tableId: string;
};

const SCROLL_EPSILON = 2;

type ColumnBounds = { left: number; right: number };

const getColumnBounds = (container: HTMLElement): ColumnBounds[] => {
  const base = container.getBoundingClientRect().left;
  const { scrollLeft } = container;
  return Array.from(container.querySelectorAll<HTMLElement>('thead th'))
    .filter((th) => !th.classList.contains('fr-cell--fixed') && !th.classList.contains('fr-cell--fixed-right'))
    .map((th) => {
      const r = th.getBoundingClientRect();
      return { left: Math.round(r.left - base + scrollLeft), right: Math.round(r.right - base + scrollLeft) };
    });
};

export const ColumnScrollControls = ({ containerRef, tableId }: ColumnScrollControlsProps) => {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    setCanScrollPrev(scrollLeft > SCROLL_EPSILON);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON);
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateState();
    container.addEventListener('scroll', updateState, { passive: true });

    const resizeObserver = new ResizeObserver(updateState);
    resizeObserver.observe(container);
    const table = container.querySelector('table');
    if (table) resizeObserver.observe(table);

    return () => {
      container.removeEventListener('scroll', updateState);
      resizeObserver.disconnect();
    };
  }, [containerRef, updateState]);

  const scrollToNext = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, clientWidth } = container;
    const viewportRight = scrollLeft + clientWidth;
    const target = getColumnBounds(container).find((c) => c.right > viewportRight + SCROLL_EPSILON);
    if (!target) return;
    const left = Math.max(0, Math.min(target.right - clientWidth, target.left));
    container.scrollTo({ left, behavior: 'smooth' });
  }, [containerRef]);

  const scrollToPrev = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft } = container;
    const target = [...getColumnBounds(container)].reverse().find((c) => c.left < scrollLeft - SCROLL_EPSILON);
    if (!target) return;
    container.scrollTo({ left: Math.max(0, target.left), behavior: 'smooth' });
  }, [containerRef]);

  return (
    <div
      className="data-table-column-scroll"
      role="toolbar"
      aria-label="Navigation horizontale des colonnes du tableau"
    >
      <Button
        type="button"
        priority="tertiary no outline"
        iconId="fr-icon-arrow-left-s-line"
        iconPosition="left"
        size="small"
        disabled={!canScrollPrev}
        onClick={scrollToPrev}
        nativeButtonProps={{ 'aria-controls': tableId }}
      >
        Colonnes précédentes
      </Button>
      <Button
        type="button"
        priority="tertiary no outline"
        iconId="fr-icon-arrow-right-s-line"
        iconPosition="right"
        size="small"
        disabled={!canScrollNext}
        onClick={scrollToNext}
        nativeButtonProps={{ 'aria-controls': tableId }}
      >
        Colonnes suivantes
      </Button>
    </div>
  );
};
