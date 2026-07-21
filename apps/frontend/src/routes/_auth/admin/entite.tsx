import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAdminLocalEntiteAccess } from './-admin-local-route-guard';

export const Route = createFileRoute('/_auth/admin/entite')({
  beforeLoad: requireAdminLocalEntiteAccess,
  component: Outlet,
});
