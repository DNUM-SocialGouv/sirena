import { HeaderMenu } from '@/components/layout/header';
import type { FC, ReactNode } from 'react';
import './notLogged.css';
type NotLoggedLayoutProps = {
  children: ReactNode;
};

export const NotLoggedLayout: FC<NotLoggedLayoutProps> = ({ children }) => {
  return (
    <div>
      <HeaderMenu homeHref="/" />
      {/* biome-ignore lint/a11y/noRedundantRoles: false positive
       biome-ignore lint/a11y/useSemanticElements: false positive */}
      <main className={'fr-container not-logged-main fr-mt-15w'} role="main">
        {children}
      </main>
    </div>
  );
};
