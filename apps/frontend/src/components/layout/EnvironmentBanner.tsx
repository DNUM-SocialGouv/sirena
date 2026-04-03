import { Notice } from '@codegouvfr/react-dsfr/Notice';

const NON_PRODUCTION_ENVIRONMENTS: Record<string, string> = {
  integration: 'intégration',
  validation: 'validation',
  formation: 'formation',
  preproduction: 'préproduction',
  test: 'test',
  local: 'local',
};

export function EnvironmentBanner() {
  const env = import.meta.env.VITE_SENTRY_ENVIRONMENT;

  if (!env || env === 'production') return null;

  const envLabel = NON_PRODUCTION_ENVIRONMENTS[env] ?? env;

  return (
    <Notice
      title={`Vous êtes sur l'environnement ${envLabel}. Ne saisissez pas de données réelles dans cet environnement.`}
      severity="info"
      isClosable={false}
      className="fr-mb-3w"
    />
  );
}
