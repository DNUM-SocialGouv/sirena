import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationSave } from '@/hooks/mutations/useSituationSave';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { requireAuth } from '@/lib/auth-guards';
import { formatSituationFromServer } from '@/lib/situation';

export const Route = createFileRoute('/_auth/_user/request/$requestId/situation')({
  beforeLoad: requireAuth,
  params: {
    parse: (params: Record<string, string>) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Lieu, mis en cause et faits - Édition requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const requestQuery = useRequeteDetails(requestId);

  const { handleSave } = useSituationSave({
    requestId,
    onRefetch: () => requestQuery.refetch(),
    onSuccess: () => {
      navigate({ to: '/request/$requestId', params: { requestId } });
    },
  });

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const request = requestQuery.data;
        const situation = request?.requete?.situations?.[0];

        const formattedData = formatSituationFromServer(situation);

        return <SituationForm mode="edit" requestId={requestId} initialData={formattedData} onSave={handleSave} />;
      }}
    </QueryStateHandler>
  );
}
