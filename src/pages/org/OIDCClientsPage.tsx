import { useState, useEffect, useRef } from "react";
import { Plus, Key, MoreHorizontal, Copy, Trash2, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, OIDCClient, OIDCClientWithSecret } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";

export default function OIDCClientsPage() {
  const { toast } = useToast();
  const { selectedOrgId: orgId } = useOrg();
  const [clients, setClients] = useState<OIDCClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; secret: string } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const urisRef = useRef<HTMLTextAreaElement>(null);

  const loadData = (id: string) => {
    api.organizations.getClients(id)
      .then((data) => setClients(data.clients))
      .catch(() => toast({ title: "Error", description: "Failed to load OIDC clients.", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    loadData(orgId);
  }, [orgId]);

  const handleCreate = async () => {
    if (!orgId || !nameRef.current || !urisRef.current) return;
    const name = nameRef.current.value.trim();
    const uris = urisRef.current.value.trim().split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
    if (!name || !uris.length) return;

    setIsCreating(true);
    try {
      const result = await api.organizations.createClient(orgId, name, uris);
      const created = result.client as OIDCClientWithSecret;
      setClients((prev) => [...prev, created]);
      setNewSecret({ clientId: created.client_id, secret: created.client_secret });
      setIsCreateOpen(false);
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
      toast({ title: "Client deleted", description: "OIDC client deactivated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: "Copied", description: "Copied to clipboard." })
    );
  };

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">OIDC Clients</h1>
          <p className="page-description">
            Manage applications that authenticate via Gatehouse
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create OIDC Client</DialogTitle>
              <DialogDescription>
                Register a new application to authenticate via Gatehouse
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client name</Label>
                <Input id="clientName" placeholder="My Application" ref={nameRef} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirectUris">Redirect URIs</Label>
                <Textarea
                  id="redirectUris"
                  placeholder="https://myapp.example.com/callback"
                  className="min-h-[80px]"
                  ref={urisRef}
                />
                <p className="text-xs text-muted-foreground">
                  One URI per line. These are the allowed callback URLs.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create client"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Show new client secret once */}
      {newSecret && (
        <Card className="mb-4 border-success/50 bg-success/5">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Client created — save your secret now</p>
              <p className="text-sm text-muted-foreground mb-2">This secret will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{newSecret.secret}</code>
                <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0" onClick={() => copyToClipboard(newSecret.secret)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setNewSecret(null)}>×</Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No OIDC clients configured yet.</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {client.client_id}
                        </code>
                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyToClipboard(client.client_id)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
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
                      <Button variant="ghost" size="icon">
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
                        Delete client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Created {new Date(client.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {(client.redirect_uris ?? []).length} redirect URI{(client.redirect_uris ?? []).length !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
