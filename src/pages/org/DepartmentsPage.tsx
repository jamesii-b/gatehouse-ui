import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, Users, Loader2, Trash2, Edit2, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, Department, Principal } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [linkedPrincipals, setLinkedPrincipals] = useState<Record<string, Principal[]>>({});
  const [unlinkingKey, setUnlinkingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const fetchLinkedPrincipals = useCallback(async (currentOrgId: string, deptList: Department[]) => {
    if (!deptList.length) return;
    const results = await Promise.allSettled(
      deptList.map((dept) =>
        api.organizations.getDepartmentPrincipals(currentOrgId, dept.id)
      )
    );
    const map: Record<string, Principal[]> = {};
    deptList.forEach((dept, i) => {
      const result = results[i];
      map[dept.id] = result.status === "fulfilled" ? result.value.principals || [] : [];
    });
    setLinkedPrincipals(map);
  }, []);

  const fetchDepartments = useCallback(async (currentOrgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.organizations.getDepartments(currentOrgId);
      const deptList = response.departments || [];
      setDepartments(deptList);
      await fetchLinkedPrincipals(currentOrgId, deptList);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      setError("Failed to load departments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchLinkedPrincipals]);

  useEffect(() => {
    setError(null);
    setDepartments([]);
    setLinkedPrincipals({});
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    fetchDepartments(orgId);
  }, [orgId, fetchDepartments]);

  const handleUnlink = async (deptId: string, principalId: string) => {
    if (!orgId) return;
    const key = `${deptId}:${principalId}`;
    setUnlinkingKey(key);
    try {
      await api.organizations.unlinkPrincipalFromDepartment(orgId, principalId, deptId);
      setLinkedPrincipals((prev) => ({
        ...prev,
        [deptId]: (prev[deptId] || []).filter((p) => p.id !== principalId),
      }));
      toast({ title: "Unlinked", description: "Principal removed from department." });
    } catch (err) {
      console.error("Failed to unlink:", err);
      toast({ title: "Error", description: "Failed to unlink principal.", variant: "destructive" });
    } finally {
      setUnlinkingKey(null);
    }
  };

  const handleCreateDepartment = async () => {
    if (!orgId || !formData.name.trim()) return;
    try {
      await api.organizations.createDepartment(
        orgId,
        formData.name,
        formData.description || undefined
      );
      setFormData({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      await fetchDepartments(orgId);
    } catch (err) {
      console.error("Failed to create department:");
      setError("Failed to create department.");
    }
  };

  const handleUpdateDepartment = async () => {
    if (!orgId || !editingDept || !formData.name.trim()) return;
    try {
      await api.organizations.updateDepartment(orgId, editingDept.id, {
        name: formData.name,
        description: formData.description || undefined,
      });
      setFormData({ name: "", description: "" });
      setEditingDept(null);
      setIsEditDialogOpen(false);
      await fetchDepartments(orgId);
    } catch (err) {
      console.error("Failed to update department:");
      setError("Failed to update department.");
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!orgId || !confirm("Are you sure you want to delete this department?")) return;
    try {
      await api.organizations.deleteDepartment(orgId, deptId);
      await fetchDepartments(orgId);
    } catch (err) {
      console.error("Failed to delete department:");
      setError("Failed to delete department.");
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || "" });
    setIsEditDialogOpen(true);
  };

  const filteredDepartments = departments.filter((dept) => {
    const searchLower = search.toLowerCase();
    return (
      dept.name.toLowerCase().includes(searchLower) ||
      (dept.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-description">
            Manage departments and organize team members
          </p>
        </div>
        <Button onClick={() => { setFormData({ name: "", description: "" }); setIsCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Department
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
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
              <span className="ml-2 text-muted-foreground">Loading departments...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              {error}
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No departments found
            </div>
          ) : (
            <div className="divide-y">
              {filteredDepartments.map((dept) => {
                const principals = linkedPrincipals[dept.id] || [];
                return (
                  <div key={dept.id} className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {dept.name}
                        </p>
                      </div>
                      {dept.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {dept.description}
                        </p>
                      )}
                      {/* Linked principals */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {principals.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            Not linked to any principal
                          </span>
                        ) : (
                          principals.map((principal) => {
                            const key = `${dept.id}:${principal.id}`;
                            const busy = unlinkingKey === key;
                            return (
                              <span
                                key={principal.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                              >
                                {principal.name}
                                <button
                                  onClick={() => handleUnlink(dept.id, principal.id)}
                                  disabled={busy}
                                  className="ml-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 disabled:opacity-50 p-0.5"
                                  aria-label={`Unlink ${principal.name}`}
                                >
                                  {busy ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Created {new Date(dept.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(dept)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteDepartment(dept.id)}
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

      {/* Create Department Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
            <DialogDescription>
              Create a new department to organize team members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dept-desc">Description</Label>
              <Textarea
                id="dept-desc"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDepartment}>
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-dept-name">Department Name</Label>
              <Input
                id="edit-dept-name"
                placeholder="e.g., Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-dept-desc">Description</Label>
              <Textarea
                id="edit-dept-desc"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDepartment}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
