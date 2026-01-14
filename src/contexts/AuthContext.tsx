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
    const response = await api.auth.login(email, password, rememberMe);
    
    // If TOTP is required, don't set user yet - wait for TOTP verification
    if (response.requires_totp) {
      return { requiresTotp: true };
    }
    
    // Login complete, set user and navigate
    if (response.user) {
      setUser(response.user);
      navigate('/profile');
    }
    return { requiresTotp: false };
  }, [navigate]);

  const verifyTotp = useCallback(async (code: string, isBackupCode = false) => {
    const response = await api.totp.verify(code, isBackupCode);
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
