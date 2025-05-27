import { HeaderMenu } from '@/components/layout/header';
import type { FC, ReactNode } from 'react';

type NotLoggedLayoutProps = {
  children: ReactNode;
};

export const NotLoggedLayout: FC<NotLoggedLayoutProps> = ({ children }) => {
  return (
    <div>
      <HeaderMenu homeHref="/" />
      <main>{children}</main>
    </div>
  );
};
