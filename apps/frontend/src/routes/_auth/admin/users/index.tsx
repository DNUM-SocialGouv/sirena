import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/users/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Utilisateurs en attente de validation - SIRENA',
      },
    ],
  }),
  component: () => null,
});
