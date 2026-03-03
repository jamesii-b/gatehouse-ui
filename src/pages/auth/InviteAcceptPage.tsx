import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Lock, ArrowRight, Building2, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function InviteAcceptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [inviteData, setInviteData] = useState<{
    email: string;
    organization: { id: string; name: string };
    role: string;
    user_exists?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token found in the URL.");
      setIsTokenLoading(false);
      return;
    }
    api.invites.getInfo(token)
      .then((data) => {
        setInviteData(data);
      })
      .catch(() => {
        setTokenError("This invitation link is invalid or has expired.");
      })
      .finally(() => setIsTokenLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!inviteData?.user_exists) {
      if (password !== confirmPassword) {
        setSubmitError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setSubmitError("Password must be at least 8 characters.");
        return;
      }
    }
    setIsLoading(true);
    try {
      const result = await api.invites.accept(token, name || undefined, inviteData?.user_exists ? undefined : password);
      if (result.token) {
        // Store the token manually since we're not using the normal login flow
        localStorage.setItem("gatehouse_token", result.token);
      }
      navigate("/profile");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to accept invite.";
      setSubmitError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isTokenLoading) {
    return (
      <div className="auth-card flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-card">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            Invalid Invitation
          </h1>
          <p className="text-muted-foreground">{tokenError}</p>
          <Link to="/login" className="inline-block mt-4 text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  const isExistingUser = !!inviteData?.user_exists;

  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          You're invited!
        </h1>
        <p className="text-muted-foreground mt-2">
          <span className="font-medium text-foreground">{inviteData?.organization.name}</span> has
          invited you to join as <span className="font-medium text-foreground capitalize">{inviteData?.role}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={inviteData?.email ?? ""} disabled className="bg-muted" />
        </div>

        {isExistingUser ? (
          <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Account found</p>
              <p className="text-muted-foreground">You already have a Gatehouse account. Click below to join the organization.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
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
                  minLength={8}
                />
              </div>
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
                />
              </div>
            </div>
          </>
        )}

        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {submitError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
          ) : (
            <>
              Join {inviteData?.organization.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {isExistingUser && (
          <p className="text-center text-sm text-muted-foreground">
            Not you?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in with a different account
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
