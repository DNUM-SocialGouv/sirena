import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { APP_VERSION } from '@/config/version.constant';

export function AppFooter() {
  return (
    <Footer
      accessibility="non compliant"
      contentDescription={`version: ${APP_VERSION}`}
      termsLinkProps={{
        href: '#',
      }}
      websiteMapLinkProps={{
        href: '#',
      }}
    />
  );
}
