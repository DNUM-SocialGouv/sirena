import { toastManager } from '@/lib/toastManager';

export const notifySaveNetworkFailure = (): void => {
  toastManager.add({
    title: 'Erreur',
    description:
      "Vos modifications n'ont pas pu être enregistrées : la connexion au serveur a échoué. Vérifiez votre connexion, puis réessayez.",
    timeout: 0,
    data: { icon: 'fr-alert--error' },
  });
};
