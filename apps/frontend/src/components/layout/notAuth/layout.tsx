import type { ReactNode } from 'react';
import './layout.css';

type NotAuthProps = {
  children: ReactNode;
};

export const NotAuth = ({ children }: NotAuthProps) => {
  return (
    <div className="layout">
      <div className={'fr-container not-auth-main fr-my-15w'}>{children}</div>
    </div>
  );
};
