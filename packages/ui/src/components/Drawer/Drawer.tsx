import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { clsx } from 'clsx';
import {
  type ComponentProps,
  createContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getFocusable } from '../../utils/focusable';
import s from './Drawer.module.css';

const EXIT_MS = 240;

const raf = window?.requestAnimationFrame || ((cb: FrameRequestCallback) => +setTimeout(() => cb(Date.now()), 0));
const caf = window?.cancelAnimationFrame || ((id: number) => clearTimeout(id));

const VisualStateCtx = createContext<'entering' | 'open' | 'closing'>('open');
const useVisualState = () => useContext(VisualStateCtx);

type DsfrButtonForTrigger = ButtonProps.Common &
  (ButtonProps.IconOnly | ButtonProps.WithIcon | ButtonProps.WithoutIcon) &
  ButtonProps.AsButton;

export type RootProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  onClickOutside?: () => void;
  withCloseButton?: boolean;
  variant?: 'modal' | 'nonModal';
  overlay?: boolean;
  width?: string | number;
  position?: 'left' | 'right';
};

export type TriggerProps = {
  children: ReactNode;
  renderTrigger?: (onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void) => ReactNode;
  className?: string;
} & DsfrButtonForTrigger;

export type PortalProps = {
  children?: ReactNode;
  container?: Element | null;
};

export type BackdropProps = ComponentProps<'div'> & {
  onInteract?: (ev: ReactMouseEvent<HTMLDivElement>) => void;
};

export type PanelProps = ComponentProps<'aside'> & {
  titleId?: string;
  width?: string | number;
};

type DrawerContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
  variant: 'modal' | 'nonModal';
  props: Required<Pick<RootProps, 'withCloseButton' | 'overlay' | 'position' | 'width'>> & {
    onClickOutside?: RootProps['onClickOutside'];
  };
};

const DrawerCtx = createContext<DrawerContextValue | null>(null);

function useDrawerCtx(caller: string): DrawerContextValue {
  const ctx = useContext(DrawerCtx);
  if (!ctx) throw new Error(`${caller} must be used within <Drawer.Root>.`);
  return ctx;
}

const Root = ({
  open,
  onOpenChange,
  children,
  onClickOutside,
  withCloseButton = true,
  variant = 'nonModal',
  overlay = true,
  width = 360,
  position = 'right',
}: RootProps) => {
  const isControlled = open !== undefined;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = isControlled ? !!open : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (!isOpen || variant !== 'modal') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, variant]);

  const prevFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      prevFocused.current = document.activeElement as HTMLElement | null;
    } else {
      prevFocused.current?.focus?.();
    }
  }, [isOpen]);

  const widthCss = typeof width === 'number' ? `${width}px` : width;

  const ctxValue = useMemo<DrawerContextValue>(
    () => ({
      open: isOpen,
      setOpen,
      variant,
      props: { withCloseButton, overlay, position, width: widthCss, onClickOutside },
    }),
    [isOpen, setOpen, variant, withCloseButton, overlay, position, widthCss, onClickOutside],
  );

  return <DrawerCtx.Provider value={ctxValue}>{children}</DrawerCtx.Provider>;
};

const Trigger = ({ renderTrigger, children, onClick, ...rest }: TriggerProps) => {
  const { setOpen, open } = useDrawerCtx('Drawer.Trigger');

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      setOpen(!open);
    },
    [onClick, setOpen, open],
  );

  if (renderTrigger) {
    return renderTrigger(handleClick);
  }

  return (
    <Button {...rest} onClick={handleClick}>
      {children ?? 'Open drawer'}
    </Button>
  );
};

