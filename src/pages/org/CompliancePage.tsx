import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Search, Loader2, User, Clock, AlertTriangle, CheckCircle, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, OrgComplianceMember, create403Handler } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  compliant: {
    label: "Compliant",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  in_grace: {
    label: "In Grace",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: Clock,
  },
  past_due: {
    label: "Past Due",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: AlertTriangle,
  },
  suspended: {
    label: "Suspended",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: Clock,
  },
  not_applicable: {
    label: "Not Applicable",
    color: "bg-muted text-muted-foreground",
    icon: Shield,
  },
};

export default function CompliancePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedOrgId: currentOrgId } = useOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch compliance data
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['org-compliance', currentOrgId],
    queryFn: () => currentOrgId ? api.policies.listOrgCompliance(currentOrgId, {}, {
      on403: create403Handler(toast),
    }) : null,
    enabled: !!currentOrgId,
  });

  // Send MFA reminder mutation
  const { mutate: sendReminder, variables: reminderVars, isPending: isSendingReminder } = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api.organizations.sendMfaReminder(currentOrgId!, userId),
    onSuccess: () => {
      toast({ title: "Reminder sent", description: "MFA reminder email sent successfully." });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Could not send the reminder. Please try again.", variant: "destructive" });
    },
  });

  // Filter members based on search and status
  const filteredMembers = complianceData?.members?.filter((member) => {
    const matchesSearch = 
      member.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate stats
  const stats = {
    total: complianceData?.count || 0,
    compliant: complianceData?.members?.filter(m => m.status === 'compliant').length || 0,
    inGrace: complianceData?.members?.filter(m => m.status === 'in_grace').length || 0,
    pastDue: complianceData?.members?.filter(m => m.status === 'past_due').length || 0,
    suspended: complianceData?.members?.filter(m => m.status === 'suspended').length || 0,
  };

  if (complianceLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">MFA Compliance</h1>
        <p className="page-description">
          Monitor and manage multi-factor authentication compliance for organization members
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{stats.compliant}</p>
              <p className="text-sm text-muted-foreground">Compliant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.inGrace}</p>
              <p className="text-sm text-muted-foreground">In Grace</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{stats.pastDue}</p>
              <p className="text-sm text-muted-foreground">Past Due</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.suspended}</p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="in_grace">In Grace</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} of {complianceData?.count || 0} members shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No members found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const config = STATUS_CONFIG[member.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.user_email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {member.deadline_at && member.status !== 'compliant' && member.status !== 'not_applicable' && (
                        <div className="text-sm text-muted-foreground">
                          <span className="hidden md:inline">Deadline: </span>
                          {new Date(member.deadline_at).toLocaleDateString()}
                        </div>
                      )}
                      
                      <Badge className={config.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/profile?userId=${member.user_id}`)}
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Send Reminder"
                          disabled={isSendingReminder && reminderVars?.userId === member.user_id}
                          onClick={() => sendReminder({ userId: member.user_id })}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}