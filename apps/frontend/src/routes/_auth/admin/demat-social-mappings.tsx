import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { DematSocialMappings } from '@/components/common/tables/dematSocialMappings';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';

export const Route = createFileRoute('/_auth/admin/demat-social-mappings')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Mapping dematsocial - SIRENA',
      },
    ],
  }),
  validateSearch: QueryParamsSchema,
  component: RouteComponent,
});

export function RouteComponent() {
  return <DematSocialMappings />;
}
