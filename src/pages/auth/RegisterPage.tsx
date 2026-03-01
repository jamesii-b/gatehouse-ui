import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter, isPasswordValid } from "@/components/auth/PasswordStrengthMeter";
import { BannerAlert } from "@/components/auth/BannerAlert";
import { api, ApiError } from "@/lib/api";

type RegistrationState = "form" | "success" | "disabled";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RegistrationState>("form");

  const passwordsMatch = password === confirmPassword;
  const canSubmit = 
    name.trim() && 
    email.trim() && 
    isPasswordValid(password) && 
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet requirements");
      return;
    }

    setIsLoading(true);

    try {
      await api.auth.register(email, password, name.trim() || undefined);
      // Show "check your email" — verification email was sent
      setState("success");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 409) {
          setError("An account with this email already exists.");
        } else if (err.code === 403 || (err.message && err.message.toLowerCase().includes("disabled"))) {
          setState("disabled");
        } else {
          setError(err.message || "An error occurred. Please try again.");
        }
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Registration disabled state
  if (state === "disabled") {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-warning" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Registration unavailable
        </h1>
        <p className="text-muted-foreground mt-2 mb-6">
          New account registration is currently invite-only. Please contact your administrator for an invitation.
        </p>

        <Link to="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  // Success state - email sent
  if (state === "success") {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-success" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground mt-2 mb-6">
          We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
          Click the link to verify your account and get started.
        </p>

        <div className="space-y-3">
          <Link to="/login">
            <Button className="w-full">
              Continue to sign in
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Didn't receive the email?{" "}
          <button 
            onClick={() => setState("form")}
            className="text-accent hover:underline font-medium"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  // Registration form
  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground mt-2">
          Get started with Gatehouse in seconds
        </p>
      </div>

      {error && (
        <BannerAlert 
          type="error" 
          message={error} 
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              required
              autoComplete="name"
            />
          </div>
        </div>

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
              autoComplete="email"
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
              autoComplete="new-password"
            />
          </div>
          <PasswordStrengthMeter password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="new-password"
            />
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? (
            "Creating account..."
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground mt-4">
        By creating an account, you agree to our{" "}
        <Link to="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
