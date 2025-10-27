import { ROLES } from '@sirena/common/constants';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/$requestId/situation/')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]),
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Lieu, mis en cause et faits - Nouvelle situation - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const { handleSave } = useSituationSave({
          requestId,
          situationId: undefined,
          onRefetch: () => requestQuery.refetch(),
          onSuccess: () => {
            navigate({ to: '/request/$requestId', params: { requestId } });
          },
        });

        return <SituationForm mode="edit" requestId={requestId} situationId={undefined} onSave={handleSave} />;
      }}
    </QueryStateHandler>
  );
}
