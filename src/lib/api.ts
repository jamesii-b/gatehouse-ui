// API Client for Gatehouse Backend
// Uses Bearer token authentication

import { config } from '@/config';

interface ApiResponse<T = unknown> {
  version: string;
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: {
    type: string;
    details: Record<string, unknown>;
  };
}

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  count: number;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_at: string;
  requires_totp?: boolean;
}

export interface TotpEnrollResponse {
  secret: string;
  provisioning_uri: string;
  qr_code: string; // base64 PNG
  backup_codes: string[];
}

export interface TotpStatusResponse {
  totp_enabled: boolean;
  verified_at: string | null;
  backup_codes_remaining: number;
}

export interface TotpVerifyResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface ProfileResponse {
  user: User;
}

class ApiError extends Error {
  code: number;
  type: string;
  details: Record<string, unknown>;

  constructor(message: string, code: number, type: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.type = type;
    this.details = details;
  }
}

// Token storage keys
const TOKEN_KEY = 'gatehouse_token';
const TOKEN_EXPIRY_KEY = 'gatehouse_token_expiry';

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    // Check if token is expired
    if (token && expiry) {
      const expiryDate = new Date(expiry);
      if (expiryDate <= new Date()) {
        tokenManager.clearToken();
        return null;
      }
    }
    
    return token;
  },
  
  setToken: (token: string, expiresAt: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
  },
  
  clearToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
  
  hasValidToken: (): boolean => {
    return tokenManager.getToken() !== null;
  },
};

// Error types that indicate the session/token is truly invalid
const SESSION_INVALID_ERROR_TYPES = [
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'SESSION_EXPIRED',
  'AUTH_ERROR',
  'UNAUTHORIZED',
];

interface RequestConfig {
  // Controls token clearing on 401:
  // - 'auto' (default): Clear only if error type indicates invalid session
  // - true: Always clear token on 401
  // - false: Never clear token on 401
  clearTokenOn401?: boolean | 'auto';
}

// Central request function - all API calls go through here
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true,
  requestConfig: RequestConfig = {}
): Promise<T> {
  const { clearTokenOn401 = 'auto' } = requestConfig;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if we have a token and auth is required
  if (requiresAuth) {
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    const errorType = json.error?.type || 'UNKNOWN_ERROR';

    // Handle 401 token clearing based on configuration
    if (json.code === 401) {
      const shouldClearToken =
        clearTokenOn401 === true ||
        (clearTokenOn401 === 'auto' && SESSION_INVALID_ERROR_TYPES.includes(errorType));

      if (shouldClearToken) {
        tokenManager.clearToken();
        if (import.meta.env.DEV) {
          console.log(`[API] Token cleared on 401 (type: ${errorType}, endpoint: ${endpoint})`);
        }
      } else if (import.meta.env.DEV) {
        console.log(`[API] 401 received but token preserved (type: ${errorType}, endpoint: ${endpoint})`);
      }
    }
    
    throw new ApiError(
      json.message || 'An error occurred',
      json.code,
      errorType,
      json.error?.details || {}
    );
  }

  return json.data as T;
}

// Centralized API client - all routes defined here
export const api = {
  auth: {
    login: async (email: string, password: string, remember_me = false): Promise<LoginResponse> => {
      const response = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember_me }),
      }, false); // Login doesn't require auth
      
      // Store token on successful login
      tokenManager.setToken(response.token, response.expires_at);
      
      return response;
    },

    logout: async (): Promise<void> => {
      try {
        await request<void>('/auth/logout', {
          method: 'POST',
        });
      } finally {
        // Always clear token on logout
        tokenManager.clearToken();
      }
    },
  },

  users: {
    // me() is the canonical session validity check - always clear token on 401
    me: () => request<ProfileResponse>('/users/me', {}, true, { clearTokenOn401: true }),

    updateMe: (data: { full_name?: string; avatar_url?: string }) =>
      request<ProfileResponse>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    organizations: () => request<OrganizationsResponse>('/users/me/organizations'),

    // Password change can return 401 for wrong current password - don't clear token
    changePassword: (currentPassword: string, newPassword: string, newPasswordConfirm: string) =>
      request<{ message: string }>('/users/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
      }, true, { clearTokenOn401: false }),
  },

  totp: {
    // Initiate TOTP enrollment - returns secret, QR code, and backup codes
    enroll: () =>
      request<TotpEnrollResponse>('/auth/totp/enroll', {
        method: 'POST',
      }),

    // Verify TOTP enrollment - wrong code should not log user out
    verifyEnrollment: (code: string) =>
      request<{ message: string }>('/auth/totp/verify-enrollment', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }, true, { clearTokenOn401: false }),

    // Verify TOTP code during login (no auth required - uses session state)
    verify: (code: string, isBackupCode = false) =>
      request<TotpVerifyResponse>('/auth/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ code, is_backup_code: isBackupCode }),
      }, false),

    // Get TOTP status
    status: () =>
      request<TotpStatusResponse>('/auth/totp/status'),

    // Disable TOTP - wrong password should not log user out
    disable: (password: string) =>
      request<{ message: string }>('/auth/totp/disable', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      }, true, { clearTokenOn401: false }),

    // Regenerate backup codes - wrong password should not log user out
    regenerateBackupCodes: (password: string) =>
      request<{ backup_codes: string[] }>('/auth/totp/regenerate-backup-codes', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }, true, { clearTokenOn401: false }),
  },
};

export { ApiError };
