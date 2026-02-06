import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { SituationForm } from '@/components/situation/SituationForm';
import { useSituationCreate } from '@/hooks/mutations/useSituationCreate';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create/situation')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]),
  head: () => ({
    meta: [
      {
        title: 'Description de la situation - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { handleSave } = useSituationCreate();

  return <SituationForm mode="create" onSave={handleSave} />;
}
