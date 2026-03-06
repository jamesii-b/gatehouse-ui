import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Shield,
  ShieldCheck,
  Mail,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  User,
  Key,
  Plus,
  Ban,
  UserCheck,
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  CheckCircle,
  XCircle,
  Crown,
  Trash2,
  ShieldOff,
  Link2,
  Unlink,
  Smartphone,
  KeyRound,
  Lock,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api, OrganizationMember, ApiError, OrgInvite, SSHKey, User as ApiUser, AdminMfaMethod, AdminLinkedAccount } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { useAuth } from "@/contexts/AuthContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const raw = typeof d === "string" && !(d.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(d)) ? d + "Z" : d;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(raw));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isSuspended(status: string | undefined) {
  return status === "suspended" || status === "compliance_suspended";
}

function RoleBadge({ role }: { role: string }) {
  const r = (role || "").toLowerCase();
  if (r === "owner") {
    return (
      <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">
        <ShieldCheck className="w-3 h-3 mr-1" />Owner
      </Badge>
    );
  }
  if (r === "admin") {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">
        <Shield className="w-3 h-3 mr-1" />Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      Member
    </Badge>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MembersPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // ── Member list ──────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── User detail drawer ───────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);
  const [userSshKeys, setUserSshKeys] = useState<SSHKey[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  // ── MFA management (drawer) ──────────────────────────────────────────────────
  const [userMfaMethods, setUserMfaMethods] = useState<AdminMfaMethod[]>([]);
  const [removingMfaId, setRemovingMfaId] = useState<string | null>(null);
  const [showRemoveAllMfa, setShowRemoveAllMfa] = useState(false);
  const [isRemovingAllMfa, setIsRemovingAllMfa] = useState(false);

  // ── Linked OAuth accounts (drawer) ──────────────────────────────────────────
  const [userLinkedAccounts, setUserLinkedAccounts] = useState<AdminLinkedAccount[]>([]);
  const [totalAuthMethods, setTotalAuthMethods] = useState(0);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  // ── Admin set / change password (drawer) ────────────────────────────────────
  const [adminPwNew, setAdminPwNew] = useState("");
  const [adminPwConfirm, setAdminPwConfirm] = useState("");
  const [adminPwError, setAdminPwError] = useState<string | null>(null);
  const [isSettingPw, setIsSettingPw] = useState(false);
  const [adminPwSuccess, setAdminPwSuccess] = useState(false);

  // ── Suspend / Unsuspend ──────────────────────────────────────────────────────
  const [isSuspending, setIsSuspending] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  // ── Role update (via drawer) ─────────────────────────────────────────────────
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // ── Admin add SSH key dialog ─────────────────────────────────────────────────
  const [showAddKey, setShowAddKey] = useState(false);
  const [addKeyPublicKey, setAddKeyPublicKey] = useState("");
  const [addKeyDescription, setAddKeyDescription] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [addKeyError, setAddKeyError] = useState<string | null>(null);

  // ── Change role dialog (from row dropdown) ───────────────────────────────────
  const [changeRoleMember, setChangeRoleMember] = useState<OrganizationMember | null>(null);
  const [newRole, setNewRole] = useState("member");
  const [isChangingRole, setIsChangingRole] = useState(false);

  // ── Remove member ────────────────────────────────────────────────────────────
  const [removeMember, setRemoveMember] = useState<OrganizationMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // ── Remove MFA (drawer) ─────────────────────────────────────────────────────────
  const handleRemoveMfaMethod = async (method: AdminMfaMethod) => {
    if (!selectedMember) return;
    setRemovingMfaId(method.id);
    try {
      const methodType = method.type as 'totp' | 'webauthn';
      const credId = method.type === 'webauthn' ? method.id : undefined;
      await api.admin.removeUserMfa(selectedMember.user_id, methodType, credId);
      const refreshed = await api.admin.getUserMfa(selectedMember.user_id);
      setUserMfaMethods(refreshed.mfa_methods);
      toast({ title: 'MFA method removed', description: `${method.name} has been removed for ${selectedMember.user?.email}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to remove MFA method', description: err instanceof ApiError ? err.message : 'Something went wrong.' });
    } finally {
      setRemovingMfaId(null);
    }
  };

  const handleRemoveAllMfa = async () => {
    if (!selectedMember) return;
    setIsRemovingAllMfa(true);
    try {
      await api.admin.removeUserMfa(selectedMember.user_id, 'all');
      setUserMfaMethods([]);
      setShowRemoveAllMfa(false);
      toast({ title: 'All MFA methods removed', description: `All MFA methods for ${selectedMember.user?.email} have been cleared.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to remove MFA methods', description: err instanceof ApiError ? err.message : 'Something went wrong.' });
    } finally {
      setIsRemovingAllMfa(false);
    }
  };

  // ── Unlink OAuth provider (drawer) ────────────────────────────────────────────
  const handleUnlinkProvider = async (account: AdminLinkedAccount) => {
    if (!selectedMember) return;
    setUnlinkingProvider(account.id);
    try {
      await api.admin.adminUnlinkUserProvider(selectedMember.user_id, account.provider_type);
      setUserLinkedAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setTotalAuthMethods((prev) => prev - 1);
      toast({ title: 'Provider unlinked', description: `${capitalize(account.provider_type)} has been unlinked from ${selectedMember.user?.email}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to unlink provider', description: err instanceof ApiError ? err.message : 'Something went wrong.' });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  // ── Admin set / change password ──────────────────────────────────────────────
  const handleAdminSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setAdminPwError(null);
    setAdminPwSuccess(false);
    if (adminPwNew.length < 8) {
      setAdminPwError("Password must be at least 8 characters.");
      return;
    }
    if (adminPwNew !== adminPwConfirm) {
      setAdminPwError("Passwords do not match.");
      return;
    }
    setIsSettingPw(true);
    try {
      await api.admin.adminSetUserPassword(selectedMember.user_id, adminPwNew);
      setAdminPwNew("");
      setAdminPwConfirm("");
      setAdminPwSuccess(true);
      // Refresh detailUser so has_password reflects the new state
      const refreshed = await api.admin.getUser(selectedMember.user_id);
      setDetailUser(refreshed.user);
      toast({ title: detailUser?.has_password ? "Password updated" : "Password set", description: `Password ${detailUser?.has_password ? "changed" : "created"} for ${selectedMember.user?.email}.` });
    } catch (err) {
      setAdminPwError(err instanceof ApiError ? err.message : "Failed to update password.");
    } finally {
      setIsSettingPw(false);
    }
  };


  // ── Invite ───────────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Invite link dialog
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkEmail, setInviteLinkEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Pending invites ──────────────────────────────────────────────────────────
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isInvitesLoading, setIsInvitesLoading] = useState(false);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  // ── Transfer ownership ───────────────────────────────────────────────────────
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);

  // ── Hard delete ──────────────────────────────────────────────────────────────
  const [showHardDelete, setShowHardDelete] = useState(false);
  const [hardDeleteConfirmEmail, setHardDeleteConfirmEmail] = useState("");
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // ── Fetch members ────────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.organizations.getMembers(orgId);
      setMembers(response.members || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Failed to load members. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  const fetchInvites = useCallback(async () => {
    if (!orgId) return;
    setIsInvitesLoading(true);
    try {
      const res = await api.organizations.getInvites(orgId);
      setInvites(res.invites || []);
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    } finally {
      setIsInvitesLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    setMembers([]);
    setError(null);
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  // ── Open user drawer ─────────────────────────────────────────────────────────
  const openMemberDrawer = async (member: OrganizationMember) => {
    setSelectedMember(member);
    setDetailUser(null);
    setUserSshKeys([]);
    setIsDrawerLoading(true);
    setUserMfaMethods([]);
    setUserLinkedAccounts([]);
    setTotalAuthMethods(0);
    try {
      const [userData, mfaData, linkedData] = await Promise.allSettled([
        api.admin.getUser(member.user_id),
        api.admin.getUserMfa(member.user_id),
        api.admin.getUserLinkedAccounts(member.user_id),
      ]);
      if (userData.status === 'fulfilled') {
        setDetailUser(userData.value.user);
        setUserSshKeys(userData.value.ssh_keys);
      }
      if (mfaData.status === 'fulfilled') setUserMfaMethods(mfaData.value.mfa_methods);
      if (linkedData.status === 'fulfilled') {
        setUserLinkedAccounts(linkedData.value.linked_accounts);
        setTotalAuthMethods(linkedData.value.total_auth_methods);
      }
    } catch {
      // Non-fatal — drawer still shows member info
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedMember(null);
    setDetailUser(null);
    setUserSshKeys([]);
    setUserMfaMethods([]);
    setUserLinkedAccounts([]);
    setTotalAuthMethods(0);
    setAdminPwNew("");
    setAdminPwConfirm("");
    setAdminPwError(null);
    setAdminPwSuccess(false);
  };

  // ── Role change (drawer inline select) ──────────────────────────────────────
  const handleDrawerRoleChange = async (newRoleValue: string) => {
    if (!orgId || !selectedMember) return;
    setIsUpdatingRole(true);
    try {
      const updated = await api.organizations.updateMemberRole(orgId, selectedMember.user_id, newRoleValue.toLowerCase());
      const updatedRole = updated.member.role;
      setSelectedMember((prev) => prev ? { ...prev, role: updatedRole } : prev);
      setMembers((prev) =>
        prev.map((m) => m.id === selectedMember.id ? { ...m, role: updatedRole } : m)
      );
      toast({
        title: "Role updated",
        description: `${selectedMember.user?.full_name || selectedMember.user?.email} is now a ${updatedRole}.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // ── Suspend ──────────────────────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!selectedMember) return;
    setIsSuspending(true);
    try {
      const data = await api.admin.suspendUser(selectedMember.user_id);
      const newStatus = data.user.status;
      setDetailUser((prev) => prev ? { ...prev, status: newStatus } : prev);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, user: m.user ? { ...m.user, status: newStatus } : m.user }
            : m
        )
      );
      setSelectedMember((prev) =>
        prev ? { ...prev, user: prev.user ? { ...prev.user, status: newStatus } : prev.user } : prev
      );
      setShowSuspendConfirm(false);
      toast({
        title: "User suspended",
        description: `${selectedMember.user?.full_name || selectedMember.user?.email} has been suspended.`,
      });
    } catch (err) {
      setShowSuspendConfirm(false);
      if (err instanceof ApiError && err.type === "OWNER_PROTECTION") {
        toast({
          variant: "destructive",
          title: "Cannot suspend organization owner",
          description: "Transfer ownership to another member before suspending this account.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to suspend user",
          description: err instanceof ApiError ? err.message : "Something went wrong.",
        });
      }
    } finally {
      setIsSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedMember) return;
    setIsSuspending(true);
    try {
      const data = await api.admin.unsuspendUser(selectedMember.user_id);
      const newStatus = data.user.status;
      setDetailUser((prev) => prev ? { ...prev, status: newStatus } : prev);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, user: m.user ? { ...m.user, status: newStatus } : m.user }
            : m
        )
      );
      setSelectedMember((prev) =>
        prev ? { ...prev, user: prev.user ? { ...prev.user, status: newStatus } : prev.user } : prev
      );
      toast({
        title: "User unsuspended",
        description: `${selectedMember.user?.full_name || selectedMember.user?.email} is now active.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to unsuspend user",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsSuspending(false);
    }
  };

  // ── Admin add SSH key ────────────────────────────────────────────────────────
  const handleAddKey = async () => {
    if (!selectedMember) return;
    setAddKeyError(null);
    if (!addKeyPublicKey.trim()) {
      setAddKeyError("Public key is required.");
      return;
    }
    setIsAddingKey(true);
    try {
      const key = await api.ssh.adminAddKey(
        selectedMember.user_id,
        addKeyPublicKey.trim(),
        addKeyDescription.trim() || undefined
      );
      setUserSshKeys((prev) => [...prev, key]);
      toast({ title: "SSH key added", description: `Key added for ${selectedMember.user?.email}` });
      setShowAddKey(false);
      setAddKeyPublicKey("");
      setAddKeyDescription("");
    } catch (err) {
      setAddKeyError(err instanceof ApiError ? err.message : "Failed to add key.");
    } finally {
      setIsAddingKey(false);
    }
  };

  // ── Change role (row dropdown) ───────────────────────────────────────────────
  const handleChangeRole = async () => {
    if (!orgId || !changeRoleMember) return;
    setIsChangingRole(true);
    try {
      const updated = await api.organizations.updateMemberRole(orgId, changeRoleMember.user_id, newRole.toLowerCase());
      const updatedRole = updated.member.role;
      setMembers((prev) =>
        prev.map((m) => m.id === changeRoleMember.id ? { ...m, role: updatedRole } : m)
      );
      toast({
        title: "Role updated",
        description: `${changeRoleMember.user?.full_name || changeRoleMember.user?.email} is now a ${updatedRole}.`,
      });
      setChangeRoleMember(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsChangingRole(false);
    }
  };

  // ── Remove member ────────────────────────────────────────────────────────────
  const handleRemoveMember = async () => {
    if (!orgId || !removeMember) return;
    setIsRemoving(true);
    try {
      await api.organizations.removeMember(orgId, removeMember.user_id);
      setMembers((prev) => prev.filter((m) => m.id !== removeMember.id));
      toast({
        title: "Member removed",
        description: `${removeMember.user?.full_name || removeMember.user?.email} has been removed.`,
      });
      setRemoveMember(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to remove member",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Transfer ownership ───────────────────────────────────────────────────────
  const handleTransferOwnership = async () => {
    if (!orgId || !selectedMember) return;
    setIsTransferringOwnership(true);
    try {
      await api.organizations.transferOwnership(orgId, selectedMember.user_id);
      await fetchMembers();
      setShowTransferOwnership(false);
      closeDrawer();
      toast({
        title: "Ownership transferred",
        description: `${selectedMember.user?.full_name || selectedMember.user?.email} is now the organization owner.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to transfer ownership",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  // ── Hard delete ──────────────────────────────────────────────────────────────
  const handleHardDelete = async () => {
    if (!selectedMember) return;
    setIsHardDeleting(true);
    try {
      const result = await api.admin.hardDeleteUser(selectedMember.user_id);
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      setShowHardDelete(false);
      closeDrawer();
      toast({
        title: "User permanently deleted",
        description: `${result.deleted_user_email} — ${result.certs_revoked} cert(s) revoked, ${result.ssh_keys_deleted} key(s) deleted.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setIsHardDeleting(false);
    }
  };

  // ── Invite ───────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!orgId) return;
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setIsInviting(true);
    try {
      const res = await api.organizations.createInvite(orgId, inviteEmail.trim(), inviteRole);
      const link = res.invite?.invite_link;
      await fetchInvites();
      if (link) {
        setInviteLink(link);
        setInviteLinkEmail(inviteEmail.trim());
      } else {
        toast({ title: "Invitation sent", description: `Invite email sent to ${inviteEmail.trim()}.` });
      }
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  // ── Filtered members ─────────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.user?.full_name?.toLowerCase().includes(q) ?? false) ||
      (m.user?.email.toLowerCase().includes(q) ?? false)
    );
  });

  // ── Derived status for drawer ────────────────────────────────────────────────
  const drawerStatus = detailUser?.status ?? selectedMember?.user?.status;
  const drawerActivated = detailUser?.activated ?? undefined;
  const drawerLastLogin = detailUser?.last_login_at ?? selectedMember?.user?.last_login_at ?? null;
  const drawerCreatedAt = detailUser?.created_at ?? selectedMember?.user?.created_at ?? selectedMember?.created_at ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Members</h1>
        <p className="page-description">Manage organization members and invitations</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invites">
            Invitations{invites.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {invites.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Members tab ────────────────────────────────────────────────────── */}
        <TabsContent value="members">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 max-w-sm"
              />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Members
                {!isLoading && (
                  <Badge variant="secondary" className="ml-1">{members.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Click a member to view details, manage their role, or administer SSH keys
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading members…</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">{error}</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No members found</div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => {
                    const memberStatus = member.user?.status;
                    const suspended = isSuspended(memberStatus);
                    const isOwner = (member.role || "").toLowerCase() === "owner";
                    const isSelf = member.user?.id === currentUser?.id;
                    return (
                      <button
                        key={member.id}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
                        onClick={() => openMemberDrawer(member)}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={member.user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(member.user?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                              {member.user?.full_name || member.user?.email}
                            </p>
                            <RoleBadge role={member.role} />
                            {suspended && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
                                <Ban className="w-3 h-3 mr-1" />Suspended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user?.email}
                          </p>
                        </div>
                        {/* Row action menu — hide for owners and self */}
                        {!isSelf && !isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon" className="flex-shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChangeRoleMember(member);
                                  setNewRole((member.role || "member").toLowerCase());
                                }}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Change role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRemoveMember(member);
                                }}
                              >
                                Remove member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invitations tab ─────────────────────────────────────────────────── */}
        <TabsContent value="invites">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending invites list */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Pending invitations</h3>
                  <span className="text-sm text-muted-foreground">
                    {isInvitesLoading ? "Loading…" : invites.length}
                  </span>
                </div>
                {isInvitesLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading invites…</div>
                ) : invites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No pending invitations</div>
                ) : (
                  <div className="divide-y">
                    {invites.map((inv) => (
                      <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{inv.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Role: {inv.role} · Expires: {new Date(inv.expires_at).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={cancellingInviteId === inv.id}
                          onClick={() => {
                            void (async () => {
                              if (!orgId) return;
                              setCancellingInviteId(inv.id);
                              try {
                                await api.organizations.cancelInvite(orgId, inv.id);
                                setInvites((prev) => prev.filter((i) => i.id !== inv.id));
                                toast({ title: "Invite cancelled" });
                              } catch {
                                toast({ variant: "destructive", title: "Failed to cancel invite" });
                              } finally {
                                setCancellingInviteId(null);
                              }
                            })();
                          }}
                        >
                          {cancellingInviteId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invite form */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Send an invitation</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  )}
                  <Button
                    onClick={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                    className="w-full"
                  >
                    {isInviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Mail className="w-4 h-4 mr-2" />
                    Send invitation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── User detail drawer ──────────────────────────────────────────────────── */}
      <Sheet open={!!selectedMember} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMember && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={selectedMember.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(selectedMember.user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedMember.user?.full_name || selectedMember.user?.email}</span>
                </SheetTitle>
                <SheetDescription>{selectedMember.user?.email}</SheetDescription>
              </SheetHeader>

              {isDrawerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Basic info */}
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="flex items-center gap-1">
                        {isSuspended(drawerStatus) ? (
                          <>
                            <Ban className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 font-medium">
                              Suspended{drawerStatus === "compliance_suspended" ? " (compliance)" : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-600">Active</span>
                          </>
                        )}
                      </span>
                      <span className="text-muted-foreground">Joined</span>
                      <span>{formatDate(drawerCreatedAt)}</span>
                      {drawerActivated !== undefined && (
                        <>
                          <span className="text-muted-foreground">Activated</span>
                          <span className="flex items-center gap-1">
                            {drawerActivated === false ? (
                              <><XCircle className="w-4 h-4 text-amber-500" /> No</>
                            ) : (
                              <><CheckCircle className="w-4 h-4 text-green-500" /> Yes</>
                            )}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground">Last login</span>
                      <span>{formatDate(drawerLastLogin)}</span>
                    </div>
                  </div>

                  {/* Suspend / Unsuspend */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-6 p-4 border rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Ban className="w-4 h-4" />
                        Account Access
                      </h3>
                      {isSuspended(drawerStatus) ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {drawerStatus === "compliance_suspended"
                              ? "This account is suspended due to MFA compliance. The user cannot request certificates."
                              : "This account is suspended. The user cannot request certificates."}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleUnsuspend}
                            disabled={isSuspending}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            {isSuspending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-2" />
                            )}
                            Restore account
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Suspending blocks this user from requesting SSH certificates.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowSuspendConfirm(true)}
                            disabled={isSuspending}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend account
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Role management */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-6 p-4 border rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Organization Role
                      </h3>
                      {(selectedMember.role || "").toLowerCase() === "owner" ? (
                        <p className="text-xs text-muted-foreground">
                          Owner role cannot be changed here. Transfer ownership from organization settings.
                        </p>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Select
                            value={(selectedMember.role || "member").toLowerCase()}
                            onValueChange={handleDrawerRoleChange}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transfer Ownership — shown when current user is owner and target is not */}
                  {selectedMember.user?.id !== currentUser?.id &&
                    (selectedMember.role || "").toLowerCase() !== "owner" &&
                    members.some(
                      (m) => m.user?.id === currentUser?.id && (m.role || "").toLowerCase() === "owner"
                    ) && (
                    <div className="mb-6 p-4 border rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Transfer Ownership
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Make this member the new organization owner. You will be demoted to admin.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTransferOwnership(true)}
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Transfer ownership to this member
                      </Button>
                    </div>
                  )}

                  {/* Danger zone — Hard delete */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-6 p-4 border border-destructive/30 rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Danger Zone
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this user account. This cannot be undone — all SSH keys and certificates will be revoked.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setHardDeleteConfirmEmail(""); setShowHardDelete(true); }}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Permanently delete account
                      </Button>
                    </div>
                  )}

                  {/* MFA Methods */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-6 p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ShieldOff className="w-4 h-4" />
                          MFA / 2FA Methods
                        </h3>
                        {userMfaMethods.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowRemoveAllMfa(true)}
                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove all
                          </Button>
                        )}
                      </div>
                      {isDrawerLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : userMfaMethods.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No MFA methods configured.</p>
                      ) : (
                        <div className="space-y-2">
                          {userMfaMethods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {method.type === "totp" ? (
                                  <Smartphone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <KeyRound className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{method.name}</p>
                                  {method.last_used_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Last used: {formatDate(method.last_used_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveMfaMethod(method)}
                                disabled={removingMfaId === method.id}
                                className="text-red-600 hover:bg-red-50 flex-shrink-0 ml-2"
                                title={`Remove ${method.name}`}
                              >
                                {removingMfaId === method.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Remove an MFA method if the user has lost access (e.g. lost phone or passkey). They can re-enroll after removal.
                      </p>
                    </div>
                  )}

                  {/* Linked OAuth Accounts */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-6 p-4 border rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Linked OAuth Accounts
                      </h3>
                      {isDrawerLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : userLinkedAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No OAuth providers linked.</p>
                      ) : (
                        <div className="space-y-2">
                          {userLinkedAccounts.map((account) => {
                            const isOnlyMethod = totalAuthMethods <= 1;
                            return (
                              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium capitalize">{account.provider_type}</p>
                                    {account.email && (
                                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                                    )}
                                    {account.linked_at && (
                                      <p className="text-xs text-muted-foreground">
                                        Linked: {formatDate(account.linked_at)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnlinkProvider(account)}
                                  disabled={unlinkingProvider === account.id || isOnlyMethod}
                                  className="text-red-600 hover:bg-red-50 flex-shrink-0 ml-2"
                                  title={isOnlyMethod ? "Cannot unlink — this is the user's only sign-in method" : `Unlink ${account.provider_type}`}
                                >
                                  {unlinkingProvider === account.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Unlink className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Unlink a provider to prevent sign-in via that provider. Cannot unlink if it is the user's only sign-in method.
                      </p>
                    </div>
                  )}

                  {/* Password Management */}
                  {selectedMember.user?.id !== currentUser?.id && (
                    <div className="mb-2 p-4 border rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {detailUser?.has_password ? "Reset Password" : "Set Password"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {detailUser?.has_password
                          ? "Override this user's current password. They will need to use the new password on next login."
                          : "This user has no password configured (sign-in via OIDC/OAuth only). Set one to enable email/password login."}
                      </p>
                      <form onSubmit={handleAdminSetPassword} className="space-y-2">
                        <Input
                          type="password"
                          placeholder="New password"
                          value={adminPwNew}
                          onChange={(e) => { setAdminPwNew(e.target.value); setAdminPwError(null); setAdminPwSuccess(false); }}
                          disabled={isSettingPw}
                          autoComplete="new-password"
                        />
                        <Input
                          type="password"
                          placeholder="Confirm password"
                          value={adminPwConfirm}
                          onChange={(e) => { setAdminPwConfirm(e.target.value); setAdminPwError(null); setAdminPwSuccess(false); }}
                          disabled={isSettingPw}
                          autoComplete="new-password"
                        />
                        {adminPwError && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {adminPwError}
                          </p>
                        )}
                        {adminPwSuccess && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            Password updated successfully.
                          </p>
                        )}
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={isSettingPw || !adminPwNew || !adminPwConfirm}
                        >
                          {isSettingPw ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                          ) : (
                            <><Lock className="w-4 h-4 mr-2" />{detailUser?.has_password ? "Reset password" : "Set password"}</>
                          )}
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* SSH Keys */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        SSH Keys
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowAddKey(true)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add key
                      </Button>
                    </div>
                    {userSshKeys.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No SSH keys registered
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userSshKeys.map((k) => (
                          <div key={k.id} className="p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {k.description || <em className="text-muted-foreground">No description</em>}
                              </span>
                              {k.verified ? (
                                <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {k.fingerprint ?? (k.public_key.slice(0, 64) + "…")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Added {formatDate(k.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Admin add SSH key dialog ──────────────────────────────────────────── */}
      <Dialog
        open={showAddKey}
        onOpenChange={(open) => {
          setShowAddKey(open);
          if (!open) { setAddKeyError(null); setAddKeyPublicKey(""); setAddKeyDescription(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add SSH Key for {selectedMember?.user?.email}</DialogTitle>
            <DialogDescription>
              Add an SSH public key on behalf of this user (admin action).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addKeyError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{addKeyError}</div>
            )}
            <div className="space-y-2">
              <Label>Public key</Label>
              <Textarea
                placeholder="ssh-ed25519 AAAA..."
                value={addKeyPublicKey}
                onChange={(e) => setAddKeyPublicKey(e.target.value)}
                className="font-mono text-xs min-h-[80px]"
                disabled={isAddingKey}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                placeholder="Laptop key"
                value={addKeyDescription}
                onChange={(e) => setAddKeyDescription(e.target.value)}
                disabled={isAddingKey}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddKey(false)} disabled={isAddingKey}>
              Cancel
            </Button>
            <Button onClick={handleAddKey} disabled={isAddingKey || !addKeyPublicKey.trim()}>
              {isAddingKey && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove all MFA confirmation dialog ───────────────────────────── */}
      <Dialog open={showRemoveAllMfa} onOpenChange={setShowRemoveAllMfa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Remove all MFA methods?
            </DialogTitle>
            <DialogDescription>
              This will remove <strong>all</strong> MFA methods (TOTP and passkeys) for{" "}
              <strong>{selectedMember?.user?.email}</strong>. They will be able to re-enroll after this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveAllMfa(false)} disabled={isRemovingAllMfa}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveAllMfa} disabled={isRemovingAllMfa}>
              {isRemovingAllMfa && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove all MFA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend confirmation dialog ───────────────────────────────────────── */}
      <Dialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Suspend account?
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedMember?.user?.full_name || selectedMember?.user?.email}</strong> will be
              blocked from requesting SSH certificates. You can restore their access at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendConfirm(false)}
              disabled={isSuspending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={isSuspending}>
              {isSuspending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change role dialog (row dropdown) ────────────────────────────────── */}
      <Dialog open={!!changeRoleMember} onOpenChange={(o) => { if (!o) setChangeRoleMember(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update the role for{" "}
              {changeRoleMember?.user?.full_name || changeRoleMember?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">New role</Label>
            <Select value={newRole} onValueChange={setNewRole} disabled={isChangingRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRoleMember(null)}
              disabled={isChangingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole}>
              {isChangingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove member confirmation ────────────────────────────────────────── */}
      <Dialog open={!!removeMember} onOpenChange={(o) => { if (!o) setRemoveMember(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Remove member?
            </DialogTitle>
            <DialogDescription>
              <strong>{removeMember?.user?.full_name || removeMember?.user?.email}</strong> will lose
              access to this organization immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveMember(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isRemoving}>
              {isRemoving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer ownership confirmation ───────────────────────────────── */}
      <Dialog open={showTransferOwnership} onOpenChange={setShowTransferOwnership}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Crown className="w-5 h-5" />
              Transfer ownership?
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedMember?.user?.full_name || selectedMember?.user?.email}</strong> will
              become the new organization owner. You will be demoted to admin and lose the ability to
              perform owner-only actions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransferOwnership(false)}
              disabled={isTransferringOwnership}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={isTransferringOwnership}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isTransferringOwnership && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hard delete confirmation ──────────────────────────────────────────── */}
      <Dialog
        open={showHardDelete}
        onOpenChange={(open) => { setShowHardDelete(open); if (!open) setHardDeleteConfirmEmail(""); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Permanently delete account?
            </DialogTitle>
            <DialogDescription>
              This will <strong>permanently</strong> delete{" "}
              <strong>{selectedMember?.user?.full_name || selectedMember?.user?.email}</strong>,
              revoke all their SSH certificates, and remove all their SSH keys. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-sm">
              Type <span className="font-mono font-semibold">{selectedMember?.user?.email}</span> to confirm
            </Label>
            <Input
              value={hardDeleteConfirmEmail}
              onChange={(e) => setHardDeleteConfirmEmail(e.target.value)}
              placeholder={selectedMember?.user?.email ?? ""}
              disabled={isHardDeleting}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHardDelete(false)}
              disabled={isHardDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={isHardDeleting || hardDeleteConfirmEmail !== selectedMember?.user?.email}
            >
              {isHardDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Invite link dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!inviteLink}
        onOpenChange={(o) => { if (!o) { setInviteLink(null); setLinkCopied(false); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Share this invite link
            </DialogTitle>
            <DialogDescription>
              Email delivery is not configured. Share this link directly with{" "}
              <strong>{inviteLinkEmail}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <span className="flex-1 text-xs text-muted-foreground break-all font-mono">
                {inviteLink}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }
                }}
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days. The recipient must already have an account or will be
              prompted to create one.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setInviteLink(null); setLinkCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
