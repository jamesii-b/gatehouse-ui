import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { tokenManager } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type CallbackState = 'loading' | 'success' | 'error';

const GATEHOUSE_API = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1') as string;
const GATEHOUSE_OIDC = GATEHOUSE_API.replace(/\/api\/v1\/?$/, '');

async function completeOidcFlow(oidcSessionId: string, token: string): Promise<string> {
  const res = await fetch(`${GATEHOUSE_OIDC}/oidc/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oidc_session_id: oidcSessionId, token }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message ?? 'OIDC completion failed');
  return body.data.redirect_url as string;
}

/**
 * OAuth callback page that handles the redirect from the Gatehouse backend
 * after a successful (or failed) OAuth provider authentication.
 *
 * The backend exchanges the provider code for a session token and then
 * redirects the browser here with query params:
 *
 *   Success:       ?token=TOKEN&expires_in=86400&flow=login&provider=google&state=STATE
 *   OIDC bridge:   same as above + &oidc_session_id=ID
 *   Error:         ?error=MESSAGE&error_type=TYPE&state=STATE
 *   Org selection: ?requires_org_selection=1&state=STATE
 *   Org creation:  ?requires_org_creation=1&state=STATE
 */
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const errorParam = searchParams.get("error");
      const errorType = searchParams.get("error_type");
      const token = searchParams.get("token");
      const expiresIn = searchParams.get("expires_in");
      const flowType = searchParams.get("flow") || "login";
      const provider = searchParams.get("provider") || "google";
      const requiresOrgSelection = searchParams.get("requires_org_selection");
      const requiresOrgCreation = searchParams.get("requires_org_creation");
      const oidcSessionId = searchParams.get("oidc_session_id");

      // Error from provider or backend
      if (errorParam) {
        setStatus('error');
        if (errorType === 'ACCESS_DENIED' || errorParam.toLowerCase().includes('denied')) {
          setError("You denied the authorization request. Please try again if you wish to sign in.");
        } else {
          setError(errorParam);
        }
        return;
      }

      // Organisation selection required
      if (requiresOrgSelection) {
        setStatus('error');
        setError("Multiple organizations found. Organization selection is not yet supported in this UI. Please contact your administrator.");
        return;
      }

      // Organisation creation required
      if (requiresOrgCreation) {
        setStatus('error');
        setError("No organization found for your account. Please ask an administrator to add you to an organization.");
        return;
      }

      // Success — token in URL
      if (!token) {
        setStatus('error');
        setError("No authentication token received. Please try signing in again.");
        return;
      }

      try {
        const expiresAt = expiresIn
          ? new Date(Date.now() + parseInt(expiresIn, 10) * 1000).toISOString()
          : null;

        tokenManager.setToken(token, expiresAt);
        await refreshUser();

        // ── OIDC bridge: complete the flow and redirect back to the OIDC client ──
        if (oidcSessionId) {
          try {
            const redirectUrl = await completeOidcFlow(oidcSessionId, token);
            window.location.href = redirectUrl;
            return;
          } catch (oidcErr) {
            if (import.meta.env.DEV) {
              console.error("[Gatehouse] OIDC completion failed after OAuth:", oidcErr);
            }
            // Fall through to normal flow on failure — user is still logged in
          }
        }

        setStatus('success');

        toast({
          title: "Sign in successful",
          description: `Signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        });

        setTimeout(() => {
          switch (flowType) {
            case 'link':
              navigate('/linked-accounts', { replace: true });
              break;
            case 'register':
            case 'login':
            default:
              navigate('/profile', { replace: true });
          }
        }, 1200);

      } catch (err) {
        setStatus('error');
        setError("Failed to load your profile. Please try signing in again.");
        if (import.meta.env.DEV) {
          console.error("[Gatehouse] OAuth callback refreshUser failed:", err);
        }
      }
    };

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="auth-card">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold">Completing sign in...</h1>
          <p className="text-muted-foreground mt-2">
            Please wait while we verify your credentials
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-card">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Authentication Failed
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login', { replace: true })} className="w-full">
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Sign in successful!</h1>
        <p className="text-muted-foreground mt-2">
          Redirecting you to your profile...
        </p>
      </div>
    </div>
  );
}

