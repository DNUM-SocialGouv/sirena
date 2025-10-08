import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { DeclarantForm } from '@/components/declarant/DeclarantForm';
import { useDeclarantCreate } from '@/hooks/mutations/useDeclarantCreate';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/_user/request/create/declarant')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  head: () => ({
    meta: [
      {
        title: 'Déclarant - Nouvelle requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { handleSave } = useDeclarantCreate();

  return <DeclarantForm mode="create" onSave={handleSave} />;
}
