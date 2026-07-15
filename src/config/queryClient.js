import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1, // Number of retry attempts on failure
      staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
    },
  },
});
