import { useUserStore } from '@/stores/userStore';
import { type FC, type ReactNode, Suspense, lazy, useMemo } from 'react';

type LayoutProps = {
  children: ReactNode;
};

export const Layout: FC<LayoutProps> = ({ children }) => {
  const isLogged = useUserStore((state) => state.isLogged);
  const Component = useMemo(() => lazy(() => import(`./${isLogged ? 'logged' : 'notLogged'}`)), [isLogged]);

  return (
    <Suspense fallback={<div>Chargement…</div>}>
      <Component>{children}</Component>
    </Suspense>
  );
};
