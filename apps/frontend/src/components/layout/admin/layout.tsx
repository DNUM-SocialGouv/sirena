import type { ReactNode } from 'react';
import { HeaderMenu } from '@/components/layout/header';
import './layout.css';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <>
      <HeaderMenu homeHref="/" />
      <main className={'fr-container not-logged-main fr-mt-15w'}>{children}</main>
    </>
  );
};
