import { HeaderMenu } from '@/components/layout/header';
import type { ReactNode } from 'react';
import './layout.css';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div>
      <HeaderMenu homeHref="/" />
      <main className={'fr-container not-logged-main fr-mt-15w'}>{children}</main>
    </div>
  );
};
