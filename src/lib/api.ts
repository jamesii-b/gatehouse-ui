// API Client for Secuird Backend
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
  // Fields present in admin list view
  org_role?: string;
  org_id?: string;
  activated?: boolean;
  // Auth method capabilities — present on /users/me response
  has_password?: boolean;
  totp_enabled?: boolean;
  linked_providers?: string[];
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
  requires_webauthn?: boolean;
  requires_mfa_enrollment?: boolean;
  mfa_compliance?: MfaComplianceSummary;
  /** Set on login when the user belongs to no organisations. */
  requires_org_setup?: boolean;
  /** Pending invitations for the user's email (present when requires_org_setup is true). */
  pending_invites?: PendingInvite[];
  /** True when the registering user is the very first user on this instance. */
  is_first_user?: boolean;
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

// Admin MFA management types
export interface AdminMfaMethod {
  /** Unique identifier: auth_method.id for TOTP, credential id for WebAuthn */
  id: string;
  /** 'totp' or 'webauthn' */
  type: 'totp' | 'webauthn';
  /** Human-readable name */
  name: string;
  device_type?: string;
  transports?: string[];
  verified: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

export interface AdminLinkedAccount {
  /** UUID of the AuthenticationMethod row */
  id: string;
  /** Provider name: 'google' | 'github' | 'microsoft' | 'oidc' */
  provider_type: string;
  /** Email address from the OAuth provider, if available */
  email: string | null;
  /** Display name from the OAuth provider, if available */
  name: string | null;
  /** ISO timestamp when the account was linked */
  linked_at: string | null;
}

// External Auth Types
export type ExternalProviderId = 'google' | 'github' | 'microsoft';

export interface ExternalProvider {
  id: string;
  name: string;
  type: string;
  is_configured: boolean;
  is_active: boolean;
  settings: {
    requires_domain: boolean;
    supports_refresh_tokens: boolean;
  };
}

export interface ExternalProvidersResponse {
  providers: ExternalProvider[];
}

export interface LinkedAccount {
  id: string;
  provider_type: string;
  provider_user_id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  verified: boolean;
  linked_at: string | null;
  last_used_at: string | null;
}

export interface LinkedAccountsResponse {
  linked_accounts: LinkedAccount[];
  unlink_available: boolean;
}

export interface PrincipalOption {
  id: string;
  name: string;
  description: string | null;
}

export interface MyPrincipalsOrg {
  org_id: string;
  org_name: string;
  role: string;
  is_admin: boolean;
  my_principals: PrincipalOption[];
  all_principals: PrincipalOption[]; // populated for admin/owner only
}

export interface MyPrincipalsResponse {
  orgs: MyPrincipalsOrg[];
}

export interface OAuthAuthorizeResponse {
  authorization_url: string;
  state: string;
}

export interface OAuthCallbackResponse {
  token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface LinkAccountResponse {
  linked_account: LinkedAccount;
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
const TOKEN_KEY = 'secuird_token';
const TOKEN_EXPIRY_KEY = 'secuird_token_expiry';

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
  
  setToken: (token: string, expiresAt?: string | null): void => {
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
    } else {
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
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

    register: async (email: string, password: string, full_name?: string): Promise<LoginResponse> => {
      const response = await request<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, password_confirm: password, full_name }),
      }, false);

      if (response.token) {
        tokenManager.setToken(response.token, response.expires_at ?? null);
      }

