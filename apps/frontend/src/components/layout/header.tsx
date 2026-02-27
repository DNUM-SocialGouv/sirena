import { Header } from '@codegouvfr/react-dsfr/Header';
import { useId } from 'react';
import { useUserStore } from '@/stores/userStore';
import style from './header.module.css';
import { UserMenu } from './userMenu';

type HeaderMenuProps = {
  homeHref: string;
};

export const HeaderMenu = (props: HeaderMenuProps) => {
  const id = useId();
  const userStore = useUserStore();

  const quickAccessItems = [
    <a
      key={'faq'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-arrow-right-line"
      href="https://docs.numerique.gouv.fr/docs/0221f89c-5118-42b2-8aa1-238e32231c8c/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <abbr title="Foire Aux Questions">FAQ</abbr>
      <span className="fr-sr-only"> - nouvel onglet</span>
    </a>,
    <a
      key={'doc'}
      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-arrow-right-line"
      href="https://docs.numerique.gouv.fr/docs/541c745d-7a82-4cbf-b792-c15f69ccf2c7/"
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
          title: 'Accueil - Sirena',
        }}
        serviceTagline=""
        serviceTitle="Sirena"
        id={id}
        quickAccessItems={quickAccessItems}
      />
      <div className={style['header-separator']} />
    </>
  );
};
