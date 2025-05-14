import { HeaderMenu } from '@/components/layout/header';
import type { FC, ReactNode } from 'react';

type LoginLayoutLayoutProps = {
  children: ReactNode;
};

export const LoginLayout: FC<LoginLayoutLayoutProps> = ({ children }) => {
  return (
    <div>
      <HeaderMenu homeHref="/" />
      <main>{children}</main>
    </div>
  );
};
