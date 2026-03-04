import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BannerAlert } from "@/components/auth/BannerAlert";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.auth.forgotPassword(email);
    } catch {
      // Always show success to avoid leaking account existence
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  // Success state - always show neutral message (don't leak account existence)
  if (isSubmitted) {
    return (
      <div className="auth-card text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-accent" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground mt-2 mb-6">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, 
          you'll receive a password reset link shortly.
        </p>

        <div className="space-y-3">
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Button>
          </Link>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setIsSubmitted(false);
              setEmail("");
            }}
          >
            Try a different email
          </Button>
        </div>
      </div>
    );
  }

  // Request form
  return (
    <div className="auth-card">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Forgot password?
        </h1>
        <p className="text-muted-foreground mt-2">
          No worries, we'll send you reset instructions
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
              autoComplete="email"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link 
          to="/login" 
          className="text-accent hover:underline font-medium inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
