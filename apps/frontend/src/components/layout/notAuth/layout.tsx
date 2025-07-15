import type { ReactNode } from 'react';
import { HeaderMenu } from '@/components/layout/header';
import { AppFooter } from '../footer';

type NotAuthProps = {
  children: ReactNode;
};

export const NotAuth = ({ children }: NotAuthProps) => {
  return (
    <div className="layout">
      <HeaderMenu homeHref="/" />
      <main className={'fr-container not-auth-main fr-my-15w'}>{children}</main>
      <AppFooter />
    </div>
  );
};
