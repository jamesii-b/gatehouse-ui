import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, LogOut, User, Shield, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Organization } from "@/lib/api";
import { useOrganizations } from "@/hooks/useOrganizations";
import { ComplianceBanner } from "@/components/auth/ComplianceBanner";

export function TopBar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, mfaCompliance, logout } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  
  // Use React Query hook for organizations with automatic caching and deduplication
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();

  // Ensure organizations is always an array (defensive check)
  const organizationsArray = Array.isArray(organizations) ? organizations : [];

  // Set initial currentOrg when organizations are loaded
  useEffect(() => {
    if (organizationsArray.length > 0 && !currentOrg) {
      setCurrentOrg(organizationsArray[0]);
    }
  }, [organizationsArray, currentOrg]);

  const handleLogout = async () => {
    await logout();
  };

  const userInitials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="flex flex-col">
      <ComplianceBanner compliance={mfaCompliance} />
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
        {/* Left side - Sidebar toggle */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </SidebarTrigger>
        </div>

        {/* Right side - Org selector + User menu */}
        <div className="flex items-center gap-3">
          {/* Organization Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {orgsLoading ? "Loading..." : (currentOrg?.name || "No Organization")}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                Switch Organization
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orgsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : organizationsArray.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No organizations
                </div>
              ) : (
                organizationsArray.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setCurrentOrg(org)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{org.name}</span>
                    </div>
                    {org.role && ["owner", "admin"].includes(org.role) && (
                      <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded capitalize">
                        {org.role}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.full_name || "User"}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/security")}>
                <Shield className="w-4 h-4 mr-2" />
                Security
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}