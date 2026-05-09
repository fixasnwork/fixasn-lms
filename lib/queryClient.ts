import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new QueryClient for server-side prefetching.
 * Use this in Server Components to prefetch data and pass
 * the dehydrated state to a client-side HydrationBoundary.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
