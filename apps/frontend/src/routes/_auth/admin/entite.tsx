import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAdminLocalEntite } from './directions-services/-route-guard';

export const Route = createFileRoute('/_auth/admin/entite')({
  beforeLoad: requireAdminLocalEntite,
  component: Outlet,
});
