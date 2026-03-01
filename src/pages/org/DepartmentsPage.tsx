import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, Users, Loader2, Trash2, Edit2, X, ChevronDown, ChevronUp, ShieldCheck, UserPlus, UserMinus, Link as LinkIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, Department, Principal, DeptCertPolicy, STANDARD_SSH_EXTENSIONS, DepartmentMember, OrganizationMember } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Department Certificate Policy Panel
// ---------------------------------------------------------------------------

function DepartmentCertPolicyPanel({ orgId, deptId }: { orgId: string; deptId: string }) {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<DeptCertPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local editable form state
  const [allowUserExpiry, setAllowUserExpiry] = useState(false);
  const [defaultExpiry, setDefaultExpiry] = useState(1);
  const [maxExpiry, setMaxExpiry] = useState(24);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([...STANDARD_SSH_EXTENSIONS]);
  const [customExtensions, setCustomExtensions] = useState<string[]>([]);
  const [newCustomExt, setNewCustomExt] = useState("");

  useEffect(() => {
    setIsLoading(true);
    api.admin.getDeptCertPolicy(orgId, deptId)
      .then((data) => {
        const p = data.cert_policy;
        setPolicy(p);
        setAllowUserExpiry(p.allow_user_expiry);
        setDefaultExpiry(p.default_expiry_hours);
        setMaxExpiry(p.max_expiry_hours);
        setAllowedExtensions(p.allowed_extensions ?? [...STANDARD_SSH_EXTENSIONS]);
        setCustomExtensions(p.custom_extensions ?? []);
      })
      .catch(() => {/* non-fatal — use defaults */})
      .finally(() => setIsLoading(false));
  }, [orgId, deptId]);

  const toggleExtension = (ext: string) => {
    setAllowedExtensions((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  };

  const addCustomExt = () => {
    const trimmed = newCustomExt.trim();
    if (!trimmed || customExtensions.includes(trimmed)) return;
    setCustomExtensions((prev) => [...prev, trimmed]);
    setNewCustomExt("");
  };

  const removeCustomExt = (ext: string) => {
    setCustomExtensions((prev) => prev.filter((e) => e !== ext));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // When members can pick: max_expiry is the cap, default_expiry is also set to max
      // (the backend uses default when no expiry is provided).
      // When members can't pick: default_expiry is the fixed value, max is irrelevant.
      const payload = allowUserExpiry
        ? { allow_user_expiry: true,  default_expiry_hours: maxExpiry,    max_expiry_hours: maxExpiry }
        : { allow_user_expiry: false, default_expiry_hours: defaultExpiry, max_expiry_hours: defaultExpiry };

      const data = await api.admin.setDeptCertPolicy(orgId, deptId, {
        ...payload,
        allowed_extensions: allowedExtensions,
        custom_extensions: customExtensions,
      });
      setPolicy(data.cert_policy);
      toast({ title: "Policy saved", description: "Certificate policy updated." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to save policy" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 p-4 border rounded-lg bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />Loading policy…
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 border rounded-lg bg-muted/20 space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Certificate Policy
      </h4>

      {/* Allow user to choose expiry */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Allow members to pick expiry date</p>
          <p className="text-xs text-muted-foreground">Admins can always pick.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowUserExpiry}
          onClick={() => setAllowUserExpiry((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            allowUserExpiry ? "bg-primary" : "bg-zinc-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              allowUserExpiry ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Expiry hours — conditional on toggle */}
      {allowUserExpiry ? (
        <div className="space-y-1">
          <Label className="text-xs">Max expiry members can request (hours)</Label>
          <Input
            type="number"
            min={1}
            value={maxExpiry}
            onChange={(e) => setMaxExpiry(Math.max(1, Number(e.target.value)))}
            className="h-8 text-sm w-40"
          />
          <p className="text-xs text-muted-foreground">Members can choose any duration up to this cap.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Default expiry applied to all members (hours)</Label>
          <Input
            type="number"
            min={1}
            value={defaultExpiry}
            onChange={(e) => setDefaultExpiry(Math.max(1, Number(e.target.value)))}
            className="h-8 text-sm w-40"
          />
          <p className="text-xs text-muted-foreground">Members receive this expiry automatically — no choice shown.</p>
        </div>
      )}

      {/* Standard extensions */}
      <div className="space-y-2">
        <Label className="text-xs">Standard SSH extensions</Label>
        <div className="space-y-1.5">
          {STANDARD_SSH_EXTENSIONS.map((ext) => (
            <div key={ext} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`ext-${deptId}-${ext}`}
                checked={allowedExtensions.includes(ext)}
                onChange={() => toggleExtension(ext)}
                className="accent-primary"
              />
              <label htmlFor={`ext-${deptId}-${ext}`} className="text-sm font-mono cursor-pointer">{ext}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom extensions */}
      <div className="space-y-2">
        <Label className="text-xs">Custom extensions</Label>
        <div className="flex gap-2">
          <Input
            placeholder="permit-custom-x"
            value={newCustomExt}
            onChange={(e) => setNewCustomExt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomExt()}
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addCustomExt} disabled={!newCustomExt.trim()}>
            Add
          </Button>
        </div>
        {customExtensions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {customExtensions.map((ext) => (
              <Badge key={ext} variant="secondary" className="text-xs gap-1 pr-1">
                <span className="font-mono">{ext}</span>
                <button onClick={() => removeCustomExt(ext)} className="ml-0.5 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button size="sm" onClick={handleSave} disabled={isSaving}>
        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save policy
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Department Members Panel
// ---------------------------------------------------------------------------

function DepartmentMembersPanel({ orgId, deptId }: { orgId: string; deptId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.organizations.getDepartmentMembers(orgId, deptId),
      api.organizations.getMembers(orgId),
    ])
      .then(([deptRes, orgRes]) => {
        setMembers(deptRes.members || []);
        setOrgMembers(orgRes.members || []);
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load members" }))
      .finally(() => setIsLoading(false));
  }, [orgId, deptId, toast]);

  const deptUserIds = new Set(members.map((m) => m.user_id));
  const available = orgMembers.filter((m) => !deptUserIds.has(m.user_id));

  const handleAdd = async () => {
    const orgMember = orgMembers.find((m) => m.user_id === selectedUserId);
    if (!orgMember?.user?.email) return;
    setIsAdding(true);
    try {
      const res = await api.organizations.addDepartmentMember(orgId, deptId, orgMember.user.email);
      setMembers((prev) => [...prev, res.member]);
      setSelectedUserId("");
      toast({ title: "Member added", description: `${orgMember.user.full_name || orgMember.user.email} added to department.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to add member" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string, displayName: string) => {
    setRemovingId(userId);
    try {
      await api.organizations.removeDepartmentMember(orgId, deptId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast({ title: "Member removed", description: `${displayName} removed from department.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to remove member" });
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 p-4 border rounded-lg bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 border rounded-lg bg-muted/20 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        Department Members
        <Badge variant="secondary" className="ml-1">{members.length}</Badge>
      </h4>

      {/* Existing members */}
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No members yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => {
            const name = m.user?.full_name || m.user?.email || m.user_id;
            const email = m.user?.email;
            const busy = removingId === m.user_id;
            return (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium truncate">{name}</span>
                  {email && name !== email && (
                    <span className="ml-2 text-xs text-muted-foreground">{email}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(m.user_id, name)}
                  disabled={busy}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50 flex-shrink-0"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add member */}
      {available.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select org member to add…</option>
            {available.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user?.full_name || m.user?.email || m.user_id}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!selectedUserId || isAdding}>
            {isAdding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
            Add
          </Button>
        </div>
      )}
      {available.length === 0 && members.length > 0 && (
        <p className="text-xs text-muted-foreground pt-1 border-t">All org members are already in this department.</p>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [linkedPrincipals, setLinkedPrincipals] = useState<Record<string, Principal[]>>({});
  const [unlinkingKey, setUnlinkingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkingDept, setLinkingDept] = useState<Department | null>(null);
  const [selectedPrincipalId, setSelectedPrincipalId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const togglePolicyPanel = (deptId: string) => {
    setExpandedPolicies((prev) => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

  const toggleMembersPanel = (deptId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

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
      const [response, principalsRes] = await Promise.all([
        api.organizations.getDepartments(currentOrgId),
        api.organizations.getPrincipals(currentOrgId),
      ]);
      const deptList = response.departments || [];
      setDepartments(deptList);
      setPrincipals(principalsRes.principals || []);
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
    setPrincipals([]);
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

  const handleLinkPrincipal = async () => {
    if (!orgId || !linkingDept || !selectedPrincipalId) return;
    setIsLinking(true);
    try {
      await api.organizations.linkPrincipalToDepartment(orgId, selectedPrincipalId, linkingDept.id);
      toast({ title: "Principal linked", description: "Principal linked to department." });
      setLinkingDept(null);
      setSelectedPrincipalId("");
      setIsLinkDialogOpen(false);
      await fetchDepartments(orgId);
    } catch {
      toast({ variant: "destructive", title: "Failed to link principal to department" });
    } finally {
      setIsLinking(false);
    }
  };

  const openLinkDialog = (dept: Department) => {
    setLinkingDept(dept);
    setSelectedPrincipalId("");
    setIsLinkDialogOpen(true);
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

  // Principals not yet linked to the dept being linked
  const availablePrincipalsToLink = linkingDept
    ? principals.filter((p) => !(linkedPrincipals[linkingDept.id] || []).some((lp) => lp.id === p.id))
    : principals;

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

                      {/* Members toggle */}
                      <button
                        className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => toggleMembersPanel(dept.id)}
                      >
                        <Users className="w-3 h-3" />
                        Members
                        {expandedMembers.has(dept.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* Members panel */}
                      {orgId && expandedMembers.has(dept.id) && (
                        <DepartmentMembersPanel orgId={orgId} deptId={dept.id} />
                      )}

                      {/* Certificate policy toggle */}
                      <button
                        className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => orgId && togglePolicyPanel(dept.id)}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Certificate Policy
                        {expandedPolicies.has(dept.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* Certificate policy panel */}
                      {orgId && expandedPolicies.has(dept.id) && (
                        <DepartmentCertPolicyPanel orgId={orgId} deptId={dept.id} />
                      )}
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
                        <DropdownMenuItem onClick={() => openLinkDialog(dept)}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Link Principal
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

      {/* Link Principal to Department Dialog */}
      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setLinkingDept(null); setSelectedPrincipalId(""); }
          setIsLinkDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Principal to Department</DialogTitle>
            <DialogDescription>
              Link a principal to <strong>{linkingDept?.name}</strong>. All department members will gain access to the principal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="principal-select">Principal</Label>
              {availablePrincipalsToLink.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {principals.length === 0
                    ? "No principals exist yet. Create one on the Principals page."
                    : "All principals are already linked to this department."}
                </p>
              ) : (
                <Select value={selectedPrincipalId} onValueChange={setSelectedPrincipalId}>
                  <SelectTrigger id="principal-select" className="mt-1">
                    <SelectValue placeholder="Choose a principal…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrincipalsToLink.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleLinkPrincipal}
              disabled={!selectedPrincipalId || isLinking || availablePrincipalsToLink.length === 0}
            >
              {isLinking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
