import { Button } from '@codegouvfr/react-dsfr/Button';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { useCanEdit } from '@/hooks/useCanEdit';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { router } from '@/lib/router';
import { QueryParamsSchema } from '@/schemas/pagination.schema';
import { useUserStore } from '@/stores/userStore';
import styles from './home.module.css';

export const Route = createFileRoute('/_auth/_user/home')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
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
  const { canEdit } = useCanEdit();
  const profileQuery = useQuery({ ...profileQueryOptions(), enabled: false });
  const userStore = useUserStore();

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.prenom : ''), [profileQuery.data]);

  useEffect(() => {
    if (userStore.role === ROLES.PENDING || profileQuery.data?.statutId !== STATUT_TYPES.ACTIF) {
      router.navigate({ to: '/inactive' });
    }
  }, [profileQuery.data, userStore.role]);

  return (
    <QueryStateHandler query={profileQuery}>
      {() => (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>Bienvenue {label}</h1>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {canEdit && (
                <Link to="/request/create">
                  <Button iconId="fr-icon-add-line" iconPosition="left">
                    Créer une requête
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <RequetesEntite />
        </>
      )}
    </QueryStateHandler>
  );
}
