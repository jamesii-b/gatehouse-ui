/**
 * OIDCLoginPage — Standalone OIDC proxy login UI
 *
 * Unified entry point for OIDC authorization flows via the Gatehouse OIDC bridge.
 * Handles:
 *   1. Unauthenticated users → shows an email/password login form
 *   2. Already-authenticated users → shows a consent/approval screen directly
 *
 * Route: /oidc-login?oidc_session_id=<id>
 *
 * Configure your oauth2-proxy / OIDC client's login_url to:
 *   https://<gatehouse-ui>/oidc-login
 */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  XCircle,
  CheckCircle,
  AlertTriangle,
  User,
  Building2,
  Key,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, tokenManager } from "@/lib/api";

// ── Configuration ─────────────────────────────────────────────────────────────
const GATEHOUSE_OIDC = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1")
  .replace(/\/api\/v1\/?$/, "");

// ── Scope display metadata ────────────────────────────────────────────────────
const SCOPE_META: Record<string, { icon: typeof Shield; label: string; description: string }> = {
  openid:         { icon: Shield,    label: "Identity",       description: "Verify your identity" },
  profile:        { icon: User,      label: "Profile",        description: "Your name and username" },
  email:          { icon: Mail,      label: "Email",          description: "Your email address" },
  groups:         { icon: Building2, label: "Groups",         description: "Your organization memberships" },
  roles:          { icon: Shield,    label: "Roles",          description: "Your roles in the organization" },
  offline_access: { icon: Key,       label: "Offline Access", description: "Access data while you're away" },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface OIDCContext {
  oidc_session_id: string;
  client_name: string;
  scopes: string[];
  redirect_uri: string;
}

type PageStep = "loading" | "login" | "consent" | "error";

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchOIDCContext(oidcSessionId: string): Promise<OIDCContext> {
  const res = await fetch(`${GATEHOUSE_OIDC}/oidc/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oidc_session_id: oidcSessionId }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Failed to load authorization context.");
  }
  return body.data as OIDCContext;
}

async function completeOIDCFlow(oidcSessionId: string, token: string): Promise<string> {
  const res = await fetch(`${GATEHOUSE_OIDC}/oidc/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oidc_session_id: oidcSessionId, token }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Authorization failed.");
  }
  return body.data.redirect_url as string;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OIDCLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, login, logout } = useAuth();

  const oidcSessionId = searchParams.get("oidc_session_id");

  const [step, setStep] = useState<PageStep>("loading");
  const [context, setContext] = useState<OIDCContext | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Load OIDC context on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!oidcSessionId) {
      setErrorMsg("Missing oidc_session_id. This page must be accessed from an OIDC authorization flow.");
      setStep("error");
      return;
    }

    fetchOIDCContext(oidcSessionId)
      .then((ctx) => {
        setContext(ctx);
        // Determine initial step once we have context and auth state is known
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setStep("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oidcSessionId]);

  // ── Determine step once both context and auth state are ready ───────────────
  useEffect(() => {
    if (authLoading || !context || step !== "loading") return;
    const token = tokenManager.getToken();
    setStep(token ? "consent" : "login");
  }, [authLoading, context, step]);

  // ── Complete OIDC flow ──────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!context) return;
    const token = tokenManager.getToken();
    if (!token) {
      setStep("login");
      return;
    }
    setIsCompleting(true);
    try {
      const redirectUrl = await completeOIDCFlow(context.oidc_session_id, token);
      window.location.href = redirectUrl;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not complete authorization.");
      setStep("error");
    } finally {
      setIsCompleting(false);
    }
  }, [context]);

  // ── Login form submit ───────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setLoginError(null);
    setIsSubmitting(true);

    try {
      // skipNavigate=true so we control post-login navigation
      const result = await login(email, password, false, true);
      if (result.requiresTotp || result.requiresWebAuthn) {
        // MFA required — hand off to main login page which already handles this
        navigate(`/login?oidc_session_id=${context.oidc_session_id}`);
        return;
      }
      // Login succeeded — move to consent step
      setStep("consent");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message
        : err instanceof Error ? err.message
        : "Invalid email or password.";
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Deny / cancel ───────────────────────────────────────────────────────────
  const handleDeny = () => {
    if (context?.redirect_uri) {
      window.location.href = `${context.redirect_uri}?error=access_denied&error_description=User+denied+access`;
    } else {
      navigate("/");
    }
  };

  // ── Switch account ──────────────────────────────────────────────────────────
  const handleSwitchAccount = async () => {
    await logout();
    setStep("login");
    setEmail("");
    setPassword("");
    setLoginError(null);
  };

  // ── Render: loading ──────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="auth-card text-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading authorization request…</p>
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="auth-card text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Authorization Error</h1>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        {context?.redirect_uri && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = `${context.redirect_uri}?error=server_error&error_description=${encodeURIComponent(errorMsg ?? "Unknown error")}`;
            }}
          >
            Return to application
          </Button>
        )}
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  // ── Render: login form ────────────────────────────────────────────────────────
  if (step === "login") {
    return (
      <div className="auth-card space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Sign in to continue
            </h1>
            {context && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{context.client_name}</span>
                {" "}is requesting access to your account
              </p>
            )}
          </div>
        </div>

        {/* Requested scopes preview */}
        {context && context.scopes.length > 0 && (
          <Card className="p-3 bg-secondary/30 border-0">
            <p className="text-xs text-muted-foreground mb-2">This application will access:</p>
            <div className="flex flex-wrap gap-1.5">
              {context.scopes.map((scope) => {
                const meta = SCOPE_META[scope];
                return (
                  <Badge key={scope} variant="secondary" className="text-xs gap-1">
                    {meta?.label ?? scope}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        {/* Login form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {loginError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{loginError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="oidc-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="oidc-email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oidc-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="oidc-password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in…</>
            ) : (
              <><ArrowRight className="w-4 h-4 mr-2" />Sign in</>
            )}
          </Button>
        </form>

        <Separator />

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Need an account?{" "}
            <a href="/register" className="text-primary hover:underline">Register here</a>
          </p>
          <p className="text-xs text-muted-foreground">
            Forgot your password?{" "}
            <a href="/forgot-password" className="text-primary hover:underline">Reset it</a>
          </p>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleDeny}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel and return to application
          </button>
        </div>
      </div>
    );
  }

  // ── Render: consent screen (user is authenticated) ────────────────────────────
  if (step === "consent" && context) {
    return (
      <div className="auth-card space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Authorize {context.client_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              This application is requesting access to your account
            </p>
          </div>
        </div>

        {/* Signed-in-as banner */}
        {user && (
          <Card className="p-3 bg-secondary/30 border-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch
            </button>
          </Card>
        )}

        {/* Requested permissions */}
        <Card className="p-4 bg-secondary/30 border-0">
          <p className="text-sm font-medium text-foreground mb-3">
            {context.client_name} is requesting:
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

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Completing…</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" />Allow access</>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={handleDeny} disabled={isCompleting}>
            <XCircle className="w-4 h-4 mr-2" />
            Deny
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By allowing, you agree to share the above information with{" "}
          <span className="font-medium text-foreground">{context.client_name}</span>.
        </p>
      </div>
    );
  }

  return null;
}
