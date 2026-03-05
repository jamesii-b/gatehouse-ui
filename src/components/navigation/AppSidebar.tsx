import { useLocation } from "react-router-dom";
import {
  User,
  Shield,
  Link2,
  Activity,
  Building2,
  Users,
  Settings,
  FileText,
  Layers,
  GitBranch,
  ScrollText,
  Terminal,
  ShieldCheck,
  Key,
} from "lucide-react";
import { SecuirdLogo } from "@/components/branding/SecuirdLogo";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const userNavItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Security", url: "/security", icon: Shield },
  { title: "SSH Keys", url: "/ssh-keys", icon: Terminal },
  { title: "Linked Accounts", url: "/linked-accounts", icon: Link2 },
  { title: "Activity", url: "/activity", icon: Activity },
];

// Visible to ALL org members
const orgMemberNavItems = [
  { title: "Overview", url: "/org", icon: Building2 },
  { title: "My Memberships", url: "/org/my-memberships", icon: Layers },
];

// Visible to org admins/owners only (management)
const orgAdminNavItems = [
  { title: "Overview", url: "/org", icon: Building2 },
  { title: "Members", url: "/org/members", icon: Users },
  { title: "Departments", url: "/org/departments", icon: Layers },
  { title: "Principals", url: "/org/principals", icon: GitBranch },
  { title: "Policies", url: "/org/policies", icon: Settings },
];

const adminNavItems = [
  { title: "Certificate Auth.", url: "/org/cas", icon: ShieldCheck },
  { title: "OIDC Clients",     url: "/org/clients", icon: Key },
  { title: "Org Audit Log",    url: "/org/audit", icon: FileText },
  { title: "System Logs",      url: "/admin/audit", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isOrgAdmin, isOrgMember } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isOrgActive = orgAdminNavItems.some((item) => isActive(item.url)) || adminNavItems.some((item) => isActive(item.url));
  void isOrgActive; // used for future active state tracking

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {/* Logo */}
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <SecuirdLogo size="sm" variant="light" />
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
              Secuird
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {/* User Section */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
              Account
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {userNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center text-sm text-sidebar-foreground rounded-lg transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed
                          ? "justify-center w-10 h-10 mx-auto p-0"
                          : "gap-3 px-4 py-2.5 mx-2"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Organization Section — content differs by role */}
        {isOrgMember && (
        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
              Organization
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {(isOrgAdmin ? orgAdminNavItems : orgMemberNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center text-sm text-sidebar-foreground rounded-lg transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed
                          ? "justify-center w-10 h-10 mx-auto p-0"
                          : "gap-3 px-4 py-2.5 mx-2"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Admin Section — only visible to org admins/owners */}
        {isOrgAdmin && (
        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center text-sm text-sidebar-foreground rounded-lg transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed
                          ? "justify-center w-10 h-10 mx-auto p-0"
                          : "gap-3 px-4 py-2.5 mx-2"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-sidebar-muted">
            v1.0.0 • Self-hosted
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
