import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/users/all')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer les utilisateurs - SIRENA',
      },
    ],
  }),
  component: () => null,
});
