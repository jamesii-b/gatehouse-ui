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

// User pages
import ProfilePage from "@/pages/user/ProfilePage";
import SecurityPage from "@/pages/user/SecurityPage";
import LinkedAccountsPage from "@/pages/user/LinkedAccountsPage";
import ActivityPage from "@/pages/user/ActivityPage";

// Organization pages
import OrgOverviewPage from "@/pages/org/OrgOverviewPage";
import MembersPage from "@/pages/org/MembersPage";
import PoliciesPage from "@/pages/org/PoliciesPage";
import CompliancePage from "@/pages/org/CompliancePage";
import OrgAuditPage from "@/pages/org/OrgAuditPage";
import OIDCClientsPage from "@/pages/org/OIDCClientsPage";
import DepartmentsPage from "@/pages/org/DepartmentsPage";
import PrincipalsPage from "@/pages/org/PrincipalsPage";
import SystemAuditPage from "@/pages/admin/SystemAuditPage";

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
import { AuthProvider } from "@/contexts/AuthContext";

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Index redirect */}
        <Route path="/" element={<Index />} />

        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite" element={<InviteAcceptPage />} />
          <Route path="/consent" element={<OIDCConsentPage />} />
          <Route path="/error" element={<OIDCErrorPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        </Route>

        {/* Protected routes - handles auth and MFA enforcement */}
        <Route element={<ProtectedLayout />}>
          {/* User routes */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/linked-accounts" element={<LinkedAccountsPage />} />
          <Route path="/activity" element={<ActivityPage />} />

          {/* Organization routes */}
          <Route path="/org" element={<OrgOverviewPage />} />
          <Route path="/org/members" element={<MembersPage />} />
          <Route path="/org/departments" element={<DepartmentsPage />} />
          <Route path="/org/principals" element={<PrincipalsPage />} />
          <Route path="/org/policies" element={<PoliciesPage />} />
          <Route path="/org/policies/compliance" element={<CompliancePage />} />
          <Route path="/org/audit" element={<OrgAuditPage />} />
          <Route path="/org/clients" element={<OIDCClientsPage />} />

          {/* Admin routes */}
          <Route path="/admin/audit" element={<SystemAuditPage />} />
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
