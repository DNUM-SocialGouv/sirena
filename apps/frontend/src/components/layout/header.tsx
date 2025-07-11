import { Header } from '@codegouvfr/react-dsfr/Header';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useUserStore } from '@/stores/userStore';
import { UserMenu } from './userMenu';
import { ROLES } from '@sirena/common/constants';

type HeaderMenuProps = {
  homeHref: string;
};

export const HeaderMenu = (props: HeaderMenuProps) => {
  const userStore = useUserStore();

  const quickAccessItems = userStore.isLogged ? [<UserMenu key="menu" />] : [];

  return (
    <>
    <Header
      brandTop={
        <>
          Ministère
          <br />
          du Travail, de la Santé,
          <br />
          des Solidarités
          <br />
          et des Familles
        </>
      }
      homeLinkProps={{
        href: props.homeHref,
        title: 'Accueil - Sirena',
      }}
      serviceTagline="précisions sur l'organisation"
      serviceTitle="Sirena"
      id="fr-header-header"
      quickAccessItems={quickAccessItems}
    />
    {userStore.isLogged && userStore.role === ROLES.SUPER_ADMIN && (
      <Button type="button" onClick={() => { throw new Error('test sentry')} }>Test gestion d'érreur</Button>
    )}
    </>
  );
};
