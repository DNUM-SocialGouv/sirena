import { useUserStore } from '@/stores/userStore';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, type LinkProps, RouterProvider, createRouter } from '@tanstack/react-router';
import { type JSX, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    // biome-ignore lint/style/noNonNullAssertion: store is provided in App()
    userStore: undefined!,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

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
  const userStore = useUserStore();
  return <RouterProvider router={router} context={{ userStore }} />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
