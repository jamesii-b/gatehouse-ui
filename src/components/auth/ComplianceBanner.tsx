import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MfaComplianceSummary, isMfaRequired } from '@/lib/api';

interface ComplianceBannerProps {
  compliance: MfaComplianceSummary | null;
}

export function ComplianceBanner({ compliance }: ComplianceBannerProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  // Calculate countdown from deadline
  useEffect(() => {
    if (!compliance?.deadline_at) {
      setCountdown(null);
      return;
    }

    const deadline = new Date(compliance.deadline_at);
    const now = new Date();

    if (deadline <= now) {
      setCountdown('Deadline passed');
      return;
    }

    const updateCountdown = () => {
      const remaining = deadline.getTime() - Date.now();
      
      if (remaining <= 0) {
        setCountdown('Deadline passed');
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days} day${days > 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setCountdown(`${hours} hour${hours > 1 ? 's' : ''} remaining`);
      } else {
        setCountdown(`${minutes} minute${minutes > 1 ? 's' : ''} remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [compliance?.deadline_at]);

  // Check if MFA is required based on effective_mode (if available)
  const mfaRequired = isMfaRequired(compliance);

  // DEBUG: Log compliance data to diagnose the error
  console.log('[ComplianceBanner] compliance:', compliance);
  console.log('[ComplianceBanner] missing_methods:', compliance?.missing_methods);
  console.log('[ComplianceBanner] missing_methods is array:', Array.isArray(compliance?.missing_methods));

  // Don't show if no compliance data or already compliant
  if (!compliance || compliance.overall_status === 'compliant' ||
      compliance.overall_status === 'not_applicable') {
    return null;
  }

  // Show banner if:
  // 1. MFA is required (effective_mode starts with "require_"), OR
  // 2. There are missing methods (fallback for older data without effective_mode)
  // Guard against missing_methods being undefined
  if (!mfaRequired && (!compliance.missing_methods || compliance.missing_methods.length === 0)) {
    return null;
  }

  // Past due - high severity
  if (compliance.overall_status === 'past_due' || compliance.overall_status === 'suspended') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Multi-Factor Authentication Required</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <p>
              Your account requires MFA enrollment to access full features.
              Please configure MFA immediately to restore access.
            </p>
            {compliance.missing_methods?.length > 0 && (
              <p className="text-sm">
                Required methods: {compliance.missing_methods.join(', ')}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // In grace period - warning
  if (compliance.overall_status === 'in_grace') {
    return (
      <Alert className="mb-4 border-warning/50 bg-warning/5">
        <Clock className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">MFA Enrollment Required</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <p>
              Your organization requires multi-factor authentication. Please configure MFA before the deadline.
            </p>
            {countdown && (
              <p className="text-sm font-medium">
                Time remaining: {countdown}
              </p>
            )}
            {compliance.missing_methods?.length > 0 && (
              <p className="text-sm">
                Required methods: {compliance.missing_methods.join(', ')}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Pending - info
  if (compliance.overall_status === 'pending') {
    return (
      <Alert className="mb-4 border-primary/50 bg-primary/5">
        <Clock className="h-4 w-4 text-primary" />
        <AlertTitle>MFA Policy Applied</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <p>
              Your organization has enabled MFA requirements. You have a grace period to configure your authentication methods.
            </p>
            {compliance.missing_methods?.length > 0 && (
              <p className="text-sm">
                Required methods: {compliance.missing_methods.join(', ')}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}