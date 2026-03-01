import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";

const ERROR_DESCRIPTIONS: Record<string, string> = {
  invalid_request: "The request was missing a required parameter or was otherwise malformed.",
  unauthorized_client: "The client is not authorized to request an authorization code using this method.",
  access_denied: "The resource owner or authorization server denied the request.",
  unsupported_response_type: "The authorization server does not support obtaining an authorization code using this method.",
  invalid_scope: "The requested scope is invalid, unknown, or malformed.",
  server_error: "The authorization server encountered an unexpected condition that prevented it from fulfilling the request.",
  temporarily_unavailable: "The authorization server is temporarily unavailable. Please try again later.",
};

export default function OIDCErrorPage() {
  const [searchParams] = useSearchParams();

  const error = searchParams.get("error") || "server_error";
  const errorDescription =
    searchParams.get("error_description") ||
    ERROR_DESCRIPTIONS[error] ||
    "An unexpected error occurred during authentication.";
  const clientName = searchParams.get("client") || "the application";

  return (
    <div className="auth-card text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight">
        Authentication Error
      </h1>
      <p className="text-muted-foreground mt-2 mb-4">
        There was a problem with the authentication request from{" "}
        <span className="font-medium text-foreground">{clientName}</span>.
      </p>

      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6 text-left">
        <p className="text-sm font-medium text-foreground mb-1">
          Error: <code className="text-destructive">{error}</code>
        </p>
        <p className="text-sm text-muted-foreground">
          {decodeURIComponent(errorDescription)}
        </p>
      </div>

      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
        <Link to="/">
          <Button variant="ghost" className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Return to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
