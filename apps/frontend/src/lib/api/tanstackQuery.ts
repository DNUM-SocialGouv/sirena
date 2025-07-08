import { router } from '@/lib/router';
import { toastManager } from '@/lib/toastManager';
import { useUserStore } from '@/stores/userStore';

export const handleRequestErrors = async (res: Response) => {
  if (res.ok) return;

  if (res.status === 401) {
    const userStore = useUserStore.getState();
    userStore.logout();
    router.navigate({ to: '/login', search: { redirect: window.location.pathname } });
  }

  let data: unknown;
  try {
    data = await res.clone().json();
  } catch {
    try {
      data = await res.clone().text();
    } catch {
      data = null;
    }
  }

  const error = new Error(`HTTP ${res.status}`) as Error & {
    status: number;
    data: unknown;
  };

  error.status = res.status;
  error.data = data;

  toastManager.add({
    title: 'Erreur',
    description: `Une erreur s'est produite : ${res.status} ${res.statusText}`,
    timeout: 5000,
    data: { icon: 'fr-alert--error' },
  });

  throw error;
};
