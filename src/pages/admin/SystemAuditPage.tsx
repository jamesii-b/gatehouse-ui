import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Key,
  UserPlus,
  Shield,
  Settings,
  AlertTriangle,
  Fingerprint,
  Smartphone,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, AuditLogEntry } from "@/lib/api";

// ─── category helpers ────────────────────────────────────────────────────────

type Category = "auth" | "ssh" | "org" | "user" | "security" | "token" | "other";

const getCategory = (action: string): Category => {
  const a = action.toLowerCase();
  if (a.startsWith("session") || a.includes("login") || a.includes("logout") || a.includes("external_auth"))
    return "auth";
  if (a.startsWith("ssh"))
    return "ssh";
  if (a.startsWith("org") || a.includes("member") || a.includes("department") || a.includes("invite"))
    return "org";
  if (a.startsWith("user"))
    return "user";
  if (a.includes("mfa") || a.includes("totp") || a.includes("webauthn") || a.includes("passkey") || a.includes("password"))
    return "security";
  if (a.includes("token") || a.includes("oidc") || a.includes("client"))
    return "token";
  return "other";
};

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  auth:     { label: "Auth",     color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ssh:      { label: "SSH",      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  org:      { label: "Org",      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  user:     { label: "User",     color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  security: { label: "Security", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  token:    { label: "Token",    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  other:    { label: "Other",    color: "bg-muted text-muted-foreground" },
};

const getCategoryIcon = (category: Category) => {
  const cls = "w-4 h-4";
  switch (category) {
    case "auth":     return <LogIn className={cls} />;
    case "ssh":      return <Terminal className={cls} />;
    case "org":      return <Settings className={cls} />;
    case "user":     return <UserPlus className={cls} />;
    case "security": return <Shield className={cls} />;
    case "token":    return <Key className={cls} />;
    default:         return <Globe className={cls} />;
  }
};

const getActionLabel = (action: string) =>
  action
    .replace(/_/g, " ")
    .replace(/\./g, " › ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ─── component ───────────────────────────────────────────────────────────────

const ACTION_FILTER_OPTIONS = [
  { value: "all",                         label: "All actions" },
  { value: "SESSION_CREATE",              label: "Login" },
  { value: "SESSION_REVOKE",              label: "Logout" },
  { value: "EXTERNAL_AUTH_LOGIN",         label: "OAuth Login" },
  { value: "EXTERNAL_AUTH_LOGIN_FAILED",  label: "OAuth Failed" },
  { value: "USER_REGISTER",              label: "Register" },
  { value: "SSH_KEY_ADDED",              label: "SSH Key Added" },
  { value: "SSH_KEY_VERIFIED",           label: "SSH Key Verified" },
  { value: "SSH_CERT_ISSUED",            label: "SSH Cert Issued" },
  { value: "SSH_CERT_REVOKED",           label: "SSH Cert Revoked" },
  { value: "SSH_CERT_FAILED",            label: "SSH Cert Failed" },
  { value: "ORG_CREATE",                 label: "Org Created" },
  { value: "ORG_MEMBER_ADD",             label: "Member Added" },
  { value: "ORG_MEMBER_ROLE_CHANGE",     label: "Role Changed" },
];

export default function SystemAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [successFilter, setSuccessFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PER_PAGE = 50;

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(PER_PAGE),
      };
      if (actionFilter !== "all") params.action = actionFilter;
      if (successFilter !== "all") params.success = successFilter;
      if (debouncedSearch) params.q = debouncedSearch;

      const resp = await api.admin.getAuditLogs(params);
      setLogs(resp.audit_logs ?? []);
      setTotalCount(resp.count ?? 0);
      setTotalPages(resp.pages ?? 1);
      setIsAdminView(resp.is_admin_view ?? false);
    } catch (err) {
      console.error("Failed to fetch system audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, successFilter, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, successFilter, debouncedSearch]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  };

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return null;
    const m = ua.match(/\(([^)]+)\)/);
    if (m) return m[1].split(";")[0].trim();
    return ua.slice(0, 40);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">System Audit Log</h1>
          <p className="page-description">
            {isAdminView
              ? `All system events — ${totalCount.toLocaleString()} total`
              : "Your account events"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={successFilter} onValueChange={setSuccessFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Success only</SelectItem>
            <SelectItem value="false">Failures only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading…</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No audit events match the current filters.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const cat = getCategory(log.action);
                const meta = CATEGORY_META[cat];
                return (
                  <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        log.success ? meta.color : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {log.success ? getCategoryIcon(cat) : <XCircle className="w-4 h-4" />}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {getActionLabel(log.action)}
                        </span>
                        <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                        {!log.success && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            Failed
                          </Badge>
                        )}
                        {log.resource_type && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                            {log.resource_type}
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      {log.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{log.description}</p>
                      )}
                      {log.error_message && (
                        <p className="mt-0.5 text-xs text-destructive">{log.error_message}</p>
                      )}

                      {/* Meta row */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {log.user?.email ? (
                          <span className="font-medium text-foreground/70">{log.user.email}</span>
                        ) : log.user_id ? (
                          <span className="font-mono">{log.user_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="italic">System</span>
                        )}
                        {log.ip_address && (
                          <span className="font-mono">{log.ip_address}</span>
                        )}
                        {log.user_agent && (
                          <span className="truncate max-w-[220px]" title={log.user_agent}>
                            {formatUserAgent(log.user_agent)}
                          </span>
                        )}
                        {log.resource_id && (
                          <span className="font-mono">{log.resource_id.slice(0, 8)}…</span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </p>
                      {log.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount.toLocaleString()} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
