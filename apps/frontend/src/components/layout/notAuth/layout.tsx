import { HeaderMenu } from '@/components/layout/header';
import type { ReactNode } from 'react';
import './layout.css';

type NotAuthProps = {
  children: ReactNode;
};

export const NotAuth = ({ children }: NotAuthProps) => {
  return (
    <div>
      <HeaderMenu homeHref="/" />
      <main className={'fr-container not-auth-main fr-mt-15w'}>{children}</main>
    </div>
  );
};
