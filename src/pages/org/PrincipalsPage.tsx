import { useState, useEffect } from "react";
import { Search, Plus, MoreHorizontal, Users, Loader2, Trash2, Edit2, Link as LinkIcon, Unlink } from "lucide-react";
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

export default function PrincipalsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;

  const [search, setSearch] = useState("");
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingPrincipal, setEditingPrincipal] = useState<Principal | null>(null);
  const [selectedPrincipalForLink, setSelectedPrincipalForLink] = useState<Principal | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    setError(null);
    setPrincipals([]);
    setDepartments([]);
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    fetchData(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const fetchData = async (currentOrgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [principalsRes, deptRes] = await Promise.all([
        api.organizations.getPrincipals(currentOrgId),
        api.organizations.getDepartments(currentOrgId),
      ]);
      setPrincipals(principalsRes.principals || []);
      setDepartments(deptRes.departments || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrincipal = async () => {
    if (!orgId || !formData.name.trim()) return;

    try {
      await api.organizations.createPrincipal(
        orgId,
        formData.name,
        formData.description || undefined
      );
      setFormData({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      await fetchData(orgId);
    } catch (err) {
      console.error("Failed to create principal:");
      setError("Failed to create principal.");
    }
  };

  const handleUpdatePrincipal = async () => {
    if (!orgId || !editingPrincipal || !formData.name.trim()) return;

    try {
      await api.organizations.updatePrincipal(
        orgId,
        editingPrincipal.id,
        {
          name: formData.name,
          description: formData.description || undefined,
        }
      );
      setFormData({ name: "", description: "" });
      setEditingPrincipal(null);
      setIsEditDialogOpen(false);
      await fetchData(orgId);
    } catch (err) {
      console.error("Failed to update principal:");
      setError("Failed to update principal.");
    }
  };

  const handleDeletePrincipal = async (principalId: string) => {
    if (!orgId || !confirm("Are you sure you want to delete this principal?")) return;

    try {
      await api.organizations.deletePrincipal(orgId, principalId);
      await fetchData(orgId);
    } catch (err) {
      console.error("Failed to delete principal:");
      setError("Failed to delete principal.");
    }
  };

  const handleLinkPrincipal = async () => {
    if (!orgId || !selectedPrincipalForLink || !selectedDepartmentId) return;

    try {
      await api.organizations.linkPrincipalToDepartment(
        orgId,
        selectedPrincipalForLink.id,
        selectedDepartmentId
      );
      setSelectedPrincipalForLink(null);
      setSelectedDepartmentId("");
      setIsLinkDialogOpen(false);
      await fetchData(orgId);
    } catch (err) {
      console.error("Failed to link principal:");
      setError("Failed to link principal to department.");
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

  const filteredPrincipals = principals.filter((principal) => {
    const searchLower = search.toLowerCase();
    return (
      principal.name.toLowerCase().includes(searchLower) ||
      (principal.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Principals</h1>
          <p className="page-description">
            Manage principals and link them to departments
          </p>
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading principals...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              {error}
            </div>
          ) : filteredPrincipals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No principals found
            </div>
          ) : (
            <div className="divide-y">
              {filteredPrincipals.map((principal) => (
                <div key={principal.id} className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {principal.name}
                      </p>
                    </div>
                    {principal.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {principal.description}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Created {new Date(principal.created_at).toLocaleDateString()}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Principal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Principal</DialogTitle>
            <DialogDescription>
              Create a new principal to manage access and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="principal-name">Principal Name</Label>
              <Input
                id="principal-name"
                placeholder="e.g., Backend Team"
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrincipal}>
              Create Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Principal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Principal</DialogTitle>
            <DialogDescription>
              Update principal information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-principal-name">Principal Name</Label>
              <Input
                id="edit-principal-name"
                placeholder="e.g., Backend Team"
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrincipal}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Principal to Department Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Principal to Department</DialogTitle>
            <DialogDescription>
              Associate this principal with a department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-select">Select Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger id="dept-select">
                  <SelectValue placeholder="Choose a department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkPrincipal} disabled={!selectedDepartmentId}>
              Link Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
