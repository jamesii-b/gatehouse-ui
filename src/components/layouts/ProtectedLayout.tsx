import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from './AuthenticatedLayout';
import MfaEnforcementLayout from './MfaEnforcementLayout';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, requiresMfaEnrollment } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiresMfaEnrollment) {
    return <MfaEnforcementLayout />;
  }

  return (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  );
}
