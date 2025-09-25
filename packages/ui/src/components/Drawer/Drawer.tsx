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
  closable?: boolean;
  mask?: boolean;
  maskClosable?: boolean;
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
  width?: string | number;
};

type DrawerContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
  props: Required<Pick<RootProps, 'closable' | 'mask' | 'maskClosable' | 'position' | 'width'>> & {
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
  closable = true,
  mask = true,
  maskClosable = true,
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
    if (!isOpen || !closable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closable, setOpen]);

  useEffect(() => {
    if (!isOpen || !mask) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, mask]);

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
      props: { closable, mask, maskClosable, position, width: widthCss, onClickOutside },
    }),
    [isOpen, setOpen, closable, mask, maskClosable, position, widthCss, onClickOutside],
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

const Backdrop = ({ onInteract, className, ...rest }: BackdropProps) => {
  const {
    props: { mask },
  } = useDrawerCtx('Drawer.Backdrop');
  const visual = useVisualState();

  if (!mask) return null;

  return <div data-state={visual} className={clsx(s.backdrop, className)} {...rest} />;
};

const Panel = ({ className, style, width, children, ...rest }: PanelProps) => {
  const {
    setOpen,
    props: { closable, position, width: rootWidth, onClickOutside, mask, maskClosable },
  } = useDrawerCtx('Drawer.Panel');
  const visual = useVisualState();

  const computedWidth = typeof width === 'number' ? `${width}px` : (width ?? rootWidth);
  const fromRight = position === 'right';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!closable) return;
      const panel = panelRef.current;
      if (!panel) return;
      const target = e.target as Node | null;
      const isInside = !!(target && panel.contains(target));
      if (isInside) return;
      if (!mask) return;
      onClickOutside?.();
      if (maskClosable) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [closable, mask, maskClosable, setOpen, onClickOutside]);

  useEffect(() => {
    if (visual !== 'open') return;
    const el = panelRef.current;
    if (!el) return;
    const focusables = getFocusable(el);
    focusables[0]?.focus?.();
  }, [visual]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const el = panelRef.current;
    if (!el) return;
    const f = getFocusable(el);
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  return (
    <div ref={containerRef} className={clsx(s.container, !mask && s.containerNoMask)} aria-hidden={false}>
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        data-state={visual}
        data-side={fromRight ? 'right' : 'left'}
        className={clsx(s.panel, className)}
        style={{ width: computedWidth, ...style }}
        onKeyDown={onKeyDown}
        {...rest}
      >
        {children}
        {closable && (
          <Button
            iconId="fr-icon-close-line"
            priority="tertiary no outline"
            aria-label="Close drawer"
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
