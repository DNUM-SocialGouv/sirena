import type { ReactNode } from 'react';
import { HeaderMenu } from '@/components/layout/header';
import { SideNav } from '@/components/layout/sidenav';
import './layout.css';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="admin-layout__container">
      <div className="admin-layout__header">
        <HeaderMenu homeHref="/home" />
      </div>

      <aside className="admin-layout__sidenav">
        <SideNav />
      </aside>

      <main className="admin-layout__main">{children}</main>
    </div>
  );
};
