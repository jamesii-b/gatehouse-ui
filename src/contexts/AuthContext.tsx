import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User, ApiError, tokenManager, MfaComplianceSummary } from '@/lib/api';

interface LoginResult {
  requiresTotp: boolean;
  requiresWebAuthn: boolean;
  requiresMfaEnrollment?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mfaCompliance: MfaComplianceSummary | null;
  requiresMfaEnrollment: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  verifyTotp: (code: string, isBackupCode?: boolean) => Promise<void>;
  verifyWebAuthn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCompliance: () => Promise<void>;
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
    if (!stored) {
      console.log('[AuthContext] loadMfaCompliance: no stored data');
      return null;
    }
    
    const parsed = JSON.parse(stored);
    console.log('[AuthContext] loadMfaCompliance: raw parsed:', parsed);
    
    // Handle both direct format and legacy double-nested format
    // Legacy format: { mfa_compliance: { ... } }
    // Current format: { ... }
    let compliance: Record<string, unknown>;
    if (parsed.mfa_compliance && typeof parsed.mfa_compliance === 'object') {
      console.log('[AuthContext] loadMfaCompliance: detected legacy double-nested format, unwrapping');
      compliance = parsed.mfa_compliance as Record<string, unknown>;
    } else {
      compliance = parsed;
    }
    
    // Validate that the stored data has the required fields
    if (!compliance || typeof compliance !== 'object') {
      console.log('[AuthContext] loadMfaCompliance: invalid compliance object');
      return null;
    }
    if (!Array.isArray(compliance.orgs)) {
      console.log('[AuthContext] loadMfaCompliance: orgs is not an array');
      return null;
    }
    
    // Validate missing_methods exists and is an array
    if (!Array.isArray(compliance.missing_methods)) {
      console.log('[AuthContext] loadMfaCompliance: missing_methods is not an array or missing');
    }
    
    // Check if at least one org has effective_mode (new field from API)
    // If not, treat as stale data and return null to fetch fresh data
    const hasEffectiveMode = compliance.orgs.some((org: Record<string, unknown>) =>
      typeof org.effective_mode === 'string'
    );
    
    if (!hasEffectiveMode) {
      console.log('[AuthContext] loadMfaCompliance: no effective_mode found, treating as stale');
      return null;
    }
    
    console.log('[AuthContext] loadMfaCompliance: loaded successfully');
    return compliance as unknown as MfaComplianceSummary;
  } catch (error) {
    console.log('[AuthContext] loadMfaCompliance: error loading:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mfaCompliance, setMfaCompliance] = useState<MfaComplianceSummary | null>(loadMfaCompliance);
  const [requiresMfaEnrollment, setRequiresMfaEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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
        
        // Also fetch compliance status
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
      } catch {
        setUser(null);
        setMfaCompliance(null);
        persistMfaCompliance(null);
        setRequiresMfaEnrollment(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false): Promise<LoginResult> => {
    console.log('[AuthContext] login() called');
    const response = await api.auth.login(email, password, rememberMe);
    console.log('[AuthContext] login response:', {
      requires_totp: response.requires_totp,
      requires_webauthn: response.requires_webauthn,
      requires_mfa_enrollment: response.requires_mfa_enrollment,
      hasToken: !!response.token,
      hasUser: !!response.user
    });
    
    // If WebAuthn is required, don't set user yet - wait for WebAuthn verification
    if (response.requires_webauthn) {
      console.log('[AuthContext] WebAuthn required, returning early');
      return { requiresTotp: false, requiresWebAuthn: true };
    }
    
    // If TOTP is required, don't set user yet - wait for TOTP verification
    if (response.requires_totp) {
      console.log('[AuthContext] TOTP required, returning early');
      return { requiresTotp: true, requiresWebAuthn: false };
    }
    
    // If MFA enrollment is required (past deadline), set compliance state
    if (response.requires_mfa_enrollment) {
      console.log('[AuthContext] MFA enrollment required, setting compliance state');
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
    
    // Login complete: store token explicitly before setting user state
    // This ensures the token is available for any subsequent API calls
    // (e.g., when navigate('/profile') triggers refreshUser())
    if (response.token) {
      console.log('[AuthContext] Storing token in localStorage');
      tokenManager.setToken(response.token, response.expires_at ?? null);
      console.log('[AuthContext] Token stored, verifying:', tokenManager.getToken()?.substring(0, 20) + '...');
    }
    
    // Set user and navigate
    if (response.user) {
      console.log('[AuthContext] Setting user state and navigating to /profile');
      setUser(response.user);
      if (response.mfa_compliance) {
        setMfaCompliance(response.mfa_compliance);
        persistMfaCompliance(response.mfa_compliance);
      }
      setRequiresMfaEnrollment(false);
      navigate('/profile');
    }
    return { requiresTotp: false, requiresWebAuthn: false };
  }, [navigate]);

  const verifyWebAuthn = useCallback(async () => {
    // WebAuthn verification is handled directly in the LoginPage component
    // This is a placeholder for consistency with the interface
    console.log('[AuthContext] verifyWebAuthn called - verification handled in LoginPage');
  }, []);

  const verifyTotp = useCallback(async (code: string, isBackupCode = false) => {
    const response = await api.totp.verify(code, isBackupCode);
    
    // Store token explicitly before setting user state
    // This ensures the token is available for any subsequent API calls
    if (response.token) {
      tokenManager.setToken(response.token, response.expires_at ?? null);
    }
    
    setUser(response.user);
    
    // Check for MFA compliance in response
    try {
      const compliance = await api.policies.getMyCompliance();
      setMfaCompliance(compliance);
      persistMfaCompliance(compliance);
      setRequiresMfaEnrollment(compliance.overall_status === 'suspended');
    } catch {
      setMfaCompliance(null);
      persistMfaCompliance(null);
    }
    
    navigate('/profile');
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
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
        mfaCompliance,
        requiresMfaEnrollment,
        login,
        verifyTotp,
        verifyWebAuthn,
        logout,
        refreshUser,
        refreshCompliance,
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
