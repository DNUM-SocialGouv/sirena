import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { RequestForm } from '@/components/requestForm/RequestForm';
import { requireAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/$requestId/edit')({
  beforeLoad: requireAuth,
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Édition requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();

  // TODO: Replace with actual query hook for fetching request data
  const requestQuery = useQuery({
    queryKey: ['request', requestId],
    queryFn: async () => {
      // Placeholder - replace with actual API call
      return {
        id: requestId,
        declarant: undefined,
        personneConcernee: undefined,
        lieuxFaits: undefined,
        requeteOriginale: undefined,
      };
    },
    enabled: !!requestId,
  });

  return (
    <QueryStateHandler query={requestQuery}>
      {({ data }) => (
        <RequestForm
          mode="edit"
          requestId={requestId}
          initialData={{
            declarant: data.declarant,
            personneConcernee: data.personneConcernee,
            lieuxFaits: data.lieuxFaits,
            requeteOriginale: data.requeteOriginale,
          }}
        />
      )}
    </QueryStateHandler>
  );
}
