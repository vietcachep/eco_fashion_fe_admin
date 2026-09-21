import { QueryClient } from "@tanstack/react-query";
import { apiStatus } from "@/lib/api-error";

/*
 * TanStack Query configuration (docs/03_API_STATE_RULES.md).
 * staleTime 30s by default; screens needing fresher data override per-query.
 * Retry once — ERP screens prefer showing a clear error over hammering the API.
 *
 * Never retry authorization failures (401/403): a missing permission is not a
 * transient fault like a dropped connection — the same call is refused again.
 * Retrying only makes the user wait an extra round-trip before the 403 screen
 * appears, and doubles pointless load on the backend (Rule 1). Fail fast.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status = apiStatus(error);
          if (status === 401 || status === 403) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
