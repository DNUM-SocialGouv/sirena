import { QueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      onError: (error) => {
        console.error(error);
      },
    },
  },
});

// Devtools
window.__TANSTACK_QUERY_CLIENT__ = queryClient;
