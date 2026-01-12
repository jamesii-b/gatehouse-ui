import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";

interface TotpRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isRequired?: boolean;
}

export function TotpRemoveDialog({
  open,
  onOpenChange,
  onSuccess,
  isRequired = false,
}: TotpRemoveDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetDialog = () => {
    setPassword("");
    setError(null);
    setIsLoading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  };

  const handleRemove = async () => {
    if (!password) {
      setError("Password is required to disable TOTP");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.totp.disable(password);
      
      toast({
        title: "Two-factor authentication disabled",
        description: "TOTP has been removed from your account.",
      });
      
      onSuccess();
      handleClose(false);
    } catch (err) {
      console.error("Failed to remove TOTP:", err);
      if (err instanceof ApiError) {
        if (err.type === "INVALID_CREDENTIALS" || err.code === 401) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password) {
      handleRemove();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Remove Two-Factor Authentication?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will disable TOTP-based two-factor authentication for your account.
              Your backup codes will also be invalidated.
            </p>
            
            {isRequired && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                <strong>Warning:</strong> Your organization requires two-factor authentication.
                You may lose access to certain features if you disable it.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password-confirm">Enter your password to confirm</Label>
            <Input
              id="password-confirm"
              type="password"
              placeholder="Your current password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isLoading || !password}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove TOTP
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
