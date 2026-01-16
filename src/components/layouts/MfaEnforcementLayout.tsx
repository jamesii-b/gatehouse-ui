import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, Fingerprint, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AddPasskeyWizard } from '@/components/security/AddPasskeyWizard';
import { TotpEnrollmentWizard } from '@/components/security/TotpEnrollmentWizard';
import { api } from '@/lib/api';

export default function MfaEnforcementLayout() {
  const navigate = useNavigate();
  const { user, mfaCompliance, refreshCompliance } = useAuth();
  const [showTotpEnrollment, setShowTotpEnrollment] = useState(false);
  const [showPasskeyEnrollment, setShowPasskeyEnrollment] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isCompliant, setIsCompliant] = useState(false);

  // Check compliance status on mount and after enrollment
  useEffect(() => {
    const checkCompliance = async () => {
      setIsChecking(true);
      try {
        const compliance = await api.policies.getMyCompliance();
        if (compliance.overall_status === 'compliant') {
          setIsCompliant(true);
        } else {
          setIsCompliant(false);
        }
      } catch (error) {
        console.error('[MfaEnforcementLayout] Failed to check compliance:', error);
        setIsCompliant(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkCompliance();
  }, []);

  // Redirect when compliant
  useEffect(() => {
    if (isCompliant) {
      const timer = setTimeout(() => {
        navigate('/profile');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCompliant, navigate]);

  const handleTotpSuccess = async () => {
    setShowTotpEnrollment(false);
    await refreshCompliance();
    const compliance = await api.policies.getMyCompliance();
    setIsCompliant(compliance.overall_status === 'compliant');
  };

  const handlePasskeySuccess = async () => {
    setShowPasskeyEnrollment(false);
    await refreshCompliance();
    const compliance = await api.policies.getMyCompliance();
    setIsCompliant(compliance.overall_status === 'compliant');
  };

  // Show success state
  if (isCompliant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                MFA Configured Successfully
              </h2>
              <p className="text-muted-foreground mb-4">
                Your account is now compliant. Redirecting to your profile...
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine which MFA methods are required
  const missingMethods = mfaCompliance?.missing_methods || [];
  const requiresTotp = missingMethods.includes('totp');
  const requiresPasskey = missingMethods.includes('webauthn');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - similar to TopBar but without sidebar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Gatehouse</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {user?.email}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
            <CardTitle className="text-xl">MFA Enrollment Required</CardTitle>
            <CardDescription>
              Your account is restricted until you configure multi-factor authentication.
              Please set up at least one of the following methods to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Deadline info */}
            {mfaCompliance?.deadline_at && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-sm font-medium text-destructive">
                  Deadline: {new Date(mfaCompliance.deadline_at).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* TOTP Option */}
            {requiresTotp && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Authenticator App</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up an authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowTotpEnrollment(true)}
                  className="w-full"
                >
                  Set up Authenticator
                </Button>
              </div>
            )}

            {/* Passkey Option */}
            {requiresPasskey && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Passkey</h3>
                    <p className="text-sm text-muted-foreground">
                      Register a passkey (biometrics, security key, or device passkey)
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowPasskeyEnrollment(true)}
                  className="w-full"
                >
                  Add Passkey
                </Button>
              </div>
            )}

            {/* Both methods available */}
            {(!requiresTotp && !requiresPasskey) && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Configure MFA</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up multi-factor authentication to secure your account
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setShowTotpEnrollment(true)}
                    className="w-full"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Authenticator
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowPasskeyEnrollment(true)}
                    className="w-full"
                  >
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Passkey
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state while checking */}
            {isChecking && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking compliance status...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Wizards */}
      <TotpEnrollmentWizard
        open={showTotpEnrollment}
        onOpenChange={setShowTotpEnrollment}
        onSuccess={handleTotpSuccess}
      />

      <AddPasskeyWizard
        open={showPasskeyEnrollment}
        onOpenChange={setShowPasskeyEnrollment}
        onSuccess={handlePasskeySuccess}
      />
    </div>
  );
}
