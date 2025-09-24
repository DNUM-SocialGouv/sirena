import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { createRequeteEntite } from '@/lib/api/createRequeteEntite';
import { requireAuth } from '@/lib/auth-guards';
import { router } from '@/lib/router';
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
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  //@todo: useful to validate ticket SIRENA-223, should be removed later
  const createRequestMutation = useMutation({
    mutationFn: createRequeteEntite,
    onSuccess: (data) => {
      setCreatedRequestId(data.id);
    },
  });

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.prenom : ''), [profileQuery.data]);

  useEffect(() => {
    if (userStore.role === ROLES.PENDING || profileQuery.data?.statutId !== STATUT_TYPES.ACTIF) {
      router.navigate({ to: '/inactive' });
    }
  }, [profileQuery.data, userStore.role]);

  const handleCreateRequest = () => {
    createRequestMutation.mutate();
  };

  return (
    <div className="fr-container fr-mt-4w">
      <QueryStateHandler query={profileQuery}>
        {() => (
          <>
            <h1>Bienvenue {label}</h1>

            <div className="fr-mb-4w">
              <button
                type="button"
                className="fr-btn"
                onClick={handleCreateRequest}
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? 'Création...' : 'Créer une requête'}
              </button>

              {createdRequestId && (
                <div className="fr-alert fr-alert--success fr-mt-2w">
                  <p className="fr-alert__title">Requête créée avec succès!</p>
                  <p>
                    ID de la requête: <strong>{createdRequestId}</strong>
                  </p>
                </div>
              )}

              {createRequestMutation.isError && (
                <div className="fr-alert fr-alert--error fr-mt-2w">
                  <p className="fr-alert__title">Erreur lors de la création</p>
                </div>
              )}
            </div>

            <RequetesEntite />
          </>
        )}
      </QueryStateHandler>
    </div>
  );
}
