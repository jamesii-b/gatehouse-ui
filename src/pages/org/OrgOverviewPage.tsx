import { useEffect, useState } from "react";
import { Building2, Users, Shield, Key, ArrowRight, TrendingUp, Loader2, Trash2, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, OIDCClient, ApiError } from "@/lib/api";
import { useOrg } from "@/contexts/OrgContext";import { useOrganizations } from "@/hooks/useOrganizations";
import { toast } from "@/hooks/use-toast";

export default function OrgOverviewPage() {
  const navigate = useNavigate();
  const { selectedOrg, selectOrg } = useOrg();
  const { refetch: refetchOrgs } = useOrganizations();
  const [memberCount, setMemberCount] = useState<number>(0);
  const [clientCount, setClientCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Delete org dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = selectedOrg?.role === "owner";

  useEffect(() => {
    if (!selectedOrg) return;
    setIsLoading(true);
    Promise.allSettled([
      api.organizations.getMembers(selectedOrg.id),
      api.organizations.getClients(selectedOrg.id),
    ]).then(([membersResp, clientsResp]) => {
      if (membersResp.status === "fulfilled") setMemberCount(membersResp.value.count);
      if (clientsResp.status === "fulfilled") setClientCount((clientsResp.value as { clients: OIDCClient[]; count: number }).count);
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedOrg?.id]);

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;
    setIsDeleting(true);
    try {
      await api.organizations.deleteOrganization(selectedOrg.id);
      toast({ title: "Organization deleted", description: `"${selectedOrg.name}" has been deleted.` });
      setDeleteDialogOpen(false);
      // Refresh org list; context will auto-select next available org
      const result = await refetchOrgs();
      const remaining = result.data ?? [];
      if (remaining.length > 0) {
        selectOrg(remaining[0]);
        navigate("/org");
      } else {
        navigate("/org-setup");
      }
    } catch (err) {
      if (err instanceof ApiError && err.type === "ORG_HAS_MEMBERS") {
        toast({
          title: "Cannot delete organization",
          description: "This organization still has other members. Transfer ownership or remove all members first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion failed",
          description: err instanceof ApiError ? err.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const quickLinks = [
    {
      title: "Members",
      description: "Manage team members and roles",
      icon: Users,
      href: "/org/members",
    },
    {
      title: "Policies",
      description: "Configure security requirements",
      icon: Shield,
      href: "/org/policies",
    },
    {
      title: "OIDC Clients",
      description: "Manage connected applications",
      icon: Key,
      href: "/org/clients",
    },
  ];

  if (isLoading && !selectedOrg) {
    return (
      <div className="page-container flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const org = selectedOrg;
  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="page-title">{org?.name ?? "Organization"}</h1>
            {createdAt && <p className="page-description">Created {createdAt}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-semibold">{memberCount}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OIDC Clients</p>
                <p className="text-2xl font-semibold">{clientCount}</p>
              </div>
              <Key className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Org ID</p>
                <p className="text-xs font-mono text-muted-foreground mt-1 truncate max-w-[140px]">{org?.id ?? "—"}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="h-full hover:border-accent/50 transition-colors cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <link.icon className="w-5 h-5 text-accent" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="font-medium text-foreground">{link.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Danger Zone — owners only */}
      {isOwner && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for this organization. Proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transfer ownership hint */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Transfer Ownership</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pass ownership to another member before deleting the organization.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/org/members")}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Go to Members
              </Button>
            </div>

            {/* Delete organization */}
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Organization</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes this organization.{" "}
                  {memberCount > 1
                    ? `You must remove all ${memberCount - 1} other member${memberCount > 2 ? "s" : ""} first.`
                    : "This action cannot be undone."}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={memberCount > 1}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete "{org?.name}"?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the organization and all associated
              data. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            You are about to delete <strong>{org?.name}</strong>. All settings,
            policies, OIDC clients, and CA configurations will be lost.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrg} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
