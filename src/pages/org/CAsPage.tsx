// ─── THIS FILE IS THE LEAN ORCHESTRATOR ──────────────────────────────────────
// Heavy sub-components live in ./ca/  — edit them there for isolated changes.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Loader2, Server, Shield, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { api, OrgCA, ApiError } from "@/lib/api";
import { CASection } from "./ca/CASection";
import {
  CreateCADialog,
  CreateCAForm,
  EditCADialog,
  EditCAForm,
  RotateCADialog,
  DeleteCADialog,
} from "./ca/CADialogs";

export default function CAsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;

  const { toast } = useToast();
  const [cas, setCAs] = useState<OrgCA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCaType, setCreateCaType] = useState<"user" | "host">("user");
  const [createForm, setCreateForm] = useState<CreateCAForm>({
    name: "",
    description: "",
    key_type: "ed25519",
    default_cert_validity_hours: 8,
    max_cert_validity_hours: 720,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editingCA, setEditingCA] = useState<OrgCA | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditCAForm>({
    default_cert_validity_hours: 1,
    max_cert_validity_hours: 24,
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Rotate dialog ──────────────────────────────────────────────────────────
  const [rotatingCA, setRotatingCA] = useState<OrgCA | null>(null);
  const [isRotateOpen, setIsRotateOpen] = useState(false);
  const [rotateKeyType, setRotateKeyType] = useState<"ed25519" | "rsa" | "ecdsa">("ed25519");
  const [rotateReason, setRotateReason] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deletingCA, setDeletingCA] = useState<OrgCA | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load CAs ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const data = await api.organizations.getCAs(orgId);
        setCAs(data.cas);
      } catch (err) {
        if (err instanceof ApiError && err.code === 403) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "Admin or owner role required.",
          });
        } else {
          toast({ variant: "destructive", title: "Failed to load CAs" });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [orgId, toast]);

  const userCA = cas.find((c) => c.ca_type === "user") ?? null;
  const hostCA = cas.find((c) => c.ca_type === "host") ?? null;

  // ── Handlers: Create ───────────────────────────────────────────────────────
  const handleOpenCreate = (caType: "user" | "host") => {
    setCreateCaType(caType);
    setCreateForm({
      name: caType === "user" ? "User CA" : "Host CA",
      description: "",
      key_type: "ed25519",
      default_cert_validity_hours: caType === "user" ? 8 : 720,
      max_cert_validity_hours: caType === "user" ? 720 : 8760,
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateCA = async () => {
    if (!orgId) return;
    if (!createForm.name.trim()) {
      setCreateError("Name is required");
      return;
    }
    if (createForm.default_cert_validity_hours <= 0 || createForm.max_cert_validity_hours <= 0) {
      setCreateError("Validity hours must be greater than 0");
      return;
    }
    if (createForm.default_cert_validity_hours > createForm.max_cert_validity_hours) {
      setCreateError("Default validity must be ≤ maximum validity");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await api.organizations.createCA(orgId, {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        ca_type: createCaType,
        key_type: createForm.key_type,
        default_cert_validity_hours: createForm.default_cert_validity_hours,
        max_cert_validity_hours: createForm.max_cert_validity_hours,
      });
      setCAs((prev) => [...prev, result.ca]);
      setIsCreateOpen(false);
      toast({
        title: `${createCaType === "user" ? "User" : "Host"} CA created`,
        description: result.ca.name,
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create CA — please try again",
      );
    } finally {
      setIsCreating(false);
    }
  };

  // ── Handlers: Edit ─────────────────────────────────────────────────────────
  const handleEditCA = (ca: OrgCA) => {
    setEditingCA(ca);
    setEditForm({
      default_cert_validity_hours: ca.default_cert_validity_hours,
      max_cert_validity_hours: ca.max_cert_validity_hours,
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveCA = async () => {
    if (!orgId || !editingCA) return;
    if (editForm.default_cert_validity_hours <= 0 || editForm.max_cert_validity_hours <= 0) {
      setEditError("Validity hours must be greater than 0");
      return;
    }
    if (editForm.default_cert_validity_hours > editForm.max_cert_validity_hours) {
      setEditError("Default validity must be less than or equal to maximum validity");
      return;
    }
    setIsEditSaving(true);
    try {
      const updated = await api.organizations.updateCA(orgId, editingCA.id, editForm);
      setCAs(cas.map((ca) => (ca.id === editingCA.id ? updated.ca : ca)));
      setIsEditOpen(false);
      setEditingCA(null);
      toast({ title: "CA configuration updated" });
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update CA");
    } finally {
      setIsEditSaving(false);
    }
  };

  // ── Handlers: Rotate ───────────────────────────────────────────────────────
  const handleRotateCA = (ca: OrgCA) => {
    setRotatingCA(ca);
    setRotateKeyType((ca.key_type as "ed25519" | "rsa" | "ecdsa") || "ed25519");
    setRotateReason("");
    setRotateError(null);
    setIsRotateOpen(true);
  };

  const handleConfirmRotate = async () => {
    if (!orgId || !rotatingCA) return;
    setIsRotating(true);
    setRotateError(null);
    try {
      const result = await api.organizations.rotateCA(orgId, rotatingCA.id, {
        key_type: rotateKeyType,
        reason: rotateReason.trim() || undefined,
      });
      setCAs(cas.map((ca) => (ca.id === rotatingCA.id ? result.ca : ca)));
      setIsRotateOpen(false);
      setRotatingCA(null);
      toast({
        title: "CA key rotated successfully",
        description: `Old fingerprint: ${result.old_fingerprint}. Update TrustedUserCAKeys / known_hosts on your servers.`,
      });
    } catch (err) {
      setRotateError(err instanceof ApiError ? err.message : "Failed to rotate CA key");
    } finally {
      setIsRotating(false);
    }
  };

  // ── Handlers: Delete ───────────────────────────────────────────────────────
  const handleDeleteCA = (ca: OrgCA) => {
    setDeletingCA(ca);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orgId || !deletingCA) return;
    setIsDeleting(true);
    try {
      await api.organizations.deleteCA(orgId, deletingCA.id);
      setCAs(cas.filter((ca) => ca.id !== deletingCA.id));
      setIsDeleteOpen(false);
      setDeletingCA(null);
      toast({
        title: "CA deleted",
        description: "Existing certificates remain valid until they expire.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to delete CA",
        description: err instanceof ApiError ? err.message : "",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Shared section event props
  const sectionProps = {
    onCreateClick: handleOpenCreate,
    onEdit: handleEditCA,
    onRotate: handleRotateCA,
    onDelete: handleDeleteCA,
  };

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="page-title">Certificate Authorities</h1>
            <p className="page-description">
              Manage your organization's SSH CAs with <code>Gatehouse</code>
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="user" className="space-y-4">
          <TabsList className="h-auto gap-1">
            <TabsTrigger value="user" className="flex items-center gap-2 px-4 py-2">
              <User className="w-4 h-4" />
              <span>User CA</span>
              {userCA ? (
                userCA.is_system ? (
                  <Badge variant="secondary" className="text-xs ml-1">System</Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-700 border-0 text-xs ml-1">
                    Active
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-xs ml-1 text-muted-foreground">
                  Not set
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="host" className="flex items-center gap-2 px-4 py-2">
              <Server className="w-4 h-4" />
              <span>Host CA</span>
              {hostCA ? (
                hostCA.is_system ? (
                  <Badge variant="secondary" className="text-xs ml-1">System</Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-700 border-0 text-xs ml-1">
                    Active
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-xs ml-1 text-muted-foreground">
                  Not set
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-0">
            <CASection caType="user" ca={userCA} {...sectionProps} />
          </TabsContent>

          <TabsContent value="host" className="mt-0">
            <CASection caType="host" ca={hostCA} {...sectionProps} />
          </TabsContent>
        </Tabs>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CreateCADialog
        open={isCreateOpen}
        onOpenChange={(o) => { setIsCreateOpen(o); if (!o) setCreateError(null); }}
        caType={createCaType}
        form={createForm}
        onFormChange={setCreateForm}
        error={createError}
        isLoading={isCreating}
        onSubmit={handleCreateCA}
      />

      <EditCADialog
        open={isEditOpen}
        onOpenChange={(o) => { setIsEditOpen(o); if (!o) setEditError(null); }}
        ca={editingCA}
        form={editForm}
        onFormChange={setEditForm}
        error={editError}
        isLoading={isEditSaving}
        onSubmit={handleSaveCA}
      />

      <RotateCADialog
        open={isRotateOpen}
        onOpenChange={(o) => { setIsRotateOpen(o); if (!o) setRotateError(null); }}
        ca={rotatingCA}
        keyType={rotateKeyType}
        onKeyTypeChange={setRotateKeyType}
        reason={rotateReason}
        onReasonChange={setRotateReason}
        error={rotateError}
        isLoading={isRotating}
        onSubmit={handleConfirmRotate}
      />

      <DeleteCADialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        ca={deletingCA}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

