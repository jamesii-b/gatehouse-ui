import { useState, useEffect } from "react";
import { Search, Shield, ShieldCheck, Mail, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api, OrganizationMember, ApiError, OrgInvite } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { MoreHorizontal } from "lucide-react";

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

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

export default function MembersPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Invite link dialog (shown when email is not configured)
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkEmail, setInviteLinkEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Change role dialog
  const [changeRoleMember, setChangeRoleMember] = useState<OrganizationMember | null>(null);
  const [newRole, setNewRole] = useState("member");
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Pending invites
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isInvitesLoading, setIsInvitesLoading] = useState(false);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setMembers([]);
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.organizations.getMembers(orgId);
        setMembers(response.members || []);
      } catch (err) {
        console.error("Failed to fetch members:", err);
        setError("Failed to load members. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchInvites = async () => {
      try {
        setIsInvitesLoading(true);
        const res = await api.organizations.getInvites(orgId);
        setInvites(res.invites || []);
      } catch (err) {
        console.error("Failed to fetch invites:", err);
      } finally {
        setIsInvitesLoading(false);
      }
    };

    fetchMembers();
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filteredMembers = members.filter((member) => {
    const searchLower = search.toLowerCase();
    return (
      (member.user?.full_name?.toLowerCase().includes(searchLower) ?? false) ||
      (member.user?.email.toLowerCase().includes(searchLower) ?? false)
    );
  });

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
      setShowInvite(false);
      // Refresh invites list
      const updated = await api.organizations.getInvites(orgId);
      setInvites(updated.invites || []);
      if (link) {
        // Email delivery not configured — show copyable link as fallback
        setInviteLink(link);
        setInviteLinkEmail(inviteEmail.trim());
      } else {
        // Email was sent successfully
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

  const handleChangeRole = async () => {
    if (!orgId || !changeRoleMember) return;
    setIsChangingRole(true);
    try {
      const updated = await api.organizations.updateMemberRole(orgId, changeRoleMember.user_id, newRole.toUpperCase());
      setMembers((prev) =>
        prev.map((m) => (m.id === changeRoleMember.id ? { ...m, role: updated.member.role } : m))
      );
      toast({
        title: "Role updated",
        description: `${changeRoleMember.user?.full_name || changeRoleMember.user?.email} is now a ${newRole}.`,
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

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!orgId) return;
    try {
      await api.organizations.removeMember(orgId, member.user_id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast({
        title: "Member removed",
        description: `${member.user?.full_name || member.user?.email} has been removed.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to remove member",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Members</h1>
        <p className="page-description">
          Manage organization members and invitations
        </p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invites">
            Invitations {invites.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{invites.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 max-w-sm"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading members...</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">
                  {error}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No members found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="p-4 flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {member.user?.full_name || member.user?.email}
                          </p>
                          <RoleBadge role={member.role} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.user?.email}
                        </p>
                      </div>
                      {/* Actions — hide for self and for owners (can't modify owner here) */}
                      {member.user?.id !== currentUser?.id && (member.role || "").toLowerCase() !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
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
                              onClick={() => handleRemoveMember(member)}
                            >
                              Remove member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Pending invitations</h3>
                  <span className="text-sm text-muted-foreground">{isInvitesLoading ? 'Loading...' : `${invites.length}`}</span>
                </div>
                {isInvitesLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading invites...</div>
                ) : invites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No pending invitations</div>
                ) : (
                  <div className="divide-y">
                    {invites.map((inv) => (
                      <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{inv.email}</div>
                          <div className="text-sm text-muted-foreground">Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { void (async () => {
                            if (!orgId) return;
                            setCancellingInviteId(inv.id);
                            try {
                              await api.organizations.cancelInvite(orgId, inv.id);
                              setInvites((prev) => prev.filter((i) => i.id !== inv.id));
                              toast({ title: 'Invite cancelled' });
                            } catch (err) {
                              toast({ variant: 'destructive', title: 'Failed to cancel invite' });
                            } finally {
                              setCancellingInviteId(null);
                            }
                          })() }}>
                            {cancellingInviteId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
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
                  <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()} className="w-full">
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

      {/* ── Invite link dialog (shown when SMTP not configured) ────────────────── */}
      <Dialog open={!!inviteLink} onOpenChange={(o) => { if (!o) { setInviteLink(null); setLinkCopied(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Share this invite link
            </DialogTitle>
            <DialogDescription>
              Email delivery is not configured. Share this link directly with <strong>{inviteLinkEmail}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <span className="flex-1 text-xs text-muted-foreground break-all font-mono">{inviteLink}</span>
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
                {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days. The recipient must already have an account or will be prompted to create one.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setInviteLink(null); setLinkCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change role dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!changeRoleMember} onOpenChange={(o) => { if (!o) setChangeRoleMember(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update the role for {changeRoleMember?.user?.full_name || changeRoleMember?.user?.email}
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
            <Button variant="outline" onClick={() => setChangeRoleMember(null)} disabled={isChangingRole}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole}>
              {isChangingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
