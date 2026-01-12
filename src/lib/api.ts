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

// Central request function - all API calls go through here
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
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
    // Clear token on 401 errors
    if (json.code === 401) {
      tokenManager.clearToken();
    }
    
    throw new ApiError(
      json.message || 'An error occurred',
      json.code,
      json.error?.type || 'UNKNOWN_ERROR',
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
    me: () => request<ProfileResponse>('/users/me'),

    updateMe: (data: { full_name?: string; avatar_url?: string }) =>
      request<ProfileResponse>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    organizations: () => request<OrganizationsResponse>('/users/me/organizations'),

    changePassword: (currentPassword: string, newPassword: string, newPasswordConfirm: string) =>
      request<{ message: string }>('/users/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
      }),
  },
};

export { ApiError };
