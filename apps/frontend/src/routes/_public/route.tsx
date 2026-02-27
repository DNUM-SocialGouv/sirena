import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PublicLayout } from '@/components/layout/publicLayout';

export const Route = createFileRoute('/_public')({
  component: () => (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  ),
});
