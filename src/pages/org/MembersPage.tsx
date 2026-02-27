import { useState, useEffect } from "react";
import { Search, Plus, MoreHorizontal, Shield, User, Mail, Clock, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, OrganizationMember } from "@/lib/api";
import { useCurrentOrganizationId } from "@/hooks/useCurrentOrganization";

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function MembersPage() {
  const params = useParams<{ orgId?: string }>();
  const { orgId: fallbackOrgId } = useCurrentOrganizationId();
  const orgId = params.orgId || fallbackOrgId;

  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setMembers([]);
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.organizations.getMembers(orgId);
        setMembers(response.members || []);
      } catch (err) {
        console.error("Failed to fetch members:", err);
        setError("Failed to load members. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filteredMembers = members.filter((member) => {
    const searchLower = search.toLowerCase();
    return (
      (member.user?.full_name?.toLowerCase().includes(searchLower) ?? false) ||
      (member.user?.email.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-description">
            Manage organization members and invitations
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Invite member
        </Button>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invites">
            Pending Invites (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 max-w-sm"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading members...</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">
                  {error}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No members found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="p-4 flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {member.user?.full_name || member.user?.email}
                          </p>
                          {member.role === "admin" && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {member.role === "owner" && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Owner
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.user?.email}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <User className="w-4 h-4 mr-2" />
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="w-4 h-4 mr-2" />
                            Change role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardContent className="p-0">
              <div className="p-8 text-center text-muted-foreground">
                No pending invitations
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
