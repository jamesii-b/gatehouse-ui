import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Mail, CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BannerAlert } from "@/components/auth/BannerAlert";
import { api, ApiError } from "@/lib/api";

type VerificationState = "verifying" | "success" | "error" | "resend";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [state, setState] = useState<VerificationState>(token ? "verifying" : "resend");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (token && state === "verifying") {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    try {
      await api.auth.verifyEmail(verificationToken);
      setState("success");
    } catch (err) {
      setState("error");
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "This verification link has expired or is invalid.");
      } else {
        setErrorMessage("This verification link has expired or is invalid.");
      }
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setResendSuccess(false);

    try {
      await api.auth.resendVerification(resendEmail);
    } catch {
      // Always show success to avoid leaking account existence
    } finally {
      setIsResending(false);
      setResendSuccess(true);
    }
  };

  // Loading / Verifying state
  if (state === "verifying") {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Verifying your email
        </h1>
        <p className="text-muted-foreground mt-2">
          Please wait while we confirm your email address...
        </p>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Email verified
        </h1>
        <p className="text-muted-foreground mt-2 mb-6">
          Your email has been successfully verified. You can now sign in to your account.
        </p>

        <Link to="/login">
          <Button className="w-full">
            Continue to sign in
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Verification failed
        </h1>
        <p className="text-muted-foreground mt-2 mb-6">
          {errorMessage}
        </p>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setState("resend")}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Resend verification email
          </Button>
          
          <Link to="/login">
            <Button variant="ghost" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Resend verification form
  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-accent" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Resend verification
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter your email to receive a new verification link
        </p>
      </div>

      {resendSuccess && (
        <BannerAlert
          type="success"
          message="If an account exists with this email, you'll receive a verification link shortly."
          className="mb-6"
        />
      )}

      <form onSubmit={handleResendVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="pl-10"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isResending || !resendEmail.trim()}
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send verification link
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link to="/login" className="text-accent hover:underline font-medium">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