      return response;
    },

    forgotPassword: (email: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false),

    resetPassword: (token: string, password: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, password_confirm: password }),
      }, false),

    verifyEmail: (token: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }, false),

    resendVerification: (email: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false),

    activate: (activation_key: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ activation_key }),
      }, false),

    resendActivation: (email: string): Promise<{ message: string }> =>
      request<{ message: string }>('/auth/resend-activation', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false),

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

    // Delete the current user's own account (soft delete)
    deleteMe: (requestConfig?: RequestConfig) =>
      request<{ message: string }>('/users/me', { method: 'DELETE' }, true, requestConfig),

    organizations: (requestConfig?: RequestConfig) =>
      request<OrganizationsResponse>('/users/me/organizations', {}, true, requestConfig),

    // Get the current user's effective principals across all orgs
    myPrincipals: (requestConfig?: RequestConfig) =>
      request<MyPrincipalsResponse>('/users/me/principals', {}, true, requestConfig),

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

    // Get audit logs for the currently authenticated user
    auditLogs: (params?: Record<string, string>, requestConfig?: RequestConfig) =>
      request<{ audit_logs: AuditLogEntry[]; count: number; page: number; per_page: number; pages: number }>(
        `/auth/audit-logs${params ? '?' + new URLSearchParams(params).toString() : ''}`,
        {},
        true,
        requestConfig,
      ),

    // Get pending (unaccepted) invitations for the logged-in user
    getMyInvites: (requestConfig?: RequestConfig) =>
      request<{ invites: PendingInvite[] }>('/users/me/invites', {}, true, requestConfig),

    // Get the current user's department + principal memberships across all orgs
    getMyMemberships: (requestConfig?: RequestConfig) =>
      request<{ orgs: MyOrgMembership[] }>('/users/me/memberships', {}, true, requestConfig),
  },

  admin: {
    // Get all system audit logs (admin view — returns all logs for org owners, own logs otherwise)
    getAuditLogs: (params?: Record<string, string>, requestConfig?: RequestConfig) =>
      request<{ audit_logs: AuditLogEntry[]; count: number; page: number; per_page: number; pages: number; is_admin_view: boolean }>(
        `/audit-logs${params ? '?' + new URLSearchParams(params).toString() : ''}`,
        {},
        true,
        requestConfig,
      ),

    // List users visible to the calling admin
    listUsers: (params?: Record<string, string>, requestConfig?: RequestConfig) =>
      request<{ users: User[]; count: number; page: number; per_page: number; pages: number }>(
        `/admin/users${params ? '?' + new URLSearchParams(params).toString() : ''}`,
        {},
        true,
        requestConfig,
      ),

    // Get a single user's profile + SSH keys (admin view)
    getUser: (userId: string, requestConfig?: RequestConfig) =>
      request<{ user: User; ssh_keys: SSHKey[] }>(`/admin/users/${userId}`, {}, true, requestConfig),

    // Update a user's role in a shared org (admin action)
    updateUserRole: (orgId: string, userId: string, role: string, requestConfig?: RequestConfig) =>
      request<{ member: OrganizationMember }>(`/organizations/${orgId}/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }, true, requestConfig),

    // List application-level OAuth provider configurations
    listOAuthProviders: (requestConfig?: RequestConfig) =>
      request<{ providers: { id: string; name: string; is_configured: boolean; is_enabled: boolean; client_id: string | null }[] }>(
        '/admin/oauth/providers', {}, true, requestConfig,
      ),

    // Create or update an application-level OAuth provider
    configureOAuthProvider: (provider: string, clientId: string, clientSecret: string, isEnabled: boolean, requestConfig?: RequestConfig) =>
      request<{ provider: { id: string; client_id: string; is_enabled: boolean } }>(
        `/admin/oauth/providers/${provider}`,
        { method: 'PUT', body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, is_enabled: isEnabled }) },
        true,
        requestConfig,
      ),

    // Delete an application-level OAuth provider
    deleteOAuthProvider: (provider: string, requestConfig?: RequestConfig) =>
      request<Record<string, never>>(`/admin/oauth/providers/${provider}`, { method: 'DELETE' }, true, requestConfig),

    // Suspend a user account (blocks login & CA issuance)
    suspendUser: (userId: string, requestConfig?: RequestConfig) =>
      request<{ user: User }>(`/admin/users/${userId}/suspend`, { method: 'POST' }, true, requestConfig),

    // Restore a suspended user to active status
    unsuspendUser: (userId: string, requestConfig?: RequestConfig) =>
      request<{ user: User }>(`/admin/users/${userId}/unsuspend`, { method: 'POST' }, true, requestConfig),

    // Force-verify a user's email and activate their account (clears stale verification tokens)
    adminVerifyUserEmail: (userId: string, requestConfig?: RequestConfig) =>
      request<{ user: User }>(`/admin/users/${userId}/verify-email`, { method: 'POST' }, true, requestConfig),

    // Permanently delete a user — revokes certs, cascades DB delete, unrecoverable
    hardDeleteUser: (userId: string, requestConfig?: RequestConfig) =>
      request<{ deleted_user_id: string; deleted_user_email: string; ssh_keys_deleted: number; certs_revoked: number }>(
        `/admin/users/${userId}/delete`,
        { method: 'POST', body: JSON.stringify({ confirm: true }) },
        true,
        requestConfig,
      ),

    // Get all MFA methods configured for a user (admin view)
    getUserMfa: (userId: string, requestConfig?: RequestConfig) =>
      request<{ user: { id: string; email: string; full_name: string | null }; mfa_methods: AdminMfaMethod[] }>(
        `/admin/users/${userId}/mfa`,
        {},
        true,
        requestConfig,
      ),

    // Remove an MFA method for a user (admin action — use when user lost access)
    // method_type: 'totp' | 'webauthn' | 'all'
    // credentialId: optional WebAuthn credential ID to remove a single passkey
    removeUserMfa: (userId: string, methodType: 'totp' | 'webauthn' | 'all', credentialId?: string, requestConfig?: RequestConfig) => {
      const qs = credentialId ? `?credential_id=${encodeURIComponent(credentialId)}` : '';
      return request<{ removed_methods: string[]; removed_count: number; user: { id: string; email: string } }>(
        `/admin/users/${userId}/mfa/${methodType}${qs}`,
        { method: 'DELETE' },
        true,
        requestConfig,
      );
    },

    // Get linked OAuth/OIDC accounts for a user (admin view)
    getUserLinkedAccounts: (userId: string, requestConfig?: RequestConfig) =>
      request<{
        user: { id: string; email: string; full_name: string | null };
        linked_accounts: AdminLinkedAccount[];
        total_auth_methods: number;
      }>(
        `/admin/users/${userId}/linked-accounts`,
        {},
        true,
        requestConfig,
      ),

    // Unlink an OAuth/OIDC provider from a user's account (admin action)
    // provider: provider name ('google', 'github', 'microsoft', 'oidc') or method UUID
    adminUnlinkUserProvider: (userId: string, provider: string, requestConfig?: RequestConfig) =>
      request<{ provider: string; user: { id: string; email: string } }>(
        `/admin/users/${userId}/linked-accounts/${encodeURIComponent(provider)}`,
        { method: 'DELETE' },
        true,
        requestConfig,
      ),

    // Set or reset a user's password (admin action — no current password needed)
    // Creates the password auth method if the user doesn't have one (e.g. OAuth-only users)
    adminSetUserPassword: (userId: string, password: string, requestConfig?: RequestConfig) =>
      request<{ user: { id: string; email: string } }>(
        `/admin/users/${userId}/password`,
        { method: 'POST', body: JSON.stringify({ password }) },
        true,
        requestConfig,
      ),

    // Get the cert policy for a department
    getDeptCertPolicy: (orgId: string, deptId: string, requestConfig?: RequestConfig) =>
      request<{ cert_policy: DeptCertPolicy }>(`/organizations/${orgId}/departments/${deptId}/cert-policy`, {}, true, requestConfig),

    // Create or update the cert policy for a department
    setDeptCertPolicy: (orgId: string, deptId: string, policy: Partial<DeptCertPolicy>, requestConfig?: RequestConfig) =>
      request<{ cert_policy: DeptCertPolicy }>(`/organizations/${orgId}/departments/${deptId}/cert-policy`, {
        method: 'PUT',
        body: JSON.stringify(policy),
      }, true, requestConfig),
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

    // Verify TOTP code with an mfa_token (used after OAuth callback when MFA is required)
    verifyWithMfaToken: async (code: string, mfaToken: string, isBackupCode = false): Promise<TotpVerifyResponse> => {
      const response = await request<TotpVerifyResponse>('/auth/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ code, mfa_token: mfaToken, is_backup_code: isBackupCode }),
        credentials: 'include',
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
    disable: (password?: string | null) =>
      request<{ message: string }>('/auth/totp/disable', {
        method: 'DELETE',
        body: JSON.stringify({ password: password || null }),
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

  externalAuth: {
    // List available providers
    listProviders: () =>
      request<ExternalProvidersResponse>('/auth/external/providers'),

    // Get linked accounts for current user
    listLinkedAccounts: () =>
      request<LinkedAccountsResponse>('/auth/external/linked-accounts'),

    // Initiate OAuth login flow — returns authorization_url to redirect the browser to
    initiateLogin: (provider: string, options?: { redirect_uri?: string; organization_id?: string; flow?: string; oidc_session_id?: string }) => {
      const params = new URLSearchParams({ flow: options?.flow ?? 'login' });
      if (options?.redirect_uri) params.set('redirect_uri', options.redirect_uri);
      if (options?.organization_id) params.set('organization_id', options.organization_id);
      if (options?.oidc_session_id) params.set('oidc_session_id', options.oidc_session_id);
      return request<OAuthAuthorizeResponse>(`/auth/external/${provider}/authorize?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      }, false);
    },

    // Initiate account linking flow (requires auth)
    initiateLink: (provider: string, redirect_uri?: string) =>
      request<OAuthAuthorizeResponse>(`/auth/external/${provider}/link`, {
        method: 'POST',
        body: JSON.stringify({ redirect_uri }),
        credentials: 'include',
      }),

    // Unlink an external account
    unlinkAccount: (provider: string) =>
      request<{ message: string }>(`/auth/external/${provider}/unlink`, {
        method: 'DELETE',
        credentials: 'include',
      }),
  },

  organizations: {
    // Create a new organization (caller becomes owner)
    create: (name: string, slug: string, description?: string) =>
      request<{ organization: Organization }>('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name, slug, description }),
      }, true),

    // Get organization by ID
    getById: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ organization: Organization; member_count: number }>(`/organizations/${orgId}`, {}, true, requestConfig),

    // Delete an organization (owner only; pass confirm=true when other members exist)
    deleteOrganization: (orgId: string, confirm?: boolean, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}`, {
        method: 'DELETE',
        ...(confirm ? { body: JSON.stringify({ confirm: true }) } : {}),
      }, true, requestConfig),

    // Get organization members
    getMembers: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ members: OrganizationMember[]; count: number }>(`/organizations/${orgId}/members`, {}, true, requestConfig),

    // Add member to organization
    addMember: (orgId: string, email: string, role: string, requestConfig?: RequestConfig) =>
      request<{ member: OrganizationMember }>(`/organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }, true, requestConfig),

    // Remove member from organization
    removeMember: (orgId: string, userId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Update member role
    updateMemberRole: (orgId: string, userId: string, role: string, requestConfig?: RequestConfig) =>
      request<{ member: OrganizationMember }>(`/organizations/${orgId}/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }, true, requestConfig),

    // Get organization audit logs
    getAuditLogs: (orgId: string, params?: Record<string, string>, requestConfig?: RequestConfig) =>
      request<{ audit_logs: AuditLogEntry[]; count: number }>(
        `/organizations/${orgId}/audit-logs${params ? '?' + new URLSearchParams(params).toString() : ''}`,
        {},
        true,
        requestConfig
      ),

    // Get departments
    getDepartments: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ departments: Department[]; count: number }>(`/organizations/${orgId}/departments`, {}, true, requestConfig),

    // Create department
    createDepartment: (orgId: string, name: string, description?: string, requestConfig?: RequestConfig) =>
      request<{ department: Department }>(`/organizations/${orgId}/departments`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }, true, requestConfig),

    // Update department
    updateDepartment: (orgId: string, deptId: string, data: { name?: string; description?: string }, requestConfig?: RequestConfig) =>
      request<{ department: Department }>(`/organizations/${orgId}/departments/${deptId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true, requestConfig),

    // Delete department
    deleteDepartment: (orgId: string, deptId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/departments/${deptId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Get department members
    getDepartmentMembers: (orgId: string, deptId: string, requestConfig?: RequestConfig) =>
      request<{ members: DepartmentMember[]; count: number }>(`/organizations/${orgId}/departments/${deptId}/members`, {}, true, requestConfig),

    // Add member to department
    addDepartmentMember: (orgId: string, deptId: string, email: string, requestConfig?: RequestConfig) =>
      request<{ member: DepartmentMember }>(`/organizations/${orgId}/departments/${deptId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, true, requestConfig),

    // Remove member from department
    removeDepartmentMember: (orgId: string, deptId: string, userId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/departments/${deptId}/members/${userId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Get principals
    getPrincipals: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ principals: Principal[]; count: number }>(`/organizations/${orgId}/principals`, {}, true, requestConfig),

    // Create principal
    createPrincipal: (orgId: string, name: string, description?: string, requestConfig?: RequestConfig) =>
      request<{ principal: Principal }>(`/organizations/${orgId}/principals`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }, true, requestConfig),

    // Update principal
    updatePrincipal: (orgId: string, principalId: string, data: { name?: string; description?: string }, requestConfig?: RequestConfig) =>
      request<{ principal: Principal }>(`/organizations/${orgId}/principals/${principalId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true, requestConfig),

    // Delete principal
    deletePrincipal: (orgId: string, principalId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/principals/${principalId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Get principal members
    getPrincipalMembers: (orgId: string, principalId: string, requestConfig?: RequestConfig) =>
      request<{ members: PrincipalMember[]; count: number }>(`/organizations/${orgId}/principals/${principalId}/members`, {}, true, requestConfig),

    // Add member to principal
    addPrincipalMember: (orgId: string, principalId: string, email: string, requestConfig?: RequestConfig) =>
      request<{ member: PrincipalMember }>(`/organizations/${orgId}/principals/${principalId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, true, requestConfig),

    // Remove member from principal
    removePrincipalMember: (orgId: string, principalId: string, userId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/principals/${principalId}/members/${userId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Link principal to department
    linkPrincipalToDepartment: (orgId: string, principalId: string, departmentId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/principals/${principalId}/departments/${departmentId}`, {
        method: 'POST',
      }, true, requestConfig),

    // Unlink principal from department
    unlinkPrincipalFromDepartment: (orgId: string, principalId: string, departmentId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/principals/${principalId}/departments/${departmentId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Get departments linked to a principal
    getPrincipalDepartments: (orgId: string, principalId: string, requestConfig?: RequestConfig) =>
      request<{ departments: Department[]; count: number }>(`/organizations/${orgId}/principals/${principalId}/departments`, {}, true, requestConfig),

    // Get principals linked to a department
    getDepartmentPrincipals: (orgId: string, deptId: string, requestConfig?: RequestConfig) =>
      request<{ principals: Principal[]; count: number }>(`/organizations/${orgId}/departments/${deptId}/principals`, {}, true, requestConfig),

    // Create invite token
    createInvite: (orgId: string, email: string, role: string, requestConfig?: RequestConfig) =>
      request<{ invite: OrgInvite }>(`/organizations/${orgId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }, true, requestConfig),

    // List pending invites for an organization
    getInvites: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ invites: OrgInvite[] }>(`/organizations/${orgId}/invites`, {}, true, requestConfig),

    // Cancel (delete) an invite
    cancelInvite: (orgId: string, inviteId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/invites/${inviteId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // List OIDC clients
    getClients: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ clients: OIDCClient[]; count: number }>(`/organizations/${orgId}/clients`, {}, true, requestConfig),

    // Create OIDC client
    createClient: (orgId: string, name: string, redirect_uris: string[], requestConfig?: RequestConfig) =>
      request<{ client: OIDCClientWithSecret }>(`/organizations/${orgId}/clients`, {
        method: 'POST',
        body: JSON.stringify({ name, redirect_uris }),
      }, true, requestConfig),

    // Delete OIDC client
    deleteClient: (orgId: string, clientId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/clients/${clientId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Send MFA reminder to a member
    sendMfaReminder: (orgId: string, userId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/organizations/${orgId}/members/${userId}/send-mfa-reminder`, {
        method: 'POST',
      }, true, requestConfig),

    // Transfer organization ownership to another member
    transferOwnership: (orgId: string, newOwnerUserId: string, requestConfig?: RequestConfig) =>
      request<{ previous_owner: OrganizationMember; new_owner: OrganizationMember }>(
        `/organizations/${orgId}/transfer-ownership`,
        { method: 'POST', body: JSON.stringify({ new_owner_user_id: newOwnerUserId }) },
        true,
        requestConfig,
      ),

    // List Certificate Authorities for an org
    getCAs: (orgId: string, requestConfig?: RequestConfig) =>
      request<{ cas: OrgCA[]; count: number }>(`/organizations/${orgId}/cas`, {}, true, requestConfig),

    // Create a new Certificate Authority for an org
    createCA: (orgId: string, data: { name: string; description?: string; ca_type?: 'user' | 'host'; key_type?: 'ed25519' | 'rsa' | 'ecdsa'; default_cert_validity_hours?: number; max_cert_validity_hours?: number }, requestConfig?: RequestConfig) =>
      request<{ ca: OrgCA }>(`/organizations/${orgId}/cas`, {
        method: 'POST',
        body: JSON.stringify(data),
      }, true, requestConfig),

    // Update CA configuration
    updateCA: (orgId: string, caId: string, data: { default_cert_validity_hours?: number; max_cert_validity_hours?: number }, requestConfig?: RequestConfig) =>
      request<{ ca: OrgCA }>(`/organizations/${orgId}/cas/${caId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true, requestConfig),

    // Rotate (replace) a CA's key pair — returns updated CA + old_fingerprint
    rotateCA: (orgId: string, caId: string, data?: { key_type?: 'ed25519' | 'rsa' | 'ecdsa'; reason?: string }, requestConfig?: RequestConfig) =>
      request<{ ca: OrgCA; old_fingerprint: string }>(`/organizations/${orgId}/cas/${caId}/rotate`, {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }, true, requestConfig),

    // Soft-delete a CA
    deleteCA: (orgId: string, caId: string, requestConfig?: RequestConfig) =>
      request<{ ca_id: string }>(`/organizations/${orgId}/cas/${caId}`, {
        method: 'DELETE',
      }, true, requestConfig),
  },

  invites: {
    // Get invite details by token (unauthenticated)
    getInfo: (token: string) =>
      request<{ email: string; organization: { id: string; name: string }; role: string; user_exists?: boolean }>(
        `/invites/${token}`,
        {},
        false,
      ),

    // Accept invite — sends Bearer token if present (OAuth users skip password)
    accept: (token: string, full_name?: string, password?: string) =>
      request<LoginResponse>(
        `/invites/${token}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({ full_name, password, password_confirm: password }),
        },
        true,
      ),
  },

  ssh: {
    // List all SSH keys for the current user
    listKeys: (requestConfig?: RequestConfig) =>
      request<SSHKeysResponse>('/ssh/keys', {}, true, requestConfig),

    // Add a new SSH public key
    addKey: (public_key: string, description?: string, requestConfig?: RequestConfig) =>
      request<SSHKey>('/ssh/keys', {
        method: 'POST',
        body: JSON.stringify({ public_key, description }),
      }, true, requestConfig),

    // Delete an SSH key
    deleteKey: (keyId: string, requestConfig?: RequestConfig) =>
      request<{ status: string }>(`/ssh/keys/${keyId}`, {
        method: 'DELETE',
      }, true, requestConfig),

    // Update SSH key description
    updateKeyDescription: (keyId: string, description: string, requestConfig?: RequestConfig) =>
      request<SSHKey>(`/ssh/keys/${keyId}/update-description`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      }, true, requestConfig),

    // Get a verification challenge for a key
    getChallenge: (keyId: string, requestConfig?: RequestConfig) =>
      request<SSHChallengeResponse>(`/ssh/keys/${keyId}/verify`, {}, true, requestConfig),

    // Submit signature to verify key ownership
    verifyKey: (keyId: string, signature: string, requestConfig?: RequestConfig) =>
      request<SSHVerifyResponse>(`/ssh/keys/${keyId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ signature, action: 'verify_signature' }),
      }, true, requestConfig),

    // Sign a certificate for the given key
    signCertificate: (key_id: string, principals?: string[], cert_type?: 'user' | 'host', expiry_hours?: number, requestConfig?: RequestConfig) =>
      request<SSHSignResponse>('/ssh/sign', {
        method: 'POST',
        body: JSON.stringify({ key_id, principals, cert_type, expiry_hours }),
      }, true, requestConfig),

    // Issue a host certificate by submitting a raw server host public key
    // (admin-only; does not require a pre-registered SSHKey record)
    signHostCert: (
      hostPublicKey: string,
      principals: string[],
      validityHours: number,
      caId: string,
      requestConfig?: RequestConfig,
    ) =>
      request<SSHSignResponse>('/ssh/sign/host', {
        method: 'POST',
        body: JSON.stringify({
          host_public_key: hostPublicKey,
          principals,
          validity_hours: validityHours,
          ca_id: caId,
        }),
      }, true, requestConfig),

    // Get the merged department certificate policy for the current user (used in sign dialog)
    getMyDeptCertPolicy: (requestConfig?: RequestConfig) =>
      request<{ policy: DeptCertPolicy }>('/ssh/dept-cert-policy', {}, true, requestConfig),

    // List issued certificates for the current user
    listCertificates: (requestConfig?: RequestConfig) =>
      request<{ certificates: SSHCertificate[]; count: number }>('/ssh/certificates', {}, true, requestConfig),

    // Get a single certificate (includes full cert text)
    getCertificate: (certId: string, requestConfig?: RequestConfig) =>
      request<SSHCertificate>(`/ssh/certificates/${certId}`, {}, true, requestConfig),

    // Revoke a certificate
    revokeCertificate: (certId: string, reason?: string, requestConfig?: RequestConfig) =>
      request<{ status: string; cert_id: string; reason: string }>(`/ssh/certificates/${certId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }, true, requestConfig),

    // Get the CA public key for the current user's org
    getCaPublicKey: (requestConfig?: RequestConfig) =>
      request<{ public_key: string; fingerprint: string; ca_name: string; source: string }>('/ssh/ca/public-key', {}, true, requestConfig),

    // Add SSH key on behalf of another user (admin)
    adminAddKey: (userId: string, public_key: string, description?: string, requestConfig?: RequestConfig) =>
      request<SSHKey>(`/ssh/keys/admin/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ public_key, description }),
      }, true, requestConfig),

    // List CA permissions for a CA
    listCaPermissions: (caId: string, requestConfig?: RequestConfig) =>
      request<{ ca_id: string; permissions: CAPermission[]; open_to_all: boolean }>(`/ssh/ca/${caId}/permissions`, {}, true, requestConfig),

    // Grant a user permission on a CA
    addCaPermission: (caId: string, user_id: string, permission: 'sign' | 'admin', requestConfig?: RequestConfig) =>
      request<{ message: string; permission: CAPermission }>(`/ssh/ca/${caId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ user_id, permission }),
      }, true, requestConfig),

    // Revoke a user's CA permission
    removeCaPermission: (caId: string, userId: string, requestConfig?: RequestConfig) =>
      request<{ message: string }>(`/ssh/ca/${caId}/permissions/${userId}`, {
        method: 'DELETE',
      }, true, requestConfig),
  },
};

// Organization types
export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user_id: string | null;
  organization_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  description: string | null;
  success: boolean;
  error_message: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const STANDARD_SSH_EXTENSIONS = [
  'permit-X11-forwarding',
  'permit-agent-forwarding',
  'permit-pty',
  'permit-port-forwarding',
  'permit-user-rc',
] as const;

export interface DeptCertPolicy {
  department_id: string;
  allow_user_expiry: boolean;
  default_expiry_hours: number;
  max_expiry_hours: number;
  allowed_extensions: string[];
  custom_extensions: string[];
  all_extensions?: string[];
  standard_extensions?: string[];
}

export interface PendingInvite {
  token: string;
  organization: { id: string; name: string };
  role: string;
  expires_at: string;
}

export interface MyOrgMembership {
  org_id: string;
  org_name: string;
  role: string;
  departments: { id: string; name: string; description: string | null }[];
  principals: { id: string; name: string; description: string | null; via_department: boolean }[];
}

export interface DepartmentMember {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Principal {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PrincipalMember {
  id: string;
  user_id: string;
  principal_id: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  invite_link?: string;  // only present on create response (dev/when email disabled)
}

export interface OIDCClient {
  id: string;
  name: string;
  client_id: string;
  redirect_uris: string[];
  scopes: string[];
  grant_types: string[];
  is_active: boolean;
  created_at: string;
}

export interface OIDCClientWithSecret extends OIDCClient {
  client_secret: string;
}

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

// SSH Key types
export interface SSHKey {
  id: string;
  user_id: string;
  public_key: string;
  description: string | null;
  key_type: string | null;
  fingerprint: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SSHKeysResponse {
  keys: SSHKey[];
  count: number;
}

export interface SSHChallengeResponse {
  challenge_text: string;
  validationText: string;
  key_id: string;
}

export interface SSHVerifyResponse {
  verified: boolean;
}

export interface SSHCertificate {
  id: string;
  user_id: string;
  ssh_key_id: string | null;
  certificate: string;
  serial: number | null;
  key_id: string | null;
  cert_type: string;
  principals: string[];
  valid_after: string;
  valid_before: string;
  revoked: boolean;
  status: string;
  created_at: string;
}

export interface SSHSignResponse {
  certificate: string;
  serial: number;
  principals: string[];
  valid_after: string;
  valid_before: string;
  cert_id?: string;
}

export interface CAPermission {
  id: string;
  ca_id: string;
  user_id: string;
  user_email: string | null;
  permission: 'sign' | 'admin';
  created_at: string;
}

export interface OrgCA {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  ca_type: 'user' | 'host';
  key_type: string;
  public_key: string;
  fingerprint: string;
  is_active: boolean;
  /** True when this entry represents the server-wide config-file CA.
   *  System CAs are read-only — they cannot be edited, deleted, or replaced
   *  from the UI. */
  is_system?: boolean;
  default_cert_validity_hours: number;
  max_cert_validity_hours: number;
  total_certs: number;
  active_certs: number;
  revoked_certs: number;
  /** Next serial number that will be assigned when a certificate is issued. */
  next_serial_number: number | null;
  created_at: string | null;
  updated_at: string | null;
  /** Set when the key was last rotated. */
  rotated_at: string | null;
  /** Reason provided when the key was last rotated. */
  rotation_reason: string | null;
}

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