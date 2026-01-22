import { Menu } from '@base-ui/react';
import './Menu.css';
import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import { Loader } from '../Loader/Loader';

const Root = ({ children, ...props }: Menu.Root.Props) => {
  return <Menu.Root {...props}>{children}</Menu.Root>;
};

type TriggerProps = Menu.Trigger.Props & { isOpen?: boolean; isLoading?: boolean };

const Trigger = ({ children, className, isOpen, isLoading, ...props }: TriggerProps) => {
  return (
    <Menu.Trigger className={`${className || ''}`} {...props}>
      {children}
      {isLoading ? (
        <Loader size="xs" className="menu__trigger__icon-loading" />
      ) : (
        <span
          aria-hidden="true"
          className={clsx('fr-icon-arrow-down-s-line menu__trigger__icon', isOpen && 'menu__trigger__icon--is-open')}
        />
      )}
    </Menu.Trigger>
  );
};

const Portal = ({ children, ...props }: Menu.Portal.Props) => {
  return <Menu.Portal {...props}>{children}</Menu.Portal>;
};

const Positioner = ({ children, className, ...props }: Menu.Positioner.Props) => {
  return (
    <Menu.Positioner sideOffset={5} className={`menu__positioner ${className || ''}`} {...props}>
      {children}
    </Menu.Positioner>
  );
};

const Popup = ({ children, className, ...props }: Menu.Popup.Props) => {
  return (
    <Menu.Popup {...props} className={`menu__popup ${className || ''}`}>
      {children}
    </Menu.Popup>
  );
};

type HeaderProps = { children: ReactNode } & HTMLAttributes<HTMLDivElement>;

const Header = ({ children, className, ...props }: HeaderProps) => {
  return (
    <div className={`menu__popup__header ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

const Footer = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`menu__popup__footer ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

const Item = ({ children, className, ...props }: Menu.Item.Props) => {
  return (
    <Menu.Item className={`menu__popup__item ${className || ''}`} {...props}>
      {children}
    </Menu.Item>
  );
};

const Separator = ({ className, ...props }: Menu.Separator.Props) => {
  return <Menu.Separator className={`menu__popup__separator ${className || ''}`} {...props} />;
};

export default {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Item,
  Header,
  Separator,
  Footer,
};
