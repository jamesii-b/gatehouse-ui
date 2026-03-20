import { useState, useEffect, useCallback } from "react";
import {
  Monitor,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  ChevronRight,
  Zap,
  ZapOff,
  Clock,
  Trash2,
  Pencil,
  Laptop,
  Smartphone,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Users,
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
  Device,
  DeviceNetworkMembership,
  ActivationSession,
  MembershipState,
  PortalNetwork,
  UserNetworkApproval,
  ApprovalState,
} from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatExpiry(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const now = new Date();
  if (date < now) return "Expired";
  const diff = Math.floor((date.getTime() - now.getTime()) / 1000 / 60);
  if (diff < 60) return `${diff}m left`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}m left`;
  return `${Math.floor(diff / 1440)}d ${Math.floor((diff % 1440) / 60)}h left`;
}

function MembershipStateBadge({ state }: { state: MembershipState }) {
  const config: Record<MembershipState, { color: string; icon: React.ReactNode; label: string }> = {
    pending_device_registration: { color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: <AlertCircle className="w-3 h-3 mr-1" />, label: "Pending Registration" },
    pending_request: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending Request" },
    pending_manager_approval: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending Approval" },
    approved_inactive: { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "Approved (Inactive)" },
    joined_deauthorized: { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Joined (Deauth)" },
    active_authorized: { color: "bg-green-500/10 text-green-600 border-green-200", icon: <Zap className="w-3 h-3 mr-1" />, label: "Active" },
    activation_expired: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Expired" },
    suspended: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <AlertCircle className="w-3 h-3 mr-1" />, label: "Suspended" },
    revoked: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <ZapOff className="w-3 h-3 mr-1" />, label: "Revoked" },
    rejected: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Rejected" },
  };
  const { color, icon, label } = config[state] ?? { color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: null, label: state };
  return (
    <Badge className={cn("text-xs", color)}>
      {icon}{label}
    </Badge>
  );
}

function ApprovalStateBadge({ state }: { state: ApprovalState }) {
  const config: Record<ApprovalState, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending" },
    approved: { color: "bg-green-500/10 text-green-600 border-green-200", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "Approved" },
    rejected: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Rejected" },
    revoked: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Revoked" },
    suspended: { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: <AlertCircle className="w-3 h-3 mr-1" />, label: "Suspended" },
  };
  const { color, icon, label } = config[state] ?? { color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: null, label: state };
  return (
    <Badge className={cn("text-xs", color)}>
      {icon}{label}
    </Badge>
  );
}

function DeviceTypeIcon({ nickname, hostname }: { nickname: string | null; hostname: string | null }) {
  const text = (nickname || hostname || "").toLowerCase();
  if (text.includes("server") || text.includes("host") || text.includes("node")) return <Server className="w-5 h-5" />;
  if (text.includes("phone") || text.includes("mobile")) return <Smartphone className="w-5 h-5" />;
  return <Laptop className="w-5 h-5" />;
}

export default function DevicesPage() {
  const { orgId } = useCurrentOrganizationId();
  const { toast } = useToast();

  const [devices, setDevices] = useState<Device[]>([]);
  const [memberships, setMemberships] = useState<DeviceNetworkMembership[]>([]);
  const [sessions, setSessions] = useState<ActivationSession[]>([]);
  const [networks, setNetworks] = useState<PortalNetwork[]>([]);
  const [myApprovals, setMyApprovals] = useState<UserNetworkApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showRegister, setShowRegister] = useState(false);
  const [regNodeId, setRegNodeId] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regHostname, setRegHostname] = useState("");
  const [regAssetTag, setRegAssetTag] = useState("");
  const [regSerial, setRegSerial] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceMemberships, setDeviceMemberships] = useState<DeviceNetworkMembership[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editHostname, setEditHostname] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [activateLifetime, setActivateLifetime] = useState("480");
  const [showActivateDialog, setShowActivateDialog] = useState<string | null>(null);

  const [showJoinDialog, setShowJoinDialog] = useState<PortalNetwork | null>(null);
  const [joinDeviceId, setJoinDeviceId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const [showRequestDialog, setShowRequestDialog] = useState<PortalNetwork | null>(null);
  const [requestDeviceId, setRequestDeviceId] = useState("");
  const [requestJustification, setRequestJustification] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [deletingMembershipId, setDeletingMembershipId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const [devicesRes, membershipsRes, sessionsRes, networksRes, approvalsRes] = await Promise.allSettled([
        api.zerotier.listDevices(orgId),
        api.zerotier.listMemberships(orgId),
        api.zerotier.listSessions(orgId),
        api.zerotier.listNetworks(orgId),
        api.zerotier.listMyApprovals(orgId),
      ]);
      if (devicesRes.status === "fulfilled") setDevices(devicesRes.value.devices || []);
      if (membershipsRes.status === "fulfilled") setMemberships(membershipsRes.value.memberships || []);
      if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.sessions || []);
      if (networksRes.status === "fulfilled") setNetworks(networksRes.value.networks || []);
      if (approvalsRes.status === "fulfilled") setMyApprovals(approvalsRes.value.approvals || []);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    setDevices([]);
    setMemberships([]);
    fetchData();
  }, [fetchData]);

  const openDeviceDrawer = async (device: Device) => {
    setSelectedDevice(device);
    setIsDrawerLoading(true);
    setDeviceMemberships([]);
    try {
      const deviceMem = memberships.filter((m) => m.device_id === device.id);
      setDeviceMemberships(deviceMem);
    } catch {
      // non-fatal
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedDevice(null);
    setDeviceMemberships([]);
  };

  const handleRegister = async () => {
    if (!orgId) return;
    setRegError(null);
    if (!regNodeId.trim()) { setRegError("Node ID is required."); return; }
    if (regNodeId.trim().length !== 10) { setRegError("Node ID must be exactly 10 characters."); return; }
    setIsRegistering(true);
    try {
      await api.zerotier.registerDevice(orgId, {
        node_id: regNodeId.trim(),
        nickname: regNickname.trim() || undefined,
        hostname: regHostname.trim() || undefined,
        asset_tag: regAssetTag.trim() || undefined,
        serial_number: regSerial.trim() || undefined,
      });
      toast({ title: "Device registered", description: `Node ${regNodeId} has been registered.` });
      setShowRegister(false);
      setRegNodeId(""); setRegNickname(""); setRegHostname("");
      setRegAssetTag(""); setRegSerial("");
      fetchData();
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Failed to register device.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEdit = async () => {
    if (!orgId || !editDevice) return;
    setIsEditing(true);
    try {
      await api.zerotier.updateDevice(orgId, editDevice.id, {
        nickname: editNickname.trim() || undefined,
        hostname: editHostname.trim() || undefined,
      });
      toast({ title: "Device updated" });
      setEditDevice(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update device", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !deleteDevice) return;
    setIsDeleting(true);
    try {
      await api.zerotier.removeDevice(orgId, deleteDevice.id);
      toast({ title: "Device removed", description: `${deleteDevice.node_id} has been removed.` });
      setDeleteDevice(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to remove device", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivate = async (membershipId: string) => {
    if (!orgId) return;
    setActivatingId(membershipId);
    try {
      const lifetime = parseInt(activateLifetime);
      await api.zerotier.activateMembership(orgId, membershipId, lifetime);
      toast({ title: "Membership activated", description: `Active for ${lifetime} minutes.` });
      setShowActivateDialog(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to activate", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async (membershipId: string) => {
    if (!orgId) return;
    setDeactivatingId(membershipId);
    try {
      await api.zerotier.deactivateMembership(orgId, membershipId);
      toast({ title: "Membership deactivated" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to deactivate", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleActivateAll = async () => {
    if (!orgId) return;
    setActivatingId("all");
    try {
      const lifetime = parseInt(activateLifetime);
      const res = await api.zerotier.activateAllMemberships(orgId, lifetime);
      toast({ title: "All memberships activated", description: `${res.count} memberships activated for ${lifetime} minutes.` });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to activate all", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setActivatingId(null);
    }
  };

  const handleJoinNetwork = async () => {
    if (!orgId || !showJoinDialog || !joinDeviceId) return;
    setIsJoining(true);
    setRequestError(null);
    try {
      await api.zerotier.joinNetworkForDevice(orgId, joinDeviceId, showJoinDialog.id);
      toast({ title: "Joined network", description: `Device is now a member of ${showJoinDialog.name}.` });
      setShowJoinDialog(null);
      setJoinDeviceId("");
      fetchData();
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : "Failed to join network.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!orgId || !showRequestDialog || !requestDeviceId) return;
    setIsRequesting(true);
    setRequestError(null);
    try {
      await api.zerotier.requestAccess(orgId, {
        portal_network_id: showRequestDialog.id,
        device_id: requestDeviceId,
        justification: requestJustification.trim() || undefined,
      });
      toast({ title: "Access requested", description: `Request sent for ${showRequestDialog.name}.` });
      setShowRequestDialog(null);
      setRequestDeviceId("");
      setRequestJustification("");
      fetchData();
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : "Failed to request access.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeleteMembership = async (membershipId: string) => {
    if (!orgId) return;
    setDeletingMembershipId(membershipId);
    try {
      await api.zerotier.deleteMembership(orgId, membershipId);
      toast({ title: "Membership removed" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to remove membership", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setDeletingMembershipId(null);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.node_id.toLowerCase().includes(q) ||
      (d.device_nickname?.toLowerCase().includes(q) ?? false) ||
      (d.hostname?.toLowerCase().includes(q) ?? false)
    );
  });

  const getActiveSession = (membershipId: string): ActivationSession | null => {
    return sessions.find((s) => s.device_network_membership_id === membershipId && s.is_active) ?? null;
  };

  const getMembershipForDeviceAndNetwork = (deviceId: string, networkId: string): DeviceNetworkMembership | null => {
    return memberships.find((m) => m.device_id === deviceId && m.portal_network_id === networkId) ?? null;
  };

  const getApprovalForNetwork = (networkId: string): UserNetworkApproval | null => {
    return myApprovals.find((a) => a.portal_network_id === networkId) ?? null;
  };

  const filteredApprovals = myApprovals.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const network = networks.find((n) => n.id === a.portal_network_id);
      if (!network?.name.toLowerCase().includes(q) && !a.portal_network_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">ZeroTier Access</h1>
        <p className="page-description">Manage your devices, networks, and access requests</p>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="w-4 h-4" /> My Devices
            {!isLoading && devices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{devices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="networks" className="gap-2">
            <Globe className="w-4 h-4" /> My Networks
            {!isLoading && networks.length > 0 && (
              <Badge variant="secondary" className="ml-1">{networks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="w-4 h-4" /> My Requests
            {!isLoading && myApprovals.filter((a) => a.state === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-1">{myApprovals.filter((a) => a.state === "pending").length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab A: My Devices ── */}
        <TabsContent value="devices">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Node ID or nickname…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowRegister(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Register Device
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Registered Devices
                {!isLoading && <Badge variant="secondary" className="ml-1">{devices.length}</Badge>}
              </CardTitle>
              <CardDescription>Click a device to view memberships and activation status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading devices…</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">{error}</div>
              ) : filteredDevices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "No devices match your search." : "No devices registered. Register your first ZeroTier node."}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredDevices.map((device) => {
                    const activeCount = memberships.filter(
                      (m) => m.device_id === device.id && m.currently_authorized
                    ).length;
                    return (
                      <button
                        key={device.id}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
                        onClick={() => openDeviceDrawer(device)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <DeviceTypeIcon nickname={device.device_nickname} hostname={device.hostname} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                              {device.device_nickname || device.hostname || device.node_id}
                            </p>
                            {device.device_nickname && device.hostname && (
                              <span className="text-sm text-muted-foreground truncate">{device.hostname}</span>
                            )}
                            <Badge variant={device.status === "active" ? "default" : "outline"} className="text-xs">
                              {device.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{device.node_id}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm flex-shrink-0">
                          {activeCount > 0 ? (
                            <><Zap className="w-4 h-4 text-green-500" /><span className="text-green-600">{activeCount} active</span></>
                          ) : (
                            <span className="text-muted-foreground">Inactive</span>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeviceDrawer(device); }}>
                              <ChevronRight className="w-4 h-4 mr-2" /> View memberships
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditDevice(device);
                              setEditNickname(device.device_nickname || "");
                              setEditHostname(device.hostname || "");
                            }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteDevice(device); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {sessions.filter((s) => s.is_active).length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{sessions.filter((s) => s.is_active).length} active session(s)</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleActivateAll} disabled={activatingId !== null} className="gap-1">
                    {activatingId === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Activate All
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {sessions.filter((s) => s.is_active).map((session) => (
                    <div key={session.id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <span className="text-muted-foreground font-mono">{session.device_network_membership_id}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Expires: {formatExpiry(session.expires_at)}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleDeactivate(session.id)} disabled={deactivatingId === session.id}>
                          {deactivatingId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab B: My Networks ── */}
        <TabsContent value="networks">
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
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Available Networks
                {!isLoading && <Badge variant="secondary" className="ml-1">{networks.length}</Badge>}
              </CardTitle>
              <CardDescription>Join open networks or request access to approval-required networks</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading networks…</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">{error}</div>
              ) : networks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No networks available in this organization.</div>
              ) : (
                <div className="divide-y">
                  {networks.filter((n) => {
                    if (!n.is_active) return false;
                    const q = search.toLowerCase();
                    if (q && !n.name.toLowerCase().includes(q) && !n.zerotier_network_id.toLowerCase().includes(q)) return false;
                    return true;
                  }).map((network) => {
                    const approval = getApprovalForNetwork(network.id);
                    const hasMembership = memberships.some((m) => m.portal_network_id === network.id && !m.deleted_at);
                    const myDeviceMemberships = devices.map((d) => getMembershipForDeviceAndNetwork(d.id, network.id)).filter(Boolean) as DeviceNetworkMembership[];
                    return (
                      <div key={network.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium truncate">{network.name}</p>
                              <Badge variant="outline" className="text-xs">{network.environment}</Badge>
                              <Badge variant={network.request_mode === "open" ? "default" : "secondary"} className="text-xs">
                                {network.request_mode === "open" ? "Open" : "Approval Required"}
                              </Badge>
                              {hasMembership && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200">Member</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{network.zerotier_network_id}</p>
                            {approval && (
                              <div className="flex items-center gap-2 mt-1">
                                <ApprovalStateBadge state={approval.state} />
                                {approval.justification && (
                                  <span className="text-xs text-muted-foreground">"{approval.justification}"</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {network.request_mode === "open" && !hasMembership && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowJoinDialog(network);
                                  setJoinDeviceId(devices[0]?.id || "");
                                }}
                                disabled={devices.length === 0}
                                className="gap-1"
                              >
                                <Plus className="w-3 h-3" /> Join
                              </Button>
                            )}
                            {network.request_mode === "approval_required" && !hasMembership && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowRequestDialog(network);
                                  setRequestDeviceId(devices[0]?.id || "");
                                  setRequestJustification("");
                                }}
                                disabled={devices.length === 0}
                                className="gap-1"
                              >
                                <Globe className="w-3 h-3" /> Request Access
                              </Button>
                            )}
                            {hasMembership && (
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" /> Member
                              </div>
                            )}
                          </div>
                        </div>

                        {myDeviceMemberships.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {myDeviceMemberships.map((m) => (
                              <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <DeviceTypeIcon
                                    nickname={devices.find((d) => d.id === m.device_id)?.device_nickname || null}
                                    hostname={devices.find((d) => d.id === m.device_id)?.hostname || null}
                                  />
                                  <span className="text-sm font-mono">
                                    {devices.find((d) => d.id === m.device_id)?.device_nickname ||
                                     devices.find((d) => d.id === m.device_id)?.node_id}
                                  </span>
                                  <MembershipStateBadge state={m.state} />
                                </div>
                                <div className="flex items-center gap-1">
                                  {m.approved_for_activation && !m.currently_authorized && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setShowActivateDialog(m.id)}
                                      disabled={activatingId === m.id}
                                      className="gap-1"
                                    >
                                      {activatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                      Activate
                                    </Button>
                                  )}
                                  {m.currently_authorized && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeactivate(m.id)}
                                      disabled={deactivatingId === m.id}
                                      className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                    >
                                      {deactivatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
                                      Deactivate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab C: My Requests ── */}
        <TabsContent value="requests">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by network name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Access Requests
                {!isLoading && <Badge variant="secondary" className="ml-1">{myApprovals.length}</Badge>}
              </CardTitle>
              <CardDescription>Track your network access requests and approvals</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading requests…</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">{error}</div>
              ) : filteredApprovals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "No requests match your search." : "No access requests yet. Browse networks to request access."}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredApprovals.map((approval) => {
                    const network = networks.find((n) => n.id === approval.portal_network_id);
                    const relatedMemberships = memberships.filter((m) => m.portal_network_id === approval.portal_network_id);
                    return (
                      <div key={approval.id} className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium truncate">{network?.name || approval.portal_network_id}</p>
                            <Badge variant="outline" className="text-xs">{network?.environment}</Badge>
                            <ApprovalStateBadge state={approval.state} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {approval.grant_type === "requested" ? "You requested" : "Assigned by admin"}
                            {approval.justification && ` — "${approval.justification}"`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(approval.created_at)}
                            {approval.granted_by_user_id && ` · Granted by manager`}
                          </p>
                          {relatedMemberships.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {relatedMemberships.map((m) => {
                                const dev = devices.find((d) => d.id === m.device_id);
                                return (
                                  <Badge key={m.id} variant="outline" className="text-xs">
                                    {dev?.device_nickname || dev?.node_id}: <MembershipStateBadge state={m.state} />
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {approval.state === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-red-300 hover:bg-red-50 gap-1 flex-shrink-0"
                            onClick={() => {
                              const firstMem = memberships.find((m) => m.portal_network_id === approval.portal_network_id);
                              if (firstMem) handleDeleteMembership(firstMem.id);
                            }}
                            disabled={!memberships.some((m) => m.portal_network_id === approval.portal_network_id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Device Dialog */}
      <Dialog open={showRegister} onOpenChange={(open) => { if (!open) setShowRegister(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>Add a ZeroTier node to your account. Find your Node ID in the ZeroTier client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Node ID *</Label>
              <Input placeholder="d6578dd03c" maxLength={10} value={regNodeId} onChange={(e) => setRegNodeId(e.target.value.toLowerCase())} className="font-mono" />
              <p className="text-xs text-muted-foreground">10-character ZeroTier Node ID from your client.</p>
            </div>
            <div className="space-y-2">
              <Label>Nickname</Label>
              <Input placeholder="Work Laptop" value={regNickname} onChange={(e) => setRegNickname(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hostname</Label>
              <Input placeholder="ubuntu-work" value={regHostname} onChange={(e) => setRegHostname(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Tag</Label>
                <Input placeholder="ASSET-001" value={regAssetTag} onChange={(e) => setRegAssetTag(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input placeholder="SN123456" value={regSerial} onChange={(e) => setRegSerial(e.target.value)} />
              </div>
            </div>
            {regError && <p className="text-sm text-destructive">{regError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)} disabled={isRegistering}>Cancel</Button>
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={!!editDevice} onOpenChange={(open) => { if (!open) setEditDevice(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update device nickname or hostname.</DialogDescription>
          </DialogHeader>
          {editDevice && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Node ID</Label>
                <Input value={editDevice.node_id} disabled className="font-mono bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hostname</Label>
                <Input value={editHostname} onChange={(e) => setEditHostname(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDevice(null)} disabled={isEditing}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Device Confirmation */}
      <Dialog open={!!deleteDevice} onOpenChange={(open) => { if (!open) setDeleteDevice(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Device</DialogTitle>
            <DialogDescription>
              Remove "{deleteDevice?.node_id}" from your account? Active sessions will be terminated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDevice(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Lifetime Dialog */}
      <Dialog open={!!showActivateDialog} onOpenChange={(open) => { if (!open) setShowActivateDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Activation Duration</DialogTitle>
            <DialogDescription>How long should this membership be active?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={activateLifetime} onChange={(e) => setActivateLifetime(e.target.value)} placeholder="480" />
              <p className="text-xs text-muted-foreground">e.g. 480 = 8 hours, 60 = 1 hour</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(null)}>Cancel</Button>
            <Button onClick={() => { if (showActivateDialog) handleActivate(showActivateDialog); }} disabled={activatingId !== null}>
              {activatingId !== null && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Network Dialog */}
      <Dialog open={!!showJoinDialog} onOpenChange={(open) => { if (!open) { setShowJoinDialog(null); setJoinDeviceId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Network</DialogTitle>
            <DialogDescription>Select a registered device to join {showJoinDialog?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Device *</Label>
              <Select value={joinDeviceId} onValueChange={setJoinDeviceId}>
                <SelectTrigger><SelectValue placeholder="Select a device…" /></SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.device_nickname || d.hostname || d.node_id} ({d.node_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requestError && <p className="text-sm text-destructive">{requestError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowJoinDialog(null); setJoinDeviceId(""); }} disabled={isJoining}>Cancel</Button>
            <Button onClick={handleJoinNetwork} disabled={isJoining || !joinDeviceId}>
              {isJoining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Access Dialog */}
      <Dialog open={!!showRequestDialog} onOpenChange={(open) => { if (!open) { setShowRequestDialog(null); setRequestDeviceId(""); setRequestJustification(""); setRequestError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Network Access</DialogTitle>
            <DialogDescription>Request access to {showRequestDialog?.name}. A manager will review your request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Device *</Label>
              <Select value={requestDeviceId} onValueChange={setRequestDeviceId}>
                <SelectTrigger><SelectValue placeholder="Select a device…" /></SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.device_nickname || d.hostname || d.node_id} ({d.node_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Justification (optional)</Label>
              <Input
                placeholder="Engineering team access"
                value={requestJustification}
                onChange={(e) => setRequestJustification(e.target.value)}
              />
            </div>
            {requestError && <p className="text-sm text-destructive">{requestError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRequestDialog(null); setRequestDeviceId(""); setRequestJustification(""); setRequestError(null); }} disabled={isRequesting}>Cancel</Button>
            <Button onClick={handleRequestAccess} disabled={isRequesting || !requestDeviceId}>
              {isRequesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Detail Drawer */}
      <Sheet open={!!selectedDevice} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedDevice && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DeviceTypeIcon nickname={selectedDevice.device_nickname} hostname={selectedDevice.hostname} />
                  </div>
                  {selectedDevice.device_nickname || selectedDevice.node_id}
                </SheetTitle>
                <SheetDescription className="font-mono">{selectedDevice.node_id}</SheetDescription>
              </SheetHeader>

              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedDevice.hostname && (
                    <>
                      <span className="text-muted-foreground">Hostname</span>
                      <span>{selectedDevice.hostname}</span>
                    </>
                  )}
                  {selectedDevice.asset_tag && (
                    <>
                      <span className="text-muted-foreground">Asset Tag</span>
                      <span>{selectedDevice.asset_tag}</span>
                    </>
                  )}
                  {selectedDevice.serial_number && (
                    <>
                      <span className="text-muted-foreground">Serial</span>
                      <span>{selectedDevice.serial_number}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Registered</span>
                  <span>{formatDate(selectedDevice.created_at)}</span>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedDevice.status === "active" ? "default" : "outline"} className="w-fit">{selectedDevice.status}</Badge>
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Network Memberships ({deviceMemberships.length})
              </h3>

              {isDrawerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : deviceMemberships.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No memberships found. Request network access to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceMemberships.map((m) => {
                    const session = getActiveSession(m.id);
                    const network = networks.find((n) => n.id === m.portal_network_id);
                    return (
                      <div key={m.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{network?.name || m.portal_network_id}</span>
                            <MembershipStateBadge state={m.state} />
                          </div>
                          <div className="flex items-center gap-1">
                            {m.approved_for_activation && !m.currently_authorized && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowActivateDialog(m.id)}
                                disabled={activatingId === m.id}
                                className="gap-1"
                              >
                                {activatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                Activate
                              </Button>
                            )}
                            {m.currently_authorized && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeactivate(m.id)}
                                disabled={deactivatingId === m.id}
                                className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                {deactivatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </div>
                        {session && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Session expires: {formatExpiry(session.expires_at)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {m.join_seen ? (
                            <><CheckCircle className="w-3 h-3 text-green-500" /> Joined network</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> Not yet joined</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
