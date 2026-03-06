import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  LogIn, Key, UserPlus, Shield, Settings,
  AlertTriangle, Terminal, Loader2,
  CheckCircle2, XCircle, Link2, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, AuditLogEntry } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { formatDateTime } from "@/lib/date";

// ─── category / display helpers ──────────────────────────────────────────────

type Category = "auth" | "ssh" | "admin" | "member" | "policy" | "security" | "oauth" | "other";

const getCategory = (action: string): Category => {
  const a = action.toLowerCase();
  if (a.startsWith("session") || a === "user.login" || a === "user.logout") return "auth";
  if (a.startsWith("ssh"))                                                   return "ssh";
  if (a.startsWith("admin."))                                                return "admin";
  if (a.includes("member") || a.includes("invite") || a.startsWith("org.member")) return "member";
  if (a.includes("policy") || a.includes("mfa.policy") || a.startsWith("org.security")) return "policy";
  if (a.includes("mfa") || a.includes("totp") || a.includes("webauthn") || a.includes("passkey") || a.includes("password")) return "security";
  if (a.startsWith("external_auth"))                                         return "oauth";
  return "other";
};

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  auth:     { label: "Auth",     color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ssh:      { label: "SSH",      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  admin:    { label: "Admin",    color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  member:   { label: "Member",   color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  policy:   { label: "Policy",   color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  security: { label: "Security", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  oauth:    { label: "OAuth",    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  other:    { label: "Other",    color: "bg-muted text-muted-foreground" },
};

const getCategoryIcon = (cat: Category) => {
  const cls = "w-4 h-4";
  switch (cat) {
    case "auth":     return <LogIn className={cls} />;
    case "ssh":      return <Terminal className={cls} />;
    case "admin":    return <UserCog className={cls} />;
    case "member":   return <UserPlus className={cls} />;
    case "policy":   return <Settings className={cls} />;
    case "security": return <Shield className={cls} />;
    case "oauth":    return <Link2 className={cls} />;
    default:         return <Key className={cls} />;
  }
};

const ACTION_LABELS: Record<string, string> = {
  // Sessions
  "session.create":  "Signed in",
  "session.revoke":  "Signed out",
  "user.login":      "Signed in",
  "user.logout":     "Signed out",
  // Members
  "org.member.add":         "Member added",
  "org.member.remove":      "Member removed",
  "org.member.role_change": "Member role changed",
  "org.ownership.transferred": "Ownership transferred",
  // Admin actions
  "admin.mfa.remove":    "MFA removed by admin",
  "admin.oauth.unlink":  "OAuth unlinked by admin",
  "admin.password.set":  "Password set by admin",
  "admin.email.verify":  "Email verified by admin",
  // Security / policy
  "org.security_policy.update":          "Security policy updated",
  "user.security_policy.override_update":"User policy override updated",
  "mfa.policy.user_suspended":            "User suspended (MFA policy)",
  "mfa.policy.user_compliant":            "User MFA compliant",
  // Password
  "user.password_change": "Password changed",
  "user.password_reset":  "Password reset",
  // SSH
  "ssh.key.added":             "SSH key added",
  "ssh.key.verified":          "SSH key verified",
  "ssh.key.deleted":           "SSH key removed",
  "ssh.cert.requested":        "SSH certificate requested",
  "ssh.cert.issued":           "SSH certificate issued",
  "ssh.cert.failed":           "SSH certificate request failed",
  "ssh.cert.revoked":          "SSH certificate revoked",
  // WebAuthn / Passkey
  "webauthn.register.completed": "Passkey registered",
  "webauthn.credential.deleted": "Passkey removed",
  "webauthn.login.success":      "Signed in with passkey",
  "webauthn.login.failed":       "Passkey login failed",
  // TOTP
  "totp.enroll.completed":  "TOTP enrolled",
  "totp.disabled":          "TOTP disabled",
  "totp.verify.failed":     "TOTP verification failed",
  // External auth
  "external_auth.link.completed": "OAuth account linked",
  "external_auth.unlink":         "OAuth account unlinked",
  "external_auth.login":          "Signed in via OAuth",
  "external_auth.login.failed":   "OAuth login failed",
  // Org
  "org.create": "Organisation created",
  "org.update": "Organisation updated",
  "org.delete": "Organisation deleted",
  // User lifecycle
  "user.register": "User registered",
  "user.suspend":  "User suspended",
  "user.unsuspend":"User unsuspended",
  "user.delete":   "User deleted",
};

const getActionLabel = (action: string) =>
  ACTION_LABELS[action] ??
  action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─── action filter options (value = enum dot-notation) ───────────────────────

const ACTION_FILTER_OPTIONS = [
  { value: "all",                           label: "All actions" },
  // Auth
  { value: "session.create",                label: "Sign in" },
  { value: "session.revoke",                label: "Sign out" },
  { value: "external_auth.login",           label: "OAuth login" },
  // Members
  { value: "org.member.add",                label: "Member added" },
  { value: "org.member.remove",             label: "Member removed" },
  { value: "org.member.role_change",        label: "Role changed" },
  // Admin actions
  { value: "admin.mfa.remove",              label: "MFA removed (admin)" },
  { value: "admin.oauth.unlink",            label: "OAuth unlinked (admin)" },
  { value: "admin.password.set",            label: "Password set (admin)" },
  // Security / policy
  { value: "org.security_policy.update",    label: "Security policy changed" },
  { value: "user.password_change",          label: "Password changed" },
  { value: "user.password_reset",           label: "Password reset" },
  // SSH
  { value: "ssh.key.added",                 label: "SSH key added" },
  { value: "ssh.key.verified",              label: "SSH key verified" },
  { value: "ssh.cert.issued",               label: "SSH cert issued" },
  { value: "ssh.cert.revoked",              label: "SSH cert revoked" },
  // MFA
  { value: "totp.enroll.completed",         label: "TOTP enrolled" },
  { value: "totp.disabled",                 label: "TOTP disabled" },
  { value: "webauthn.register.completed",   label: "Passkey registered" },
  { value: "webauthn.credential.deleted",   label: "Passkey removed" },
  // User lifecycle
  { value: "user.register",                 label: "User registered" },
  { value: "user.suspend",                  label: "User suspended" },
];

const PER_PAGE = 50;

// ─── cert metadata detail ─────────────────────────────────────────────────────

function CertDetail({ metadata }: { metadata?: Record<string, unknown> | null }) {
  if (!metadata) return null;
  const principal = metadata.principal as string | undefined;
  const principals = metadata.principals as string[] | undefined;
  const serial = metadata.serial_number ?? metadata.serial ?? metadata.cert_serial;
  const principalList = principal ? [principal] : Array.isArray(principals) ? principals : [];
  if (!principalList.length && !serial) return null;
  return (
    <span className="text-xs text-muted-foreground ml-2">
      {principalList.length > 0 && <>principal: <span className="font-mono">{principalList.join(", ")}</span></>}
      {principalList.length > 0 && serial && " · "}
      {serial != null && <>serial: <span className="font-mono">{String(serial)}</span></>}
    </span>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function OrgAuditPage() {
  const { orgId } = useCurrentOrganizationId();

  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter]       = useState("all");
  const [successFilter, setSuccessFilter]     = useState("all");
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalCount, setTotalCount]           = useState(0);
  const [auditLogs, setAuditLogs]             = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [actionFilter, successFilter, debouncedSearch]);

  const fetchLogs = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(PER_PAGE),
      };
      if (actionFilter !== "all")  params.action  = actionFilter;
      if (successFilter !== "all") params.success = successFilter;
      if (debouncedSearch)         params.q        = debouncedSearch;

      const resp = await api.organizations.getAuditLogs(orgId, params);
      setAuditLogs(resp.audit_logs ?? []);
      setTotalCount(resp.count ?? 0);
      setTotalPages(resp.pages ?? 1);
    } catch (err) {
      console.error("Failed to fetch org audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, page, actionFilter, successFilter, debouncedSearch]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Org Audit Log</h1>
          <p className="page-description">
            All organisation activity — user events, admin actions, policy changes
            {totalCount > 0 && ` · ${totalCount.toLocaleString()} total`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
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
          <SelectTrigger className="w-[210px]">
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
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No audit events match the current filters.
            </div>
          ) : (
            <div className="divide-y">
              {auditLogs.map((log) => {
                const cat = getCategory(log.action);
                const meta = CATEGORY_META[cat];
                const isCert = log.action.startsWith("ssh.cert");
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
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">Failed</Badge>
                        )}
                      </div>

                      {/* Description */}
                      {log.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {log.description}
                          {isCert && <CertDetail metadata={log.metadata} />}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="mt-0.5 text-xs text-destructive">{log.error_message}</p>
                      )}

                      {/* Actor / meta row */}
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
                        {log.resource_type && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                            {log.resource_type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.created_at)}
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
              variant="outline" size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}