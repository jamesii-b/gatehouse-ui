import { useEffect, useState } from "react";
import { Layers, GitBranch, Building2, Loader2, Link } from "lucide-react";
import { api, MyOrgMembership } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function MembershipsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyMembershipsPage() {
  const [orgs, setOrgs] = useState<MyOrgMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.users.getMyMemberships()
      .then((res) => setOrgs(res.orgs ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalDepts = orgs.reduce((s, o) => s + o.departments.length, 0);
  const totalPrincipals = orgs.reduce((s, o) => s + o.principals.length, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Memberships</h1>
        <p className="page-description">
          Departments and principals you belong to across your organizations
        </p>
      </div>

      {isLoading ? (
        <MembershipsSkeleton />
      ) : orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <Building2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">You're not a member of any organizations yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{totalDepts}</span>
              <span className="text-muted-foreground">department{totalDepts !== 1 ? "s" : ""}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{totalPrincipals}</span>
              <span className="text-muted-foreground">principal{totalPrincipals !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {orgs.map((org) => (
            <div
              key={org.org_id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Org header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-semibold text-foreground text-sm">{org.org_name}</span>
                <Badge variant="outline" className="capitalize text-xs ml-auto">
                  {org.role.toLowerCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Departments */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Layers className="w-3.5 h-3.5" />
                    Departments
                  </div>
                  {org.departments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Not assigned to any departments.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {org.departments.map((dept) => (
                        <li
                          key={dept.id}
                          className="flex items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
                        >
                          <Layers className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{dept.name}</p>
                            {dept.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{dept.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Principals */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <GitBranch className="w-3.5 h-3.5" />
                    Principals
                  </div>
                  {org.principals.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No principals assigned.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {org.principals.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
                        >
                          <GitBranch className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                            )}
                          </div>
                          {p.via_department && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                              <Link className="w-2.5 h-2.5" />
                              via dept
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
