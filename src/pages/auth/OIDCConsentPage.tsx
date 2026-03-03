import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Shield, User, Mail, Building2, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { tokenManager } from "@/lib/api";

const GATEHOUSE_API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';
const GATEHOUSE_OIDC = GATEHOUSE_API.replace(/\/api\/v1\/?$/, '');

const SCOPE_META: Record<string, { icon: typeof Shield; label: string; description: string }> = {
  openid: { icon: Shield, label: "OpenID", description: "Verify your identity" },
  profile: { icon: User, label: "Profile", description: "Access your name and profile picture" },
  email: { icon: Mail, label: "Email", description: "Access your email address" },
  groups: { icon: Building2, label: "Groups", description: "Access your group memberships" },
  offline_access: { icon: Key, label: "Offline Access", description: "Access your data while you are not logged in" },
};

interface ConsentContext {
  oidc_session_id: string;
  client_name: string;
  scopes: string[];
  redirect_uri: string;
}

export default function OIDCConsentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oidcSessionId = searchParams.get("oidc_session_id");

  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ConsentContext | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!oidcSessionId) {
      setFetchError("No OIDC session provided.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${GATEHOUSE_OIDC}/oidc/begin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oidc_session_id: oidcSessionId }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          setFetchError(body.message || "Failed to load consent context.");
          return;
        }
        setContext(body.data as ConsentContext);
      } catch {
        setFetchError("Failed to connect to authentication server.");
      }
    })();
  }, [oidcSessionId]);

  const handleAllow = async () => {
    if (!context) return;
    setIsLoading(true);
    try {
      const token = tokenManager.getToken();
      if (!token) {
        navigate(`/login?oidc_session_id=${context.oidc_session_id}`);
        return;
      }
      const res = await fetch(`${GATEHOUSE_OIDC}/oidc/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oidc_session_id: context.oidc_session_id, token }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setFetchError(body.message || "Authorization failed.");
        return;
      }
      window.location.href = body.data.redirect_url;
    } catch {
      setFetchError("Failed to complete authorization.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    if (context?.redirect_uri) {
      window.location.href = `${context.redirect_uri}?error=access_denied&error_description=User+denied+access`;
    } else {
      navigate(-1);
    }
  };

  if (fetchError) {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Authorization Error</h1>
        <p className="text-muted-foreground mt-2">{fetchError}</p>
        <Button variant="outline" className="mt-6 w-full" onClick={() => navigate("/")}>
          Return to home
        </Button>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="auth-card text-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading authorization request…</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Authorize {context.client_name}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          This application wants to access your account
        </p>
      </div>

      <Card className="p-4 bg-secondary/30 border-0 mb-6">
        <p className="text-sm text-foreground font-medium mb-3">
          {context.client_name} is requesting access to:
        </p>
        <ul className="space-y-3">
          {context.scopes.map((scope) => {
            const meta = SCOPE_META[scope];
            const Icon = meta?.icon ?? Key;
            return (
              <li key={scope} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {meta?.label ?? scope}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta?.description ?? scope}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {context.redirect_uri && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Building2 className="w-4 h-4" />
          <span>
            Redirecting to:{" "}
            <span className="font-mono text-foreground">
              {new URL(context.redirect_uri).origin}
            </span>
          </span>
        </div>
      )}

      <Separator className="mb-6" />

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleDeny}
          className="flex-1"
          disabled={isLoading}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Deny
        </Button>
        <Button
          onClick={handleAllow}
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Authorizing…" : "Allow"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        You can revoke this access anytime from your{" "}
        <a href="/linked-accounts" className="text-accent hover:underline">
          linked accounts
        </a>
      </p>
    </div>
  );
}
