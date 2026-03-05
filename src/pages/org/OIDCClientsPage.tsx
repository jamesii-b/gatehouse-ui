import { useState, useEffect, useRef } from "react";
import {
  Plus, Key, MoreHorizontal, Copy, Trash2, Loader2,
  AlertCircle, CheckCircle, Network, Terminal, Check,
  ChevronDown, Globe, RefreshCw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, OIDCClient, OIDCClientWithSecret } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";

// Derive issuer base URL from the API base
const ISSUER_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1")
  .replace(/\/api\/v1\/?$/, "");

function buildProxyConfig(clientId: string, clientSecret: string, proxyHost: string) {
  return `provider = "oidc"
oidc_issuer_url = "${ISSUER_URL}"
client_id     = "${clientId}"
client_secret = "${clientSecret}"
redirect_url  = "http://${proxyHost}/oauth2/callback"
scope         = "openid profile email"
cookie_secret = "$(openssl rand -base64 32 | head -c 32)"
cookie_secure = false
upstream      = "http://127.0.0.1:8080/"
set_authorization_header  = true
set_x_auth_request_header = true`;
}

function useCopyButton() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

type DialogMode = "generic" | "proxy" | null;

interface NewSecretState {
  clientId: string;
  secret: string;
  proxyHost?: string;
  isProxy: boolean;
}

