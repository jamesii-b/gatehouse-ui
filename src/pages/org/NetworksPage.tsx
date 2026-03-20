import { useState, useEffect, useCallback } from "react";
import {
  Network,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  ChevronRight,
  Users,
  Monitor,
  Clock,
  Shield,
  Trash2,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  api,
  ApiError,
  PortalNetwork,
  DeviceNetworkMembership,
  UserNetworkApproval,
  NetworkEnvironment,
  NetworkRequestMode,
} from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";

const ENVIRONMENTS: { value: NetworkEnvironment; label: string }[] = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "lab", label: "Lab" },
];

const REQUEST_MODES: { value: NetworkRequestMode; label: string }[] = [
  { value: "open", label: "Open — anyone can join" },
  { value: "approval_required", label: "Approval Required" },
  { value: "invite_only", label: "Invite Only" },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EnvironmentBadge({ env }: { env: NetworkEnvironment }) {
  const colors: Record<NetworkEnvironment, string> = {
    production: "bg-red-500/10 text-red-600 border-red-200",
    staging: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    development: "bg-green-500/10 text-green-600 border-green-200",
    lab: "bg-blue-500/10 text-blue-600 border-blue-200",
  };
  return (
    <Badge className={cn("text-xs", colors[env])}>
      {env.charAt(0).toUpperCase() + env.slice(1)}
    </Badge>
  );
}

function RequestModeBadge({ mode }: { mode: NetworkRequestMode }) {
  if (mode === "open") return <Badge variant="outline" className="text-xs text-green-600 border-green-300">Open</Badge>;
  if (mode === "approval_required") return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Approval Required</Badge>;
  return <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">Invite Only</Badge>;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NetworksPage() {
  const { orgId } = useCurrentOrganizationId();
  const { toast } = useToast();

  const [networks, setNetworks] = useState<PortalNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createZtId, setCreateZtId] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createEnv, setCreateEnv] = useState<NetworkEnvironment>("development");
  const [createMode, setCreateMode] = useState<NetworkRequestMode>("approval_required");
  const [createDefaultLifetime, setCreateDefaultLifetime] = useState("480");
  const [createMaxLifetime, setCreateMaxLifetime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedNetwork, setSelectedNetwork] = useState<PortalNetwork | null>(null);
  const [networkMembers, setNetworkMembers] = useState<DeviceNetworkMembership[]>([]);
  const [networkRequests, setNetworkRequests] = useState<UserNetworkApproval[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  const [editingNetwork, setEditingNetwork] = useState<PortalNetwork | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editEnv, setEditEnv] = useState<NetworkEnvironment>("development");
  const [editMode, setEditMode] = useState<NetworkRequestMode>("approval_required");
  const [editDefaultLifetime, setEditDefaultLifetime] = useState("480");
  const [editMaxLifetime, setEditMaxLifetime] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteNetwork, setDeleteNetwork] = useState<PortalNetwork | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNetworks = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.zerotier.listNetworks(orgId);
      setNetworks(res.networks || []);
    } catch (err) {
      setError("Failed to load networks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    setNetworks([]);
    fetchNetworks();
  }, [fetchNetworks]);

  const openNetworkDrawer = async (network: PortalNetwork) => {
    setSelectedNetwork(network);
    setIsDrawerLoading(true);
    setNetworkMembers([]);
    setNetworkRequests([]);
    try {
      const [membersRes, requestsRes] = await Promise.allSettled([
        api.zerotier.getNetworkMembers(orgId!, network.id),
        api.zerotier.getNetworkPendingRequests(orgId!, network.id),
      ]);
      if (membersRes.status === "fulfilled") setNetworkMembers(membersRes.value.memberships || []);
      if (requestsRes.status === "fulfilled") setNetworkRequests(requestsRes.value.requests || []);
    } catch {
      // non-fatal
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedNetwork(null);
    setNetworkMembers([]);
    setNetworkRequests([]);
  };

  const handleCreate = async () => {
    if (!orgId) return;
    setCreateError(null);
    if (!createName.trim()) { setCreateError("Network name is required."); return; }
    if (!createZtId.trim()) { setCreateError("ZeroTier Network ID is required."); return; }
    setIsCreating(true);
    try {
      await api.zerotier.createNetwork(orgId, {
        name: createName.trim(),
        zerotier_network_id: createZtId.trim(),
        description: createDesc.trim() || undefined,
        environment: createEnv,
        request_mode: createMode,
        default_activation_lifetime_minutes: parseInt(createDefaultLifetime) || 480,
        max_activation_lifetime_minutes: createMaxLifetime ? parseInt(createMaxLifetime) : undefined,
      });
      toast({ title: "Network created", description: `${createName} has been added.` });
      setShowCreate(false);
      setCreateName(""); setCreateZtId(""); setCreateDesc("");
      setCreateEnv("development"); setCreateMode("approval_required");
      setCreateDefaultLifetime("480"); setCreateMaxLifetime("");
      fetchNetworks();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create network.");
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (network: PortalNetwork) => {
    setEditingNetwork(network);
    setEditName(network.name);
    setEditDesc(network.description || "");
    setEditEnv(network.environment);
    setEditMode(network.request_mode);
    setEditDefaultLifetime(String(network.default_activation_lifetime_minutes));
    setEditMaxLifetime(network.max_activation_lifetime_minutes ? String(network.max_activation_lifetime_minutes) : "");
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!orgId || !editingNetwork) return;
    setEditError(null);
    setIsEditing(true);
    try {
      await api.zerotier.updateNetwork(orgId, editingNetwork.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        environment: editEnv,
        request_mode: editMode,
        default_activation_lifetime_minutes: parseInt(editDefaultLifetime) || 480,
        max_activation_lifetime_minutes: editMaxLifetime ? parseInt(editMaxLifetime) : undefined,
      });
      toast({ title: "Network updated", description: `${editName} has been updated.` });
      setEditingNetwork(null);
      fetchNetworks();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update network.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !deleteNetwork) return;
    setIsDeleting(true);
    try {
      await api.zerotier.deleteNetwork(orgId, deleteNetwork.id);
      toast({ title: "Network deleted", description: `${deleteNetwork.name} has been removed.` });
      setDeleteNetwork(null);
      fetchNetworks();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete network", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNetworks = networks.filter((n) => {
    const q = search.toLowerCase();
    return (
      n.name.toLowerCase().includes(q) ||
      n.zerotier_network_id.toLowerCase().includes(q) ||
      (n.description?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Networks</h1>
        <p className="page-description">Manage ZeroTier portal networks and monitor access</p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search networks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Network
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="w-4 h-4" />
            Portal Networks
            {!isLoading && <Badge variant="secondary" className="ml-1">{networks.length}</Badge>}
          </CardTitle>
          <CardDescription>Click a network to view members, requests, and manage access</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading networks…</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : filteredNetworks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No networks match your search." : "No networks configured yet. Add one to get started."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredNetworks.map((network) => (
                <button
                  key={network.id}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => openNetworkDrawer(network)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Network className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{network.name}</p>
                      <EnvironmentBadge env={network.environment} />
                      <RequestModeBadge mode={network.request_mode} />
                      {!network.is_active && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
                          <Ban className="w-3 h-3 mr-1" />Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{network.zerotier_network_id}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-1" title="Approved users">
                      <Users className="w-4 h-4" />
                      <span>{network.approved_user_count ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Active devices">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span>{network.active_membership_count ?? 0}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNetworkDrawer(network); }}>
                        <Eye className="w-4 h-4 mr-2" /> View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(network); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteNetwork(network); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Network Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Portal Network</DialogTitle>
            <DialogDescription>Link a ZeroTier network to your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Network Name *</Label>
              <Input placeholder="Production VPN" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ZeroTier Network ID *</Label>
              <Input placeholder="d6578dd03c894448" value={createZtId} onChange={(e) => setCreateZtId(e.target.value)} />
              <p className="text-xs text-muted-foreground">16-character hexadecimal network ID from your ZeroTier controller.</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Production network for engineering" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={createEnv} onValueChange={(v) => setCreateEnv(v as NetworkEnvironment)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Request Mode</Label>
                <Select value={createMode} onValueChange={(v) => setCreateMode(v as NetworkRequestMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Activation (minutes)</Label>
                <Input type="number" placeholder="480" value={createDefaultLifetime} onChange={(e) => setCreateDefaultLifetime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Activation (minutes)</Label>
                <Input type="number" placeholder="No limit" value={createMaxLifetime} onChange={(e) => setCreateMaxLifetime(e.target.value)} />
              </div>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Network Dialog */}
      <Dialog open={!!editingNetwork} onOpenChange={(open) => { if (!open) setEditingNetwork(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Network</DialogTitle>
            <DialogDescription>Update network settings.</DialogDescription>
          </DialogHeader>
          {editingNetwork && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Network Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={editEnv} onValueChange={(v) => setEditEnv(v as NetworkEnvironment)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Request Mode</Label>
                  <Select value={editMode} onValueChange={(v) => setEditMode(v as NetworkRequestMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Activation (minutes)</Label>
                  <Input type="number" value={editDefaultLifetime} onChange={(e) => setEditDefaultLifetime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Activation (minutes)</Label>
                  <Input type="number" placeholder="No limit" value={editMaxLifetime} onChange={(e) => setEditMaxLifetime(e.target.value)} />
                </div>
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNetwork(null)} disabled={isEditing}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteNetwork} onOpenChange={(open) => { if (!open) setDeleteNetwork(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Network</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{deleteNetwork?.name}"? This does not affect the ZeroTier network itself.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNetwork(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Network Detail Drawer */}
      <Sheet open={!!selectedNetwork} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedNetwork && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Network className="w-5 h-5 text-primary" />
                  </div>
                  {selectedNetwork.name}
                </SheetTitle>
                <SheetDescription className="font-mono">{selectedNetwork.zerotier_network_id}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <EnvironmentBadge env={selectedNetwork.environment} />
                  <RequestModeBadge mode={selectedNetwork.request_mode} />
                </div>
                {selectedNetwork.description && (
                  <p className="text-sm text-muted-foreground">{selectedNetwork.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Default activation</span>
                    <p className="font-medium">{selectedNetwork.default_activation_lifetime_minutes} min</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max activation</span>
                    <p className="font-medium">{selectedNetwork.max_activation_lifetime_minutes ? `${selectedNetwork.max_activation_lifetime_minutes} min` : "No limit"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved users</span>
                    <p className="font-medium flex items-center gap-1"><Users className="w-3 h-3" />{selectedNetwork.approved_user_count ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active devices</span>
                    <p className="font-medium flex items-center gap-1 text-green-600"><Zap className="w-3 h-3" />{selectedNetwork.active_membership_count ?? 0}</p>
                  </div>
                </div>
              </div>

              {isDrawerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Tabs defaultValue="members" className="w-full">
                  <TabsList className="mb-3">
                    <TabsTrigger value="members">
                      Members ({networkMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="requests">
                      Requests ({networkRequests.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members">
                    {networkMembers.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">No members yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {networkMembers.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                            <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{m.device_id}</p>
                              <p className="text-xs text-muted-foreground">
                                State: {m.state} · Join seen: {m.join_seen ? "Yes" : "No"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {m.currently_authorized ? (
                                <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-green-600">Authorized</span></>
                              ) : (
                                <><XCircle className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inactive</span></>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="requests">
                    {networkRequests.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">No pending requests.</div>
                    ) : (
                      <div className="space-y-2">
                        {networkRequests.map((r) => (
                          <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{r.user_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.grant_type} · {r.state}
                              </p>
                              {r.justification && <p className="text-xs text-muted-foreground mt-1">"{r.justification}"</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
