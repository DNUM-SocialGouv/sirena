import type { ReactNode } from 'react';
import { AppFooter } from '@/components/layout/footer';
import { HeaderMenu } from '@/components/layout/header';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="layout">
      <HeaderMenu homeHref="/" />
      <main className={'fr-container main fr-my-15w'}>{children}</main>
      <AppFooter />
    </div>
  );
};
