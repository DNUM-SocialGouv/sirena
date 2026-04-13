import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { APP_VERSION } from '@/config/version.constant';
import { useVersion } from '@/hooks/queries/version.hook';

export function AppFooter() {
  const { data } = useVersion();
  const footerId = 'footer';
  return (
    <Footer
      id={footerId}
      domains={[]}
      accessibility="non compliant"
      contentDescription={`frontend version: ${APP_VERSION} backend version: ${data?.version}`}
      accessibilityLinkProps={{ href: '/accessibilite' }}
      bottomItems={[
        {
          text: 'Mentions légales',
          linkProps: {
            href: '/mentions-legales',
          },
        },
        {
          text: 'Données personnelles',
          linkProps: {
            href: '/donnees-personnelles',
          },
        },
        {
          text: 'Gestion des cookies',
          linkProps: {
            href: '/gestion-cookies',
          },
        },
      ]}
      homeLinkProps={{
        href: '/',
        title: 'Retour à l’accueil du site - SIRENA - Ministère des Solidarités et de la Santé',
      }}
    />
  );
}
