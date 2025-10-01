import type { Cause } from '@sirena/common/types';
import { router } from '@/lib/router';
import { toastManager } from '@/lib/toastManager';
import { useUserStore } from '@/stores/userStore';

export interface RequestErrorOptions {
  silentToastError?: boolean;
}

const getDataResposne = (data: unknown): data is { cause?: Cause; message: string } => {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;

  if (d.message === undefined || typeof d.message !== 'string') return false;
  if (d.cause !== undefined && !getCauseResponse(d.cause)) return false;

  return true;
};

const getCauseResponse = (cause: unknown): cause is Cause => {
  if (typeof cause !== 'object' || cause === null) return false;

  const d = cause as Record<string, unknown>;

  if (d.name !== undefined && typeof d.name !== 'string') return false;
  if (d.message !== undefined && typeof d.message !== 'string') return false;
  if (d.stack !== undefined && typeof d.stack !== 'string') return false;

  return true;
};

export class HttpError extends Error {
  status: number;
  rawData: unknown;
  data: Cause | undefined;

  constructor(message: string, status: number, data?: unknown) {
    let finalMessage = message;
    let d: Cause | undefined;
    if (getDataResposne(data)) {
      if (data.cause) {
        d = data.cause;
      }
      finalMessage = data.message;
    }
    super(finalMessage);
    this.name = 'HttpError';
    this.status = status;
    this.rawData = data;
    if (d) this.data = d;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const handleRequestErrors = async (res: Response, options: RequestErrorOptions = {}) => {
  const isAccountInactiveError = (res: Response): boolean => {
    return res.status === 403 && res.headers.get('X-Error-Code') === 'ACCOUNT_INACTIVE';
  };

  if (res.ok) return;

  if (res.status === 401) {
    const userStore = useUserStore.getState();
    userStore.logout();
    router.navigate({ to: '/login', search: { redirect: window.location.pathname } });
  }

  if (isAccountInactiveError(res)) {
    // For account inactive error, logout and redirect to login to get fresh JWT with new role as payload
    const userStore = useUserStore.getState();
    userStore.logout();
    router.navigate({ to: '/login', search: { redirect: window.location.pathname } });
    return;
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

  if (!options.silentToastError) {
    toastManager.add({
      title: 'Erreur',
      description: `Une erreur s'est produite : ${res.status} ${res.statusText}`,
      timeout: 0,
      data: { icon: 'fr-alert--error' },
    });
  }

  throw new HttpError(`HTTP ${res.status}`, res.status, data);
};