export default function OIDCClientsPage() {
  const { toast } = useToast();
  const { selectedOrgId: orgId } = useOrg();
  const { copy: copySecret, copied: secretCopied } = useCopyButton();
  const { copy: copyConfig, copied: configCopied } = useCopyButton();

  const [clients, setClients] = useState<OIDCClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<NewSecretState | null>(null);

  // Generic form
  const nameRef = useRef<HTMLInputElement>(null);
  const urisRef = useRef<HTMLTextAreaElement>(null);

  // Proxy form
  const proxyNameRef = useRef<HTMLInputElement>(null);
  const proxyHostRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    api.organizations.getClients(orgId)
      .then((data) => setClients(data.clients))
      .catch(() => toast({ title: "Error", description: "Failed to load OIDC clients.", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  const handleCreate = async () => {
    if (!orgId) return;

    let name: string;
    let uris: string[];
    let proxyHost: string | undefined;

    if (dialogMode === "generic") {
      name = nameRef.current?.value.trim() ?? "";
      uris = (urisRef.current?.value ?? "").split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
      if (!name || !uris.length) return;
    } else {
      name = proxyNameRef.current?.value.trim() ?? "";
      proxyHost = proxyHostRef.current?.value.trim() ?? "";
      if (!name || !proxyHost) return;
      uris = [`http://${proxyHost}/oauth2/callback`];
    }

    setIsCreating(true);
    try {
      const result = await api.organizations.createClient(orgId, name, uris);
      const created = result.client as OIDCClientWithSecret;
      setClients((prev) => [...prev, created]);
      setNewSecret({
        clientId: created.client_id,
        secret: created.client_secret,
        proxyHost,
        isProxy: dialogMode === "proxy",
      });
      setDialogMode(null);
    } catch {
      toast({ title: "Error", description: "Failed to create client.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!orgId) return;
    try {
      await api.organizations.deleteClient(orgId, clientId);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      toast({ title: "Client deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" });
    }
  };

  const proxyConfig = newSecret?.isProxy && newSecret.proxyHost
    ? buildProxyConfig(newSecret.clientId, newSecret.secret, newSecret.proxyHost)
    : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">OIDC Clients</h1>
          <p className="page-description">Applications that authenticate via Secuird</p>
        </div>
        <Button onClick={() => setDialogMode("generic")}>
          <Plus className="w-4 h-4 mr-2" />
          Add client
        </Button>
      </div>

      {/* One-time secret banner */}
      {newSecret && (
        <Card className="mb-6 border-green-500/40 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="font-medium">Client created — save your secret now</p>
                  <p className="text-sm text-muted-foreground">This will not be shown again.</p>
                </div>

                {/* Secret row */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client secret</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                      {newSecret.secret}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copySecret(newSecret.secret)}>
                      {secretCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* oauth2-proxy config snippet */}
                {proxyConfig && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Terminal className="w-3 h-3" />
                      oauth2-proxy config
                    </p>
                    <div className="relative">
                      <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto whitespace-pre">
                        {proxyConfig}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyConfig(proxyConfig)}
                      >
                        {configCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={() => setNewSecret(null)}>
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <Network className="w-10 h-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-muted-foreground">No OIDC clients yet</p>
              <p className="text-sm text-muted-foreground/70">Register an app to let it authenticate via Secuird</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="outline" onClick={() => setDialogMode("generic")}>
                <Plus className="w-4 h-4 mr-2" />
                Generic app
              </Button>
              <Button variant="outline" onClick={() => setDialogMode("proxy")}>
                <Terminal className="w-4 h-4 mr-2" />
                oauth2-proxy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{client.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-[260px]">
                          {client.client_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 flex-shrink-0"
                          onClick={() => navigator.clipboard.writeText(client.client_id).then(() =>
                            toast({ title: "Copied client ID" })
                          )}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(client.scopes ?? []).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {new Date(client.created_at).toLocaleDateString()}</span>
                  <span>
                    {(client.redirect_uris ?? []).length} redirect URI{(client.redirect_uris ?? []).length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) setDialogMode(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add OIDC Client</DialogTitle>
            <DialogDescription>Register an application to authenticate via Secuird</DialogDescription>
          </DialogHeader>

          <Tabs
            value={dialogMode ?? "generic"}
            onValueChange={(v) => setDialogMode(v as DialogMode)}
            className="mt-2"
          >
            <TabsList className="w-full">
              <TabsTrigger value="generic" className="flex-1">Generic app</TabsTrigger>
              <TabsTrigger value="proxy" className="flex-1 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" />
                oauth2-proxy
              </TabsTrigger>
            </TabsList>

            {/* Generic tab */}
            <TabsContent value="generic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="genericName">Client name</Label>
                <Input id="genericName" placeholder="My Application" ref={nameRef} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirectUris">Redirect URIs</Label>
                <Textarea
                  id="redirectUris"
                  placeholder={"https://myapp.example.com/callback\nhttps://myapp.example.com/auth/callback"}
                  className="min-h-[80px] font-mono text-sm"
                  ref={urisRef}
                />
                <p className="text-xs text-muted-foreground">One URI per line</p>
              </div>
            </TabsContent>

            {/* oauth2-proxy tab */}
            <TabsContent value="proxy" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="proxyName">Client name</Label>
                <Input id="proxyName" placeholder="My Protected App" ref={proxyNameRef} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxyHost">Proxy host</Label>
                <Input id="proxyHost" placeholder="app.example.com" ref={proxyHostRef} />
                <p className="text-xs text-muted-foreground">
                  The hostname where oauth2-proxy runs. Redirect URI will be set to{" "}
                  <code className="bg-muted px-1 rounded">http://{"<host>"}/oauth2/callback</code> automatically.
                </p>
              </div>
              <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                After creating, you'll get a ready-to-paste config snippet for oauth2-proxy.
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogMode(null)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
              ) : (
                "Create client"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reference ─────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Info className="w-4 h-4" />
          Integration reference
        </div>

        <Accordion type="multiple" className="space-y-2">

          {/* Endpoints */}
          <AccordionItem value="endpoints" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                OIDC endpoints
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2 text-xs font-mono">
                {[
                  ["Discovery",      "GET",  "/.well-known/openid-configuration"],
                  ["Authorization",  "GET",  "/oidc/authorize"],
                  ["Token",          "POST", "/oidc/token"],
                  ["UserInfo",       "GET",  "/oidc/userinfo"],
                  ["JWKS",           "GET",  "/oidc/jwks"],
                  ["Revocation",     "POST", "/oidc/revoke"],
                  ["Introspection",  "POST", "/oidc/introspect"],
                ].map(([label, method, path]) => (
                  <div key={path} className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`w-12 justify-center text-[10px] shrink-0 ${method === "POST" ? "border-orange-500/50 text-orange-500" : "border-blue-500/50 text-blue-500"}`}
                    >
                      {method}
                    </Badge>
                    <code className="text-muted-foreground">{ISSUER_URL}{path}</code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Issuer: <code className="bg-muted px-1 rounded">{ISSUER_URL}</code>
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Scopes & flows */}
          <AccordionItem value="scopes" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Scopes &amp; flows
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Available scopes</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["openid",   "Required. Issues an ID token."],
                    ["profile",  "Includes name, given_name, family_name."],
                    ["email",    "Includes email and email_verified."],
                  ].map(([scope, desc]) => (
                    <div key={scope} className="flex items-start gap-2">
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">{scope}</Badge>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Supported flows</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span><strong>Authorization Code + PKCE</strong> — recommended for all clients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span><strong>Refresh Token</strong> — token rotation supported</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span><strong>Authorization Code (no PKCE)</strong> — deprecated, PKCE required for new clients</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">ID token claims</p>
                <div className="flex flex-wrap gap-1.5">
                  {["sub", "name", "email", "email_verified", "given_name", "family_name"].map((c) => (
                    <code key={c} className="text-xs bg-muted px-1.5 py-0.5 rounded">{c}</code>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* oauth2-proxy quick-reference */}
          <AccordionItem value="proxy-ref" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                oauth2-proxy setup
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Use the <strong>oauth2-proxy</strong> tab when creating a client to get a pre-filled config. Or build it manually:
              </p>

              {/* Step 1 */}
              <div className="space-y-1">
                <p className="text-xs font-medium">1 — Create a client (use the dialog above)</p>
                <p className="text-xs text-muted-foreground">
                  Set the redirect URI to <code className="bg-muted px-1 rounded">http://&lt;your-proxy-host&gt;/oauth2/callback</code>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1">
                <p className="text-xs font-medium">2 — Minimal config</p>
                <pre className="text-xs bg-muted rounded p-3 font-mono overflow-x-auto whitespace-pre">{`provider          = "oidc"
oidc_issuer_url   = "${ISSUER_URL}"
client_id         = "<your-client-id>"
client_secret     = "<your-client-secret>"
redirect_url      = "http://<proxy-host>/oauth2/callback"
scope             = "openid profile email"
cookie_secret     = "$(openssl rand -base64 32 | head -c 32)"
upstream          = "http://127.0.0.1:8080/"
set_authorization_header  = true
set_x_auth_request_header = true`}</pre>
              </div>

              {/* Step 3 */}
              <div className="space-y-1">
                <p className="text-xs font-medium">3 — Run it</p>
                <pre className="text-xs bg-muted rounded p-3 font-mono overflow-x-auto">{`oauth2-proxy --config ./oauth2-proxy.cfg`}</pre>
              </div>

              {/* Useful headers */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Headers forwarded to your upstream</p>
                <div className="space-y-1 text-xs font-mono">
                  {[
                    ["X-Auth-Request-User",  "User's subject (sub claim)"],
                    ["X-Auth-Request-Email", "User's email address"],
                    ["Authorization",        "Bearer <access_token>  (if set_authorization_header = true)"],
                  ].map(([header, desc]) => (
                    <div key={header} className="flex items-start gap-3">
                      <code className="text-muted-foreground shrink-0">{header}</code>
                      <span className="text-muted-foreground/70 font-sans">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Docker Compose snippet */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Docker Compose example</p>
                <pre className="text-xs bg-muted rounded p-3 font-mono overflow-x-auto whitespace-pre">{`services:
  oauth2-proxy:
    image: oauth2-proxy/oauth2-proxy:latest
    ports: ["4180:4180"]
    environment:
      OAUTH2_PROXY_PROVIDER: oidc
      OAUTH2_PROXY_OIDC_ISSUER_URL: "${ISSUER_URL}"
      OAUTH2_PROXY_CLIENT_ID: \${OIDC_CLIENT_ID}
      OAUTH2_PROXY_CLIENT_SECRET: \${OIDC_CLIENT_SECRET}
      OAUTH2_PROXY_COOKIE_SECRET: \${COOKIE_SECRET}
      OAUTH2_PROXY_UPSTREAM: http://app:8080/
      OAUTH2_PROXY_REDIRECT_URL: http://localhost:4180/oauth2/callback`}</pre>
              </div>

              {/* Kubernetes snippet */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Kubernetes Ingress annotations</p>
                <pre className="text-xs bg-muted rounded p-3 font-mono overflow-x-auto whitespace-pre">{`nginx.ingress.kubernetes.io/auth-url: https://\$host/oauth2/auth
nginx.ingress.kubernetes.io/auth-signin: https://\$host/oauth2/sign_in
nginx.ingress.kubernetes.io/configuration-snippet: |
  auth_request_set $user  \$upstream_http_x_auth_request_user;
  auth_request_set $email \$upstream_http_x_auth_request_email;
  proxy_set_header X-User  \$user;
  proxy_set_header X-Email \$email;`}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
      {/* ── /Reference ──────────────────────────────────────────── */}

    </div>
  );
}
