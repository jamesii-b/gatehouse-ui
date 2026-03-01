import { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  Copy,
  CheckCircle,
  Loader2,
  Terminal,
  Plus,
  User,
  Server,
  Settings,
  AlertCircle,
  ServerCog,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";
import { api, OrgCA, ApiError } from "@/lib/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopy}>
      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── CA Detail Card ───────────────────────────────────────────────────────────

interface CADetailCardProps {
  ca: OrgCA;
  onEdit: (ca: OrgCA) => void;
  onRotate: (ca: OrgCA) => void;
  onDelete: (ca: OrgCA) => void;
}

function CADetailCard({ ca, onEdit, onRotate, onDelete }: CADetailCardProps) {
  const isUser = ca.ca_type === "user";
  const isSystem = !!ca.is_system;
  const sshConfig = isUser
    ? `# /etc/ssh/sshd_config:\nTrustedUserCAKeys /etc/ssh/trusted_user_ca_keys\n\n# Add public key:\necho '${ca.public_key.trim()}' \\\n  >> /etc/ssh/trusted_user_ca_keys`
    : `# /etc/ssh/sshd_config:\nHostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub\n\n# Add to known_hosts (clients):\n@cert-authority * ${ca.public_key.trim()}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {isSystem ? <ServerCog className="w-4 h-4" /> : isUser ? <User className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                {ca.name}
                {isSystem ? (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <ServerCog className="w-3 h-3" />
                    System
                  </Badge>
                ) : ca.is_active ? (
                  <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </CardTitle>
              {ca.description && (
                <CardDescription className="mt-1">{ca.description}</CardDescription>
              )}
            </div>
            <Badge variant="outline" className="text-xs font-mono">{ca.key_type}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats — hidden for system CAs (we have no cert records for them) */}
          {!isSystem && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold">{ca.active_certs}</p>
                <p className="text-xs text-muted-foreground">Active certs</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold">{ca.total_certs}</p>
                <p className="text-xs text-muted-foreground">Total issued</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold">{ca.default_cert_validity_hours}h</p>
                <p className="text-xs text-muted-foreground">Default validity</p>
              </div>
            </div>
          )}

          {/* Fingerprint */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fingerprint</p>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{ca.fingerprint}</code>
          </div>

          {/* Public key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Public key</p>
              <CopyButton text={ca.public_key} />
            </div>
            <Textarea readOnly value={ca.public_key} className="font-mono text-xs min-h-[60px]" />
          </div>

          {/* Setup instructions */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-semibold flex items-center gap-1 mb-1">
              <Terminal className="w-3 h-3" />
              {isUser ? "Add to SSH servers (sshd_config)" : "Host certificate setup"}
            </p>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">{sshConfig}</pre>
          </div>

          {ca.created_at && (
            <p className="text-xs text-muted-foreground">Created {formatDate(ca.created_at)}</p>
          )}
          {ca.rotated_at && (
            <p className="text-xs text-muted-foreground">
              Key rotated {formatDate(ca.rotated_at)}
              {ca.rotation_reason && <> — {ca.rotation_reason}</>}
            </p>
          )}

          {!isSystem && (
            <div className="pt-2 border-t space-y-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(ca)} className="w-full">
                <Settings className="w-3 h-3 mr-2" />
                Edit Configuration
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => onRotate(ca)} className="w-full">
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Rotate Key
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(ca)}
                  className="w-full text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                >
                  <ShieldOff className="w-3 h-3 mr-2" />
                  Delete CA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── CA Section (one per type) ────────────────────────────────────────────────

interface CASectionProps {
  caType: "user" | "host";
  ca: OrgCA | null;
  onCreateClick: (caType: "user" | "host") => void;
  onEdit: (ca: OrgCA) => void;
  onRotate: (ca: OrgCA) => void;
  onDelete: (ca: OrgCA) => void;
}

function CASection({ caType, ca, onCreateClick, onEdit, onRotate, onDelete }: CASectionProps) {
  const isUser = caType === "user";
  const title = isUser ? "User Signing Key" : "Host Signing Key";
  const subtitle = isUser
    ? "Signs SSH user certificates so users can authenticate to servers."
    : "Signs SSH host certificates so clients can verify server identity.";
  const Icon = isUser ? User : Server;
  const isSystem = !!ca?.is_system;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {ca ? (
          isSystem ? (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <ServerCog className="w-3 h-3" />
              System (read-only)
            </Badge>
          ) : (
            <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Configured</Badge>
          )
        ) : (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Not configured
          </Badge>
        )}
      </div>

      {ca ? (
        <>
          <CADetailCard ca={ca} onEdit={onEdit} onRotate={onRotate} onDelete={onDelete} />
          {/* When only a system CA is present, offer to generate a managed replacement */}
          {isSystem && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Using server-configured CA</p>
                <p>
                  Certificates are being signed by a CA key loaded from the server configuration,
                  not managed through this UI. Generate a managed key below to take full control
                  of certificate issuance from Gatehouse.
                </p>
              </div>
              <Button onClick={() => onCreateClick(caType)} size="sm" variant="outline" className="flex-shrink-0">
                <Plus className="w-3 h-3 mr-1" />
                Generate managed key
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No {title} configured</p>
            <p className="text-xs text-center mb-4 max-w-sm">{subtitle}</p>
            <Button onClick={() => onCreateClick(caType)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Generate {title}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CAsPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;

  const { toast } = useToast();
  const [cas, setCAs] = useState<OrgCA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create CA dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCaType, setCreateCaType] = useState<"user" | "host">("user");
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    key_type: "ed25519" as "ed25519" | "rsa" | "ecdsa",
    default_cert_validity_hours: 8,
    max_cert_validity_hours: 720,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit CA dialog
  const [editingCA, setEditingCA] = useState<OrgCA | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    default_cert_validity_hours: 1,
    max_cert_validity_hours: 24,
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Rotate CA dialog
  const [rotatingCA, setRotatingCA] = useState<OrgCA | null>(null);
  const [isRotateDialogOpen, setIsRotateDialogOpen] = useState(false);
  const [rotateKeyType, setRotateKeyType] = useState<"ed25519" | "rsa" | "ecdsa">("ed25519");
  const [rotateReason, setRotateReason] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  // Delete CA dialog
  const [deletingCA, setDeletingCA] = useState<OrgCA | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!orgId) { setIsLoading(false); return; }
    (async () => {
      setIsLoading(true);
      try {
        const data = await api.organizations.getCAs(orgId);
        setCAs(data.cas);
      } catch (err) {
        if (err instanceof ApiError && err.code === 403) {
          toast({ variant: "destructive", title: "Access denied", description: "Admin or owner role required." });
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
    if (!createForm.name.trim()) { setCreateError("Name is required"); return; }
    if (createForm.default_cert_validity_hours <= 0 || createForm.max_cert_validity_hours <= 0) {
      setCreateError("Validity hours must be greater than 0"); return;
    }
    if (createForm.default_cert_validity_hours > createForm.max_cert_validity_hours) {
      setCreateError("Default validity must be ≤ maximum validity"); return;
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
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError("Failed to create CA — please try again");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCA = (ca: OrgCA) => {
    setEditingCA(ca);
    setEditFormData({
      default_cert_validity_hours: ca.default_cert_validity_hours,
      max_cert_validity_hours: ca.max_cert_validity_hours,
    });
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveCA = async () => {
    if (!orgId || !editingCA) return;
    if (editFormData.default_cert_validity_hours <= 0 || editFormData.max_cert_validity_hours <= 0) {
      setEditError("Validity hours must be greater than 0"); return;
    }
    if (editFormData.default_cert_validity_hours > editFormData.max_cert_validity_hours) {
      setEditError("Default validity must be less than or equal to maximum validity"); return;
    }
    setIsEditSaving(true);
    try {
      const updated = await api.organizations.updateCA(orgId, editingCA.id, editFormData);
      setCAs(cas.map((ca) => (ca.id === editingCA.id ? updated.ca : ca)));
      setIsEditDialogOpen(false);
      setEditingCA(null);
      toast({ title: "CA configuration updated" });
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update CA");
    } finally {
      setIsEditSaving(false);
    }
  };

  // ── Rotate handlers ──
  const handleRotateCA = (ca: OrgCA) => {
    setRotatingCA(ca);
    setRotateKeyType((ca.key_type as "ed25519" | "rsa" | "ecdsa") || "ed25519");
    setRotateReason("");
    setRotateError(null);
    setIsRotateDialogOpen(true);
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
      setIsRotateDialogOpen(false);
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

  // ── Delete handlers ──
  const handleDeleteCA = (ca: OrgCA) => {
    setDeletingCA(ca);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orgId || !deletingCA) return;
    setIsDeleting(true);
    try {
      await api.organizations.deleteCA(orgId, deletingCA.id);
      setCAs(cas.filter((ca) => ca.id !== deletingCA.id));
      setIsDeleteDialogOpen(false);
      setDeletingCA(null);
      toast({ title: "CA deleted", description: "Existing certificates remain valid until they expire." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete CA", description: err instanceof ApiError ? err.message : "" });
    } finally {
      setIsDeleting(false);
    }
  };  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Certificate Authorities</h1>
          <p className="page-description">
            Manage your organization's SSH certificate authorities and access controls
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <CASection caType="user" ca={userCA} onCreateClick={handleOpenCreate} onEdit={handleEditCA} onRotate={handleRotateCA} onDelete={handleDeleteCA} />
          <div className="border-t" />
          <CASection caType="host" ca={hostCA} onCreateClick={handleOpenCreate} onEdit={handleEditCA} onRotate={handleRotateCA} onDelete={handleDeleteCA} />
        </div>
      )}

      {/* ── Edit CA Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit CA Configuration</DialogTitle>
            <DialogDescription>
              Update certificate validity settings for <strong>{editingCA?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {editError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="default-validity">Default Certificate Validity (hours)</Label>
              <Input
                id="default-validity"
                type="number"
                min="1"
                value={editFormData.default_cert_validity_hours}
                onChange={(e) => setEditFormData({ ...editFormData, default_cert_validity_hours: parseInt(e.target.value) || 1 })}
                disabled={isEditSaving}
              />
              <p className="text-xs text-muted-foreground">Default validity period when issuing new certificates</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-validity">Maximum Certificate Validity (hours)</Label>
              <Input
                id="max-validity"
                type="number"
                min="1"
                value={editFormData.max_cert_validity_hours}
                onChange={(e) => setEditFormData({ ...editFormData, max_cert_validity_hours: parseInt(e.target.value) || 1 })}
                disabled={isEditSaving}
              />
              <p className="text-xs text-muted-foreground">Maximum allowed validity period for any certificate from this CA</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditSaving}>Cancel</Button>
            <Button onClick={handleSaveCA} disabled={isEditSaving}>
              {isEditSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create CA Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createCaType === "user" ? <User className="w-5 h-5" /> : <Server className="w-5 h-5" />}
              Generate {createCaType === "user" ? "User" : "Host"} Signing Key
            </DialogTitle>
            <DialogDescription>
              {createCaType === "user"
                ? "Creates a key pair for signing SSH user certificates. The private key is stored securely and never exposed."
                : "Creates a key pair for signing SSH host certificates, allowing clients to verify server identity."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {createError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ca-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="ca-name"
                placeholder={createCaType === "user" ? "User CA" : "Host CA"}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ca-description">Description</Label>
              <Input
                id="ca-description"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ca-key-type">Key Algorithm</Label>
              <Select
                value={createForm.key_type}
                onValueChange={(v) => setCreateForm({ ...createForm, key_type: v as "ed25519" | "rsa" | "ecdsa" })}
                disabled={isCreating}
              >
                <SelectTrigger id="ca-key-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ed25519">Ed25519 (recommended)</SelectItem>
                  <SelectItem value="ecdsa">ECDSA (P-521)</SelectItem>
                  <SelectItem value="rsa">RSA-4096</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ca-default-validity">Default validity (hours)</Label>
                <Input
                  id="ca-default-validity"
                  type="number"
                  min="1"
                  value={createForm.default_cert_validity_hours}
                  onChange={(e) => setCreateForm({ ...createForm, default_cert_validity_hours: parseInt(e.target.value) || 1 })}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ca-max-validity">Max validity (hours)</Label>
                <Input
                  id="ca-max-validity"
                  type="number"
                  min="1"
                  value={createForm.max_cert_validity_hours}
                  onChange={(e) => setCreateForm({ ...createForm, max_cert_validity_hours: parseInt(e.target.value) || 1 })}
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreateCA} disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating key…</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Generate Key</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rotate CA Dialog ── */}
      <Dialog open={isRotateDialogOpen} onOpenChange={(open) => { setIsRotateDialogOpen(open); if (!open) setRotateError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Rotate CA Key
            </DialogTitle>
            <DialogDescription>
              Generate a new key pair for <strong>{rotatingCA?.name}</strong>.
              Previously-issued certificates remain valid until they expire, but all new
              certificates will be signed with the new key. You must update
              {rotatingCA?.ca_type === "user"
                ? " TrustedUserCAKeys on your SSH servers"
                : " @cert-authority in client known_hosts files"} after rotation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {rotateError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{rotateError}</span>
              </div>
            )}

            {rotatingCA && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">⚠ Important</p>
                <p>
                  Current fingerprint: <code className="font-mono">{rotatingCA.fingerprint}</code>
                </p>
                <p className="mt-1">
                  After rotation, you <strong>must</strong> replace this fingerprint on every server /
                  client that trusts this CA. Until updated, new certificates won't be accepted.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rotate-key-type">New Key Algorithm</Label>
              <Select
                value={rotateKeyType}
                onValueChange={(v) => setRotateKeyType(v as "ed25519" | "rsa" | "ecdsa")}
                disabled={isRotating}
              >
                <SelectTrigger id="rotate-key-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ed25519">Ed25519 (recommended)</SelectItem>
                  <SelectItem value="ecdsa">ECDSA (P-521)</SelectItem>
                  <SelectItem value="rsa">RSA-4096</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rotate-reason">Reason (optional)</Label>
              <Input
                id="rotate-reason"
                placeholder="e.g. Suspected key compromise, Scheduled rotation"
                value={rotateReason}
                onChange={(e) => setRotateReason(e.target.value)}
                disabled={isRotating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRotateDialogOpen(false)} disabled={isRotating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRotate} disabled={isRotating} variant="destructive">
              {isRotating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rotating…</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Rotate Key</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete CA Confirmation ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate Authority?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate <strong>{deletingCA?.name}</strong>.
              No new certificates can be signed with this CA after deletion.
              Existing certificates remain valid until they expire.
              {deletingCA?.active_certs ? (
                <span className="block mt-2 font-semibold text-amber-600 dark:text-amber-400">
                  ⚠ This CA has {deletingCA.active_certs} active certificate{deletingCA.active_certs !== 1 ? "s" : ""}.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete CA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
