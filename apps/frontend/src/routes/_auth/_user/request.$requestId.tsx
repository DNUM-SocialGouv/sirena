import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/$requestId')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  params: {
    parse: (params) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Détails de la requête ${params.requestId} - SIRENA`,
      },
    ],
  }),
  component: Outlet,
});
