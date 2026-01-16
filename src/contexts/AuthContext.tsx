import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User, ApiError, tokenManager } from '@/lib/api';

interface LoginResult {
  requiresTotp: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  verifyTotp: (code: string, isBackupCode?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.users.me();
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.code === 401) {
        setUser(null);
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
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.users.me();
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false): Promise<LoginResult> => {
    console.log('[AuthContext] login() called');
    const response = await api.auth.login(email, password, rememberMe);
    console.log('[AuthContext] login response:', { requires_totp: response.requires_totp, hasToken: !!response.token, hasUser: !!response.user });
    
    // If TOTP is required, don't set user yet - wait for TOTP verification
    if (response.requires_totp) {
      console.log('[AuthContext] TOTP required, returning early');
      return { requiresTotp: true };
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
      navigate('/profile');
    }
    return { requiresTotp: false };
  }, [navigate]);

  const verifyTotp = useCallback(async (code: string, isBackupCode = false) => {
    const response = await api.totp.verify(code, isBackupCode);
    
    // Store token explicitly before setting user state
    // This ensures the token is available for any subsequent API calls
    if (response.token) {
      tokenManager.setToken(response.token, response.expires_at ?? null);
    }
    
    setUser(response.user);
    navigate('/profile');
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        verifyTotp,
        logout,
        refreshUser,
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
