import { useState } from "react";
import { Fingerprint, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import {
  isWebAuthnSupported,
  createRegistrationCredential,
  formatRegistrationCredential,
  WebAuthnRegistrationOptions,
} from "@/lib/webauthn";

interface AddPasskeyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (passkey: { id: string; name: string }) => void;
}

type WizardStep = "name" | "registering" | "success" | "error";

export function AddPasskeyWizard({ open, onOpenChange, onSuccess }: AddPasskeyWizardProps) {
  const [step, setStep] = useState<WizardStep>("name");
  const [passkeyName, setPasskeyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);

  const handleStartRegistration = async () => {
    if (!passkeyName.trim()) return;

    if (!isWebAuthnSupported()) {
      setError("WebAuthn is not supported in this browser. Please use a modern browser.");
      setStep("error");
      return;
    }

    setStep("registering");
    setError(null);

    try {
      // Step 1: Get registration options from server
      const options = await api.webauthn.beginRegistration() as unknown as WebAuthnRegistrationOptions;

      // Step 2: Create credential using browser WebAuthn API
      const credential = await createRegistrationCredential(options);

      // Step 3: Format and send credential to server with name
      const formattedCredential = formatRegistrationCredential(credential);
      const result = await api.webauthn.completeRegistration(formattedCredential, passkeyName.trim());

      setCredentialId(result.credential_id);
      setStep("success");

      // Notify parent after a short delay
      setTimeout(() => {
        onSuccess?.({ id: result.credential_id, name: passkeyName.trim() });
      }, 1500);
    } catch (err) {
      console.error("Passkey registration failed:", err);
      
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof DOMException) {
        // Handle WebAuthn-specific errors
        switch (err.name) {
          case "NotAllowedError":
            setError("Registration was cancelled or timed out. Please try again.");
            break;
          case "InvalidStateError":
            setError("This authenticator is already registered.");
            break;
          case "NotSupportedError":
            setError("Your device doesn't support the required authentication method.");
            break;
          default:
            setError(err.message || "Failed to register passkey");
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to register passkey");
      }
      setStep("error");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("name");
      setPasskeyName("");
      setError(null);
      setCredentialId(null);
    }, 200);
  };

  const handleRetry = () => {
    setStep("name");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Add Passkey
          </DialogTitle>
          <DialogDescription>
            {step === "name" && "Register a passkey for passwordless sign-in"}
            {step === "registering" && "Follow your browser's prompts to register"}
            {step === "success" && "Passkey registered successfully"}
            {step === "error" && "Registration failed"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "name" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passkeyName">Passkey name</Label>
                <Input
                  id="passkeyName"
                  placeholder="e.g., MacBook Pro Touch ID"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && passkeyName.trim()) {
                      handleStartRegistration();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Give this passkey a name to help you identify it later
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">What happens next</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your browser will prompt you to authenticate</li>
                  <li>• Use Touch ID, Face ID, or your security key</li>
                  <li>• The passkey will be stored on this device</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartRegistration}
                  disabled={!passkeyName.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "registering" && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Waiting for authentication</p>
                <p className="text-sm text-muted-foreground">
                  Follow the prompts from your browser or device
                </p>
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Passkey added</p>
                <p className="text-sm text-muted-foreground">
                  "{passkeyName}" is now registered and ready to use
                </p>
              </div>
              <Button onClick={handleClose} className="mt-2">
                Done
              </Button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Registration failed</p>
                <p className="text-sm text-muted-foreground">
                  {error || "Unable to register passkey. Please try again."}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleRetry}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
