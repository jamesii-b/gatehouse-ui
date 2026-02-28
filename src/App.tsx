import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "@/components/layouts/PublicLayout";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";

// Public pages
import Index from "@/pages/Index";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import InviteAcceptPage from "@/pages/auth/InviteAcceptPage";
import OIDCConsentPage from "@/pages/auth/OIDCConsentPage";
import OIDCErrorPage from "@/pages/auth/OIDCErrorPage";
import OAuthCallbackPage from "@/pages/auth/OAuthCallbackPage";
import ActivatePage from "@/pages/auth/ActivatePage";

// User pages
import ProfilePage from "@/pages/user/ProfilePage";
import SecurityPage from "@/pages/user/SecurityPage";
import LinkedAccountsPage from "@/pages/user/LinkedAccountsPage";
import ActivityPage from "@/pages/user/ActivityPage";
import SSHKeysPage from "@/pages/user/SSHKeysPage";

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
import SystemAuditPage from "@/pages/admin/SystemAuditPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";

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
import { Navigate } from "react-router-dom";

/** Redirects already-authenticated users away from guest-only pages (e.g. /login). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null; // wait for auth state to resolve
  if (isAuthenticated) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Index redirect */}
        <Route path="/" element={<Index />} />

        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite" element={<InviteAcceptPage />} />
          <Route path="/consent" element={<OIDCConsentPage />} />
          <Route path="/error" element={<OIDCErrorPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/activate" element={<ActivatePage />} />
        </Route>

        {/* Protected routes - handles auth and MFA enforcement */}
        <Route element={<ProtectedLayout />}>
          {/* User routes */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/linked-accounts" element={<LinkedAccountsPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/ssh-keys" element={<SSHKeysPage />} />

          {/* Organization routes */}
          <Route path="/org" element={<OrgOverviewPage />} />
          <Route path="/org/members" element={<MembersPage />} />
          <Route path="/org/departments" element={<DepartmentsPage />} />
          <Route path="/org/principals" element={<PrincipalsPage />} />
          <Route path="/org/policies" element={<PoliciesPage />} />
          <Route path="/org/policies/compliance" element={<CompliancePage />} />
          <Route path="/org/audit" element={<OrgAuditPage />} />
          <Route path="/org/clients" element={<OIDCClientsPage />} />
          <Route path="/org/cas" element={<CAsPage />} />

          {/* Admin routes */}
          <Route path="/admin/audit" element={<SystemAuditPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Dev tools - only shown in development */}
      <ApiDevTools />
    </AuthProvider>
  );
}

export default App;
