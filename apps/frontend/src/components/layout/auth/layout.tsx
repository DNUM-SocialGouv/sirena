import type { ReactNode } from 'react';
import { AppFooter } from '@/components/layout/footer';
import { HeaderMenu } from '@/components/layout/header';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="layout">
      <HeaderMenu homeHref="/" />
      <main>{children}</main>
      <AppFooter />
    </div>
  );
};
