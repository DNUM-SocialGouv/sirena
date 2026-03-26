import { useEffect, useRef } from 'react';

export const useModalFocusRestore = (modalIds: string[]) => {
  const triggerRef = useRef<HTMLElement | null>(null);

  const registerTrigger = (element: HTMLElement) => {
    triggerRef.current = element;
  };

  useEffect(() => {
    const handleClose = () => {
      setTimeout(() => {
        if (triggerRef.current && document.contains(triggerRef.current)) {
          triggerRef.current.focus();
          triggerRef.current.classList.add('force-focus-visible');

          setTimeout(() => {
            triggerRef.current?.classList.remove('force-focus-visible');
          }, 100);
        }
      }, 0);
    };

    const elements = modalIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);

    elements.forEach((el) => {
      el.addEventListener('dsfr.conceal', handleClose);
      return;
    });

    return () => {
      elements.forEach((el) => {
        el.removeEventListener('dsfr.conceal', handleClose);
        return;
      });
    };
  }, [modalIds]);

  return { registerTrigger };
};
