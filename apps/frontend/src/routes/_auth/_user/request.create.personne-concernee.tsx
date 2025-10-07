import { createFileRoute } from '@tanstack/react-router';
import { PersonneConcerneeForm } from '@/components/personneConcernee/PersonneConcerneeForm';
import { usePersonneConcerneeCreate } from '@/hooks/mutations/usePersonneConcerneeCreate';
import { requireAuth } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create/personne-concernee')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Personne concernée - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { handleSave } = usePersonneConcerneeCreate();

  return <PersonneConcerneeForm mode="create" onSave={handleSave} />;
}
