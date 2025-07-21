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
  component: () => null, // TODO: SIRENA-194 => Render a null component here because apps/frontend/src/routes/_auth/admin/users/route.tsx handles rendering the correct Tab. We keep these routes to be able to have different routing/url based on the selected tab and prevent double rendering of sub-components. A better solution is surely possible in the future
});
