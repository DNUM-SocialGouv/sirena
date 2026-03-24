import { BreadCrumb } from '@sirena/ui';
import { Outlet, useLocation } from '@tanstack/react-router';
import { useBreadCrumb } from '@/hooks/useBreadCrumb';

export function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const items = useBreadCrumb(pathname);

  return (
    <div className="fr-container">
      <div className="fr-grid-row">
        <div className="fr-col">
          <BreadCrumb items={items} />
        </div>
      </div>
      <main role="main">{children || <Outlet />}</main>
    </div>
  );
}
