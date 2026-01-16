import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Fingerprint, Smartphone, UserPlus, AlertTriangle, Loader2, Users, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, OrgPolicyResponse, UpdateOrgPolicyDto, create403Handler } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const MFA_MODE_LABELS: Record<string, { label: string; description: string }> = {
  disabled: {
    label: "Disabled",
    description: "No MFA required for members",
  },
  optional: {
    label: "Optional",
    description: "Members may opt-in to MFA",
  },
  require_totp: {
    label: "Require TOTP",
    description: "All members must set up an authenticator app",
  },
  require_webauthn: {
    label: "Require Passkey",
    description: "All members must register a passkey",
  },
  require_totp_or_webauthn: {
    label: "Require TOTP or Passkey",
    description: "Members must set up at least one MFA method",
  },
};

export default function PoliciesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  
  // Local form state for unsaved changes
  const [formData, setFormData] = useState({
    mfa_policy_mode: '',
    mfa_grace_period_days: 14,
    notify_days_before: 7,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch organizations to get current org
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.users.organizations({
      on403: create403Handler(toast),
    }),
  });

  useEffect(() => {
    if (orgsData?.organizations && orgsData.organizations.length > 0) {
      setCurrentOrgId(orgsData.organizations[0].id);
    }
  }, [orgsData]);

  // Fetch org policy
  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['org-policy', currentOrgId],
    queryFn: () => currentOrgId ? api.policies.getOrgPolicy(currentOrgId, {
      on403: create403Handler(toast),
    }) : null,
    enabled: !!currentOrgId,
  });

  useEffect(() => {
    if (policy?.security_policy) {
      setFormData({
        mfa_policy_mode: policy.security_policy.mfa_policy_mode,
        mfa_grace_period_days: policy.security_policy.mfa_grace_period_days,
        notify_days_before: policy.security_policy.notify_days_before,
      });
      setHasUnsavedChanges(false);
    }
  }, [policy]);

  // Fetch org compliance summary
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['org-compliance', currentOrgId],
    queryFn: () => currentOrgId ? api.policies.listOrgCompliance(currentOrgId, {}, {
      on403: create403Handler(toast),
    }) : null,
    enabled: !!currentOrgId,
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async (data: UpdateOrgPolicyDto) => {
      if (!currentOrgId) throw new Error('No organization selected');
      return api.policies.updateOrgPolicy(currentOrgId, data, {
        on403: create403Handler(toast),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-policy', currentOrgId] });
      setHasUnsavedChanges(false);
      toast({
        title: "Policy updated",
        description: "Security policy has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update policy",
        description: error.message,
      });
    },
  });

  // Calculate compliance stats
  const complianceStats = {
    compliant: 0,
    inGrace: 0,
    pastDue: 0,
    suspended: 0,
    pending: 0,
    total: complianceData?.count || 0,
  };

  if (complianceData?.members) {
    for (const member of complianceData.members) {
      switch (member.status) {
        case 'compliant':
          complianceStats.compliant++;
          break;
        case 'in_grace':
          complianceStats.inGrace++;
          break;
        case 'past_due':
          complianceStats.pastDue++;
          break;
        case 'suspended':
          complianceStats.suspended++;
          break;
        case 'pending':
          complianceStats.pending++;
          break;
      }
    }
  }

  const handleMfaModeChange = (mode: string) => {
    setFormData(prev => ({ ...prev, mfa_policy_mode: mode }));
    setHasUnsavedChanges(true);
  };

  const handleGracePeriodChange = (days: number[]) => {
    setFormData(prev => ({ ...prev, mfa_grace_period_days: days[0] }));
    setHasUnsavedChanges(true);
  };

  const handleNotifyDaysChange = (days: number[]) => {
    setFormData(prev => ({ ...prev, notify_days_before: days[0] }));
    setHasUnsavedChanges(true);
  };

  const handleSavePolicy = () => {
    updatePolicyMutation.mutate({
      mfa_policy_mode: formData.mfa_policy_mode,
      mfa_grace_period_days: formData.mfa_grace_period_days,
      notify_days_before: formData.notify_days_before,
    });
  };

  const handleDiscardChanges = () => {
    if (policy?.security_policy) {
      setFormData({
        mfa_policy_mode: policy.security_policy.mfa_policy_mode,
        mfa_grace_period_days: policy.security_policy.mfa_grace_period_days,
        notify_days_before: policy.security_policy.notify_days_before,
      });
      setHasUnsavedChanges(false);
    }
  };

  if (orgsLoading || policyLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!currentOrgId || !policy) {
    return (
      <div className="page-container">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Unable to load organization policy. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Security Policies</h1>
        <p className="page-description">
          Configure security requirements for organization members
        </p>
      </div>

      <div className="space-y-6">
        {/* Compliance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Compliance Overview
            </CardTitle>
            <CardDescription>
              Current MFA compliance status for organization members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-2xl font-bold text-success">{complianceStats.compliant}</p>
                <p className="text-xs text-muted-foreground">Compliant</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">{complianceStats.inGrace}</p>
                <p className="text-xs text-muted-foreground">In Grace</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-2xl font-bold text-warning">{complianceStats.pastDue}</p>
                <p className="text-xs text-muted-foreground">Past Due</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-2xl font-bold text-destructive">{complianceStats.suspended}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-2xl font-bold">{complianceStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/org/policies/compliance')}
            >
              View Details
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* MFA Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Multi-Factor Authentication
            </CardTitle>
            <CardDescription>
              Require additional authentication methods for all members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasUnsavedChanges && (
              <Alert className="border-warning/30 bg-warning/5">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <AlertDescription className="text-sm">
                  You have unsaved changes. Click "Save Changes" to apply them or "Discard" to revert.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>MFA Policy Mode</Label>
              <Select
                value={formData.mfa_policy_mode}
                onValueChange={handleMfaModeChange}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MFA_MODE_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {MFA_MODE_LABELS[formData.mfa_policy_mode]?.description}
              </p>
            </div>

            {formData.mfa_policy_mode !== 'disabled' && formData.mfa_policy_mode !== 'optional' && (
              <>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Grace Period (days)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[formData.mfa_grace_period_days]}
                        onValueChange={handleGracePeriodChange}
                        max={60}
                        min={1}
                        step={1}
                        className="w-full max-w-xs"
                      />
                      <span className="text-sm font-medium w-16">{formData.mfa_grace_period_days} days</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Members will have this many days to configure MFA after policy is applied.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Notify Before Deadline (days)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[formData.notify_days_before]}
                        onValueChange={handleNotifyDaysChange}
                        max={14}
                        min={1}
                        step={1}
                        className="w-full max-w-xs"
                      />
                      <span className="text-sm font-medium w-16">{formData.notify_days_before} days</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send reminder notifications this many days before the deadline.
                    </p>
                  </div>
                </div>
              </>
            )}
            
            {hasUnsavedChanges && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSavePolicy}
                  disabled={updatePolicyMutation.isPending}
                >
                  {updatePolicyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDiscardChanges}
                  disabled={updatePolicyMutation.isPending}
                >
                  Discard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password Policy
            </CardTitle>
            <CardDescription>
              Set minimum password requirements for all members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Minimum password length</Label>
              <div className="flex items-center gap-4">
                <Slider
                  defaultValue={[12]}
                  max={32}
                  min={8}
                  step={1}
                  className="w-full max-w-xs"
                />
                <span className="text-sm font-medium w-16">12 chars</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require uppercase letters</Label>
                  <p className="text-sm text-muted-foreground">At least one A-Z</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require numbers</Label>
                  <p className="text-sm text-muted-foreground">At least one 0-9</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require special characters</Label>
                  <p className="text-sm text-muted-foreground">At least one !@#$%^&*</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passkey Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Passkeys (WebAuthn)
            </CardTitle>
            <CardDescription>
              Require passwordless authentication capability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require at least one passkey</Label>
                <p className="text-sm text-muted-foreground">
                  Members must register a passkey for backup authentication
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}