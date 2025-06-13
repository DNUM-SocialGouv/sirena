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
      <main className={'fr-container not-logged-main'}>{children}</main>
    </div>
  );
};
