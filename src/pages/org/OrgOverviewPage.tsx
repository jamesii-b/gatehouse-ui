import { useEffect, useState } from "react";
import { Building2, Users, Shield, Key, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { api, Organization, OIDCClient } from "@/lib/api";

export default function OrgOverviewPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [clientCount, setClientCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.users.organizations()
      .then(async (data) => {
        if (!data.organizations.length) return;
        const first = data.organizations[0];
        setOrg(first);

        const [membersResp, clientsResp] = await Promise.allSettled([
          api.organizations.getMembers(first.id),
          api.organizations.getClients(first.id),
        ]);

        if (membersResp.status === "fulfilled") setMemberCount(membersResp.value.count);
        if (clientsResp.status === "fulfilled") setClientCount((clientsResp.value as { clients: OIDCClient[]; count: number }).count);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const quickLinks = [
    {
      title: "Members",
      description: "Manage team members and roles",
      icon: Users,
      href: "/org/members",
    },
    {
      title: "Policies",
      description: "Configure security requirements",
      icon: Shield,
      href: "/org/policies",
    },
    {
      title: "OIDC Clients",
      description: "Manage connected applications",
      icon: Key,
      href: "/org/clients",
    },
  ];

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="page-title">{org?.name ?? "Organization"}</h1>
            {createdAt && <p className="page-description">Created {createdAt}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-semibold">{memberCount}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OIDC Clients</p>
                <p className="text-2xl font-semibold">{clientCount}</p>
              </div>
              <Key className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Org ID</p>
                <p className="text-xs font-mono text-muted-foreground mt-1 truncate max-w-[140px]">{org?.id ?? "—"}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="h-full hover:border-accent/50 transition-colors cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <link.icon className="w-5 h-5 text-accent" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="font-medium text-foreground">{link.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
