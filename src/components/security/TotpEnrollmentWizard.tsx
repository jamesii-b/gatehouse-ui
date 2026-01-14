import { useState, useEffect } from "react";
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
import { api, ApiError, TotpEnrollResponse } from "@/lib/api";

type WizardStep = "loading" | "setup" | "verify" | "backup-codes" | "success";

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
  const [step, setStep] = useState<WizardStep>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<TotpEnrollResponse | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch enrollment data when dialog opens
  useEffect(() => {
    if (open) {
      initiateEnrollment();
    }
  }, [open]);

  const initiateEnrollment = async () => {
    setStep("loading");
    setEnrollError(null);
    setEnrollmentData(null);

    try {
      const data = await api.totp.enroll();
      setEnrollmentData(data);
      setStep("setup");
    } catch (err) {
      console.error("TOTP enrollment initiation failed:", err);
      if (err instanceof ApiError) {
        if (err.code === 409) {
          setEnrollError("TOTP is already enabled on this account. Please remove it first to reconfigure.");
        } else {
          setEnrollError(err.message);
        }
      } else {
        setEnrollError("Failed to initiate TOTP enrollment. Please try again.");
      }
      setStep("setup"); // Show error state
    }
  };

  const resetWizard = () => {
    setStep("loading");
    setVerificationCode("");
    setVerifyError(null);
    setCopiedSecret(false);
    setCopiedBackupCodes(false);
    setIsLoading(false);
    setEnrollmentData(null);
    setEnrollError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetWizard();
    }
    onOpenChange(isOpen);
  };

  const handleCopySecret = async () => {
    if (!enrollmentData) return;
    try {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      console.error("Failed to copy secret:", err);
    }
  };

  const handleCopyBackupCodes = async () => {
    if (!enrollmentData) return;
    try {
      await navigator.clipboard.writeText(enrollmentData.backup_codes.join("\n"));
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
      await api.totp.verifyEnrollment(verificationCode);
      setStep("backup-codes");
    } catch (err) {
      console.error("TOTP verification failed:", err);
      if (err instanceof ApiError) {
        setVerifyError(err.message || "Invalid verification code. Please try again.");
      } else {
        setVerifyError("Verification failed. Please try again.");
      }
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
            {step === "loading" && "Setting up..."}
            {step === "setup" && "Set up Authenticator App"}
            {step === "verify" && "Verify Setup"}
            {step === "backup-codes" && "Save Backup Codes"}
            {step === "success" && "Setup Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "loading" && "Preparing your TOTP enrollment..."}
            {step === "setup" && (enrollError ? "An error occurred" : "Scan the QR code with your authenticator app")}
            {step === "verify" && "Enter the code from your authenticator app"}
            {step === "backup-codes" && "Save these codes in a safe place"}
            {step === "success" && "Two-factor authentication is now enabled"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Preparing enrollment...</p>
            </div>
          )}

          {step === "setup" && enrollError && (
            <>
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Enrollment failed</p>
                    <p className="text-destructive/80">{enrollError}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button onClick={initiateEnrollment}>
                  Try again
                </Button>
              </div>
            </>
          )}

          {step === "setup" && !enrollError && enrollmentData && (
            <>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={enrollmentData.qr_code.startsWith('data:') ? enrollmentData.qr_code : `data:image/png;base64,${enrollmentData.qr_code}`}
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
                    {enrollmentData.secret}
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

          {step === "backup-codes" && enrollmentData && (
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
                {enrollmentData.backup_codes.map((code, index) => (
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
