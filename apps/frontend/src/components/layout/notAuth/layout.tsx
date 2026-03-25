import type { ReactNode } from 'react';
import './layout.css';

type NotAuthProps = {
  children: ReactNode;
};

export const NotAuth = ({ children }: NotAuthProps) => {
  const mainId = 'main';

  return (
    <div className="layout">
      <main role="main" id={mainId} className={'fr-container not-auth-main fr-my-15w'}>
        {children}
      </main>
    </div>
  );
};