const Portal = ({ children, container }: PortalProps) => {
  const { open } = useDrawerCtx('Drawer.Portal');
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [visual, setVisual] = useState<'entering' | 'open' | 'closing'>(open ? 'open' : 'closing');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setVisual('entering');
      let id1 = 0,
        id2 = 0;
      id1 = raf(() => {
        id2 = raf(() => setVisual('open'));
      });
      return () => {
        caf(id1);
        caf(id2);
      };
    } else {
      setVisual('closing');
      const t = setTimeout(() => setShouldRender(false), EXIT_MS + 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;
  const target = container ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;

  return createPortal(
    <VisualStateCtx.Provider value={visual}>{shouldRender ? children : null}</VisualStateCtx.Provider>,
    target,
  );
};

// This is a backdrop overlay for Drawer.
// It has onMouseDown for closing the drawer, but it is intentionally NOT focusable.
// RGAA-compliant; Biome reports a false positive lint warning here.
const Backdrop = ({ onInteract, className, ...rest }: BackdropProps) => {
  const {
    props: { overlay },
  } = useDrawerCtx('Drawer.Backdrop');
  const visual = useVisualState();

  if (!overlay) return null;

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (useDrawerCtx('Drawer.Backdrop').variant !== 'nonModal') {
      onInteract?.(e);
    }
  };

  return (
    <div
      data-state={visual}
      className={clsx(s.backdrop, className)}
      onMouseDown={handleMouseDown}
      {...rest}
      style={{
        pointerEvents: useDrawerCtx('Drawer.Backdrop').variant === 'nonModal' ? 'none' : undefined,
      }}
    />
  );
};

const Panel = ({ className, style, width, titleId, children, ...rest }: PanelProps) => {
  const {
    open,
    setOpen,
    props: { withCloseButton, position, width: rootWidth, onClickOutside, overlay },
    variant,
  } = useDrawerCtx('Drawer.Panel');
  const visual = useVisualState();
  const isModal = variant === 'modal';
  const shouldTrapFocus = isModal;

  const computedWidth = typeof width === 'number' ? `${width}px` : (width ?? rootWidth);
  const fromRight = position === 'right';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || visual !== 'open') return;
    const el = panelRef.current;

    if (!el) return;
    const focusables = getFocusable(el);
    if (focusables.length > 0) {
      focusables[0]?.focus?.();
    } else {
      el.focus();
    }
  }, [visual, open]);

  useEffect(() => {
    if (!open || !shouldTrapFocus) return;

    const handleFocusIn = (e: FocusEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (!panel.contains(e.target as Node)) {
        const focusables = getFocusable(panel);
        focusables[0]?.focus();
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [open, shouldTrapFocus]);

  useEffect(() => {
    if (!open || !isModal) return;

    const container = containerRef.current;
    if (!container) return;

    const siblings = Array.from(document.body.children).filter((el) => el !== container) as HTMLElement[];
    siblings.forEach((el) => {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    });

    return () => {
      siblings.forEach((el) => {
        el.inert = false;
        el.removeAttribute('aria-hidden');
      });
    };
  }, [open, isModal]);

  useEffect(() => {
    if (!open || isModal || !onClickOutside) return;

    const handleClickOutside = (e: MouseEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (!panel.contains(e.target as Node)) {
        onClickOutside?.();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [open, onClickOutside, setOpen, isModal]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!shouldTrapFocus || e.key !== 'Tab') return;

    const el = panelRef.current;
    if (!el) return;

    const focusables = getFocusable(el);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx(s.container, !overlay && s.containerNoOverlay, !isModal && s.containerNonModal)}
    >
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={isModal ? true : undefined}
        aria-labelledby={titleId}
        data-state={visual}
        data-side={fromRight ? 'right' : 'left'}
        className={clsx(s.panel, className)}
        style={{ width: computedWidth, ...style }}
        onKeyDown={onKeyDown}
        {...rest}
      >
        {children}
        {withCloseButton && (
          <Button
            iconId="fr-icon-close-line"
            priority="tertiary no outline"
            aria-label="Annuler et fermer le panneau"
            className={s.close}
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
        )}
      </aside>
    </div>
  );
};

export default { Root, Trigger, Portal, Backdrop, Panel };
