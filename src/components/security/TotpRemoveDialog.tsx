import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleRemove = async () => {
    setIsLoading(true);

    try {
      // TODO: Call actual API to remove TOTP
      // await api.users.removeTotpEnrollment();
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Two-factor authentication disabled",
        description: "TOTP has been removed from your account.",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to remove TOTP:", err);
      toast({
        title: "Failed to remove TOTP",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            
            <p className="text-sm">
              Are you sure you want to continue?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remove TOTP
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
