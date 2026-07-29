import { Header } from '@codegouvfr/react-dsfr/Header';
import { FEATURE_FLAGS, ROLES, ROLES_STATISTICS, type Role } from '@sirena/common/constants';
import { Link, useLocation } from '@tanstack/react-router';
import { useId } from 'react';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useUserStore } from '@/stores/userStore';
import style from './header.module.css';
import { UserMenu } from './userMenu';

type HeaderMenuProps = {
  homeHref: string;
};

const DOCUMENTATION_LINK = 'https://docs.numerique.gouv.fr/docs/541c745d-7a82-4cbf-b792-c15f69ccf2c7/';
const FAQ_LINK = 'https://docs.numerique.gouv.fr/docs/558cb802-d140-4189-9d61-c2dfd7abca35/';

const STATISTICS_LINK_CLASS = 'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left';

export const HeaderMenu = (props: HeaderMenuProps) => {
  const id = useId();
  const userStore = useUserStore();
  const { pathname } = useLocation();
  const isStatisticsEnabled = useFeatureFlagStore((s) => s.flags[FEATURE_FLAGS.STATISTICS] ?? false);

  const isSuperAdmin = userStore.role === ROLES.SUPER_ADMIN;
  const canAccessStatistics = userStore.role != null && (ROLES_STATISTICS as readonly Role[]).includes(userStore.role);
  const showStatisticsLink = userStore.isLogged && isStatisticsEnabled && canAccessStatistics;
  const isOnStatistics = pathname === '/statistiques';

  // Lien retour : le super admin revient vers son espace ; les autres vers la liste des requêtes.
  const backTo = isSuperAdmin ? '/admin/users' : '/home';
  const backLabel = isSuperAdmin ? 'Espace administrateur' : 'Liste des requêtes';

  const statisticsLink = !showStatisticsLink ? null : isOnStatistics ? (
    <Link key="statistics" className={`${STATISTICS_LINK_CLASS} fr-icon-arrow-left-line`} to={backTo}>
      {backLabel}
    </Link>
  ) : (
    <Link key="statistics" className={`${STATISTICS_LINK_CLASS} fr-icon-line-chart-line`} to="/statistiques">
      Indicateurs
    </Link>
  );

  const quickAccessItems = [
    ...(statisticsLink ? [statisticsLink] : []),
    <a
      key={'faq'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
      href={FAQ_LINK}
      target="_blank"
      rel="noopener noreferrer"
    >
      Questions fréquentes
      <span className="fr-sr-only"> - nouvel onglet</span>
    </a>,
    <a
      key={'doc'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
      href={DOCUMENTATION_LINK}
      target="_blank"
      rel="noopener noreferrer"
    >
      Documentation
      <span className="fr-sr-only"> - nouvel onglet</span>
    </a>,

    ...(userStore.isLogged ? [<UserMenu key="menu" />] : []),
  ];
  return (
    <>
      <Header
        brandTop={
          <>
            Ministère
            <br />
            des Solidarités
            <br />
            et de la Santé
          </>
        }
        homeLinkProps={{
          href: props.homeHref,
          title: 'Accueil - SIRENA',
        }}
        serviceTagline=""
        serviceTitle="SIRENA"
        id={id}
        quickAccessItems={quickAccessItems}
      />
      <div className={style['header-separator']} />
    </>
  );
};
