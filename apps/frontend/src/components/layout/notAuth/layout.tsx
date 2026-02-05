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
      <main
        /* biome-ignore lint: RGAA exige role et ID explicites pour le lien d'évitement */
        role="main"
        id={mainId}
        className={'fr-container not-auth-main fr-my-15w'}
      >
        {children}
      </main>
      <AppFooter />
    </div>
  );
};
