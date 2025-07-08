import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { Toast, ToastList } from '@sirena/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { Link, type LinkProps, RouterProvider } from '@tanstack/react-router';
import { type JSX, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';
import { toastManager } from '@/lib/toastManager';

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

createRoot(document.getElementById('root') as HTMLElement).render(
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
