import { useCallback, useEffect, useRef, useState } from 'react';

type useDisclosureMenuOptions = {
  onOpen?: () => void;
  onClose?: () => void;
};

export function useDisclosureMenu({ onOpen, onClose }: useDisclosureMenuOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();

    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      const next = !v;
      next ? onOpen?.() : onClose?.();
      return next;
    });
  }, [onOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        panelRef.current &&
        triggerRef.current &&
        !panelRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
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

      if (!next || !panelRef.current?.contains(next)) {
        close();
      }
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
