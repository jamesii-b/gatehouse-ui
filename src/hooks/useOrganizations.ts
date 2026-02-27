import { useQuery } from "@tanstack/react-query";
import { api, Organization, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Custom hook for fetching user organizations using React Query.
 * Provides automatic caching and deduplication of API calls.
 * 
 * @returns Query result with organizations data, loading state, and error
 */
export function useOrganizations() {
  const { isAuthenticated } = useAuth();

  return useQuery<Organization[], ApiError>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await api.users.organizations();
      return Array.isArray(response.organizations) ? response.organizations : [];
    },
    // Only fetch when user is authenticated
    enabled: isAuthenticated,
    // Cache data for 5 minutes (300,000ms) before considering it stale
    staleTime: 5 * 60 * 1000,
    // Keep cached data in memory for 10 minutes (600,000ms)
    gcTime: 10 * 60 * 1000,
    // Don't retry on 403 errors (handled by QueryClient default config)
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.code === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
