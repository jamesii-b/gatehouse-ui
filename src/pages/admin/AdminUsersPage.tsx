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
import { useToast } from "@/hooks/use-toast";
import { api, User as ApiUser, SSHKey, ApiError } from "@/lib/api";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const { toast } = useToast();

  // User list
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [userSshKeys, setUserSshKeys] = useState<SSHKey[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  // Admin add SSH key dialog
  const [showAddKey, setShowAddKey] = useState(false);
  const [addKeyPublicKey, setAddKeyPublicKey] = useState("");
  const [addKeyDescription, setAddKeyDescription] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [addKeyError, setAddKeyError] = useState<string | null>(null);

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

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-description">
          View and manage users across your organizations
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Users
            {!isLoading && <Badge variant="secondary" className="ml-1">{total}</Badge>}
          </CardTitle>
          <CardDescription>Click a user to view details and manage their SSH keys</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{debouncedSearch ? "No users match your search" : "No users found"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((user) => (
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
                    {(user as ApiUser & { activated?: boolean }).activated === false && (
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
                  <span className="text-muted-foreground">Joined</span>
                  <span>{formatDate(selectedUser.created_at)}</span>
                  <span className="text-muted-foreground">Activated</span>
                  <span className="flex items-center gap-1">
                    {(selectedUser as ApiUser & { activated?: boolean }).activated === false ? (
                      <><XCircle className="w-4 h-4 text-amber-500" /> No</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 text-green-500" /> Yes</>
                    )}
                  </span>
                </div>
              </div>

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
    </div>
  );
}
