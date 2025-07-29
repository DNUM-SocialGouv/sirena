import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ROLES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireAuth } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/_auth/_user/home')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Accueil - SIRENA',
      },
    ],
  }),
  validateSearch: QueryParamsSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const profileQuery = useQuery({ ...profileQueryOptions(), enabled: false });
  const userStore = useUserStore();

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.firstName : ''), [profileQuery.data]);

  return (
    <div className="home">
      <QueryStateHandler query={profileQuery}>
        {() => (
          <>
            <h1>Bienvenue {label}</h1>
            {userStore.role === ROLES.PENDING ? <PendingAlert /> : <RequetesEntite />}
          </>
        )}
      </QueryStateHandler>
    </div>
  );
}

function PendingAlert() {
  return (
    <Alert
      severity="info"
      title="Contactez votre administrateur"
      description="Votre compte a SIRENA a bien été créé. Veuillez contacter votre administrateur pour qu'il vous attribue les droits nécessaires à l'utilisation de l'application."
    />
  );
}
