import { useParams } from "react-router-dom";
import { useOrganizations } from "@/hooks/useOrganizations";

/**
 * Custom hook to get the current organization from URL params or first available org.
 * This helps with backward compatibility if routes don't include orgId.
 */
export function useCurrentOrganization() {
  const params = useParams<{ orgId?: string }>();
  const { data: organizations = [], isLoading } = useOrganizations();

  // If orgId is in params, use that
  if (params.orgId) {
    return {
      org: organizations.find((org) => org.id === params.orgId) || organizations[0] || null,
      isLoading,
    };
  }

  // Otherwise, return the first organization (default)
  return { org: organizations[0] || null, isLoading };
}

/**
 * Get the organization ID from URL params or first available org.
 * Also returns isLoading so callers can distinguish "no org" from "still loading".
 */
export function useCurrentOrganizationId(): { orgId: string | null; isLoading: boolean } {
  const { org, isLoading } = useCurrentOrganization();
  return { orgId: org?.id || null, isLoading };
}
