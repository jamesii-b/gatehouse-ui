import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, Users, Loader2, Trash2, Edit2, Link as LinkIcon, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, Principal, Department } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { useToast } from "@/hooks/use-toast";

export default function PrincipalsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [linkedDepts, setLinkedDepts] = useState<Record<string, Department[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingPrincipal, setEditingPrincipal] = useState<Principal | null>(null);
  const [selectedPrincipalForLink, setSelectedPrincipalForLink] = useState<Principal | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkingKey, setUnlinkingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const fetchLinkedDepts = useCallback(async (currentOrgId: string, principalList: Principal[]) => {
    const entries = await Promise.all(
      principalList.map(async (p) => {
        try {
          const res = await api.organizations.getPrincipalDepartments(currentOrgId, p.id);
          return [p.id, res.departments] as [string, Department[]];
        } catch {
          return [p.id, []] as [string, Department[]];
        }
      })
    );
    setLinkedDepts(Object.fromEntries(entries));
  }, []);

  const fetchData = useCallback(async (currentOrgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [principalsRes, deptRes] = await Promise.all([
        api.organizations.getPrincipals(currentOrgId),
        api.organizations.getDepartments(currentOrgId),
      ]);
      const pList = principalsRes.principals || [];
      setPrincipals(pList);
      setDepartments(deptRes.departments || []);
      await fetchLinkedDepts(currentOrgId, pList);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchLinkedDepts]);

  useEffect(() => {
    setError(null);
    setPrincipals([]);
    setDepartments([]);
    setLinkedDepts({});
    if (!orgId) { setIsLoading(false); return; }
    fetchData(orgId);
  }, [orgId, fetchData]);

  const handleCreatePrincipal = async () => {
    if (!orgId || !formData.name.trim()) return;
    try {
      await api.organizations.createPrincipal(orgId, formData.name, formData.description || undefined);
      setFormData({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      await fetchData(orgId);
    } catch {
      toast({ variant: "destructive", title: "Failed to create principal" });
    }
  };

  const handleUpdatePrincipal = async () => {
    if (!orgId || !editingPrincipal || !formData.name.trim()) return;
    try {
      await api.organizations.updatePrincipal(orgId, editingPrincipal.id, {
        name: formData.name,
        description: formData.description || undefined,
      });
      setFormData({ name: "", description: "" });
      setEditingPrincipal(null);
      setIsEditDialogOpen(false);
      await fetchData(orgId);
    } catch {
      toast({ variant: "destructive", title: "Failed to update principal" });
    }
  };

  const handleDeletePrincipal = async (principalId: string) => {
    if (!orgId || !confirm("Are you sure you want to delete this principal?")) return;
    try {
      await api.organizations.deletePrincipal(orgId, principalId);
      await fetchData(orgId);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete principal" });
    }
  };

  const handleLinkPrincipal = async () => {
    if (!orgId || !selectedPrincipalForLink || !selectedDepartmentId) return;
    setIsLinking(true);
    try {
      await api.organizations.linkPrincipalToDepartment(orgId, selectedPrincipalForLink.id, selectedDepartmentId);
      toast({ title: "Principal linked to department" });
      setSelectedPrincipalForLink(null);
      setSelectedDepartmentId("");
      setIsLinkDialogOpen(false);
      await fetchData(orgId);
    } catch {
      toast({ variant: "destructive", title: "Failed to link principal to department" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (principalId: string, deptId: string) => {
    if (!orgId) return;
    const key = `${principalId}:${deptId}`;
    setUnlinkingKey(key);
    try {
      await api.organizations.unlinkPrincipalFromDepartment(orgId, principalId, deptId);
      toast({ title: "Unlinked from department" });
      setLinkedDepts((prev) => ({
        ...prev,
        [principalId]: (prev[principalId] || []).filter((d) => d.id !== deptId),
      }));
    } catch {
      toast({ variant: "destructive", title: "Failed to unlink" });
    } finally {
      setUnlinkingKey(null);
    }
  };

  const openEditDialog = (principal: Principal) => {
    setEditingPrincipal(principal);
    setFormData({ name: principal.name, description: principal.description || "" });
    setIsEditDialogOpen(true);
  };

  const openLinkDialog = (principal: Principal) => {
    setSelectedPrincipalForLink(principal);
    setSelectedDepartmentId("");
    setIsLinkDialogOpen(true);
  };

  const filteredPrincipals = principals.filter((p) => {
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.description?.toLowerCase().includes(s) ?? false);
  });

  // Only show departments not already linked
  const availableToLink = selectedPrincipalForLink
    ? departments.filter((d) => !(linkedDepts[selectedPrincipalForLink.id] || []).some((ld) => ld.id === d.id))
    : departments;

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Principals</h1>
          <p className="page-description">Manage principals and link them to departments</p>
        </div>
        <Button onClick={() => { setFormData({ name: "", description: "" }); setIsCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Principal
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search principals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading principals...</span>
            </div>
          ) : filteredPrincipals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No principals found</div>
          ) : (
            <div className="divide-y">
              {filteredPrincipals.map((principal) => {
                const linked = linkedDepts[principal.id] || [];
                return (
                  <div key={principal.id} className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{principal.name}</p>
                      {principal.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{principal.description}</p>
                      )}

                      {/* Linked department tags */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {linked.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Not linked to any department</span>
                        ) : linked.map((dept) => {
                          const key = `${principal.id}:${dept.id}`;
                          const busy = unlinkingKey === key;
                          return (
                            <span
                              key={dept.id}
                              className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full pl-2.5 pr-1 py-0.5"
                            >
                              {dept.name}
                              <button
                                onClick={() => handleUnlink(principal.id, dept.id)}
                                disabled={busy}
                                className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
                                title="Unlink from department"
                              >
                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              </button>
                            </span>
                          );
                        })}
                      </div>

                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(principal)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openLinkDialog(principal)}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Link to Department
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeletePrincipal(principal.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Principal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Principal</DialogTitle>
            <DialogDescription>Create a new principal to manage access and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="principal-name">Principal Name</Label>
              <Input
                id="principal-name"
                placeholder="e.g., eng-prod"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="principal-desc">Description</Label>
              <Textarea
                id="principal-desc"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePrincipal} disabled={!formData.name.trim()}>Create Principal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Principal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Principal</DialogTitle>
            <DialogDescription>Update principal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-principal-name">Principal Name</Label>
              <Input
                id="edit-principal-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-principal-desc">Description</Label>
              <Textarea
                id="edit-principal-desc"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePrincipal} disabled={!formData.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Department Dialog */}
      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setSelectedPrincipalForLink(null); setSelectedDepartmentId(""); }
          setIsLinkDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Department</DialogTitle>
            <DialogDescription>
              Link <strong>{selectedPrincipalForLink?.name}</strong> to a department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-select">Department</Label>
              {availableToLink.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Already linked to all available departments.</p>
              ) : (
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger id="dept-select" className="mt-1">
                    <SelectValue placeholder="Choose a department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToLink.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkPrincipal} disabled={!selectedDepartmentId || isLinking || availableToLink.length === 0}>
              {isLinking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}