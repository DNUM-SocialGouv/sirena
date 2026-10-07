import { useCallback, useEffect, useRef, useState } from 'react';

export function hasFocusLeftMenu(next: Node | null, panel: HTMLElement | null, trigger: HTMLElement | null): boolean {
  if (!next) return false;
  if (panel?.contains(next) || trigger?.contains(next)) return false;
  return !panel || !next.contains(panel);
}

type useDisclosureMenuOptions = {
  onOpen?: () => void;
  onClose?: () => void;
};

export function useDisclosureMenu({ onOpen, onClose }: useDisclosureMenuOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isOpenRef = useRef(false);

  const setOpenState = useCallback((next: boolean) => {
    isOpenRef.current = next;
    setIsOpen(next);
  }, []);

  const open = useCallback(() => {
    if (isOpenRef.current) return;

    setOpenState(true);
    onOpen?.();
  }, [onOpen, setOpenState]);

  const close = useCallback(
    (options?: { restoreFocus?: boolean }) => {
      if (!isOpenRef.current) return;

      const { restoreFocus = true } = options ?? {};

      setOpenState(false);
      onClose?.();

      if (!restoreFocus) return;

      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    },
    [onClose, setOpenState],
  );

  const toggle = useCallback(() => {
    const next = !isOpenRef.current;

    setOpenState(next);
    next ? onOpen?.() : onClose?.();
  }, [onOpen, onClose, setOpenState]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      const isInside = panelRef.current?.contains(target) || triggerRef.current?.contains(target);

      if (!isInside) close({ restoreFocus: false });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  // fermeture si focus sort du panel (WCAG-safe)
  const onPanelBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null;

      if (next && !hasFocusLeftMenu(next, panelRef.current, triggerRef.current)) return;

      close({ restoreFocus: false });
    },
    [close],
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerRef,
    panelRef,
    onPanelBlur,
  };
}
