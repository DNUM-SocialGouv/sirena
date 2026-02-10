import type { ReactNode } from 'react';
import { HeaderMenu } from '@/components/layout/header';
import { AppFooter } from '../footer';
import './layout.css';

type NotAuthProps = {
  children: ReactNode;
};

export const NotAuth = ({ children }: NotAuthProps) => {
  const mainId = 'main';

  return (
    <div className="layout">
      <HeaderMenu homeHref="/" />
      {/* biome-ignore lint/a11y/useSemanticElements: exigé par RGAA */}
      <main role="main" id={mainId} className={'fr-container not-auth-main fr-my-15w'}>
        {children}
      </main>
      <AppFooter />
    </div>
  );
};
