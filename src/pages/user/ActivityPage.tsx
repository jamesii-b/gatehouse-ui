import { useState, useEffect } from "react";
import { LogIn, LogOut, Key, Fingerprint, Smartphone, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, AuditLogEntry } from "@/lib/api";

// Map audit log action strings to display info
const getEventDisplay = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("login") && a.includes("fail")) {
    return { icon: <AlertTriangle className="w-4 h-4" />, title: "Failed login attempt", failed: true };
  }
  if (a.includes("login") || a.includes("authenticate")) {
    return { icon: <LogIn className="w-4 h-4" />, title: "Signed in", failed: false };
  }
  if (a.includes("logout") || a.includes("sign_out")) {
    return { icon: <LogOut className="w-4 h-4" />, title: "Signed out", failed: false };
  }
  if (a.includes("passkey") || a.includes("webauthn")) {
    return { icon: <Fingerprint className="w-4 h-4" />, title: "Passkey event", failed: false };
  }
  if (a.includes("mfa") || a.includes("totp") || a.includes("2fa")) {
    return { icon: <Smartphone className="w-4 h-4" />, title: "MFA event", failed: false };
  }
  if (a.includes("ssh")) {
    return { icon: <Key className="w-4 h-4" />, title: "SSH key event", failed: false };
  }
  return { icon: <Key className="w-4 h-4" />, title: action.replace(/_/g, " "), failed: !action.includes("success") && a.includes("fail") };
};

export default function ActivityPage() {
  const [filter, setFilter] = useState("all");
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = () => {
    setIsLoading(true);
    setError("");
    api.users.auditLogs({ per_page: "50" })
      .then((data) => {
        setEvents(data.audit_logs ?? []);
      })
      .catch(() => setError("Failed to load activity. Please try again."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadEvents(); }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    const a = e.action.toLowerCase();
    if (filter === "logins")
      return a.includes("session_create") || a.includes("session_revoke") || a.includes("external_auth") || a.includes("login") || a.includes("logout");
    if (filter === "security")
      return a.includes("mfa") || a.includes("passkey") || a.includes("ssh") || a.includes("totp") || a.includes("password") || a.includes("webauthn");
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-description">
            Your recent account activity and security events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="logins">Logins only</SelectItem>
              <SelectItem value="security">Security changes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadEvents} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

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
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No activity events found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEvents.map((event) => {
                const display = getEventDisplay(event.action);
                return (
                  <div key={event.id} className="p-4 flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        display.failed || !event.success
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {display.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground capitalize">
                          {display.title}
                        </p>
                        {(!event.success || display.failed) && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                        {event.description && <p>{event.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.ip_address && (
                            <span className="font-mono text-xs">{event.ip_address}</span>
                          )}
                          {event.user_agent && (
                            <span className="truncate max-w-[200px]">{event.user_agent}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
