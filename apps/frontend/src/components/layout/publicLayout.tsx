import { Outlet } from '@tanstack/react-router';

export function PublicLayout({ children }: { children?: React.ReactNode }) {
  return <>{children || <Outlet />}</>;
}
