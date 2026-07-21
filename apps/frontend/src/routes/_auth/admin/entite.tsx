import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAdminLocalAccess } from './-admin-local-route-guard';

export const Route = createFileRoute('/_auth/admin/entite')({
  beforeLoad: requireAdminLocalAccess,
  component: Outlet,
});
