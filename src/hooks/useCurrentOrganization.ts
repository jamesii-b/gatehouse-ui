import { useParams } from "react-router-dom";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOrg } from "@/contexts/OrgContext";

/**
 * Custom hook to get the current organization from URL params, or the
 * globally-selected org from OrgContext (set via the TopBar org switcher).
 */
export function useCurrentOrganization() {
  const params = useParams<{ orgId?: string }>();
  const { data: organizations = [], isLoading } = useOrganizations();
  const { selectedOrg } = useOrg();

  // If orgId is in the URL params, use that specific org.
  if (params.orgId) {
    return {
      org: organizations.find((org) => org.id === params.orgId) ?? organizations[0] ?? null,
      isLoading,
    };
  }

  // Otherwise use the org selected via the TopBar switcher (falls back to
  // organizations[0] when OrgContext hasn't initialised yet).
  return { org: selectedOrg ?? organizations[0] ?? null, isLoading };
}

/**
 * Get the organization ID from URL params or the globally-selected org.
 * Also returns isLoading so callers can distinguish "no org" from "still loading".
 */
export function useCurrentOrganizationId(): { orgId: string | null; isLoading: boolean } {
  const { org, isLoading } = useCurrentOrganization();
  return { orgId: org?.id || null, isLoading };
}
