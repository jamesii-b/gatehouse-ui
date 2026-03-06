import { useState, useCallback, useEffect } from "react";
import {
  Search,
  User,
  CheckCircle,
  XCircle,
  Key,
  Loader2,
  Plus,
  ChevronRight,
  ShieldCheck,
  Shield,
  Ban,
  UserCheck,
  AlertTriangle,
  Trash2,
  ShieldOff,
  Smartphone,
  KeyRound,
  Link2,
  Unlink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useToast } from "@/hooks/use-toast";
import { api, User as ApiUser, SSHKey, ApiError, AdminMfaMethod, AdminLinkedAccount } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(d: string | null) {
  if (!d) return "—";
  const raw = !(d.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(d)) ? d + "Z" : d;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(raw));
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // User list
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [userSshKeys, setUserSshKeys] = useState<SSHKey[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  // Role update
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Admin add SSH key dialog
  const [showAddKey, setShowAddKey] = useState(false);
  const [addKeyPublicKey, setAddKeyPublicKey] = useState("");
  const [addKeyDescription, setAddKeyDescription] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [addKeyError, setAddKeyError] = useState<string | null>(null);

  // Suspend / unsuspend
  const [isSuspending, setIsSuspending] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  // Force-verify email
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Hard delete
  const [showHardDelete, setShowHardDelete] = useState(false);
  const [hardDeleteConfirmEmail, setHardDeleteConfirmEmail] = useState("");
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // MFA management
  const [userMfaMethods, setUserMfaMethods] = useState<AdminMfaMethod[]>([]);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [removingMfaId, setRemovingMfaId] = useState<string | null>(null);
  const [showRemoveAllMfa, setShowRemoveAllMfa] = useState(false);
  const [isRemovingAllMfa, setIsRemovingAllMfa] = useState(false);

  // Linked accounts management
  const [userLinkedAccounts, setUserLinkedAccounts] = useState<AdminLinkedAccount[]>([]);
  const [totalAuthMethods, setTotalAuthMethods] = useState(0);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  // Admin password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (q: string, pg: number) => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(pg), per_page: "50" };
      if (q) params.q = q;
      const data = await api.admin.listUsers(params);
      setUsers(data.users);
      setTotal(data.count);
      setPages(data.pages);
    } catch (err) {
      if (err instanceof ApiError && err.code === 403) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "Admin or owner role required to view all users.",
        });
      } else {
        toast({ variant: "destructive", title: "Failed to load users" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setPage(1);
    fetchUsers(debouncedSearch, 1);
  }, [debouncedSearch, fetchUsers]);

  useEffect(() => {
    fetchUsers(debouncedSearch, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open user drawer ─────────────────────────────────────────────────────────
  const openUserDrawer = async (user: ApiUser) => {
    setSelectedUser(user);
    setUserSshKeys([]);
    setUserMfaMethods([]);
    setUserLinkedAccounts([]);
    setTotalAuthMethods(0);
    setIsDrawerLoading(true);
    try {
      const [userData, mfaData, linkedData] = await Promise.allSettled([
        api.admin.getUser(user.id),
        api.admin.getUserMfa(user.id),
        api.admin.getUserLinkedAccounts(user.id),
      ]);
      if (userData.status === "fulfilled") setUserSshKeys(userData.value.ssh_keys);
      if (mfaData.status === "fulfilled") setUserMfaMethods(mfaData.value.mfa_methods);
      if (linkedData.status === "fulfilled") {
        setUserLinkedAccounts(linkedData.value.linked_accounts);
        setTotalAuthMethods(linkedData.value.total_auth_methods);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsDrawerLoading(false);
    }
  };

  // ── Update role ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser || !selectedUser.org_id) return;
    setIsUpdatingRole(true);
    try {
      await api.admin.updateUserRole(selectedUser.org_id, selectedUser.id, newRole.toUpperCase());
      const updated = { ...selectedUser, org_role: newRole };
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, org_role: newRole } : u))
      );
      toast({
        title: "Role updated",
        description: `${selectedUser.full_name || selectedUser.email} is now a ${newRole}.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // ── Admin add SSH key ────────────────────────────────────────────────────────
  const handleAddKey = async () => {
    if (!selectedUser) return;
    setAddKeyError(null);
    if (!addKeyPublicKey.trim()) {
      setAddKeyError("Public key is required");
      return;
    }
    setIsAddingKey(true);
    try {
      const key = await api.ssh.adminAddKey(selectedUser.id, addKeyPublicKey.trim(), addKeyDescription.trim() || undefined);
      setUserSshKeys((prev) => [...prev, key]);
      toast({ title: "SSH key added", description: `Key added for ${selectedUser.email}` });
      setShowAddKey(false);
      setAddKeyPublicKey("");
      setAddKeyDescription("");
    } catch (err) {
      setAddKeyError(err instanceof ApiError ? err.message : "Failed to add key");
    } finally {
      setIsAddingKey(false);
    }
  };

  // ── Suspend / Unsuspend user ─────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!selectedUser) return;
    setIsSuspending(true);
    try {
      const data = await api.admin.suspendUser(selectedUser.id);
      const updated = { ...selectedUser, status: data.user.status };
      setSelectedUser(updated);
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, status: data.user.status } : u));
      setShowSuspendConfirm(false);
      toast({ title: "User suspended", description: `${selectedUser.full_name || selectedUser.email} has been suspended.` });
    } catch (err) {
      setShowSuspendConfirm(false);
      if (err instanceof ApiError && err.type === "OWNER_PROTECTION") {
        toast({
          variant: "destructive",
          title: "Cannot suspend organization owner",
          description: "Transfer ownership to another member before suspending this account.",
        });
      } else {
        toast({ variant: "destructive", title: "Failed to suspend user", description: err instanceof ApiError ? err.message : "Something went wrong" });
      }
    } finally {
      setIsSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedUser) return;
    setIsSuspending(true);
    try {
      const data = await api.admin.unsuspendUser(selectedUser.id);
      const updated = { ...selectedUser, status: data.user.status };
      setSelectedUser(updated);
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, status: data.user.status } : u));
      toast({ title: "User unsuspended", description: `${selectedUser.full_name || selectedUser.email} is now active.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to unsuspend user", description: err instanceof ApiError ? err.message : "Something went wrong" });
    } finally {
      setIsSuspending(false);
    }
  };

  // ── Force-verify email ───────────────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    if (!selectedUser) return;
    setIsVerifyingEmail(true);
    try {
      const data = await api.admin.adminVerifyUserEmail(selectedUser.id);
      const updated = { ...selectedUser, email_verified: data.user.email_verified, status: data.user.status };
      setSelectedUser(updated);
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, email_verified: data.user.email_verified, status: data.user.status } : u));
      toast({ title: "Email verified", description: `${selectedUser.email} is now verified and active.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to verify email", description: err instanceof ApiError ? err.message : "Something went wrong" });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // ── Hard delete user ─────────────────────────────────────────────────────────
  const handleHardDelete = async () => {
    if (!selectedUser) return;
    setIsHardDeleting(true);
    try {
      const result = await api.admin.hardDeleteUser(selectedUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setTotal((t) => t - 1);
      setShowHardDelete(false);
      setSelectedUser(null);
      toast({
        title: "User permanently deleted",
        description: `${result.deleted_user_email} — ${result.certs_revoked} cert(s) revoked, ${result.ssh_keys_deleted} key(s) deleted.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setIsHardDeleting(false);
    }
  };

  // ── Remove single MFA method ─────────────────────────────────────────────────
  const handleRemoveMfaMethod = async (method: AdminMfaMethod) => {
    if (!selectedUser) return;
    setRemovingMfaId(method.id);
    try {
      const credentialId = method.type === "webauthn" ? method.id : undefined;
      await api.admin.removeUserMfa(selectedUser.id, method.type as "totp" | "webauthn", credentialId);
      // Refresh MFA methods list
      const mfaData = await api.admin.getUserMfa(selectedUser.id);
      setUserMfaMethods(mfaData.mfa_methods);
      toast({
        title: "MFA method removed",
        description: `${method.name} has been removed for ${selectedUser.email}. They can now re-enroll.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to remove MFA method",
        description: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setRemovingMfaId(null);
    }
  };

  // ── Remove ALL MFA methods ───────────────────────────────────────────────────
  const handleRemoveAllMfa = async () => {
    if (!selectedUser) return;
    setIsRemovingAllMfa(true);
    try {
      await api.admin.removeUserMfa(selectedUser.id, "all");
      setUserMfaMethods([]);
      setShowRemoveAllMfa(false);
      toast({
        title: "All MFA methods removed",
        description: `All MFA methods for ${selectedUser.email} have been cleared. They can now re-enroll.`,
      });
    } catch (err) {
      setShowRemoveAllMfa(false);
      toast({
        variant: "destructive",
        title: "Failed to remove MFA methods",
        description: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setIsRemovingAllMfa(false);
    }
  };

  const handleUnlinkProvider = async (account: AdminLinkedAccount) => {
    if (!selectedUser) return;
    setUnlinkingProvider(account.id);
    try {
      await api.admin.adminUnlinkUserProvider(selectedUser.id, account.provider_type);
      setUserLinkedAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setTotalAuthMethods((prev) => Math.max(0, prev - 1));
      toast({
        title: "Provider unlinked",
        description: `${capitalize(account.provider_type)} has been unlinked from ${selectedUser.email}.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to unlink provider",
        description: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  // ── Admin password reset ─────────────────────────────────────────────────────
  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    setPasswordResetError(null);

    if (newPassword.length < 8) {
      setPasswordResetError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordResetError("Passwords do not match");
      return;
    }

    setIsResettingPassword(true);
    try {
      await api.admin.adminSetUserPassword(selectedUser.id, newPassword);
      setShowPasswordReset(false);
      setNewPassword("");
      setNewPasswordConfirm("");
      toast({
        title: "Password updated",
        description: `Password has been set for ${selectedUser.email}. They can now log in with it.`,
      });
    } catch (err) {
      setPasswordResetError(err instanceof ApiError ? err.message : "Failed to set password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Filter by role client-side
  const filteredUsers = users.filter((u) => {
    if (roleFilter === "all") return true;
    const r = (u.org_role || "member").toLowerCase();
    return r === roleFilter;
  });

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-description">
          View and manage users across your organizations
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Users
            {!isLoading && <Badge variant="secondary" className="ml-1">{total}</Badge>}
          </CardTitle>
          <CardDescription>Click a user to view details and manage their role or SSH keys</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{debouncedSearch ? "No users match your search" : "No users found"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  onClick={() => openUserDrawer(user)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleBadge role={user.org_role || "member"} />
                    {isSuspended(user.status) && (
                      <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
                        <Ban className="w-3 h-3 mr-1" />Suspended
                      </Badge>
                    )}
                    {user.activated === false && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Not activated
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pages} · {total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── User detail drawer ─────────────────────────────────────────────────── */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {selectedUser.full_name || selectedUser.email}
                </SheetTitle>
                <SheetDescription>{selectedUser.email}</SheetDescription>
              </SheetHeader>

              {/* Basic info */}
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1">
                    {isSuspended(selectedUser.status) ? (
                      <><Ban className="w-4 h-4 text-red-500" /><span className="text-red-600 font-medium">Suspended{selectedUser.status === "compliance_suspended" ? " (compliance)" : ""}</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-600">Active</span></>
                    )}
                  </span>
                  <span className="text-muted-foreground">Joined</span>
                  <span>{formatDate(selectedUser.created_at)}</span>
                  <span className="text-muted-foreground">Activated</span>
                  <span className="flex items-center gap-1">
                    {selectedUser.activated === false ? (
                      <><XCircle className="w-4 h-4 text-amber-500" /> No</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-green-500" /> Yes</>
                    )}
                  </span>
                  <span className="text-muted-foreground">Last login</span>
                  <span>{formatDate(selectedUser.last_login_at)}</span>
                </div>
              </div>

              {/* Suspend / Unsuspend — only for other users */}
              {selectedUser.id !== currentUser?.id && (
                <div className="mb-6 p-4 border rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Account Access
                  </h3>

                  {/* Unverified / inactive email block */}
                  {(!selectedUser.email_verified || selectedUser.status === "inactive") && (
                    <div className="space-y-2 pb-3 border-b">
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.status === "inactive"
                          ? "This account is inactive — the user has not verified their email and cannot log in, set up OAuth, or configure MFA."
                          : "This user's email address is not verified."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleVerifyEmail}
                        disabled={isVerifyingEmail}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        {isVerifyingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Verify email &amp; activate account
                      </Button>
                    </div>
                  )}

                  {isSuspended(selectedUser.status) ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.status === "compliance_suspended"
                          ? "This account is suspended due to MFA compliance. The user cannot log in or request certificates."
                          : "This account is suspended. The user cannot log in or request certificates."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnsuspend}
                        disabled={isSuspending}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        {isSuspending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                        Restore account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Suspending blocks this user from logging in and requesting SSH certificates.</p>
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

              {/* Role management — only if not viewing yourself and user has org_id */}
              {selectedUser.org_id && selectedUser.id !== currentUser?.id && (
                <div className="mb-6 p-4 border rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Organization Role
                  </h3>
                  <div className="flex items-center gap-3">
                    <Select
                      value={(selectedUser.org_role || "member").toLowerCase()}
                      onValueChange={handleRoleChange}
                      disabled={isUpdatingRole || (selectedUser.org_role || "").toLowerCase() === "owner"}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                  {(selectedUser.org_role || "").toLowerCase() === "owner" && (
                    <p className="text-xs text-muted-foreground">Owner role cannot be changed here. Transfer ownership from the Members page.</p>
                  )}
                </div>
              )}

              {/* ── MFA Methods section ────────────────────────────────────────── */}
              {selectedUser.id !== currentUser?.id && (
                <div className="mb-6 p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldOff className="w-4 h-4" />
                      MFA Methods
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

                  {isMfaLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : userMfaMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No MFA methods configured.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userMfaMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center justify-between p-3 border rounded-lg text-sm"
                        >
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
                    Remove an MFA method if the user has lost access (e.g. lost phone or passkey).
                    The user will be able to re-enroll after removal.
                  </p>
                </div>
              )}

              {/* ── Linked Accounts section ────────────────────────────────── */}
              {selectedUser.id !== currentUser?.id && (
                <div className="mb-6 p-4 border rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Linked OAuth Accounts
                  </h3>

                  {userLinkedAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No OAuth providers linked.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userLinkedAccounts.map((account) => {
                        const isOnlyMethod = totalAuthMethods <= 1;
                        return (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-3 border rounded-lg text-sm"
                          >
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
                              title={
                                isOnlyMethod
                                  ? "Cannot unlink — this is the user's only sign-in method"
                                  : `Unlink ${account.provider_type}`
                              }
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
                    Unlink an OAuth provider to prevent sign-in via that provider.
                    Cannot unlink if it is the user's only sign-in method.
                  </p>
                </div>
              )}

              {/* ── Admin Password Reset section ──────────────────────────── */}
              {selectedUser.id !== currentUser?.id && (
                <div className="mb-6 p-4 border rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Set a new password for this user. Use this when a user is locked out or needs a password added to their account.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPasswordResetError(null); setNewPassword(""); setNewPasswordConfirm(""); setShowPasswordReset(true); }}
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Set password
                  </Button>
                </div>
              )}

              {/* SSH Keys section */}
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

                {isDrawerLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : userSshKeys.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No SSH keys registered
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userSshKeys.map((k) => (
                      <div key={k.id} className="p-3 border rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{k.description || <em className="text-muted-foreground">No description</em>}</span>
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
                          {k.fingerprint ?? k.public_key.slice(0, 64) + "…"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Added {formatDate(k.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger zone — Hard delete */}
              {selectedUser.id !== currentUser?.id && (
                <div className="mt-6 p-4 border border-destructive/30 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this account. This cannot be undone — all SSH keys and certificates will be revoked immediately.
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
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Admin add SSH key dialog ───────────────────────────────────────────── */}
      <Dialog open={showAddKey} onOpenChange={(open) => { setShowAddKey(open); setAddKeyError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add SSH Key for {selectedUser?.email}</DialogTitle>
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
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
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

      {/* ── Suspend confirmation dialog ───────────────────────────────────────── */}
      <Dialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Suspend account?
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedUser?.full_name || selectedUser?.email}</strong> will be blocked from logging in and requesting SSH certificates. You can restore their access at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendConfirm(false)} disabled={isSuspending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={isSuspending}
            >
              {isSuspending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove All MFA confirmation ───────────────────────────────────────── */}
      <Dialog open={showRemoveAllMfa} onOpenChange={setShowRemoveAllMfa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldOff className="w-5 h-5" />
              Remove all MFA methods?
            </DialogTitle>
            <DialogDescription>
              All MFA methods for{" "}
              <strong>{selectedUser?.full_name || selectedUser?.email}</strong> will
              be removed. They will be able to re-enroll after this action. Use this
              when the user has lost access to their authenticator app or passkey.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveAllMfa(false)} disabled={isRemovingAllMfa}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAllMfa}
              disabled={isRemovingAllMfa}
            >
              {isRemovingAllMfa && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove all MFA
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
              <strong>{selectedUser?.full_name || selectedUser?.email}</strong>,
              revoke all their SSH certificates, and remove all their SSH keys. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-sm">
              Type <span className="font-mono font-semibold">{selectedUser?.email}</span> to confirm
            </Label>
            <Input
              value={hardDeleteConfirmEmail}
              onChange={(e) => setHardDeleteConfirmEmail(e.target.value)}
              placeholder={selectedUser?.email ?? ""}
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
              disabled={isHardDeleting || hardDeleteConfirmEmail !== selectedUser?.email}
            >
              {isHardDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Admin password reset dialog ───────────────────────────────────── */}
      <Dialog
        open={showPasswordReset}
        onOpenChange={(open) => {
          setShowPasswordReset(open);
          if (!open) { setNewPassword(""); setNewPasswordConfirm(""); setPasswordResetError(null); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Set password for {selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              The user will be able to log in with this password immediately. This does not affect their existing OAuth logins.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {passwordResetError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{passwordResetError}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New password</Label>
              <Input
                id="admin-new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordResetError(null); }}
                disabled={isResettingPassword}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-new-password-confirm">Confirm password</Label>
              <Input
                id="admin-new-password-confirm"
                type="password"
                placeholder="Repeat new password"
                value={newPasswordConfirm}
                onChange={(e) => { setNewPasswordConfirm(e.target.value); setPasswordResetError(null); }}
                disabled={isResettingPassword}
                onKeyDown={(e) => { if (e.key === "Enter" && newPassword && newPasswordConfirm) handlePasswordReset(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordReset(false)}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isResettingPassword || !newPassword || !newPasswordConfirm}
            >
              {isResettingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
