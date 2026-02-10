import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AdminLayoutProps) => {
  return <div className="layout">{children}</div>;
};
