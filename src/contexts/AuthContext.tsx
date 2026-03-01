import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User, ApiError, tokenManager, MfaComplianceSummary, PendingInvite } from '@/lib/api';

interface LoginResult {
  requiresTotp: boolean;
  requiresWebAuthn: boolean;
  requiresMfaEnrollment?: boolean;
  requiresOrgSetup?: boolean;
  pendingInvites?: PendingInvite[];
  isFirstUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOrgAdmin: boolean;
  isOrgMember: boolean;
  mfaCompliance: MfaComplianceSummary | null;
  requiresMfaEnrollment: boolean;
  login: (email: string, password: string, rememberMe?: boolean, skipNavigate?: boolean) => Promise<LoginResult>;
  verifyTotp: (code: string, isBackupCode?: boolean, skipNavigate?: boolean) => Promise<void>;
  verifyWebAuthn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCompliance: () => Promise<void>;
  /** Re-check org membership & admin status. Exposed so post-setup pages can update the context. */
  checkOrgAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// LocalStorage key for MFA compliance persistence
const MFA_COMPLIANCE_KEY = 'gatehouse_mfa_compliance';

// Helper to persist MFA compliance to localStorage
function persistMfaCompliance(compliance: MfaComplianceSummary | null): void {
  if (compliance) {
    localStorage.setItem(MFA_COMPLIANCE_KEY, JSON.stringify(compliance));
  } else {
    localStorage.removeItem(MFA_COMPLIANCE_KEY);
  }
}

// Helper to load MFA compliance from localStorage
function loadMfaCompliance(): MfaComplianceSummary | null {
  try {
    const stored = localStorage.getItem(MFA_COMPLIANCE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Handle both direct format and legacy double-nested format
    // Legacy format: { mfa_compliance: { ... } }
    // Current format: { ... }
    let compliance: Record<string, unknown>;
    if (parsed.mfa_compliance && typeof parsed.mfa_compliance === 'object') {
      compliance = parsed.mfa_compliance as Record<string, unknown>;
    } else {
      compliance = parsed;
    }

    // Validate that the stored data has the required fields
    if (!compliance || typeof compliance !== 'object') return null;
    if (!Array.isArray(compliance.orgs)) return null;

    // Check if at least one org has effective_mode (new field from API)
    // If not, treat as stale data and return null to fetch fresh data
    const hasEffectiveMode = compliance.orgs.some((org: Record<string, unknown>) =>
      typeof org.effective_mode === 'string'
    );
    if (!hasEffectiveMode) return null;

    return compliance as unknown as MfaComplianceSummary;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [mfaCompliance, setMfaCompliance] = useState<MfaComplianceSummary | null>(loadMfaCompliance);
  const [requiresMfaEnrollment, setRequiresMfaEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Helper to check if user is admin/owner in any org
  const checkOrgAdmin = useCallback(async () => {
    try {
      const data = await api.users.organizations();
      const admin = data.organizations.some(
        (org) => org.role === 'owner' || org.role === 'admin'
      );
      setIsOrgAdmin(admin);
      setIsOrgMember(data.organizations.length > 0);
    } catch {
      setIsOrgAdmin(false);
      setIsOrgMember(false);
    }
  }, []);

  const refreshCompliance = useCallback(async () => {
    try {
      const compliance = await api.policies.getMyCompliance();
      setMfaCompliance(compliance);
      persistMfaCompliance(compliance);
      
      // Check if user is now compliant
      if (compliance.overall_status === 'compliant' && requiresMfaEnrollment) {
        setRequiresMfaEnrollment(false);
        navigate('/profile');
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh compliance:', error);
    }
  }, [requiresMfaEnrollment, navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.users.me();
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.code === 401) {
        setUser(null);
        setMfaCompliance(null);
        persistMfaCompliance(null);
        setRequiresMfaEnrollment(false);
      }
      // Silently fail for other errors during refresh
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Only attempt to fetch user if we have a valid token
      if (!tokenManager.hasValidToken()) {
        setUser(null);
        setMfaCompliance(null);
        persistMfaCompliance(null);
        setRequiresMfaEnrollment(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.users.me();
        setUser(response.user);
        
        // Also fetch compliance status and org role
        try {
          const compliance = await api.policies.getMyCompliance();
          setMfaCompliance(compliance);
          persistMfaCompliance(compliance);
          setRequiresMfaEnrollment(compliance.overall_status === 'suspended');
        } catch {
          // Compliance fetch failed, continue without it
          setMfaCompliance(null);
          persistMfaCompliance(null);
        }
        // Check org admin status
        await checkOrgAdmin();
      } catch {
        setUser(null);
        setIsOrgAdmin(false);
        setIsOrgMember(false);
        setMfaCompliance(null);
        persistMfaCompliance(null);
        setRequiresMfaEnrollment(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false, skipNavigate = false): Promise<LoginResult> => {
    const response = await api.auth.login(email, password, rememberMe);

    // If WebAuthn is required, don't set user yet - wait for WebAuthn verification
    if (response.requires_webauthn) {
      return { requiresTotp: false, requiresWebAuthn: true };
    }

    // If TOTP is required, don't set user yet - wait for TOTP verification
    if (response.requires_totp) {
      return { requiresTotp: true, requiresWebAuthn: false };
    }

    // If MFA enrollment is required (past deadline), set compliance state
    if (response.requires_mfa_enrollment) {
      if (response.token) {
        tokenManager.setToken(response.token, response.expires_at ?? null);
      }
      if (response.user) {
        setUser(response.user);
      }
      if (response.mfa_compliance) {
        setMfaCompliance(response.mfa_compliance);
        persistMfaCompliance(response.mfa_compliance);
      }
      setRequiresMfaEnrollment(true);
      return { requiresTotp: false, requiresWebAuthn: false, requiresMfaEnrollment: true };
    }

    if (response.token) {
      tokenManager.setToken(response.token, response.expires_at ?? null);
    }

    if (response.user) {
      setUser(response.user);
      if (response.mfa_compliance) {
        setMfaCompliance(response.mfa_compliance);
        persistMfaCompliance(response.mfa_compliance);
      }
      setRequiresMfaEnrollment(false);
      await checkOrgAdmin();
      if (!skipNavigate) {
        if (response.requires_org_setup) {
          navigate('/org-setup', {
            state: {
              pendingInvites: response.pending_invites ?? [],
              isFirstUser: false,
            },
          });
        } else {
          navigate('/profile');
        }
      }
    }
    return {
      requiresTotp: false,
      requiresWebAuthn: false,
      requiresOrgSetup: response.requires_org_setup,
      pendingInvites: response.pending_invites,
    };
  }, [navigate, checkOrgAdmin]);

  const verifyWebAuthn = useCallback(async () => {
    // WebAuthn verification is handled directly in the LoginPage component
  }, []);

  const verifyTotp = useCallback(async (code: string, isBackupCode = false, skipNavigate = false) => {
    const response = await api.totp.verify(code, isBackupCode);
    
    if (response.token) {
      tokenManager.setToken(response.token, response.expires_at ?? null);
    }
    
    setUser(response.user);
    
    try {
      const compliance = await api.policies.getMyCompliance();
      setMfaCompliance(compliance);
      persistMfaCompliance(compliance);
      setRequiresMfaEnrollment(compliance.overall_status === 'suspended');
    } catch {
      setMfaCompliance(null);
      persistMfaCompliance(null);
    }
    
    await checkOrgAdmin();
    if (!skipNavigate) {
      navigate('/profile');
    }
  }, [navigate, checkOrgAdmin]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setIsOrgAdmin(false);
      setIsOrgMember(false);
      setMfaCompliance(null);
      persistMfaCompliance(null);
      setRequiresMfaEnrollment(false);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isOrgAdmin,
        isOrgMember,
        mfaCompliance,
        requiresMfaEnrollment,
        login,
        verifyTotp,
        verifyWebAuthn,
        logout,
        refreshUser,
        refreshCompliance,
        checkOrgAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
