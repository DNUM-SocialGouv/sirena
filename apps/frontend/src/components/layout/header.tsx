import { Header } from '@codegouvfr/react-dsfr/Header';

type HeaderMenuProps = {
  homeHref: string;
};

export const HeaderMenu = (props: HeaderMenuProps) => {
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
    />
  );
};
