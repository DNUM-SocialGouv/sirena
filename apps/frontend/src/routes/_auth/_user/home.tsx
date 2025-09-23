import { Button } from '@codegouvfr/react-dsfr/Button';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { createRequeteEntite } from '@/lib/api/createRequeteEntite';
import { requireAuth } from '@/lib/auth-guards';
import { router } from '@/lib/router';
import { QueryParamsSchema } from '@/schemas/pagination.schema';
import { useUserStore } from '@/stores/userStore';
import styles from './home.module.css';

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
  const toastManager = Toast.useToastManager();
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // TODO: useful to validate ticket SIRENA-223, should be removed later
  const createRequestMutation = useMutation({
    mutationFn: createRequeteEntite,
    onSuccess: (data) => {
      setCreatedRequestId(data.id);
      toastManager.add({
        title: 'Requête créée avec succès',
        description: `La requête avec l'ID ${data.id} a été créée.`,
        timeout: 5000,
        data: { icon: 'fr-alert--success' },
      });
    },
    onError: (error) => {
      toastManager.add({
        title: 'Erreur lors de la création',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue lors de la création de la requête.',
        timeout: 5000,
        data: { icon: 'fr-alert--error' },
      });
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
            <div className={styles.header}>
              <h1 className={styles.title}>Bienvenue {label}</h1>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/request/create">
                  <Button iconId="fr-icon-add-line" iconPosition="left">
                    Créer une requête manuellement
                  </Button>
                </Link>
                <Button iconId="fr-icon-add-line" iconPosition="left" onClick={handleCreateRequest}>
                  Créer une requête (test SIRENA-223)
                </Button>
              </div>
            </div>
            <RequetesEntite />
          </>
        )}
      </QueryStateHandler>
    </div>
  );
}
