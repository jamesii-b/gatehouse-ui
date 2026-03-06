import { useState, useEffect, useCallback } from "react";
import {
  LogIn, LogOut, Key, Fingerprint, Smartphone, AlertTriangle,
  Loader2, RefreshCw, Link2, Terminal, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, AuditLogEntry } from "@/lib/api";
import { formatDateTime } from "@/lib/date";

// ─── event display mapping ────────────────────────────────────────────────────

interface EventDisplay {
  icon: React.ReactNode;
  title: string;
}

const getEventDisplay = (action: string): EventDisplay => {
  const a = action.toLowerCase();

  // Sessions
  if (a === "session.create")  return { icon: <LogIn className="w-4 h-4" />,    title: "Signed in" };
  if (a === "session.revoke")  return { icon: <LogOut className="w-4 h-4" />,   title: "Signed out" };
  if (a === "user.login")      return { icon: <LogIn className="w-4 h-4" />,    title: "Signed in" };
  if (a === "user.logout")     return { icon: <LogOut className="w-4 h-4" />,   title: "Signed out" };

  // OAuth / external auth
  if (a === "external_auth.link.completed")  return { icon: <Link2 className="w-4 h-4" />, title: "OAuth account linked" };
  if (a === "external_auth.link.initiated")  return { icon: <Link2 className="w-4 h-4" />, title: "OAuth link started" };
  if (a === "external_auth.link.failed")     return { icon: <Link2 className="w-4 h-4" />, title: "OAuth link failed" };
  if (a === "external_auth.unlink")          return { icon: <Link2 className="w-4 h-4" />, title: "OAuth account unlinked" };
  if (a === "external_auth.login")           return { icon: <LogIn className="w-4 h-4" />,  title: "Signed in via OAuth" };
  if (a === "external_auth.login.failed")    return { icon: <LogIn className="w-4 h-4" />,  title: "OAuth login failed" };

  // SSH keys
  if (a === "ssh.key.added")            return { icon: <Key className="w-4 h-4" />,      title: "SSH key added" };
  if (a === "ssh.key.verified")         return { icon: <Key className="w-4 h-4" />,      title: "SSH key verified" };
  if (a === "ssh.key.deleted")          return { icon: <Key className="w-4 h-4" />,      title: "SSH key removed" };
  if (a === "ssh.key.validation.failed")return { icon: <Key className="w-4 h-4" />,      title: "SSH key validation failed" };
  if (a === "ssh.cert.requested")       return { icon: <Terminal className="w-4 h-4" />, title: "SSH certificate requested" };
  if (a === "ssh.cert.issued")          return { icon: <Terminal className="w-4 h-4" />, title: "SSH certificate issued" };
  if (a === "ssh.cert.failed")          return { icon: <Terminal className="w-4 h-4" />, title: "SSH certificate request failed" };
  if (a === "ssh.cert.revoked")         return { icon: <Terminal className="w-4 h-4" />, title: "SSH certificate revoked" };

  // WebAuthn / Passkey
  if (a === "webauthn.register.completed") return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey registered" };
  if (a === "webauthn.register.initiated") return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey registration started" };
  if (a === "webauthn.register.failed")    return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey registration failed" };
  if (a === "webauthn.login.success")      return { icon: <Fingerprint className="w-4 h-4" />, title: "Signed in with passkey" };
  if (a === "webauthn.login.failed")       return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey login failed" };
  if (a === "webauthn.credential.deleted") return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey removed" };
  if (a === "webauthn.credential.renamed") return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey renamed" };

  // TOTP / MFA
  if (a === "totp.enroll.completed")        return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP authenticator enrolled" };
  if (a === "totp.enroll.initiated")        return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP enrolment started" };
  if (a === "totp.verify.success")          return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP code verified" };
  if (a === "totp.verify.failed")           return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP verification failed" };
  if (a === "totp.disabled")                return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP disabled" };
  if (a === "totp.backup_code.used")        return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP backup code used" };
  if (a === "totp.backup_codes.regenerated")return { icon: <Smartphone className="w-4 h-4" />, title: "TOTP backup codes regenerated" };

  // Password
  if (a === "user.password_change") return { icon: <Key className="w-4 h-4" />, title: "Password changed" };
  if (a === "user.password_reset")  return { icon: <Key className="w-4 h-4" />, title: "Password reset" };

  // Generic fallback
  return {
    icon: <Key className="w-4 h-4" />,
    title: action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
};

// ─── cert metadata detail row ─────────────────────────────────────────────────

function CertDetail({ metadata }: { metadata?: Record<string, unknown> | null }) {
  if (!metadata) return null;
  const principal = metadata.principal as string | undefined;
  const principals = metadata.principals as string[] | undefined;
  const serial = metadata.serial_number ?? metadata.serial ?? metadata.cert_serial;
  const expiry = metadata.expiry ?? metadata.expires_at ?? metadata.valid_until;
  const principalList = principal
    ? [principal]
    : Array.isArray(principals)
    ? principals
    : [];

  if (!principalList.length && !serial) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {principalList.length > 0 && (
        <span className="text-muted-foreground">
          Principal{principalList.length > 1 ? "s" : ""}:{" "}
          <span className="font-mono text-foreground/80">{principalList.join(", ")}</span>
        </span>
      )}
      {serial != null && (
        <span className="text-muted-foreground">
          Serial: <span className="font-mono text-foreground/80">{String(serial)}</span>
        </span>
      )}
      {expiry && (
        <span className="text-muted-foreground">
          Expires: <span className="font-mono text-foreground/80">{new Date(String(expiry)).toLocaleDateString()}</span>
        </span>
      )}
    </div>
  );
}

