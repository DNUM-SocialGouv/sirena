import { HttpError } from '@/lib/api/tanstackQuery';
import { toastManager } from '@/lib/toastManager';

// The server message is technical and in English: the user gets a sentence keyed on the status instead.
const SAVE_HTTP_FAILURE_MESSAGES: Record<number, string> = {
  400: 'Les données saisies ne sont pas valides. Vérifiez le formulaire, puis réessayez.',
  403: "Vous n'êtes pas autorisé à modifier cette requête.",
  404: 'Cette requête est introuvable. Elle a peut-être été supprimée entre-temps.',
};

const SAVE_HTTP_FAILURE_FALLBACK =
  "Vos modifications n'ont pas pu être enregistrées. Réessayez dans quelques instants.";

export const notifySaveNetworkFailure = (): void => {
  toastManager.add({
    title: 'Erreur',
    description:
      "Vos modifications n'ont pas pu être enregistrées : la connexion au serveur a échoué. Vérifiez votre connexion, puis réessayez.",
    timeout: 0,
    data: { icon: 'fr-alert--error' },
  });
};

export const notifySaveHttpFailure = (error: HttpError): void => {
  toastManager.add({
    title: 'Erreur',
    description: SAVE_HTTP_FAILURE_MESSAGES[error.status] ?? SAVE_HTTP_FAILURE_FALLBACK,
    data: { icon: 'fr-alert--error' },
  });
};

export const notifySaveFailure = (error: unknown): void => {
  if (error instanceof HttpError) {
    notifySaveHttpFailure(error);
    return;
  }
  notifySaveNetworkFailure();
};

export const notifyConflictUnusable = (): void => {
  toastManager.add({
    title: 'Erreur : Conflit de données',
    description:
      'Les données ont été modifiées depuis votre dernière consultation. La page a été actualisée. Vérifiez vos modifications avant de réessayer.',
    data: { icon: 'fr-alert--error' },
  });
};

export const notifyConflictRefreshed = (): void => {
  toastManager.add({
    title: 'Erreur : Conflit de données',
    description: 'Les données ont été modifiées. La page a été actualisée.',
    data: { icon: 'fr-alert--warning' },
  });
};

export const notifyConflictPersistent = (): void => {
  toastManager.add({
    title: 'Erreur : Conflit de données',
    description:
      'Les données continuent d’être modifiées par ailleurs. La page a été actualisée. Vérifiez vos modifications avant de réessayer.',
    data: { icon: 'fr-alert--error' },
  });
};

export const notifyAutoMerge = (): void => {
  toastManager.add({
    title: 'Information : Fusion automatique',
    description: 'Les modifications ont été fusionnées automatiquement.',
    data: { icon: 'fr-alert--info' },
  });
};
