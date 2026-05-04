import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { APP_ENVS, type AppEnv, appEnvLabels } from '@sirena/common/constants';
import { env } from '@/config/env';

export function EnvironmentBanner() {
  const appEnv = env.APP_ENV as AppEnv | undefined;

  if (!appEnv || appEnv === APP_ENVS.PRODUCTION) return null;

  const envLabel = appEnvLabels[appEnv] ?? appEnv;

  return (
    <Notice
      title={`Information : Vous êtes sur un environnement de test (${envLabel}).`}
      description="Ne saisissez pas de données réelles dans cet environnement."
      severity="info"
      isClosable={false}
    />
  );
}
