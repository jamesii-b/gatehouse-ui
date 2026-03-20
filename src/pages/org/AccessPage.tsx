import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Zap,
  ZapOff,
  AlertTriangle,
  Loader2,
  Search,
  MoreHorizontal,
  UserPlus,
  Trash2,
  RefreshCw,
  Skull,
  Activity,
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
  UserNetworkApproval,
  ActivationSession,
  KillSwitchEvent,
  PortalNetwork,
  OrganizationMember,
  ApprovalState,
  MembershipState,
  EnrichedMembership,
  DeviceStatus,
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

function ApprovalStateBadge({ state }: { state: ApprovalState }) {
  const config: Record<ApprovalState, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: <Clock className="w-3 h-3 mr-1" />, label: "Pending" },
    approved: { color: "bg-green-500/10 text-green-600 border-green-200", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "Approved" },
    rejected: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Rejected" },
    revoked: { color: "bg-red-500/10 text-red-600 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" />, label: "Revoked" },
    suspended: { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: <AlertTriangle className="w-3 h-3 mr-1" />, label: "Suspended" },
  };
  const { color, icon, label } = config[state] ?? { color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: null, label: state };
  return (
    <Badge className={cn("text-xs", color)}>
      {icon}{label}
    </Badge>
  );
}

export default function AccessPage() {
  const { orgId } = useCurrentOrganizationId();
  const { toast } = useToast();

  const [approvals, setApprovals] = useState<UserNetworkApproval[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<UserNetworkApproval[]>([]);
  const [sessions, setSessions] = useState<ActivationSession[]>([]);
  const [killSwitchEvents, setKillSwitchEvents] = useState<KillSwitchEvent[]>([]);
  const [networks, setNetworks] = useState<PortalNetwork[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState<string>("all");

  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignNetworkId, setAssignNetworkId] = useState("");
  const [assignJustification, setAssignJustification] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [killTargetUserId, setKillTargetUserId] = useState("");
  const [killScope, setKillScope] = useState<"organization" | "global">("organization");
  const [killReason, setKillReason] = useState("");
  const [isKilling, setIsKilling] = useState(false);
  const [killError, setKillError] = useState<string | null>(null);

  const [endSessionId, setEndSessionId] = useState<string | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);

  const [selectedApproval, setSelectedApproval] = useState<UserNetworkApproval | null>(null);
  const [allMemberships, setAllMemberships] = useState<EnrichedMembership[]>([]);
  const [isAllMembersLoading, setIsAllMembersLoading] = useState(false);
  const [allMembersSearch, setAllMembersSearch] = useState("");
  const [allMembersNetworkFilter, setAllMembersNetworkFilter] = useState<string>("all");
  const [allMembersStateFilter, setAllMembersStateFilter] = useState<string>("all");
  const [selectedMembership, setSelectedMembership] = useState<EnrichedMembership | null>(null);
  const [adminActivatingId, setAdminActivatingId] = useState<string | null>(null);
  const [adminDeactivatingId, setAdminDeactivatingId] = useState<string | null>(null);
  const [adminDeletingId, setAdminDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const [pendingRes, allApprovalsRes, sessionsRes, networksRes, membersRes, allMemsRes] = await Promise.allSettled([
        api.zerotier.listPendingApprovals(orgId),
        api.zerotier.listMyApprovals(orgId),
        api.zerotier.listSessions(orgId),
        api.zerotier.listNetworks(orgId),
        api.organizations.getMembers(orgId),
        api.zerotier.adminListAllMemberships(orgId),
      ]);
      if (pendingRes.status === "fulfilled") setPendingApprovals(pendingRes.value.approvals || []);
      if (allApprovalsRes.status === "fulfilled") setApprovals(allApprovalsRes.value.approvals || []);
      if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.sessions || []);
      if (networksRes.status === "fulfilled") setNetworks(networksRes.value.networks || []);
      if (membersRes.status === "fulfilled") setOrgMembers(membersRes.value.members || []);
      if (allMemsRes.status === "fulfilled") setAllMemberships(allMemsRes.value.memberships || []);
    } catch {
      setError("Failed to load access data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    setApprovals([]);
    setPendingApprovals([]);
    fetchData();
  }, [fetchData]);

  const handleApprove = async (approvalId: string) => {
    if (!orgId) return;
    setApproveId(approvalId);
    setIsApproving(true);
    try {
      await api.zerotier.approveRequest(orgId, approvalId);
      toast({ title: "Request approved" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to approve", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setApproveId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    if (!orgId) return;
    setRejectId(approvalId);
    setIsApproving(true);
    try {
      await api.zerotier.rejectRequest(orgId, approvalId);
      toast({ title: "Request rejected" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to reject", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setRejectId(null);
    }
  };

  const handleRevoke = async (approvalId: string) => {
    if (!orgId) return;
    setRevokeId(approvalId);
    setIsApproving(true);
    try {
      await api.zerotier.revokeApproval(orgId, approvalId);
      toast({ title: "Approval revoked" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to revoke", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setRevokeId(null);
    }
  };

  const handleAssign = async () => {
    if (!orgId) return;
    setAssignError(null);
    if (!assignUserId) { setAssignError("Please select a user."); return; }
    if (!assignNetworkId) { setAssignError("Please select a network."); return; }
    setIsAssigning(true);
    try {
      await api.zerotier.assignAccess(orgId, {
        target_user_id: assignUserId,
        portal_network_id: assignNetworkId,
        justification: assignJustification.trim() || undefined,
      });
      toast({ title: "Access assigned", description: "The user can now register devices for this network." });
      setShowAssign(false);
      setAssignUserId(""); setAssignNetworkId(""); setAssignJustification("");
      fetchData();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Failed to assign access.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleKillSwitch = async () => {
    if (!orgId) return;
    setKillError(null);
    if (!killTargetUserId) { setKillError("Please select a user."); return; }
    setIsKilling(true);
    try {
      await api.zerotier.triggerKillSwitch(orgId, {
        target_user_id: killTargetUserId,
        scope: killScope,
        reason: killReason.trim() || undefined,
      });
      toast({ title: "Kill switch triggered", description: "All active sessions have been terminated." });
      setShowKillSwitch(false);
      setKillTargetUserId(""); setKillScope("organization"); setKillReason("");
      fetchData();
    } catch (err) {
      setKillError(err instanceof ApiError ? err.message : "Failed to trigger kill switch.");
    } finally {
      setIsKilling(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!orgId) return;
    setEndSessionId(sessionId);
    setIsEndingSession(true);
    try {
      await api.zerotier.endSession(orgId, sessionId);
      toast({ title: "Session ended" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to end session", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setEndSessionId(null);
    }
  };

  const handleAdminActivate = async (membershipId: string) => {
    if (!orgId) return;
    setAdminActivatingId(membershipId);
    try {
      await api.zerotier.activateMembership(orgId, membershipId);
      toast({ title: "Membership activated" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to activate", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setAdminActivatingId(null);
    }
  };

  const handleAdminDeactivate = async (membershipId: string) => {
    if (!orgId) return;
    setAdminDeactivatingId(membershipId);
    try {
      await api.zerotier.deactivateMembership(orgId, membershipId);
      toast({ title: "Membership deactivated" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to deactivate", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setAdminDeactivatingId(null);
    }
  };

  const handleAdminDelete = async (membershipId: string) => {
    if (!orgId) return;
    setAdminDeletingId(membershipId);
    try {
      await api.zerotier.adminDeleteMembership(orgId, membershipId);
      toast({ title: "Membership permanently deleted" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete membership", description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setAdminDeletingId(null);
    }
  };

  const filteredPending = pendingApprovals.filter((a) => {
    if (selectedNetworkFilter !== "all" && a.portal_network_id !== selectedNetworkFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.user_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredSessions = sessions.filter((s) => s.is_active);
  const activeSessions = filteredSessions;

  const getNetworkName = (networkId: string) => {
    return networks.find((n) => n.id === networkId)?.name ?? networkId;
  };

  const getUserDisplay = (userId: string) => {
    const member = orgMembers.find((m) => m.user_id === userId);
    return member?.user?.email ?? member?.user?.full_name ?? userId;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Access Control</h1>
        <p className="page-description">Manage network access requests, approvals, and active sessions</p>
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedNetworkFilter} onValueChange={setSelectedNetworkFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All networks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            {networks.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowAssign(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Assign Access
        </Button>
        <Button variant="destructive" onClick={() => setShowKillSwitch(true)} className="gap-2">
          <Skull className="w-4 h-4" /> Kill Switch
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending Requests
            {filteredPending.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
                {filteredPending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Active Sessions
            {activeSessions.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] font-bold">
                {activeSessions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">
            All Approvals ({approvals.length})
          </TabsTrigger>
          <TabsTrigger value="allmembers">
            All Members ({allMemberships.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Access Requests
              </CardTitle>
              <CardDescription>Review and approve or reject network access requests</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading…</span>
                </div>
              ) : filteredPending.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search || selectedNetworkFilter !== "all" ? "No pending requests match your filters." : "No pending requests at this time."}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPending.map((approval) => (
                    <div key={approval.id} className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{getUserDisplay(approval.user_id)}</p>
                          <Badge variant="outline" className="text-xs">{getNetworkName(approval.portal_network_id)}</Badge>
                          <ApprovalStateBadge state={approval.state} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {approval.grant_type === "requested" ? "User request" : "Manager assignment"}
                          {approval.justification && ` — "${approval.justification}"`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(approval.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 gap-1"
                          onClick={() => handleApprove(approval.id)}
                          disabled={approveId === approval.id || isApproving}
                        >
                          {approveId === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 gap-1"
                          onClick={() => handleReject(approval.id)}
                          disabled={rejectId === approval.id || isApproving}
                        >
                          {rejectId === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                Active Sessions
              </CardTitle>
              <CardDescription>Temporarily activated memberships currently in use</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading…</span>
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No active sessions.</div>
              ) : (
                <div className="divide-y">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-4 p-4">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium font-mono truncate">{session.device_network_membership_id}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>Activated: {formatDate(session.authenticated_at)}</span>
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatExpiry(session.expires_at)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 gap-1 flex-shrink-0"
                        onClick={() => handleEndSession(session.id)}
                        disabled={endSessionId === session.id}
                      >
                        {endSessionId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
                        End Session
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Approvals */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                All Approvals
              </CardTitle>
              <CardDescription>Complete history of network access grants</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading…</span>
                </div>
              ) : approvals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No approvals found.</div>
              ) : (
                <div className="divide-y">
                  {approvals.map((approval) => (
                    <div key={approval.id} className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{getUserDisplay(approval.user_id)}</p>
                          <Badge variant="outline" className="text-xs">{getNetworkName(approval.portal_network_id)}</Badge>
                          <ApprovalStateBadge state={approval.state} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {approval.grant_type === "requested" ? "User request" : "Manager assignment"}
                          {approval.justification && ` — "${approval.justification}"`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(approval.created_at)}
                          {approval.granted_by_user_id && ` · Granted by: ${getUserDisplay(approval.granted_by_user_id)}`}
                        </p>
                      </div>
                      {(approval.state === "approved" || approval.state === "suspended") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 gap-1 flex-shrink-0"
                          onClick={() => handleRevoke(approval.id)}
                          disabled={revokeId === approval.id || isApproving}
                        >
                          {revokeId === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Members */}
        <TabsContent value="allmembers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Members
              </CardTitle>
              <CardDescription>Every device membership across all users and networks</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isAllMembersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading…</span>
                </div>
              ) : allMemberships.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No memberships found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Device</th>
                        <th className="text-left p-3 font-medium">Network</th>
                        <th className="text-left p-3 font-medium">State</th>
                        <th className="text-left p-3 font-medium">Active Session</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allMemberships.map((m) => (
                        <tr key={m.id} className="hover:bg-accent/30">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{m.user_full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{m.user_email || m.user_id}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-mono text-xs">{m.device_node_id || "—"}</p>
                              <p className="text-xs text-muted-foreground">{m.device_nickname || m.device_hostname || "—"}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-xs">{m.network_name || m.portal_network_id}</p>
                              {m.network_environment && (
                                <Badge variant="outline" className="text-xs">{m.network_environment}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {m.state ? (
                              <Badge
                                variant={
                                  m.state === "active_authorized" ? "default" :
                                  m.state === "approved_inactive" ? "secondary" :
                                  "outline"
                                }
                                className="text-xs"
                              >
                                {m.state}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="p-3">
                            {m.active_session ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {formatExpiry(m.active_session.expires_at)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {m.approved_for_activation && !m.currently_authorized && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdminActivate(m.id)}
                                  disabled={adminActivatingId === m.id}
                                  className="gap-1 h-7 px-2"
                                >
                                  {adminActivatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                  Activate
                                </Button>
                              )}
                              {m.currently_authorized && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdminDeactivate(m.id)}
                                  disabled={adminDeactivatingId === m.id}
                                  className="gap-1 h-7 px-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                >
                                  {adminDeactivatingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ZapOff className="w-3 h-3" />}
                                  Deactivate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAdminDelete(m.id)}
                                disabled={adminDeletingId === m.id}
                                className="gap-1 h-7 px-2 text-destructive hover:bg-destructive/10"
                              >
                                {adminDeletingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Access Dialog */}
      <Dialog open={showAssign} onOpenChange={(open) => { if (!open) setShowAssign(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Network Access</DialogTitle>
            <DialogDescription>Grant a user direct access to a network without a request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent>
                  {orgMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Network *</Label>
              <Select value={assignNetworkId} onValueChange={setAssignNetworkId}>
                <SelectTrigger><SelectValue placeholder="Select a network…" /></SelectTrigger>
                <SelectContent>
                  {networks.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Justification (optional)</Label>
              <Input
                placeholder="Engineering team access"
                value={assignJustification}
                onChange={(e) => setAssignJustification(e.target.value)}
              />
            </div>
            {assignError && <p className="text-sm text-destructive">{assignError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)} disabled={isAssigning}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kill Switch Dialog */}
      <Dialog open={showKillSwitch} onOpenChange={(open) => { if (!open) setShowKillSwitch(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Skull className="w-5 h-5" />
              Kill Switch
            </DialogTitle>
            <DialogDescription>
              Instantly deactivate all active sessions for a user across all managed networks. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  This will immediately de-authorize all ZeroTier memberships for the selected user across all networks.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target User *</Label>
              <Select value={killTargetUserId} onValueChange={setKillTargetUserId}>
                <SelectTrigger><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent>
                  {orgMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={killScope} onValueChange={(v) => setKillScope(v as "organization" | "global")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organization only</SelectItem>
                  <SelectItem value="global">Global (all networks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="User terminated / device lost"
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
              />
            </div>
            {killError && <p className="text-sm text-destructive">{killError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKillSwitch(false)} disabled={isKilling}>Cancel</Button>
            <Button variant="destructive" onClick={handleKillSwitch} disabled={isKilling}>
              {isKilling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Trigger Kill Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
