import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  Loader2,
  Terminal,
  Award,
  AlertTriangle,
  Pencil,
  ShieldOff,
  Server,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { api, SSHKey, SSHCertificate, ApiError, PrincipalOption, MyPrincipalsOrg, DeptCertPolicy } from "@/lib/api";
import { formatDate as _formatDate } from "@/lib/date";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return _formatDate(dateStr);
}

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

// ──────────────────────────────────────────────────────────────────────────────
// Main page component
// ──────────────────────────────────────────────────────────────────────────────

export default function SSHKeysPage() {
  const { toast } = useToast();

  // Key list state
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add key modal
  const [showAdd, setShowAdd] = useState(false);
  const [addPublicKey, setAddPublicKey] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingKey, setDeletingKey] = useState<SSHKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline description editing
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  // Verify (challenge/sign) wizard
  const [verifyingKey, setVerifyingKey] = useState<SSHKey | null>(null);
  const [verifyStep, setVerifyStep] = useState<"challenge" | "submit" | "done">("challenge");
  const [challengeText, setChallengeText] = useState("");
  const [signatureInput, setSignatureInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Sign certificate modal
  const [signingKey, setSigningKey] = useState<SSHKey | null>(null);
  const [certResult, setCertResult] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [certType, setCertType] = useState<'user' | 'host'>('user');
  const [expiryHours, setExpiryHours] = useState<string>('');
  const [deptCertPolicy, setDeptCertPolicy] = useState<DeptCertPolicy | null>(null);

  // Principal selection (populated when sign dialog opens)
  const [principalOrgs, setPrincipalOrgs] = useState<MyPrincipalsOrg[]>([]);
  const [availablePrincipals, setAvailablePrincipals] = useState<PrincipalOption[]>([]);
  const [selectedPrincipalNames, setSelectedPrincipalNames] = useState<Set<string>>(new Set());
  const [isLoadingPrincipals, setIsLoadingPrincipals] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Certificates tab
  const [certs, setCerts] = useState<SSHCertificate[]>([]);
  const [isCertsLoading, setIsCertsLoading] = useState(false);
  const [revokingCertId, setRevokingCertId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // CA public key
  const [caPublicKey, setCaPublicKey] = useState<string | null>(null);
  const [caName, setCaName] = useState<string | null>(null);
  const [isCaLoading, setIsCaLoading] = useState(false);

  // ── Fetch keys ──────────────────────────────────────────────────────────────
  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.ssh.listKeys();
      setKeys(data.keys);
    } catch (err) {
      const errorMsg = err instanceof ApiError ? `${err.message} (${err.type})` : String(err);
      console.error("Failed to load SSH keys:", errorMsg, err);
      toast({
        variant: "destructive",
        title: "Failed to load SSH keys",
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const fetchCerts = useCallback(async () => {
    setIsCertsLoading(true);
    try {
      const data = await api.ssh.listCertificates();
      setCerts(data.certificates);
    } catch (err) {
      console.error("Failed to load certificates:", err);
    } finally {
      setIsCertsLoading(false);
    }
  }, []);

  const fetchCaPublicKey = useCallback(async () => {
    setIsCaLoading(true);
    try {
      const data = await api.ssh.getCaPublicKey();
      setCaPublicKey(data.public_key);
      setCaName(data.ca_name);
    } catch {
      // No CA configured — silently ignore
    } finally {
      setIsCaLoading(false);
    }
  }, []);

  // ── Add key ─────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddError(null);
    if (!addPublicKey.trim()) {
      setAddError("Public key is required");
      return;
    }
    setIsAdding(true);
    try {
      await api.ssh.addKey(addPublicKey.trim(), addDescription.trim() || undefined);
      toast({ title: "SSH key added" });
      setShowAdd(false);
      setAddPublicKey("");
      setAddDescription("");
      fetchKeys();
    } catch (err) {
      console.error("Failed to add SSH key:", err);
      setAddError(err instanceof ApiError ? err.message : "Failed to add key");
    } finally {
      setIsAdding(false);
    }
  };

  // ── Delete key ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingKey) return;
    setIsDeleting(true);
    try {
      await api.ssh.deleteKey(deletingKey.id);
      setKeys((prev) => prev.filter((k) => k.id !== deletingKey.id));
      toast({ title: "SSH key deleted" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to delete SSH key",
        description: err instanceof ApiError ? err.message : "An error occurred",
      });
    } finally {
      setIsDeleting(false);
      setDeletingKey(null);
    }
  };

  // ── Rename description ──────────────────────────────────────────────────────
  const handleRenameCommit = async (key: SSHKey) => {
    if (!editingDescription.trim() || editingDescription === (key.description ?? "")) {
      setEditingKeyId(null);
      return;
    }
    try {
      const updated = await api.ssh.updateKeyDescription(key.id, editingDescription.trim());
      setKeys((prev) => prev.map((k) => (k.id === key.id ? updated : k)));
      toast({ title: "Description updated" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update description",
        description: err instanceof ApiError ? err.message : "An error occurred",
      });
    } finally {
      setEditingKeyId(null);
    }
  };

  // ── Verify wizard ────────────────────────────────────────────────────────────
  const startVerify = async (key: SSHKey) => {
    setVerifyingKey(key);
    setVerifyStep("challenge");
    setChallengeText("");
    setSignatureInput("");
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const data = await api.ssh.getChallenge(key.id);
      setChallengeText(data.challenge_text);
      setVerifyStep("submit");
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Failed to fetch challenge");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyingKey) return;
    setVerifyError(null);
    if (!signatureInput.trim()) {
      setVerifyError("Signature is required");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await api.ssh.verifyKey(verifyingKey.id, signatureInput.trim());
      if (result.verified) {
        setVerifyStep("done");
        setKeys((prev) =>
          prev.map((k) =>
            k.id === verifyingKey.id
              ? { ...k, verified: true, verified_at: new Date().toISOString() }
              : k
          )
        );
      } else {
        setVerifyError("Signature verification failed. Please check the signed data and try again.");
      }
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Sign certificate ─────────────────────────────────────────────────────────
  const startSign = async (key: SSHKey) => {
    setSigningKey(key);
    setCertResult(null);
    setSignError(null);
    setSelectedPrincipalNames(new Set());
    setAvailablePrincipals([]);
    setPrincipalOrgs([]);
    setIsAdminMode(false);
    setCertType('user');
    setExpiryHours('');
    setDeptCertPolicy(null);
    setIsLoadingPrincipals(true);

    // Fetch dept cert policy in parallel
    api.ssh.getMyDeptCertPolicy().then((data) => {
      setDeptCertPolicy(data.policy);
    }).catch(() => {/* non-fatal */});

    try {
      const data = await api.users.myPrincipals();
      setPrincipalOrgs(data.orgs);

      // Determine admin mode: user is admin in at least one org
      const adminOrg = data.orgs.find(o => o.is_admin);
      const isAdmin = !!adminOrg;
      setIsAdminMode(isAdmin);

      // Collect available options: admins see all_principals (full org list),
      // regular users see only my_principals (their assigned ones)
      const opts: PrincipalOption[] = [];
      const seen = new Set<string>();
      for (const org of data.orgs) {
        const list = isAdmin ? org.all_principals : org.my_principals;
        for (const p of list) {
          if (!seen.has(p.name)) {
            seen.add(p.name);
            opts.push(p);
          }
        }
      }
      setAvailablePrincipals(opts);

      // Pre-select all assigned principals (my_principals) regardless of admin status
      const preselected = new Set<string>();
      for (const org of data.orgs) {
        for (const p of org.my_principals) preselected.add(p.name);
      }
      setSelectedPrincipalNames(preselected);
    } catch (err) {
      setSignError(err instanceof ApiError ? err.message : "Failed to load principals");
    } finally {
      setIsLoadingPrincipals(false);
    }
  };

  const togglePrincipal = (name: string) => {
    setSelectedPrincipalNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSign = async () => {
    if (!signingKey) return;
    setSignError(null);
    setIsSigning(true);
    try {
      const principals = Array.from(selectedPrincipalNames);
      const parsedExpiry = expiryHours.trim() ? parseInt(expiryHours, 10) : undefined;
      const result = await api.ssh.signCertificate(
        signingKey.id,
        principals.length > 0 ? principals : undefined,
        certType,
        parsedExpiry,
      );
      setCertResult(result.certificate);
      fetchCerts(); // refresh certs list
    } catch (err) {
      setSignError(err instanceof ApiError ? err.message : "Certificate signing failed");
    } finally {
      setIsSigning(false);
    }
  };

  // ── Revoke certificate ───────────────────────────────────────────────────────
  const handleRevoke = async () => {
    if (!revokingCertId) return;
    setIsRevoking(true);
    try {
      await api.ssh.revokeCertificate(revokingCertId);
      setCerts((prev) =>
        prev.map((c) => (c.id === revokingCertId ? { ...c, revoked: true, status: "revoked" } : c))
      );
      toast({ title: "Certificate revoked" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to revoke certificate",
        description: err instanceof ApiError ? err.message : "An error occurred",
      });
    } finally {
      setIsRevoking(false);
      setRevokingCertId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">SSH Keys</h1>
            <p className="page-description">
              Manage your SSH public keys and request signed certificates
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add SSH key
          </Button>
        </div>
      </div>

      <Tabs defaultValue="keys" onValueChange={(v) => {
        if (v === "certs") fetchCerts();
        if (v === "ca") fetchCaPublicKey();
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="keys">Public Keys</TabsTrigger>
          <TabsTrigger value="certs">Certificates</TabsTrigger>
          <TabsTrigger value="ca">CA Public Key</TabsTrigger>
        </TabsList>

        {/* ── Keys tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4" />
                Your SSH Keys
              </CardTitle>
              <CardDescription>
                Public keys associated with your account. Verify a key to enable certificate signing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No SSH keys yet</p>
                  <p className="text-xs mt-1">Add your first public key to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-start justify-between gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Description row */}
                        <div className="flex items-center gap-2 mb-1">
                          {editingKeyId === key.id ? (
                            <Input
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onBlur={() => handleRenameCommit(key)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameCommit(key);
                                if (e.key === "Escape") setEditingKeyId(null);
                              }}
                              className="h-7 text-sm max-w-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {key.description || <span className="text-muted-foreground italic">No description</span>}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingKeyId(key.id);
                              setEditingDescription(key.description ?? "");
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {key.verified ? (
                            <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </div>

                        {/* Key fingerprint / type */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono truncate">
                          {key.key_type && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-sans">
                              {key.key_type}
                            </span>
                          )}
                          <span className="truncate">{key.fingerprint ?? key.public_key.slice(0, 64) + "…"}</span>
                        </div>

                        {/* Dates */}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Added {formatDate(key.created_at)}
                          {key.verified_at && <span> · Verified {formatDate(key.verified_at)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!key.verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => startVerify(key)}
                          >
                            Verify
                          </Button>
                        )}
                        {key.verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => startSign(key)}
                          >
                            <Award className="w-3 h-3 mr-1" />
                            Sign cert
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingKey(key)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certificates tab ───────────────────────────────────────────────── */}
        <TabsContent value="certs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" />
                Issued Certificates
              </CardTitle>
              <CardDescription>
                SSH certificates issued to your keys. Active certificates can be used to authenticate to servers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCertsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : certs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No certificates yet</p>
                  <p className="text-xs mt-1">Verify a key and click "Sign cert" to get your first certificate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certs.map((cert) => {
                    // Ensure the date string is treated as UTC regardless of whether
                    // the backend emits a trailing Z (older rows may lack it).
                    const validBeforeStr = cert.valid_before.endsWith("Z") || cert.valid_before.includes("+")
                      ? cert.valid_before
                      : cert.valid_before + "Z";
                    const isExpired = new Date(validBeforeStr) < new Date();
                    const isRevoked = cert.revoked;
                    return (
                      <div key={cert.id} className="flex items-start justify-between gap-3 p-4 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium font-mono truncate">
                              {cert.principals.join(", ")}
                            </span>
                            {isRevoked ? (
                              <Badge variant="destructive" className="text-xs">Revoked</Badge>
                            ) : isExpired ? (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Valid {formatDate(cert.valid_after)} → {formatDate(cert.valid_before)}
                            {cert.serial != null && <span> · Serial #{cert.serial}</span>}
                          </div>
                        </div>
                        {!isRevoked && !isExpired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive flex-shrink-0"
                            onClick={() => setRevokingCertId(cert.id)}
                          >
                            <ShieldOff className="w-3 h-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CA Public Key tab ──────────────────────────────────────────────── */}
        <TabsContent value="ca">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4" />
                CA Public Key
              </CardTitle>
              <CardDescription>
                Add this key to <code>TrustedUserCAKeys</code> on your servers so they accept certificates issued by Secuird.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !caPublicKey ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No CA configured for your organization</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {caName && (
                    <p className="text-sm text-muted-foreground">CA: <strong>{caName}</strong></p>
                  )}
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={caPublicKey}
                      className="font-mono text-xs min-h-[80px] pr-10"
                    />
                    <div className="absolute top-2 right-2">
                      <CopyButton text={caPublicKey} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> Server setup
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
{`# On each SSH server:
echo '<ca_public_key>' >> /etc/ssh/trusted_user_ca
# In /etc/ssh/sshd_config:
TrustedUserCAKeys /etc/ssh/trusted_user_ca`}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add key dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); setAddError(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add SSH Public Key</DialogTitle>
            <DialogDescription>
              Paste your SSH public key (e.g. the contents of <code>~/.ssh/id_ed25519.pub</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{addError}</div>
            )}
            <div className="space-y-2">
              <Label>Public key</Label>
              <Textarea
                placeholder="ssh-ed25519 AAAA..."
                value={addPublicKey}
                onChange={(e) => setAddPublicKey(e.target.value)}
                className="font-mono text-xs min-h-[100px]"
                disabled={isAdding}
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="My laptop key"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                disabled={isAdding}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isAdding || !addPublicKey.trim()}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deletingKey} onOpenChange={() => setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SSH key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingKey?.description || "this key"}</strong>? This cannot be undone and any certificates signed with it will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Verify wizard dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!verifyingKey} onOpenChange={(open) => { if (!open) setVerifyingKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify SSH Key Ownership</DialogTitle>
            <DialogDescription>
              Prove you own this key by signing a challenge with it.
            </DialogDescription>
          </DialogHeader>

          {verifyStep === "challenge" && isVerifying && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Fetching challenge…</span>
            </div>
          )}

          {verifyStep === "challenge" && !isVerifying && verifyError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{verifyError}</div>
          )}

          {verifyStep === "submit" && (
            <div className="space-y-4 py-2">
              {verifyError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{verifyError}</div>
              )}
              <div className="space-y-2">
                <Label>Step 1 — Save the challenge text to a file</Label>
                <p className="text-xs text-muted-foreground">
                  Copy the <strong>entire</strong> text below (not just the hex) and save it to a file.
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={challengeText}
                    className="font-mono text-xs min-h-[80px] pr-10"
                  />
                  <div className="absolute top-2 right-2">
                    <CopyButton text={challengeText} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> Step 2 — Sign with ssh-keygen
                </Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={`echo '${challengeText}' > /tmp/challenge.txt\nssh-keygen -Y sign \\\n  -f ~/.ssh/id_ed25519 \\\n  -n file \\\n  /tmp/challenge.txt\ncat /tmp/challenge.txt.sig | base64 -w0`}
                    className="font-mono text-xs pr-10"
                    rows={6}
                  />
                  <div className="absolute top-2 right-2">
                    <CopyButton text={`echo '${challengeText}' > /tmp/challenge.txt\nssh-keygen -Y sign \\\n  -f ~/.ssh/id_ed25519 \\\n  -n file \\\n  /tmp/challenge.txt\ncat /tmp/challenge.txt.sig | base64 -w0`} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Step 3 — Paste the base64-encoded signature</Label>
                <Textarea
                  placeholder="Paste base64 signature here…"
                  value={signatureInput}
                  onChange={(e) => setSignatureInput(e.target.value)}
                  className="font-mono text-xs min-h-[80px]"
                  disabled={isVerifying}
                />
              </div>
            </div>
          )}

          {verifyStep === "done" && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-medium">Key verified!</p>
              <p className="text-sm text-muted-foreground">
                You can now use this key to request SSH certificates.
              </p>
            </div>
          )}

          <DialogFooter>
            {verifyStep !== "done" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setVerifyingKey(null)}
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
                {verifyStep === "submit" && (
                  <Button
                    onClick={handleVerifySubmit}
                    disabled={isVerifying || !signatureInput.trim()}
                  >
                    {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Verify signature
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={() => setVerifyingKey(null)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sign certificate dialog ───────────────────────────────────────────── */}
      <Dialog open={!!signingKey} onOpenChange={(open) => { if (!open) { setSigningKey(null); setCertResult(null); setSignError(null); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sign SSH Certificate</DialogTitle>
            <DialogDescription>
              Request a signed certificate for{" "}
              <strong>{signingKey?.description || "this key"}</strong>.
            </DialogDescription>
          </DialogHeader>

          {signError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{signError}</div>
          )}

          {!certResult ? (
            <div className="space-y-4 py-2">
              {isLoadingPrincipals ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading principals…</span>
                </div>
              ) : availablePrincipals.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                  You have no principals assigned. Ask an admin to add you to a principal before requesting a certificate.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {isAdminMode ? "Select principals" : "Select principals"}
                    </Label>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setSelectedPrincipalNames(new Set(availablePrincipals.map(p => p.name)))}
                      >
                        All
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setSelectedPrincipalNames(new Set())}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-lg border divide-y">
                    {availablePrincipals.map((p) => {
                      const checked = selectedPrincipalNames.has(p.name);
                      // For regular users, my_principals are the ones they're assigned
                      const isAssigned = principalOrgs.some(o => o.my_principals.some(mp => mp.name === p.name));
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-primary"
                            checked={checked}
                            onChange={() => togglePrincipal(p.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium">{p.name}</span>
                              {isAssigned && !isAdminMode && (
                                <Badge className="text-[10px] bg-green-500/10 text-green-700 border-0 px-1.5 py-0">assigned</Badge>
                              )}
                              {isAdminMode && isAssigned && (
                                <Badge className="text-[10px] bg-blue-500/10 text-blue-700 border-0 px-1.5 py-0">your assignment</Badge>
                              )}
                            </div>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPrincipalNames.size === 0
                      ? "Select at least one principal"
                      : `${selectedPrincipalNames.size} principal${selectedPrincipalNames.size !== 1 ? "s" : ""} selected`}
                  </p>
                </div>
              )}

              {/* Expiry — controlled by dept cert policy */}
              <div className="space-y-1.5">
                <Label htmlFor="expiry-hours" className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Validity (hours)
                </Label>
                {deptCertPolicy?.allow_user_expiry ? (
                  <div className="space-y-1">
                    <Input
                      id="expiry-hours"
                      type="number"
                      min={1}
                      max={deptCertPolicy.max_expiry_hours}
                      placeholder={`Default: ${deptCertPolicy.default_expiry_hours}h`}
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                      className="w-40"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isAdminMode
                        ? deptCertPolicy.max_expiry_hours < 8760
                          ? <>Capped at <strong>{deptCertPolicy.max_expiry_hours}h</strong> by department policy. Leave blank for default ({deptCertPolicy.default_expiry_hours}h).</>
                          : <>Leave blank to use default ({deptCertPolicy.default_expiry_hours}h).</>
                        : <>Max allowed: <strong>{deptCertPolicy.max_expiry_hours}h</strong>. Leave blank for default ({deptCertPolicy.default_expiry_hours}h).</>
                      }
                    </p>
                  </div>
                ) : deptCertPolicy ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>Expiry set by policy: <strong>{deptCertPolicy.default_expiry_hours} hours</strong></span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      id="expiry-hours"
                      type="number"
                      min={1}
                      placeholder="e.g. 8"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                      className="w-36"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use CA default.</p>
                  </div>
                )}
              </div>

              {/* Extensions granted (informational) */}
              {deptCertPolicy && deptCertPolicy.all_extensions?.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Extensions granted</Label>
                  <div className="flex flex-wrap gap-1">
                    {deptCertPolicy.all_extensions?.map((ext) => (
                      <Badge key={ext} variant="secondary" className="text-xs font-mono">{ext}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <Label>Certificate</Label>
                <CopyButton text={certResult} />
              </div>
              <Textarea
                readOnly
                value={certResult}
                className="font-mono text-xs min-h-[140px]"
              />
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-semibold flex items-center gap-1 mb-1">
                  <Terminal className="w-3 h-3" /> How to use
                </p>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
{`# Save next to your private key, e.g.:
echo '<certificate>' > ~/.ssh/id_ed25519-cert.pub
ssh -i ~/.ssh/id_ed25519 user@host`}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSigningKey(null); setCertResult(null); }}>
              Close
            </Button>
            {!certResult && (
              <Button
                onClick={handleSign}
                disabled={isSigning || isLoadingPrincipals || selectedPrincipalNames.size === 0}
              >
                {isSigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign certificate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke certificate confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!revokingCertId} onOpenChange={() => setRevokingCertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the certificate. Any active SSH sessions using it will not be affected immediately, but no new authentications will be allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
