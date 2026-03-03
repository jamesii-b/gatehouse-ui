import { useState, useEffect } from "react";
import { Mail, Upload, CheckCircle, AlertCircle, Loader2, Bell, AlertTriangle, Trash2, Building2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, PendingInvite } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

function ProfileSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>

      <div className="space-y-6">
        {/* Personal Information Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div>
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-3 w-40 mt-2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Email Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Delete account dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // Sync local name state with user data
  useEffect(() => {
    if (user?.full_name) {
      setName(user.full_name);
    }
  }, [user?.full_name]);

  // Fetch pending invitations for this user
  useEffect(() => {
    if (!user) return;
    api.users.getMyInvites()
      .then((res) => setPendingInvites(res.invites ?? []))
      .catch(() => { /* silently ignore */ });
  }, [user]);

  const getInitials = (fullName: string | null) => {
    if (!fullName) return "?";
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.users.deleteMe();
      toast({ title: "Account deleted", description: "Your account has been deleted." });
      setDeleteDialogOpen(false);
      setConfirmEmail("");
      await logout();
      navigate("/login");
    } catch (err) {
      if (err instanceof ApiError && err.type === "USER_IS_SOLE_OWNER") {
        const details = err.details as {
          transfer_ownership?: string[];
        } | undefined;

        const transferOrgs = details?.transfer_ownership ?? [];

        toast({
          title: "Cannot delete account",
          description:
            transferOrgs.length > 0
              ? `You are the owner of ${transferOrgs.join(", ")} and other members exist. Transfer ownership to another member before deleting your account.`
              : "You own organizations with other members. Transfer ownership first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion failed",
          description: err instanceof ApiError ? err.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.users.updateMe({ full_name: name.trim() });
      await refreshUser();
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your name has been updated successfully",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.full_name || "");
    setIsEditing(false);
  };

  if (authLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-description">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Suspended Banner */}
        {(user.status === "suspended" || user.status === "compliance_suspended") && (
          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-4 text-red-800 dark:border-red-700 dark:bg-red-950/60 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Account suspended</p>
              <p className="text-sm mt-0.5 opacity-90">
                Your account has been suspended. You cannot perform most actions.
                Please contact your administrator to resolve this.
              </p>
            </div>
          </div>
        )}

        {/* Pending Invitations Banner */}
        {pendingInvites.length > 0 && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Bell className="w-4 h-4" />
              You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? "s" : ""}
            </div>
            {pendingInvites.map((invite) => (
              <div
                key={invite.token}
                className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{invite.organization.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Invited as <span className="font-medium">{invite.role}</span>
                  </p>
                </div>
                <a
                  href={`/invite?token=${invite.token}`}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Accept →
                </a>
              </div>
            ))}
          </div>
        )}
        {/* Profile Photo & Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
            <CardDescription>Update your photo and personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Change photo
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/30">
                  <span className="text-foreground">{user.full_name || "Not set"}</span>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Address</CardTitle>
            <CardDescription>Your email is used for login and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user.email}</span>
                {user.email_verified ? (
                  <Badge variant="secondary" className="bg-success/10 text-success border-0">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-warning/10 text-warning border-0">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your account. Proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes your profile and all associated data. If you own
                  organizations with other members, transfer ownership first. Sole-member
                  organizations are deleted automatically.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmEmail("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription>
              Your profile, SSH keys, linked accounts, and session data will be
              permanently deleted. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Org ownership warning */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-2">
            <p className="flex items-center gap-2 font-medium">
              <Building2 className="w-4 h-4" />
              Organization ownership check
            </p>
            <p>
              If you own organizations with other members, you must{" "}
              <strong>transfer ownership</strong> to another member first.
            </p>
            <p>
              Organizations where you are the <strong>sole member</strong> will
              be automatically deleted along with your account.
            </p>
          </div>

          {/* What will be deleted */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive space-y-1">
            <p className="font-medium flex items-center gap-2">
              <TriangleAlert className="w-4 h-4" />
              The following will be permanently deleted:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-destructive/80 pl-1">
              <li>Your profile and account data</li>
              <li>All SSH keys and active certificates</li>
              <li>All linked accounts (Google, GitHub, etc.)</li>
              <li>All active sessions</li>
              <li>All passkeys and MFA methods</li>
            </ul>
          </div>

          {/* Email confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="text-sm">
              Type your email address{" "}
              <span className="font-mono font-semibold text-foreground">
                {user.email}
              </span>{" "}
              to confirm:
            </Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={user.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmEmail("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, permanently delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
