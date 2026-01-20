import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, tokenManager, OAuthCallbackResponse } from "@/lib/api";
import { getOAuthState, clearOAuthState } from "@/lib/oauth";
import { useToast } from "@/hooks/use-toast";

type CallbackState = 'loading' | 'success' | 'error';

/**
 * OAuth callback page that handles the redirect from external OAuth providers.
 * Extracts the authorization code and state from the URL, validates the state,
 * exchanges the code for tokens, and handles MFA requirements.
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
      // 1. Extract query parameters from URL
      const code = searchParams.get("code");
      const callbackState = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // 2. Handle OAuth errors from provider
      if (errorParam) {
        setStatus('error');
        
        // User denied access
        if (errorParam === 'access_denied') {
          setError("You denied the authorization request. Please try again if you wish to sign in.");
        } else {
          setError(errorDescription || `Authorization failed: ${errorParam}`);
        }
        return;
      }

      // Validate required parameters
      if (!code || !callbackState) {
        setStatus('error');
        setError("Missing authorization code or state parameter. Please try signing in again.");
        return;
      }

      // 3. Validate state parameter (CSRF protection)
      const storedState = getOAuthState(callbackState);
      if (!storedState) {
        setStatus('error');
        setError("Invalid or expired OAuth state. Please try signing in again.");
        return;
      }

      try {
        // 4. Exchange authorization code for tokens using the API
        const response = await api.externalAuth.handleCallback(
          storedState.provider,
          code,
          callbackState
        );

        // Handle error response from backend
        if (response.error) {
          setStatus('error');
          
          // Map error types to user-friendly messages
          switch (response.error_type) {
            case 'ACCESS_DENIED':
              setError("You denied the authorization request. Please try again if you wish to sign in.");
              break;
            case 'INVALID_REQUEST':
              setError("Invalid request. Please try signing in again.");
              break;
            case 'SERVER_ERROR':
              setError("The authentication server encountered an error. Please try again later.");
              break;
            default:
              setError(response.error || "An error occurred during authentication.");
          }
          
          clearOAuthState(callbackState);
          return;
        }

        // 5. Handle MFA requirement
        if (response.requires_mfa && response.mfa_token) {
          // Store MFA token for the MFA verification flow
          sessionStorage.setItem('mfa_token', response.mfa_token);
          sessionStorage.setItem('mfa_flow', 'external_auth');
          clearOAuthState(callbackState);
          
          // Redirect to login page with MFA step
          navigate('/login?step=mfa', { replace: true });
          return;
        }

        // 6. Store authentication tokens
        if (response.token && response.expires_in) {
          tokenManager.setToken(response.token, new Date(Date.now() + response.expires_in * 1000).toISOString());
        }

        // Clear OAuth state (single-use)
        clearOAuthState(callbackState);

        // Refresh user context
        await refreshUser();

        setStatus('success');

        // Show success toast and redirect
        toast({
          title: "Sign in successful",
          description: response.user ? `Welcome, ${response.user.email}` : "You have been signed in successfully.",
        });

        // 7. Redirect based on flow type
        setTimeout(() => {
          switch (storedState.flowType) {
            case 'link':
              navigate('/linked-accounts', { replace: true });
              break;
            case 'register':
              navigate('/profile', { replace: true });
              break;
            case 'login':
            default:
              navigate('/profile', { replace: true });
          }
        }, 1500);

      } catch (err) {
        setStatus('error');
        clearOAuthState(callbackState);
        
        if (err instanceof ApiError) {
          // Handle specific error types
          if (err.type === 'STATE_MISMATCH') {
            setError("CSRF protection check failed. Please try signing in again.");
          } else if (err.code === 401) {
            setError("Authentication failed. The authorization code may have expired.");
          } else {
            setError(err.message || "An unexpected error occurred during authentication.");
          }
        } else {
          setError("An unexpected error occurred. Please try signing in again.");
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser, toast]);

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
            <CardDescription>
              {error}
            </CardDescription>
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

  // Success state (briefly shown before redirect)
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