// ─── filter options ────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "all",                           label: "All events" },
  { value: "session.create",                label: "Signed in" },
  { value: "session.revoke",                label: "Signed out" },
  { value: "external_auth.login",           label: "OAuth login" },
  { value: "external_auth.link.completed",  label: "OAuth linked" },
  { value: "external_auth.unlink",          label: "OAuth unlinked" },
  { value: "ssh.key.added",                 label: "SSH key added" },
  { value: "ssh.key.verified",              label: "SSH key verified" },
  { value: "ssh.cert.issued",               label: "SSH cert issued" },
  { value: "ssh.cert.failed",               label: "SSH cert failed" },
  { value: "webauthn.register.completed",   label: "Passkey registered" },
  { value: "totp.enroll.completed",         label: "TOTP enrolled" },
  { value: "user.password_change",          label: "Password changed" },
];

const PER_PAGE = 50;

// ─── component ────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [actionFilter, debouncedSearch]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(PER_PAGE),
      };
      if (actionFilter !== "all") params.action = actionFilter;
      if (debouncedSearch) params.q = debouncedSearch;

      const data = await api.users.auditLogs(params);
      setEvents(data.audit_logs ?? []);
      setTotalCount(data.count ?? 0);
      setTotalPages(data.pages ?? 1);
    } catch {
      setError("Failed to load activity. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, debouncedSearch]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDate = (dateString: string) =>
    formatDateTime(dateString, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">My Activity</h1>
          <p className="page-description">Your recent account activity and security events</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadEvents} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search activity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p>{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No activity events found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {events.map((event) => {
                const display = getEventDisplay(event.action);
                const isCert = event.action.startsWith("ssh.cert");
                return (
                  <div key={event.id} className="p-4 flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        !event.success
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {display.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{display.title}</p>
                        {!event.success && (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
                      )}
                      {/* Cert-specific: principal + serial */}
                      {isCert && <CertDetail metadata={event.metadata} />}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {event.ip_address && (
                          <span className="font-mono">{event.ip_address}</span>
                        )}
                        {event.user_agent && (
                          <span className="truncate max-w-[220px]" title={event.user_agent}>
                            {event.user_agent.match(/\(([^)]+)\)/)?.[1]?.split(";")[0]?.trim() ?? event.user_agent.slice(0, 40)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(event.created_at)}
                      </p>
                      {event.success ? (
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
