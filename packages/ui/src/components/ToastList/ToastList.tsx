import { Toast } from '@base-ui/react';
import { memo } from 'react';
import './ToastList.css';

export type ToastData = {
  icon: string;
};

function isCustomToast(toast: Toast.Root.ToastObject): toast is Toast.Root.ToastObject<ToastData> {
  return toast.data?.icon !== undefined;
}

function ToastListComponent() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="up"
      className={`toast fr-alert ${isCustomToast(toast) && toast.data && toast.data.icon}`}
    >
      <Toast.Title className="fr-alert__title" />
      <Toast.Description />
      <Toast.Close className="fr-link--close fr-link" aria-label="Close"></Toast.Close>
    </Toast.Root>
  ));
}

export const ToastList = memo(ToastListComponent);
export { Toast } from '@base-ui/react';
