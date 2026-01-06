import { Header } from '@codegouvfr/react-dsfr/Header';
import { useId } from 'react';
import { useUserStore } from '@/stores/userStore';
import style from './header.module.css';
import { UserMenu } from './userMenu';

type HeaderMenuProps = {
  homeHref: string;
};

export const HeaderMenu = (props: HeaderMenuProps) => {
  const userStore = useUserStore();
  const quickAccessItems = userStore.isLogged ? [<UserMenu key="menu" />] : [];
  const id = useId();
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
        id={id}
        quickAccessItems={quickAccessItems}
      />
      <div className={style['header-separator']} />
    </>
  );
};
