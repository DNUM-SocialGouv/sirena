import { useUserStore } from '@/stores/userStore';
import { Header } from '@codegouvfr/react-dsfr/Header';
import { UserMenu } from './userMenu';

type HeaderMenuProps = {
  homeHref: string;
};

export const HeaderMenu = (props: HeaderMenuProps) => {
  const userStore = useUserStore();

  const quickAccessItems = userStore.isLogged ? [<UserMenu key="menu" />] : [];

  return (
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
  );
};
