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
import { api, User as ApiUser, SSHKey, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

  // Hard delete
  const [showHardDelete, setShowHardDelete] = useState(false);
  const [hardDeleteConfirmEmail, setHardDeleteConfirmEmail] = useState("");
  const [isHardDeleting, setIsHardDeleting] = useState(false);

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
    setIsDrawerLoading(true);
    try {
      const data = await api.admin.getUser(user.id);
      setUserSshKeys(data.ssh_keys);
    } catch {
      // Non-fatal — drawer still shows basic user info
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
    </div>
  );
}
