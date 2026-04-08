import { Header } from '@codegouvfr/react-dsfr/Header';
import { useId } from 'react';
import { useUserStore } from '@/stores/userStore';
import style from './header.module.css';
import { UserMenu } from './userMenu';

type HeaderMenuProps = {
  homeHref: string;
};

const DOCUMENTATION_LINK = 'https://docs.numerique.gouv.fr/docs/541c745d-7a82-4cbf-b792-c15f69ccf2c7/';
const FAQ_LINK = 'https://docs.numerique.gouv.fr/docs/558cb802-d140-4189-9d61-c2dfd7abca35/';

export const HeaderMenu = (props: HeaderMenuProps) => {
  const id = useId();
  const userStore = useUserStore();

  const quickAccessItems = [
    <a
      key={'faq'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-arrow-right-line"
      href={FAQ_LINK}
      target="_blank"
      rel="noopener noreferrer"
    >
      <abbr title="Foire Aux Questions">FAQ</abbr>
      <span className="fr-sr-only"> - nouvel onglet</span>
    </a>,
    <a
      key={'doc'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-arrow-right-line"
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
