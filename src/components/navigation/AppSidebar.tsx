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
  Key,
  Layers,
  GitBranch,
  ScrollText,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { GatehouseLogo } from "@/components/branding/GatehouseLogo";
import { NavLink } from "@/components/NavLink";
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

const orgNavItems = [
  { title: "Overview", url: "/org", icon: Building2 },
  { title: "Members", url: "/org/members", icon: Users },
  { title: "Departments", url: "/org/departments", icon: Layers },
  { title: "Principals", url: "/org/principals", icon: GitBranch },
  { title: "Policies", url: "/org/policies", icon: Settings },
  { title: "Audit Log", url: "/org/audit", icon: FileText },
];

const adminNavItems = [
  { title: "OIDC Clients", url: "/org/clients", icon: Key },
  { title: "Certificate Auth.", url: "/org/cas", icon: ShieldCheck },
  // { title: "Users", url: "/admin/users", icon: Users },
  { title: "System Logs",  url: "/admin/audit", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isOrgActive = orgNavItems.some((item) => isActive(item.url)) || adminNavItems.some((item) => isActive(item.url));
  const isUserActive = userNavItems.some((item) => isActive(item.url));

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
          <GatehouseLogo size="sm" variant="light" />
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
              Gatehouse
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {/* User Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
            {!collapsed && "Account"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground rounded-lg mx-2 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

        {/* Organization Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
            {!collapsed && "Organization"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orgNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground rounded-lg mx-2 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

        {/* Admin Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
            {!collapsed && "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground rounded-lg mx-2 transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
