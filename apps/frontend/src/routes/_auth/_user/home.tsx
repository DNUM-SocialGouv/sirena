import { fr } from '@codegouvfr/react-dsfr';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { HomeAnnouncementModal } from '@/components/home/HomeAnnouncementModal';
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

export function RouteComponent() {
  const { canEdit } = useCanEdit();
  const profileQuery = useQuery({ ...profileQueryOptions(), enabled: false });
  const userStore = useUserStore();

  useEffect(() => {
    if (userStore.role === ROLES.PENDING || profileQuery.data?.statutId !== STATUT_TYPES.ACTIF) {
      router.navigate({ to: '/inactive' });
    }
  }, [profileQuery.data, userStore.role]);

  return (
    <QueryStateHandler query={profileQuery}>
      {() => (
        <>
          <HomeAnnouncementModal />
          <div className={fr.cx('fr-my-8w')}>
            <div className={styles.header}>
              <h1 className={styles.title}>Liste des requêtes</h1>
              {canEdit ? (
                <Link to="/request/create" className={fr.cx('fr-btn', 'fr-btn--icon-left', 'fr-icon-add-line')}>
                  Créer une requête
                </Link>
              ) : null}
            </div>
            <RequetesEntite />
          </div>
        </>
      )}
    </QueryStateHandler>
  );
}
