import { fr } from '@codegouvfr/react-dsfr';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { RequetesEntite } from '@/components/common/tables/requetesEntites.tsx';
import { CollaborationAnnouncementModal } from '@/components/home/CollaborationAnnouncementModal';
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
  const homePageTitleRef = useRef<HTMLHeadingElement>(null);

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
          <CollaborationAnnouncementModal focusReturnRef={homePageTitleRef} />
          <div className={fr.cx('fr-container', 'fr-my-8w')}>
            <div className={styles.header}>
              <div>
                <h1 ref={homePageTitleRef} className={styles.title} tabIndex={-1}>
                  Tableau de bord des requêtes
                </h1>
                <p className={styles.greeting}>Bienvenue {label}</p>
              </div>
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
