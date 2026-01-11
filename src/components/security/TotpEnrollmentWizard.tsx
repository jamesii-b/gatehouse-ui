import { useState } from "react";
import { Smartphone, Copy, CheckCircle, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type WizardStep = "setup" | "verify" | "backup-codes" | "success";

interface TotpEnrollmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TotpEnrollmentWizard({
  open,
  onOpenChange,
  onSuccess,
}: TotpEnrollmentWizardProps) {
  const [step, setStep] = useState<WizardStep>("setup");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const { toast } = useToast();

  // Mock data - will be replaced with actual API calls
  const mockSecret = "JBSWY3DPEHPK3PXP";
  const mockQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Gatehouse:user@example.com?secret=${mockSecret}&issuer=Gatehouse`;
  const mockBackupCodes = [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP",
    "QRST-9012-UVWX",
    "YZAB-3456-CDEF",
    "GHIJ-7890-KLMN",
    "OPQR-1234-STUV",
    "WXYZ-5678-ABCD",
    "EFGH-9012-IJKL",
  ];

  const resetWizard = () => {
    setStep("setup");
    setVerificationCode("");
    setVerifyError(null);
    setCopiedSecret(false);
    setCopiedBackupCodes(false);
    setIsLoading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetWizard();
    }
    onOpenChange(isOpen);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(mockSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      console.error("Failed to copy secret:", err);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(mockBackupCodes.join("\n"));
      setCopiedBackupCodes(true);
      toast({
        title: "Backup codes copied",
        description: "Store these codes in a safe place.",
      });
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    } catch (err) {
      console.error("Failed to copy backup codes:", err);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setVerifyError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setVerifyError(null);

    try {
      // TODO: Call actual API to verify TOTP code
      // await api.users.verifyTotpEnrollment(verificationCode);
      
      // Mock verification - accept "123456" for testing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (verificationCode === "123456") {
        setStep("backup-codes");
      } else {
        setVerifyError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      console.error("TOTP verification failed:", err);
      setVerifyError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    handleClose(false);
    toast({
      title: "Two-factor authentication enabled",
      description: "Your account is now protected with TOTP.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "verify" && verificationCode.length === 6) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {step === "setup" && "Set up Authenticator App"}
            {step === "verify" && "Verify Setup"}
            {step === "backup-codes" && "Save Backup Codes"}
            {step === "success" && "Setup Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "setup" && "Scan the QR code with your authenticator app"}
            {step === "verify" && "Enter the code from your authenticator app"}
            {step === "backup-codes" && "Save these codes in a safe place"}
            {step === "success" && "Two-factor authentication is now enabled"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "setup" && (
            <>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={mockQrCode}
                  alt="TOTP QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-sm font-mono bg-muted rounded-md break-all">
                    {mockSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {copiedSecret ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("verify")}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="totp-code">Verification code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setVerificationCode(value);
                    setVerifyError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
                {verifyError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {verifyError}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Open your authenticator app and enter the 6-digit code shown for Gatehouse.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("setup");
                    setVerificationCode("");
                    setVerifyError(null);
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify
                </Button>
              </div>
            </>
          )}

          {step === "backup-codes" && (
            <>
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex gap-2 text-warning">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Save these backup codes</p>
                    <p className="text-warning/80">
                      You'll need these if you lose access to your authenticator app. 
                      Each code can only be used once.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {mockBackupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="px-2 py-1 text-sm font-mono text-center bg-background rounded"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyBackupCodes}
              >
                {copiedBackupCodes ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy all codes
                  </>
                )}
              </Button>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={handleComplete}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
