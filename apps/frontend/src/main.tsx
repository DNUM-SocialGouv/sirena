import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { Toast, ToastList } from '@sirena/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { Link, type LinkProps, RouterProvider } from '@tanstack/react-router';
import { type JSX, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';
import { toastManager } from '@/lib/toastManager';
import '@/lib/instrument';
import * as Sentry from '@sentry/react';
import '@/styles/main.css';

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

declare module '@codegouvfr/react-dsfr/spa' {
  interface RegisterLink {
    Link: (props: LinkProps) => JSX.Element;
  }
}

startReactDsfr({ defaultColorScheme: 'system', Link });

function App() {
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root') as HTMLElement, {
  // Callback called when an error is thrown and not caught by an ErrorBoundary.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),
  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toast.Provider limit={Infinity} toastManager={toastManager}>
        <App />
        <Toast.Portal container={document.body}>
          <Toast.Viewport className="toast-list__viewport">
            <ToastList />
          </Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
