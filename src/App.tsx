import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "@/components/layouts/PublicLayout";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import MarketingLayout from "@/components/layouts/MarketingLayout";

// Marketing pages
import HomePage from "@/pages/marketing/HomePage";
import FeaturesPage from "@/pages/marketing/FeaturesPage";
import PricingPage from "@/pages/marketing/PricingPage";
import SecurityPage from "@/pages/marketing/SecurityPage";
import SSHCertificatesPage from "@/pages/marketing/SSHCertificatesPage";
import DemoPage from "@/pages/marketing/DemoPage";

// Public pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import InviteAcceptPage from "@/pages/auth/InviteAcceptPage";
import OIDCConsentPage from "@/pages/auth/OIDCConsentPage";
import OIDCErrorPage from "@/pages/auth/OIDCErrorPage";
import OIDCLoginPage from "@/pages/auth/OIDCLoginPage";
import OAuthCallbackPage from "@/pages/auth/OAuthCallbackPage";
import ActivatePage from "@/pages/auth/ActivatePage";

// User pages
import ProfilePage from "@/pages/user/ProfilePage";
import UserSecurityPage from "@/pages/user/SecurityPage";
import LinkedAccountsPage from "@/pages/user/LinkedAccountsPage";
import ActivityPage from "@/pages/user/ActivityPage";
import SSHKeysPage from "@/pages/user/SSHKeysPage";
import CLIGuidePage from "@/pages/user/CLIGuidePage";

// Organization pages
import OrgOverviewPage from "@/pages/org/OrgOverviewPage";
import MembersPage from "@/pages/org/MembersPage";
import PoliciesPage from "@/pages/org/PoliciesPage";
import CompliancePage from "@/pages/org/CompliancePage";
import OrgAuditPage from "@/pages/org/OrgAuditPage";
import OIDCClientsPage from "@/pages/org/OIDCClientsPage";
import CAsPage from "@/pages/org/CAsPage";
import DepartmentsPage from "@/pages/org/DepartmentsPage";
import PrincipalsPage from "@/pages/org/PrincipalsPage";
import ApiKeysPage from "@/pages/org/ApiKeysPage";
import MyMembershipsPage from "@/pages/org/MyMembershipsPage";
import NetworksPage from "@/pages/org/NetworksPage";
import DevicesPage from "@/pages/org/DevicesPage";
import AccessPage from "@/pages/org/AccessPage";
import SystemAuditPage from "@/pages/admin/SystemAuditPage";
import OAuthProvidersPage from "@/pages/admin/OAuthProvidersPage";
import OrgSetupPage from "@/pages/auth/OrgSetupPage";

import NotFound from "@/pages/NotFound";
import ApiDevTools from "@/components/dev/ApiDevTools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 403 authorization errors
        if (error && typeof error === 'object' && 'code' in error && error.code === 403) {
          return false;
        }
        // Default retry behavior for other errors (max 3 retries)
        return failureCount < 3;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Separate component so AuthProvider can use useNavigate
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { Navigate } from "react-router-dom";

/** Redirects already-authenticated users away from guest-only pages (e.g. /login). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOrgMember, isLoading } = useAuth();
  // Allow authenticated users through to /login when it's a CLI auth request or
  // an OIDC session — LoginPage will immediately forward the existing token.
  const params = new URLSearchParams(window.location.search);
  const isCli = params.has('cli_token') || params.has('cli_redirect');
  const isOidcBridge = params.has('oidc_session_id');
  if (isLoading) return null; // wait for auth state to resolve
  if (isAuthenticated && !isCli && !isOidcBridge) {
    // If the user hasn't set up an org yet, send them there first
    return <Navigate to={isOrgMember ? "/profile" : "/org-setup"} replace />;
  }
  return <>{children}</>;
}

/** Blocks access to /admin/* for non-admin users. */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isOrgAdmin, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOrgAdmin) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}

/** Blocks access to /org/* for users who don't belong to any organisation. */
function RequireOrgMember({ children }: { children: React.ReactNode }) {
  const { isOrgMember, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOrgMember) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}

/** 
 *  Used for /org-setup which lives inside PublicLayout */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <OrgProvider>
      <Routes>
        {/* Marketing pages */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/ssh-certificates" element={<SSHCertificatesPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Route>

        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite" element={<InviteAcceptPage />} />
          <Route path="/consent" element={<OIDCConsentPage />} />
          <Route path="/oidc-login" element={<OIDCLoginPage />} />
          <Route path="/error" element={<OIDCErrorPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/activate" element={<ActivatePage />} />
          {/* Org-setup uses the same full-screen centred layout as auth pages,
              but requires a valid session token (RequireAuth guard below). */}
          <Route path="/org-setup" element={<RequireAuth><OrgSetupPage /></RequireAuth>} />
        </Route>

        {/* Protected routes - handles auth and MFA enforcement */}
        <Route element={<ProtectedLayout />}>
          {/* User routes */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/linked-accounts" element={<LinkedAccountsPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/ssh-keys" element={<SSHKeysPage />} />
          <Route path="/cli-guide" element={<CLIGuidePage />} />

          {/* Organization routes — org members: overview + own memberships only */}
          <Route path="/org" element={<RequireOrgMember><OrgOverviewPage /></RequireOrgMember>} />
          <Route path="/org/my-memberships" element={<RequireOrgMember><MyMembershipsPage /></RequireOrgMember>} />
          <Route path="/org/zerotier/devices" element={<RequireOrgMember><DevicesPage /></RequireOrgMember>} />

          {/* Organization management routes — org admins/owners only */}
          <Route path="/org/members" element={<RequireAdmin><MembersPage /></RequireAdmin>} />
          <Route path="/org/departments" element={<RequireAdmin><DepartmentsPage /></RequireAdmin>} />
          <Route path="/org/principals" element={<RequireAdmin><PrincipalsPage /></RequireAdmin>} />
          <Route path="/org/api-keys" element={<RequireAdmin><ApiKeysPage /></RequireAdmin>} />
          <Route path="/org/policies" element={<RequireAdmin><PoliciesPage /></RequireAdmin>} />
          <Route path="/org/policies/compliance" element={<RequireAdmin><CompliancePage /></RequireAdmin>} />
          <Route path="/org/audit" element={<RequireAdmin><OrgAuditPage /></RequireAdmin>} />
          <Route path="/org/clients" element={<RequireAdmin><OIDCClientsPage /></RequireAdmin>} />
          <Route path="/org/cas" element={<RequireAdmin><CAsPage /></RequireAdmin>} />
          <Route path="/org/zerotier/networks" element={<RequireAdmin><NetworksPage /></RequireAdmin>} />
          <Route path="/org/zerotier/access" element={<RequireAdmin><AccessPage /></RequireAdmin>} />

          {/* Admin routes — org admin/owner only */}
          <Route path="/admin/audit" element={<RequireAdmin><SystemAuditPage /></RequireAdmin>} />
          <Route path="/admin/users" element={<Navigate to="/org/members" replace />} />
          <Route path="/admin/oauth" element={<RequireAdmin><OAuthProvidersPage /></RequireAdmin>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Dev tools - only shown in development */}
      <ApiDevTools />
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
