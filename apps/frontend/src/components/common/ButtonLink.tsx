import type { ReactNode } from 'react';
import styles from './ButtonLink.module.css';

interface ButtonLinkProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: string;
  className?: string;
  disabled?: boolean;
}

export const ButtonLink = ({ children, onClick, icon, className, disabled }: ButtonLinkProps) => {
  return (
    <button type="button" className={`${styles.buttonLink} ${className || ''}`} onClick={onClick} disabled={disabled}>
      {icon && <span className={icon} aria-hidden="true"></span>}
      <span>{children}</span>
    </button>
  );
};
