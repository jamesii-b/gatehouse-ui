import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Settings, Trash2, Plus, Eye, EyeOff } from "lucide-react";

interface OAuthProvider {
  id: string;
  name: string;
  is_configured: boolean;
  is_enabled: boolean;
  client_id: string | null;
}

const PROVIDER_LOGOS: Record<string, string> = {
  google: "https://www.google.com/favicon.ico",
  github: "https://github.com/favicon.ico",
  microsoft: "https://www.microsoft.com/favicon.ico",
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1') as string;

const PROVIDER_HELP: Record<string, { docsUrl: string; callbackNote: string }> = {
  google: {
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    callbackNote: `Authorized redirect URI: ${API_BASE}/auth/external/google/callback`,
  },
  github: {
    docsUrl: "https://github.com/settings/applications/new",
    callbackNote: `Authorization callback URL: ${API_BASE}/auth/external/github/callback`,
  },
  microsoft: {
    docsUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
    callbackNote: `Redirect URI: ${API_BASE}/auth/external/microsoft/callback`,
  },
};

export default function OAuthProvidersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [configDialog, setConfigDialog] = useState<{ open: boolean; provider: OAuthProvider | null }>({
    open: false,
    provider: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; provider: OAuthProvider | null }>({
    open: false,
    provider: null,
  });

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "oauthProviders"],
    queryFn: () => api.admin.listOAuthProviders(),
  });

  const configureMutation = useMutation({
    mutationFn: ({ provider, cid, cs, enabled }: { provider: string; cid: string; cs: string; enabled: boolean }) =>
      api.admin.configureOAuthProvider(provider, cid, cs, enabled),
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "oauthProviders"] });
      toast({ title: `${provider} configured`, description: "OAuth provider settings saved." });
      setConfigDialog({ open: false, provider: null });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => api.admin.deleteOAuthProvider(provider),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "oauthProviders"] });
      toast({ title: `${provider} removed`, description: "OAuth provider configuration deleted." });
      setDeleteDialog({ open: false, provider: null });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const openConfig = (provider: OAuthProvider) => {
    setClientId(provider.client_id ?? "");
    setClientSecret("");
    setIsEnabled(provider.is_enabled);
    setShowSecret(false);
    setConfigDialog({ open: true, provider });
  };

  const handleSave = () => {
    if (!configDialog.provider) return;
    configureMutation.mutate({
      provider: configDialog.provider.id,
      cid: clientId,
      cs: clientSecret,
      enabled: isEnabled,
    });
  };

  const providers: OAuthProvider[] = data?.providers ?? [];

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OAuth Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure application-level OAuth provider credentials. Users can link their accounts via these providers.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading providers…
        </div>
      )}

      <div className="space-y-4">
        {providers.map((p) => {
          const help = PROVIDER_HELP[p.id];
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={PROVIDER_LOGOS[p.id]}
                      alt={p.name}
                      className="h-5 w-5"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.is_configured ? (
                      <Badge variant={p.is_enabled ? "default" : "secondary"}>
                        {p.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Not configured
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openConfig(p)}>
                      {p.is_configured ? (
                        <><Settings className="h-3.5 w-3.5 mr-1" /> Edit</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5 mr-1" /> Configure</>
                      )}
                    </Button>
                    {p.is_configured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, provider: p })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {p.is_configured && p.client_id && (
                <CardContent className="pt-0">
                  <CardDescription className="font-mono text-xs">
                    Client ID: {p.client_id.slice(0, 24)}…
                  </CardDescription>
                </CardContent>
              )}
              {!p.is_configured && (
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    {help.callbackNote}
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Configure Dialog */}
      <Dialog open={configDialog.open} onOpenChange={(o) => setConfigDialog((s) => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {configDialog.provider?.is_configured ? "Edit" : "Configure"}{" "}
              {configDialog.provider?.name} OAuth
            </DialogTitle>
            <DialogDescription>
              {configDialog.provider && PROVIDER_HELP[configDialog.provider.id]?.callbackNote}
              {" "}
              <a
                href={configDialog.provider ? PROVIDER_HELP[configDialog.provider.id]?.docsUrl : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Open provider console ↗
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Client ID"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-secret">
                Client Secret{" "}
                {configDialog.provider?.is_configured && (
                  <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="client-secret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={configDialog.provider?.is_configured ? "••••••••" : "Enter Client Secret"}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-enabled">Enable this provider</Label>
              <Switch id="is-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog({ open: false, provider: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!clientId || configureMutation.isPending}>
              {configureMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(o) => setDeleteDialog((s) => ({ ...s, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteDialog.provider?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the OAuth credentials for {deleteDialog.provider?.name}. Users will no longer be able
              to sign in or link accounts via this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog.provider && deleteMutation.mutate(deleteDialog.provider.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
