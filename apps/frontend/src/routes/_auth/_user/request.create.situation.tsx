import { createFileRoute } from '@tanstack/react-router';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationCreate } from '@/hooks/mutations/useSituationCreate';
import { requireAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create/situation')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Lieu, mis en cause et faits - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { handleSave } = useSituationCreate();

  return <SituationForm mode="create" onSave={handleSave} />;
}
