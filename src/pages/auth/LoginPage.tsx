import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, Fingerprint, ArrowLeft, ShieldCheck, Loader2, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, tokenManager } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  isWebAuthnSupported,
  createLoginAssertion,
  formatLoginAssertion,
  WebAuthnLoginOptions,
} from "@/lib/webauthn";
import { AddPasskeyWizard } from "@/components/security/AddPasskeyWizard";
import { TotpEnrollmentWizard } from "@/components/security/TotpEnrollmentWizard";
import { generateCodeVerifier, computeCodeChallenge, generateState, storeOAuthState, OAuthProvider } from "@/lib/oauth";

type LoginStep = 'credentials' | 'totp' | 'webauthn' | 'passkey-email' | 'mfa-enrollment' | 'mfa';

export default function LoginPage() {
  const { login, verifyTotp, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  // Check for MFA step from OAuth callback
  useEffect(() => {
    if (searchParams.get('step') === 'mfa') {
      const storedMfaToken = sessionStorage.getItem('mfa_token');
      const mfaFlow = sessionStorage.getItem('mfa_flow');
      
      if (storedMfaToken && mfaFlow === 'external_auth') {
        setMfaToken(storedMfaToken);
        setStep('mfa');
      } else {
        // No valid MFA token, redirect to credentials
        toast({
          variant: "destructive",
          title: "Error",
          description: "MFA verification session expired. Please try signing in again.",
        });
        navigate('/login', { replace: true });
      }
    }
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.requiresWebAuthn) {
        setStep('webauthn');
      } else if (result.requiresTotp) {
        setStep('totp');
        setTotpCode("");
      } else if (result.requiresMfaEnrollment) {
        // MFA enrollment required - will be handled by ProtectedLayout
        // Navigation happens in AuthContext
      }
      // If no TOTP, WebAuthn, or MFA enrollment required, navigation happens in AuthContext
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] Login failed:", error);
      }

      const message = error instanceof ApiError
        ? error.message
        : import.meta.env.DEV && error instanceof Error
          ? error.message
          : "An unexpected error occurred";
      
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length < 6 && !useBackupCode) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter your complete verification code.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mfaToken) {
        // Use MFA token verification for OAuth callback flow
        const response = await api.totp.verifyWithMfaToken(totpCode, mfaToken, useBackupCode);
        
        // Store token and update user
        if (response.token) {
          tokenManager.setToken(response.token, response.expires_at ?? null);
        }
        
        // Clear MFA session data
        sessionStorage.removeItem('mfa_token');
        sessionStorage.removeItem('mfa_flow');
        
        // Refresh user context and navigate
        await refreshUser();
        navigate('/profile');
      } else {
        // Fallback to regular TOTP verification
        await verifyTotp(totpCode, useBackupCode);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] MFA verification failed:", error);
      }

      const message = error instanceof ApiError
        ? error.message
        : import.meta.env.DEV && error instanceof Error
          ? error.message
          : "Invalid verification code";
      
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter your complete verification code.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await verifyTotp(totpCode, useBackupCode);
      // Navigation happens in AuthContext
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] TOTP verification failed:", error);
      }

      const message = error instanceof ApiError 
        ? error.message 
        : import.meta.env.DEV && error instanceof Error
          ? error.message
          : "Invalid verification code";
      
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!isWebAuthnSupported()) {
      toast({
        variant: "destructive",
        title: "Not supported",
        description: "Passkeys are not supported in this browser.",
      });
      return;
    }

    // If we have an email from the credentials form or passkey-email step, use it
    const emailToUse = email || passkeyEmail;
    
    if (!emailToUse) {
      setStep('passkey-email');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Get login options from server
      const options = await api.webauthn.beginLogin(emailToUse) as unknown as WebAuthnLoginOptions;

      // Step 2: Create assertion using browser WebAuthn API
      const assertion = await createLoginAssertion(options);

      // Step 3: Complete login with server
      const formattedAssertion = formatLoginAssertion(assertion);
      const result = await api.webauthn.completeLogin(formattedAssertion);

      // Token is stored by completeLogin, refresh user and navigate
      await refreshUser();
      navigate('/profile');
      
      toast({
        title: "Welcome back",
        description: `Signed in as ${result.user.email}`,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] Passkey login failed:", error);
      }

      let message = "Failed to sign in with passkey";
      
      if (error instanceof ApiError) {
        message = error.message;
      } else if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            message = "Authentication was cancelled or timed out.";
            break;
          case "InvalidStateError":
            message = "No passkey found for this account.";
            break;
          default:
            message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast({
        variant: "destructive",
        title: "Passkey sign in failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle WebAuthn verification specifically for the WebAuthn step (after login response)
  const handleWebAuthnVerify = async () => {
    // Use the email from the credentials form
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email is required. Please go back and try again.",
      });
      handleBackToCredentials();
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Get login options from server
      const options = await api.webauthn.beginLogin(email) as unknown as WebAuthnLoginOptions;

      // Step 2: Create assertion using browser WebAuthn API
      const assertion = await createLoginAssertion(options);

      // Step 3: Complete login with server
      const formattedAssertion = formatLoginAssertion(assertion);
      const result = await api.webauthn.completeLogin(formattedAssertion);

      // Token is stored by completeLogin, refresh user and navigate
      await refreshUser();
      navigate('/profile');
      
      toast({
        title: "Welcome back",
        description: `Signed in as ${result.user.email}`,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] WebAuthn verification failed:", error);
      }

      let message = "Failed to verify passkey";
      
      if (error instanceof ApiError) {
        message = error.message;
      } else if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            message = "Authentication was cancelled or timed out. Please try again or use your authenticator app.";
            break;
          case "InvalidStateError":
            message = "No passkey found for this account.";
            break;
          default:
            message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyEmail) return;
    await handlePasskeyLogin();
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTotpCode("");
    setUseBackupCode(false);
    setPasskeyEmail("");
  };

  /**
   * Initiate OAuth login flow for external provider
   */
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setIsLoading(true);
    
    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await computeCodeChallenge(codeVerifier);
      const state = generateState();

      // Store OAuth state for callback validation
      storeOAuthState({
        state,
        codeVerifier,
        flow: 'login',
        provider,
        redirectUri: `${window.location.origin}/oauth/callback`,
      });

      // Get authorization URL from backend
      const response = await api.externalAuth.initiateLogin(provider, state);

      // Redirect to provider authorization page
      const authUrl = new URL(response.authorization_url);
      authUrl.searchParams.set('state', response.state || state);

      window.location.href = authUrl.toString();
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Gatehouse] OAuth login failed:", error);
      }

      let message = `Failed to initiate ${provider} sign in`;
      if (error instanceof ApiError) {
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when OTP is complete
  const handleOtpChange = (value: string) => {
    setTotpCode(value);
    if (value.length === 6 && !useBackupCode) {
      setTimeout(() => {
        const form = document.getElementById('totp-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 100);
    }
  };

  // MFA enrollment step - shows when user needs to configure MFA
  if (step === 'mfa-enrollment') {
    const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);
    const [showPasskeyEnrollment, setShowPasskeyEnrollment] = useState(false);

    return (
      <div className="auth-card">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            MFA Enrollment Required
          </h1>
          <p className="text-muted-foreground mt-2">
            Your account requires multi-factor authentication to access full features.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Configure MFA</CardTitle>
            <CardDescription>
              Set up at least one authentication method to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowTotpEnrollment(true)}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Set up Authenticator App
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowPasskeyEnrollment(true)}
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Add a Passkey
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          After configuring MFA, you'll be redirected to your profile.
        </p>

        <TotpEnrollmentWizard
          open={showTotpEnrollment}
          onOpenChange={setShowTotpEnrollment}
          onSuccess={() => {
            setShowTotpEnrollment(false);
            navigate('/profile');
          }}
        />

        <AddPasskeyWizard
          open={showPasskeyEnrollment}
          onOpenChange={setShowPasskeyEnrollment}
          onSuccess={() => {
            setShowPasskeyEnrollment(false);
            navigate('/profile');
          }}
        />
      </div>
    );
  }

  // Passkey email entry step
  if (step === 'passkey-email') {
    return (
      <div className="auth-card">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Fingerprint className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Sign in with passkey
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter your email to continue with passkey authentication
          </p>
        </div>

        <form onSubmit={handlePasskeyEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passkey-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="passkey-email"
                type="email"
                placeholder="you@example.com"
                value={passkeyEmail}
                onChange={(e) => setPasskeyEmail(e.target.value)}
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !passkeyEmail}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <Button
          variant="ghost"
          className="w-full mt-4 text-muted-foreground"
          onClick={handleBackToCredentials}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </div>
    );
  }

  // MFA verification step (after OAuth callback)
  if (step === 'mfa') {
    return (
      <div className="auth-card">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Two-factor authentication
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter the 6-digit code from your authenticator app to complete sign in
          </p>
        </div>

        <form id="mfa-form" onSubmit={handleMfaSubmit} className="space-y-6">
          {useBackupCode ? (
            <div className="space-y-2">
              <Label htmlFor="mfa-backup-code">Backup code</Label>
              <Input
                id="mfa-backup-code"
                type="text"
                placeholder="Enter 16-character backup code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.toUpperCase())}
                className="text-center font-mono tracking-widest"
                maxLength={16}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={totpCode}
                onChange={handleOtpChange}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              "Verifying..."
            ) : (
              <>
                Verify
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setUseBackupCode(!useBackupCode)}
          >
            {useBackupCode ? "Use authenticator app" : "Use a backup code instead"}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              sessionStorage.removeItem('mfa_token');
              sessionStorage.removeItem('mfa_flow');
              navigate('/login', { replace: true });
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel and return to sign in
          </Button>
        </div>
      </div>
    );
  }

  // TOTP verification step
  if (step === 'totp') {
    return (
      <div className="auth-card">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Two-factor authentication
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form id="totp-form" onSubmit={handleTotpSubmit} className="space-y-6">
          {useBackupCode ? (
            <div className="space-y-2">
              <Label htmlFor="backup-code">Backup code</Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="Enter 16-character backup code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.toUpperCase())}
                className="text-center font-mono tracking-widest"
                maxLength={16}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={totpCode}
                onChange={handleOtpChange}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              "Verifying..."
            ) : (
              <>
                Verify
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setUseBackupCode(!useBackupCode)}
          >
            {useBackupCode ? "Use authenticator app" : "Use a backup code instead"}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleBackToCredentials}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  // WebAuthn verification step - shows when user has WebAuthn enrolled
  if (step === 'webauthn') {
    return (
      <div className="auth-card">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Fingerprint className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Passkey verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Use your passkey to complete sign in
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleWebAuthnVerify}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" />
                Use Passkey
              </>
            )}
          </Button>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setStep('totp');
              setTotpCode("");
              setUseBackupCode(false);
            }}
            disabled={isLoading}
            className="w-full"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Use Authenticator App
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleBackToCredentials}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  // Credentials step (default)
  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          or continue with
        </span>
      </div>

      {/* Alternative login methods */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full" 
          type="button"
          onClick={handlePasskeyLogin}
          disabled={isLoading}
        >
          <Fingerprint className="w-4 h-4 mr-2" />
          Sign in with Passkey
        </Button>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            title="Sign in with Google"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
            title="Sign in with GitHub"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
              />
            </svg>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={isLoading}
            title="Sign in with Microsoft"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#00a4ef" d="M1 13h10v10H1z" />
              <path fill="#7fba00" d="M13 1h10v10H13z" />
              <path fill="#ffb900" d="M13 13h10v10H13z" />
            </svg>
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-accent hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
