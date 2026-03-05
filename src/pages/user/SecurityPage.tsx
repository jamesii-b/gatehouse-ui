import { useState, useEffect } from "react";
import { Lock, Fingerprint, Smartphone, Shield, Plus, CheckCircle, Loader2, Pencil, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddPasskeyWizard } from "@/components/security/AddPasskeyWizard";
import { TotpEnrollmentWizard } from "@/components/security/TotpEnrollmentWizard";
import { TotpRemoveDialog } from "@/components/security/TotpRemoveDialog";
import { PasswordStrengthMeter, isPasswordValid } from "@/components/auth/PasswordStrengthMeter";
import { api, ApiError, TotpStatusResponse, PasskeyCredential, User } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ComplianceBanner } from "@/components/auth/ComplianceBanner";
import { useAuth } from "@/contexts/AuthContext";
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

export default function SecurityPage() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);
  const [showTotpRemove, setShowTotpRemove] = useState(false);

  // Profile (for has_password / linked_providers)
  const [profile, setProfile] = useState<User | null>(null);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // TOTP state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpStatus, setTotpStatus] = useState<TotpStatusResponse | null>(null);
  const [isTotpStatusLoading, setIsTotpStatusLoading] = useState(true);

  // Passkey state
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isPasskeysLoading, setIsPasskeysLoading] = useState(true);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");
  const [deletingPasskey, setDeletingPasskey] = useState<PasskeyCredential | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();
  const { mfaCompliance } = useAuth();

  // Whether this user has a password (false for pure OAuth signups)
  const hasPassword = profile?.has_password ?? true; // default true until loaded
  const linkedProviders = profile?.linked_providers ?? [];

  // Derive policy requirements from actual org compliance data
  const effectiveModes = mfaCompliance?.orgs?.map(o => o.effective_mode) ?? [];
  const policyRequirements = {
    totpRequired: effectiveModes.some(m =>
      m === 'require_totp' || m === 'require_totp_or_webauthn'
    ),
    passkeysRequired: effectiveModes.some(m =>
      m === 'require_webauthn' || m === 'require_totp_or_webauthn'
    ),
    minPasswordLength: 12,
  };
  // Build a human-readable policy description from the strictest mode active
  const activePolicyModes = effectiveModes.filter(m => m && m.startsWith('require_'));
  const policyDescription = (() => {
    if (activePolicyModes.includes('require_totp_or_webauthn'))
      return 'Your organization requires TOTP or a passkey for all members.';
    if (activePolicyModes.includes('require_totp'))
      return 'Your organization requires TOTP to be enabled for all members.';
    if (activePolicyModes.includes('require_webauthn'))
      return 'Your organization requires a passkey for all members.';
    return null;
  })();

  // Fetch TOTP status on mount
  useEffect(() => {
    fetchProfile();
    fetchTotpStatus();
    fetchPasskeys();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.users.me();
      setProfile(res.user);
    } catch {
      // Non-fatal — UI falls back to showing password section
    }
  };

  const fetchTotpStatus = async () => {
    setIsTotpStatusLoading(true);
    try {
      const status = await api.totp.status();
      setTotpStatus(status);
      setTotpEnabled(status.totp_enabled);
    } catch (err) {
      console.error("Failed to fetch TOTP status:", err);
      setTotpEnabled(false);
    } finally {
      setIsTotpStatusLoading(false);
    }
  };

  const fetchPasskeys = async () => {
    setIsPasskeysLoading(true);
    try {
      const response = await api.webauthn.listCredentials();
      setPasskeys(response.credentials);
    } catch (err) {
      console.error("Failed to fetch passkeys:", err);
      setPasskeys([]);
    } finally {
      setIsPasskeysLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setPasswordError("New password does not meet strength requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.users.changePassword(currentPassword, newPassword, confirmPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      resetPasswordForm();
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Password change failed:", err);
      
      if (err instanceof ApiError) {
        if (err.type === "INVALID_CREDENTIALS" || err.code === 401) {
          setPasswordError("Current password is incorrect");
        } else if (err.type === "VALIDATION_ERROR") {
          setPasswordError(err.message);
        } else {
          setPasswordError(err.message);
        }
      } else {
        setPasswordError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    resetPasswordForm();
    setShowPasswordForm(false);
  };

  const handleRenamePasskey = async (passkey: PasskeyCredential) => {
    if (!editingPasskeyName.trim() || editingPasskeyName === passkey.name) {
      setEditingPasskeyId(null);
      return;
    }

    try {
      await api.webauthn.renameCredential(passkey.id, editingPasskeyName.trim());
      setPasskeys(passkeys.map(p => 
        p.id === passkey.id ? { ...p, name: editingPasskeyName.trim() } : p
      ));
      toast({
        title: "Passkey renamed",
        description: `Passkey renamed to "${editingPasskeyName.trim()}"`,
      });
    } catch (err) {
      console.error("Failed to rename passkey:", err);
      toast({
        variant: "destructive",
        title: "Failed to rename passkey",
        description: err instanceof ApiError ? err.message : "An error occurred",
      });
    } finally {
      setEditingPasskeyId(null);
      setEditingPasskeyName("");
    }
  };

  const handleDeletePasskey = async () => {
    if (!deletingPasskey) return;

    setIsDeleting(true);
    try {
      await api.webauthn.deleteCredential(deletingPasskey.id);
      setPasskeys(passkeys.filter(p => p.id !== deletingPasskey.id));
      toast({
        title: "Passkey removed",
        description: `"${deletingPasskey.name}" has been removed.`,
      });
    } catch (err) {
      console.error("Failed to delete passkey:", err);
      toast({
        variant: "destructive",
        title: "Failed to remove passkey",
        description: err instanceof ApiError ? err.message : "An error occurred",
      });
    } finally {
      setIsDeleting(false);
      setDeletingPasskey(null);
    }
  };

  const formatLastUsed = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Security</h1>
        <p className="page-description">
          Manage your authentication methods and security settings
        </p>
      </div>

      <ComplianceBanner compliance={mfaCompliance} />

      <div className="space-y-6">
        {/* Policy Status — only shown when the org actually enforces MFA */}
        {policyDescription && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Organization Policy</p>
                  <p className="text-sm text-muted-foreground">{policyDescription}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </CardTitle>
                <CardDescription>Manage your account password</CardDescription>
              </div>
              {hasPassword ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                >
                  Change password
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Not set
                </Badge>
              )}
            </div>
          </CardHeader>
          {!hasPassword && linkedProviders.length > 0 && (
            <CardContent className="border-t pt-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Link2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Your account uses{" "}
                  <span className="font-medium text-foreground">
                    {linkedProviders
                      .map((p) =>
                        ({ google: "Google", github: "GitHub", microsoft: "Microsoft", oidc: "SSO" }[p] ?? p)
                      )
                      .join(", ")}
                  </span>{" "}
                  for sign-in. No password is set. Contact your admin if you need one added.
                </p>
              </div>
            </CardContent>
          )}
          {hasPassword && showPasswordForm && (
            <CardContent className="space-y-4 border-t pt-4">
              {passwordError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {passwordError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={isChangingPassword || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
                >
                  {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update password
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelPasswordChange}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* TOTP / Authenticator */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Authenticator App (TOTP)
                  {policyRequirements.totpRequired && (
                    <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Use an authenticator app for two-factor authentication
                </CardDescription>
              </div>
            {isTotpStatusLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : totpEnabled ? (
                <Badge className="bg-success/10 text-success border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Button size="sm" onClick={() => setShowTotpEnrollment(true)}>
                  Set up
                </Button>
              )}
            </div>
          </CardHeader>
          {totpEnabled && (
            <CardContent className="border-t pt-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTotpEnrollment(true)}
                >
                  Reconfigure
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowTotpRemove(true)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Passkeys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Fingerprint className="w-4 h-4" />
                  Passkeys
                  {policyRequirements.passkeysRequired && (
                    <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                  )}
                </CardTitle>
              <CardDescription>
                  Use biometrics or security keys for passwordless login
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddPasskey(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add passkey
              </Button>
            </div>
          </CardHeader>
          <CardContent className="border-t pt-4">
            {isPasskeysLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Fingerprint className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No passkeys registered</p>
                <p className="text-xs mt-1">Add a passkey to enable passwordless sign-in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Fingerprint className="w-4 h-4 text-primary" />
                      </div>
                      {editingPasskeyId === passkey.id ? (
                        <Input
                          value={editingPasskeyName}
                          onChange={(e) => setEditingPasskeyName(e.target.value)}
                          onBlur={() => handleRenamePasskey(passkey)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenamePasskey(passkey);
                            if (e.key === "Escape") setEditingPasskeyId(null);
                          }}
                          className="h-8 max-w-[200px]"
                          autoFocus
                        />
                      ) : (
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{passkey.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last used: {formatLastUsed(passkey.last_used_at)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingPasskeyId(passkey.id);
                          setEditingPasskeyName(passkey.name);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingPasskey(passkey)}
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
      </div>

      <AddPasskeyWizard
        open={showAddPasskey}
        onOpenChange={setShowAddPasskey}
        onSuccess={() => {
          setShowAddPasskey(false);
          fetchPasskeys();
        }}
      />

      <TotpEnrollmentWizard
        open={showTotpEnrollment}
        onOpenChange={setShowTotpEnrollment}
        onSuccess={() => {
          setTotpEnabled(true);
          setShowTotpEnrollment(false);
          fetchTotpStatus();
        }}
      />

      <TotpRemoveDialog
        open={showTotpRemove}
        onOpenChange={setShowTotpRemove}
        onSuccess={() => {
          setTotpEnabled(false);
          setTotpStatus(null);
          setShowTotpRemove(false);
        }}
        isRequired={policyRequirements.totpRequired}
        hasPassword={hasPassword}
      />

      {/* Delete Passkey Confirmation */}
      <AlertDialog open={!!deletingPasskey} onOpenChange={() => setDeletingPasskey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingPasskey?.name}"? You will no longer be able to use this passkey to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePasskey}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
