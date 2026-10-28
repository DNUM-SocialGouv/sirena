import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { APP_VERSION } from '@/config/version.constant';
import { useVersion } from '@/hooks/queries/version.hook';
import { useHasFeature } from '@/hooks/useHasFeature';

export function AppFooter() {
  const { data } = useVersion();
  const showCguLink = useHasFeature(FEATURE_FLAGS.CGU_ACCEPTANCE, false);
  const footerId = 'footer';
  return (
    <Footer
      id={footerId}
      domains={[]}
      accessibility="partially compliant"
      contentDescription={`frontend version: ${APP_VERSION} backend version: ${data?.version}`}
      accessibilityLinkProps={{ to: '/accessibilite' }}
      bottomItems={[
        {
          text: 'Mentions légales',
          linkProps: {
            to: '/mentions-legales',
          },
        },
        {
          text: 'Données personnelles',
          linkProps: {
            to: '/donnees-personnelles',
          },
        },
        ...(showCguLink
          ? [
              {
                text: 'Conditions générales d’utilisation',
                linkProps: {
                  to: '/conditions-generales-utilisation' as const,
                },
              },
            ]
          : []),
        {
          text: 'Gestion des cookies',
          linkProps: {
            to: '/gestion-cookies',
          },
        },
      ]}
      homeLinkProps={{
        to: '/',
        title: 'Retour à l’accueil du site - SIRENA - Ministère des Solidarités et de la Santé',
      }}
    />
  );
}
