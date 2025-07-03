import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { APP_VERSION, GIT_COMMIT } from '@/config/version.constant';

export function AppFooter() {
  return (
    <Footer
      accessibility="non compliant"
      contentDescription={`version: ${APP_VERSION}@${GIT_COMMIT}`}
      termsLinkProps={{
        href: '#',
      }}
      websiteMapLinkProps={{
        href: '#',
      }}
    />
  );
}
