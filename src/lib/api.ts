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

export interface MfaComplianceOrgSummary {
  organization_id: string;
  organization_name: string;
  status: string;
  deadline_at: string | null;
  effective_mode: string;
  applied_at: string;
}

export interface MfaComplianceSummary {
  overall_status: string;
  missing_methods: string[];
  deadline_at: string | null;
  orgs: MfaComplianceOrgSummary[];
}

/**
 * Check if MFA is required for the user based on their compliance status.
 * This checks if any organization has an effective_mode that starts with "require_",
 * which handles require_webauthn, require_totp, or any future MFA methods.
 */
export function isMfaRequired(compliance: MfaComplianceSummary | null): boolean {
  if (!compliance || !compliance.orgs) return false;
  return compliance.orgs.some(
    org => org.effective_mode && org.effective_mode.startsWith('require_')
  );
}

export interface LoginResponse {
  user?: User;
  token?: string;
  expires_at?: string;
  requires_totp?: boolean;
  requires_mfa_enrollment?: boolean;
  mfa_compliance?: MfaComplianceSummary;
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

// WebAuthn types
export interface PasskeyCredential {
  id: string;
  name: string;
  transports: string[];
  device_type: string;
  created_at: string;
  last_used_at: string | null;
}

export interface WebAuthnStatusResponse {
  webauthn_enabled: boolean;
  credential_count: number;
}

export interface WebAuthnCredentialsResponse {
  credentials: PasskeyCredential[];
  count: number;
}

export interface WebAuthnLoginCompleteResponse {
  user: User;
  token: string;
  expires_at: string;
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
        console.log('[TokenManager] Token expired, clearing');
        tokenManager.clearToken();
        return null;
      }
    }
    
    if (token) {
      console.log('[TokenManager] Token retrieved:', token.substring(0, 20) + '...');
    } else {
      console.log('[TokenManager] No token found in localStorage');
    }
    
    return token;
  },
  
  setToken: (token: string, expiresAt?: string | null): void => {
    console.log('[TokenManager] Setting token, expiresAt:', expiresAt);
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
    } else {
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
    console.log('[TokenManager] Token set successfully');
  },
  
  clearToken: (): void => {
    console.log('[TokenManager] Clearing token from localStorage');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
  
  hasValidToken: (): boolean => {
    const hasToken = tokenManager.getToken() !== null;
    console.log('[TokenManager] hasValidToken:', hasToken);
    return hasToken;
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

export const AUTHORIZATION_ERROR_TYPES = ['AUTHORIZATION_ERROR'] as const;

interface RequestConfig {
  // Controls token clearing on 401:
  // - 'auto' (default): Clear only if error type indicates invalid session
  // - true: Always clear token on 401
  // - false: Never clear token on 401
  clearTokenOn401?: boolean | 'auto';
  // Optional callback for handling 403 authorization errors
  on403?: (error: ApiError) => void;
}

// Central request function - all API calls go through here
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true,
  requestConfig: RequestConfig = {}
): Promise<T> {
  const { clearTokenOn401 = 'auto', on403 } = requestConfig;

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
      console.log('[API] Added Authorization header for endpoint:', endpoint);
    } else {
      console.log('[API] WARNING: No token available for authenticated endpoint:', endpoint);
    }
  }

  const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies for session consistency
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

    // Handle 403 authorization errors
    if (json.code === 403) {
      const error = new ApiError(
        json.message || 'Access denied',
        json.code,
        errorType,
        json.error?.details || {}
      );

      if (on403) {
        on403(error);
      }
      throw error;
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
        credentials: 'include', // Required for TOTP session tracking
      }, false); // Login doesn't require auth
      
      // Only store token if login is complete (no TOTP required)
      if (response.token && !response.requires_totp) {
        tokenManager.setToken(response.token, response.expires_at ?? null);
      }
      
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

    organizations: (requestConfig?: RequestConfig) =>
      request<OrganizationsResponse>('/users/me/organizations', {}, true, requestConfig),

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
    verify: async (code: string, isBackupCode = false): Promise<TotpVerifyResponse> => {
      const response = await request<TotpVerifyResponse>('/auth/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ code, is_backup_code: isBackupCode }),
        credentials: 'include', // Required for TOTP session tracking
      }, false);
      
      if (response.token) {
        tokenManager.setToken(response.token, response.expires_at ?? null);
      }
      
      return response;
    },

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

  webauthn: {
    // Get WebAuthn status
    status: () =>
      request<WebAuthnStatusResponse>('/auth/webauthn/status'),

    // List all passkeys for current user
    listCredentials: () =>
      request<WebAuthnCredentialsResponse>('/auth/webauthn/credentials'),

    // Begin passkey registration (returns raw WebAuthn options)
    beginRegistration: async (): Promise<Record<string, unknown>> => {
      const response = await fetch(`${config.api.baseUrl}/auth/webauthn/register/begin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(
          error.message || 'Failed to begin registration',
          error.code || response.status,
          error.error?.type || 'WEBAUTHN_ERROR',
          error.error?.details || {}
        );
      }
      // Returns raw WebAuthn options (not wrapped in standard response)
      return response.json();
    },

    // Complete passkey registration
    completeRegistration: (credential: Record<string, unknown>, name?: string) =>
      request<{ message: string; credential_id: string }>('/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({ ...credential, name }),
      }),

    // Begin passkey login (returns raw WebAuthn options)
    beginLogin: async (email: string): Promise<Record<string, unknown>> => {
      const response = await fetch(`${config.api.baseUrl}/auth/webauthn/login/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Required for session cookie
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(
          error.message || 'No passkeys found for this account',
          error.code || response.status,
          error.error?.type || 'WEBAUTHN_ERROR',
          error.error?.details || {}
        );
      }
      // Returns raw WebAuthn options (not wrapped in standard response)
      return response.json();
    },

    // Complete passkey login
    completeLogin: async (assertion: Record<string, unknown>): Promise<WebAuthnLoginCompleteResponse> => {
      const response = await fetch(`${config.api.baseUrl}/auth/webauthn/login/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Required for session cookie
        body: JSON.stringify(assertion),
      });
      
      const json: ApiResponse<WebAuthnLoginCompleteResponse> = await response.json();
      
      if (!json.success) {
        throw new ApiError(
          json.message || 'Authentication failed',
          json.code,
          json.error?.type || 'AUTHENTICATION_ERROR',
          json.error?.details || {}
        );
      }
      
      // Store token after successful passkey login
      if (json.data?.token) {
        tokenManager.setToken(json.data.token, json.data.expires_at ?? null);
      }
      
      return json.data as WebAuthnLoginCompleteResponse;
    },

    // Rename a passkey
    renameCredential: (credentialId: string, name: string) =>
      request<{ message: string }>(`/auth/webauthn/credentials/${credentialId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),

    // Delete a passkey
    deleteCredential: (credentialId: string) =>
      request<{ message: string }>(`/auth/webauthn/credentials/${credentialId}`, {
        method: 'DELETE',
      }),
  },

  policies: {
    // Get organization security policy
    getOrgPolicy: (orgId: string, requestConfig?: RequestConfig) =>
      request<OrgPolicyResponse>(`/organizations/${orgId}/security-policy`, {}, true, requestConfig),

    // Update organization security policy
    updateOrgPolicy: (orgId: string, body: UpdateOrgPolicyDto, requestConfig?: RequestConfig) =>
      request<OrgPolicyResponse>(`/organizations/${orgId}/security-policy`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }, true, requestConfig),

    // List organization compliance (paginated)
    listOrgCompliance: (orgId: string, params: Record<string, string>, requestConfig?: RequestConfig) =>
      request<OrgCompliancePage>(
        `/organizations/${orgId}/mfa-compliance?${new URLSearchParams(params)}`,
        {},
        true,
        requestConfig
      ),

    // Get current user's MFA compliance summary
    getMyCompliance: () =>
      request<MfaComplianceSummary>('/users/me/mfa-compliance'),
  },
};

// Policy types
export interface OrgPolicyResponse {
  security_policy: {
    organization_id: string;
    mfa_policy_mode: string;
    mfa_grace_period_days: number;
    notify_days_before: number;
    policy_version: number;
  };
}

export interface UpdateOrgPolicyDto {
  mfa_policy_mode: string;
  mfa_grace_period_days: number;
  notify_days_before: number;
}

export interface OrgCompliancePage {
  members: OrgComplianceMember[];
  count: number;
  page: number;
  page_size: number;
}

export interface OrgComplianceMember {
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  deadline_at: string | null;
  compliant_at: string | null;
  last_notified_at: string | null;
}

export { ApiError };

// Reusable 403 error handler for API calls
// Shows a user-friendly toast message when access is denied
export function create403Handler(toastFn: (options: { title: string; description: string; variant: "destructive" }) => void) {
  return (error: ApiError) => {
    console.warn('[API] 403 Access Denied:', error.message);
    toastFn({
      title: "Access Denied",
      description: "You don't have permission to view this section. Please contact your organization administrator.",
      variant: "destructive",
    });
  };
}