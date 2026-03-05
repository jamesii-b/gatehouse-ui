import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SecuirdLogo } from "@/components/branding/SecuirdLogo";
import { api, ApiError } from "@/lib/api";

type Status = "loading" | "success" | "error" | "missing";

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("activation_key") || searchParams.get("key");
    if (!code) {
      setStatus("missing");
      return;
    }

    api.auth
      .activate(code)
      .then(() => {
        setStatus("success");
        setMessage("Your account has been activated. You can now sign in.");
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Activation failed. The link may have expired or already been used.";
        setMessage(msg);
        setStatus("error");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <SecuirdLogo size="md" />
        </div>

        <Card>
          <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center gap-4 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Activating your account…</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500" />
                <h1 className="text-xl font-semibold">Account Activated</h1>
                <p className="text-sm text-muted-foreground">{message}</p>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-12 h-12 text-destructive" />
                <h1 className="text-xl font-semibold">Activation Failed</h1>
                <p className="text-sm text-muted-foreground">{message}</p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  Back to sign in
                </Button>
              </>
            )}

            {status === "missing" && (
              <>
                <Mail className="w-12 h-12 text-muted-foreground" />
                <h1 className="text-xl font-semibold">Invalid Activation Link</h1>
                <p className="text-sm text-muted-foreground">
                  No activation code was found in this link. Please check your email and use the
                  link provided.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  Back to sign in
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
