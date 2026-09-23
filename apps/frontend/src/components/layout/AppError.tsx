import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import type { ErrorComponentProps } from '@tanstack/react-router';

const DEFAULT_TITLE = 'Une erreur est survenue';
const DEFAULT_DESCRIPTION =
  'Le contenu n’a pas pu s’afficher. Vous pouvez réessayer ; si le problème persiste, contactez le support.';

type AppErrorProps = ErrorComponentProps & {
  title?: string;
  description?: string;
};

const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : null;
};

export const AppError = ({ error, reset, title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION }: AppErrorProps) => {
  const debugMessage = import.meta.env.DEV ? getErrorMessage(error) : null;

  return (
    <section className={fr.cx('fr-my-6w')}>
      <h1 className={fr.cx('fr-h3')}>{title}</h1>
      <Alert severity="error" small description={description} className={fr.cx('fr-mb-4w')} />
      {debugMessage ? <pre className={fr.cx('fr-mb-4w', 'fr-text--sm')}>{debugMessage}</pre> : null}
      <Button priority="primary" onClick={reset}>
        Réessayer
      </Button>
    </section>
  );
};
