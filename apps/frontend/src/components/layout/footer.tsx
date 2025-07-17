import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { APP_VERSION } from '@/config/version.constant';
import { useVersion } from '@/hooks/queries/version.hook';

export function AppFooter() {
  const { data } = useVersion();
  return (
    <Footer
      accessibility="non compliant"
      contentDescription={`frontend version: ${APP_VERSION} backend version: ${data?.version}`}
      termsLinkProps={{
        href: '#',
      }}
      websiteMapLinkProps={{
        href: '#',
      }}
    />
  );
}
