import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RequestForm } from '@/components/requestForm/RequestForm';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/$requestId/processing')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  validateSearch: z.object({
    entiteId: z.string().optional(),
  }),
  head: ({ params }) => ({
    meta: [
      {
        title: `Traitement de la requête ${params.requestId} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  return <RequestForm requestId={requestId} activeTab={1} />;
}
