import { Menu } from '@base-ui-components/react/menu';
import './Menu.css';
import type { HTMLAttributes, ReactNode } from 'react';

const Root = ({ children, ...props }: Menu.Root.Props) => {
  return <Menu.Root {...props}>{children}</Menu.Root>;
};

type TriggerProps = Menu.Trigger.Props & { isOpen?: boolean };

const Trigger = ({ children, className, isOpen, ...props }: TriggerProps) => {
  return (
    <Menu.Trigger className={`${className || ''} fr-btn fr-btn--tertiary`} {...props}>
      {children}
      <span
        aria-hidden="true"
        className={`fr-icon-arrow-down-s-line menu__trigger__icon ${isOpen ? 'menu__trigger__icon--is-open' : ''}`}
      />
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

const Footer = ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className="menu__popup__footer" {...props}>
      {children}
    </div>
  );
};

const Item = ({ children, ...props }: Menu.Item.Props) => {
  return (
    <Menu.Item className="menu__popup__item" {...props}>
      {children}
    </Menu.Item>
  );
};

const Separator = ({ ...props }: Menu.Separator.Props) => {
  return <Menu.Separator className="menu__popup__separator" {...props} />;
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
