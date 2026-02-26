import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Unlink, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, LinkedAccount, ExternalProvider, ExternalProviderId, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function LinkedAccountsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState<ExternalProviderId | null>(null);
  const [isUnlinking, setIsUnlinking] = useState<ExternalProviderId | null>(null);

  // Show success toast when arriving back from OAuth link callback
  useEffect(() => {
    const linked = searchParams.get("linked");
    const provider = searchParams.get("provider");
    if (linked === "1") {
      toast({
        title: "Account linked",
        description: provider
          ? `Your ${provider.charAt(0).toUpperCase() + provider.slice(1)} account has been linked.`
          : "Your account has been linked successfully.",
      });
      // Clean the query params so the toast doesn't re-fire on refresh
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, providersRes] = await Promise.all([
        api.externalAuth.listLinkedAccounts(),
        api.externalAuth.listProviders(),
      ]);
      // API returns standardized wrapper: { data: { linked_accounts: [], unlink_available: false } }
      // The request function extracts json.data, so accountsRes is { linked_accounts: [], unlink_available: false }
      setLinkedAccounts(accountsRes.linked_accounts || []);
      // API returns standardized wrapper: { data: { providers: [...] } }
      // The request function extracts json.data, so providersRes is { providers: [...] }
      setProviders(providersRes.providers || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[LinkedAccounts] Failed to load:", error);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load linked accounts",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isLinked = (providerId: string): boolean => {
    return linkedAccounts.some(
      (account) => account.provider_type.toLowerCase() === providerId.toLowerCase()
    );
  };

  const getLinkedEmail = (providerId: string): string | null => {
    const account = linkedAccounts.find(
      (a) => a.provider_type.toLowerCase() === providerId.toLowerCase()
    );
    return account?.email || null;
  };

  const getLinkedDate = (providerId: string): string | null => {
    const account = linkedAccounts.find(
      (a) => a.provider_type.toLowerCase() === providerId.toLowerCase()
    );
    return account?.linked_at || null;
  };

  const handleConnect = async (provider: ExternalProviderId) => {
    setIsLinking(provider);

    try {
      // The backend link flow also redirects to the backend callback, which
      // then redirects to the frontend /oauth/callback with flow=link.
      const backendCallbackUri = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1'}/auth/external/${provider}/callback`;

      const response = await api.externalAuth.initiateLink(provider, backendCallbackUri);

      // Redirect to authorization
      window.location.href = response.authorization_url;

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[LinkedAccounts] Connect failed:", error);
      }
      
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error instanceof ApiError
          ? error.message
          : "Failed to connect account",
      });
    } finally {
      setIsLinking(null);
    }
  };

  const handleDisconnect = async (provider: ExternalProviderId) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }

    setIsUnlinking(provider);

    try {
      await api.externalAuth.unlinkAccount(provider);
      
      setLinkedAccounts((prev) =>
        prev.filter((a) => a.provider_type.toLowerCase() !== provider.toLowerCase())
      );

      toast({
        title: "Account disconnected",
        description: `${provider} has been removed from your account`,
      });
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[LinkedAccounts] Disconnect failed:", error);
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof ApiError
          ? error.message
          : "Failed to disconnect account",
      });
    } finally {
      setIsUnlinking(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Linked Accounts</h1>
        <p className="page-description">
          Connect external accounts for alternative login methods
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Linked accounts can only be used to sign in to an existing Gatehouse account.
          They cannot be used to create new accounts.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {providers.map((provider) => {
          const linked = isLinked(provider.id);
          const email = getLinkedEmail(provider.id);
          const linkedDate = getLinkedDate(provider.id);
          const isConnecting = isLinking === provider.id;
          const isDisconnecting = isUnlinking === provider.id;

          return (
            <Card key={provider.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      {getProviderIcon(provider.id)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{provider.name}</p>
                      {linked ? (
                        <div className="flex flex-col">
                          <p className="text-sm text-muted-foreground">{email}</p>
                          {linkedDate && (
                            <p className="text-xs text-muted-foreground/70">
                              Connected since {new Date(linkedDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {provider.is_active ? "Not connected" : "Not configured"}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {linked ? (
                    <div className="flex items-center gap-3">
                      <Badge className="bg-success/10 text-success border-0">Connected</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDisconnecting}
                        onClick={() => handleDisconnect(provider.id as ExternalProviderId)}
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!provider.is_active || isConnecting}
                      onClick={() => handleConnect(provider.id as ExternalProviderId)}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to get provider icon
function getProviderIcon(providerId: string) {
  switch (providerId.toLowerCase()) {
    case 'google':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      );
    case 'github':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
        </svg>
      );
    case 'microsoft':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#f25022" d="M1 1h10v10H1z" />
          <path fill="#00a4ef" d="M1 13h10v10H1z" />
          <path fill="#7fba00" d="M13 1h10v10H13z" />
          <path fill="#ffb900" d="M13 13h10v10H13z" />
        </svg>
      );
    default:
      return null;
  }
}
