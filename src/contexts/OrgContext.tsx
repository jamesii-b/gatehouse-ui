import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Organization } from "@/lib/api";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";

interface OrgContextType {
  /** The currently selected organisation (null while loading or no memberships). */
  selectedOrg: Organization | null;
  /** Programmatically switch the active organisation and invalidate all org-scoped queries. */
  selectOrg: (org: Organization) => void;
  /** Convenience accessor for the selected org's ID. */
  selectedOrgId: string | null;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: organizations = [] } = useOrganizations();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Auto-select the first org once the list arrives (or when the list changes
  // and the previously selected org is no longer present, e.g. after deletion).
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedOrg(null);
      return;
    }
    if (organizations.length === 0) return;

    setSelectedOrg((prev) => {
      // Keep the current selection if it still exists in the updated list.
      if (prev && organizations.some((o) => o.id === prev.id)) {
        // Refresh the object in case name/role changed.
        return organizations.find((o) => o.id === prev.id) ?? prev;
      }
      return organizations[0];
    });
  }, [organizations, isAuthenticated]);

  const selectOrg = useCallback(
    (org: Organization) => {
      setSelectedOrg(org);
      // Invalidate all organisation-scoped React Query caches so every page
      // immediately re-fetches data for the newly selected org.
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      // Invalidate any queries keyed by the previous org id.  The broadest
      // approach is to remove all non-organisations queries so pages reload.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  return (
    <OrgContext.Provider
      value={{ selectedOrg, selectOrg, selectedOrgId: selectedOrg?.id ?? null }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextType {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside <OrgProvider>");
  return ctx;
}
