import { HeaderMenu } from '@/components/layout/header';
import { SideNav } from '@/components/layout/sidenav';
import type { FC, ReactNode } from 'react';
import './logged.css';

type LoggedLayoutProps = {
  children: ReactNode;
};

export const LoggedLayout: FC<LoggedLayoutProps> = ({ children }) => {
  return (
    <div className="logged-layout__container">
      <div className="logged-layout__header">
        <HeaderMenu homeHref="/home" />
      </div>

      <aside className="logged-layout__sidenav">
        <SideNav />
      </aside>

      <main className="logged-layout__main">{children}</main>
    </div>
  );
};
