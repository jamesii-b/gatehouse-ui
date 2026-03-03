import { Loader2, AlertCircle, Shield, User, Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { OrgCA } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Create CA Dialog
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCAForm {
  name: string;
  description: string;
  key_type: "ed25519" | "rsa" | "ecdsa";
  default_cert_validity_hours: number;
  max_cert_validity_hours: number;
}

interface CreateCADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caType: "user" | "host";
  form: CreateCAForm;
  onFormChange: (form: CreateCAForm) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: () => void;
}

export function CreateCADialog({
  open,
  onOpenChange,
  caType,
  form,
  onFormChange,
  error,
  isLoading,
  onSubmit,
}: CreateCADialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {caType === "user" ? <User className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            Generate {caType === "user" ? "User" : "Host"} Signing Key
          </DialogTitle>
          <DialogDescription>
            {caType === "user"
              ? "Creates a key pair for signing SSH user certificates. The private key is stored securely and never exposed."
              : "Creates a key pair for signing SSH host certificates, allowing clients to verify server identity."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ca-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ca-name"
              placeholder={caType === "user" ? "User CA" : "Host CA"}
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-description">Description</Label>
            <Input
              id="ca-description"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-key-type">Key Algorithm</Label>
            <Select
              value={form.key_type}
              onValueChange={(v) =>
                onFormChange({ ...form, key_type: v as "ed25519" | "rsa" | "ecdsa" })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="ca-key-type">
                <SelectValue />
              </SelectTrigger>
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
                value={form.default_cert_validity_hours}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    default_cert_validity_hours: parseInt(e.target.value) || 1,
                  })
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-max-validity">Max validity (hours)</Label>
              <Input
                id="ca-max-validity"
                type="number"
                min="1"
                value={form.max_cert_validity_hours}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    max_cert_validity_hours: parseInt(e.target.value) || 1,
                  })
                }
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating key…
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Generate Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit CA Dialog
// ─────────────────────────────────────────────────────────────────────────────

export interface EditCAForm {
  default_cert_validity_hours: number;
  max_cert_validity_hours: number;
}

interface EditCADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ca: OrgCA | null;
  form: EditCAForm;
  onFormChange: (form: EditCAForm) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: () => void;
}

export function EditCADialog({
  open,
  onOpenChange,
  ca,
  form,
  onFormChange,
  error,
  isLoading,
  onSubmit,
}: EditCADialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit CA Configuration</DialogTitle>
          <DialogDescription>
            Update certificate validity settings for <strong>{ca?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="default-validity">Default Certificate Validity (hours)</Label>
            <Input
              id="default-validity"
              type="number"
              min="1"
              value={form.default_cert_validity_hours}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  default_cert_validity_hours: parseInt(e.target.value) || 1,
                })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Default validity period when issuing new certificates
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-validity">Maximum Certificate Validity (hours)</Label>
            <Input
              id="max-validity"
              type="number"
              min="1"
              value={form.max_cert_validity_hours}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  max_cert_validity_hours: parseInt(e.target.value) || 1,
                })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Maximum allowed validity period for any certificate from this CA
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotate CA Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface RotateCADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ca: OrgCA | null;
  keyType: "ed25519" | "rsa" | "ecdsa";
  onKeyTypeChange: (kt: "ed25519" | "rsa" | "ecdsa") => void;
  reason: string;
  onReasonChange: (r: string) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: () => void;
}

export function RotateCADialog({
  open,
  onOpenChange,
  ca,
  keyType,
  onKeyTypeChange,
  reason,
  onReasonChange,
  error,
  isLoading,
  onSubmit,
}: RotateCADialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Rotate CA Key
          </DialogTitle>
          <DialogDescription>
            Generate a new key pair for <strong>{ca?.name}</strong>. Previously-issued
            certificates remain valid until they expire, but all new certificates will be signed
            with the new key. You must update{" "}
            {ca?.ca_type === "user"
              ? "TrustedUserCAKeys on your SSH servers"
              : "@cert-authority in client known_hosts files"}{" "}
            after rotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ca && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">⚠ Important</p>
              <p>
                Current fingerprint:{" "}
                <code className="font-mono">{ca.fingerprint}</code>
              </p>
              <p className="mt-1">
                After rotation, you <strong>must</strong> replace this fingerprint on every
                server / client that trusts this CA. Until updated, new certificates won't be
                accepted.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rotate-key-type">New Key Algorithm</Label>
            <Select
              value={keyType}
              onValueChange={(v) => onKeyTypeChange(v as "ed25519" | "rsa" | "ecdsa")}
              disabled={isLoading}
            >
              <SelectTrigger id="rotate-key-type">
                <SelectValue />
              </SelectTrigger>
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
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading} variant="destructive">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rotating…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Rotate Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete CA Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteCADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ca: OrgCA | null;
  isLoading: boolean;
  onConfirm: () => void;
}

export function DeleteCADialog({
  open,
  onOpenChange,
  ca,
  isLoading,
  onConfirm,
}: DeleteCADialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Certificate Authority?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently deactivate <strong>{ca?.name}</strong>. No new certificates
            can be signed with this CA after deletion. Existing certificates remain valid until
            they expire.
            {ca?.active_certs ? (
              <span className="block mt-2 font-semibold text-amber-600 dark:text-amber-400">
                ⚠ This CA has {ca.active_certs} active certificate
                {ca.active_certs !== 1 ? "s" : ""}.
              </span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete CA
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
