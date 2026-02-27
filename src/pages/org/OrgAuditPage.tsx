import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Download, User, Settings, Key, UserPlus, AlertTriangle, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, AuditLogEntry } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";

const getEventIcon = (action: string) => {
  if (action.includes("member") || action.includes("MEMBER")) {
    return <UserPlus className="w-4 h-4" />;
  }
  if (action.includes("policy") || action.includes("POLICY") || action.includes("mfa")) {
    return <Settings className="w-4 h-4" />;
  }
  if (action.includes("delete") || action.includes("DELETE") || action.includes("disable")) {
    return <AlertTriangle className="w-4 h-4" />;
  }
  if (action.includes("client") || action.includes("oidc") || action.includes("key")) {
    return <Key className="w-4 h-4" />;
  }
  return <User className="w-4 h-4" />;
};

const getEventTitle = (action: string) => {
  const parts = action.split(".");
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
};

const getActionCategory = (action: string): string => {
  if (action.includes("member") || action.includes("MEMBER")) return "members";
  if (action.includes("policy") || action.includes("POLICY") || action.includes("mfa")) return "policies";
  if (action.includes("client") || action.includes("OIDC")) return "clients";
  return "other";
};

export default function OrgAuditPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (currentOrgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.organizations.getAuditLogs(currentOrgId);
      setAuditLogs(response.audit_logs || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setError(null);
    setAuditLogs([]);
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    fetchAuditLogs(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.email.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      typeFilter === "all" ||
      getActionCategory(log.action) === typeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-description">
            View all administrative actions and changes
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="members">Member changes</SelectItem>
            <SelectItem value="policies">Policy changes</SelectItem>
            <SelectItem value="clients">OIDC clients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No audit events found
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      !log.success
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {getEventIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {getEventTitle(log.action)}
                      </p>
                      {log.resource_type && (
                        <Badge variant="secondary" className="text-xs">
                          {log.resource_type}
                        </Badge>
                      )}
                      {!log.success && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span>by {log.user?.full_name || log.user?.email || "System"}</span>
                      {log.description && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{log.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
