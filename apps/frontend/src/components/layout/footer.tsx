import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { APP_VERSION } from '@/config/version.constant';
import { useVersion } from '@/hooks/queries/version.hook';

export function AppFooter() {
  const { data } = useVersion();
  const footerId = 'footer';
  return (
    <Footer
      id={footerId}
      accessibility="non compliant"
      contentDescription={`frontend version: ${APP_VERSION} backend version: ${data?.version}`}
      termsLinkProps={{
        href: '#',
      }}
      websiteMapLinkProps={{
        href: '#',
      }}
      homeLinkProps={{
        href: '/',
        title:
          'Retour à l’accueil du site - Sirena - Ministère du Tavail, de la Santé, des Solidarités et des Familles',
      }}
    />
  );
}
