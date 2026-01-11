import { useState } from "react";
import { Lock, Fingerprint, Smartphone, Shield, Plus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddPasskeyWizard } from "@/components/security/AddPasskeyWizard";
import { PasswordStrengthMeter, isPasswordValid } from "@/components/auth/PasswordStrengthMeter";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SecurityPage() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Mock security data
  const security = {
    passwordLastChanged: "3 months ago",
    totpEnabled: true,
    passkeysCount: 2,
    passkeys: [
      { id: "1", name: "MacBook Pro Touch ID", lastUsed: "Today" },
      { id: "2", name: "iPhone Face ID", lastUsed: "Yesterday" },
    ],
    policyRequirements: {
      totpRequired: true,
      passkeysRequired: false,
      minPasswordLength: 12,
    },
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);

    // Client-side validation
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Security</h1>
        <p className="page-description">
          Manage your authentication methods and security settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Policy Status */}
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Organization Policy</p>
                <p className="text-sm text-muted-foreground">
                  Your organization requires TOTP to be enabled for all members.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </CardTitle>
                <CardDescription>Last changed {security.passwordLastChanged}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                Change password
              </Button>
            </div>
          </CardHeader>
          {showPasswordForm && (
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
                  {security.policyRequirements.totpRequired && (
                    <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Use an authenticator app for two-factor authentication
                </CardDescription>
              </div>
              {security.totpEnabled ? (
                <Badge className="bg-success/10 text-success border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Button size="sm">Set up</Button>
              )}
            </div>
          </CardHeader>
          {security.totpEnabled && (
            <CardContent className="border-t pt-4">
              <Button variant="outline" size="sm">
                Reconfigure
              </Button>
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
                  {security.policyRequirements.passkeysRequired && (
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
            <div className="space-y-3">
              {security.passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Fingerprint className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{passkey.name}</p>
                      <p className="text-xs text-muted-foreground">Last used: {passkey.lastUsed}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddPasskeyWizard
        open={showAddPasskey}
        onOpenChange={setShowAddPasskey}
        onSuccess={(passkey) => {
          console.log("Passkey added:", passkey);
          setShowAddPasskey(false);
        }}
      />
    </div>
  );
}
