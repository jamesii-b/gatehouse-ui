/**
 * PKCE utilities and OAuth state management for external authentication flow.
 * Supports Google OAuth with PKCE (Proof Key for Code Exchange).
 */

/**
 * OAuth flow types for state management.
 */
export type OAuthFlow = 'login' | 'register' | 'link';

/**
 * Parameters for storing OAuth state.
 */
export interface OAuthStateParams {
  state: string;
  codeVerifier?: string;
  flow: OAuthFlow;
  provider: string;
  redirectUri?: string;
}

/**
 * Retrieved OAuth state with metadata.
 */
export interface OAuthStateData {
  state: string;
  codeVerifier?: string;
  flow: OAuthFlow;
  provider: string;
  redirectUri?: string;
  timestamp: number;
}

/**
 * State expiration time in milliseconds (10 minutes).
 */
const STATE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Generate a cryptographically secure code verifier for PKCE.
 * The code verifier is a high-entropy cryptographic random string.
 * 
 * @returns A URL-safe base64-encoded string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 32 bytes of random data
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  return base64UrlEncode(randomBytes);
}

/**
 * Compute the S256 code challenge from a code verifier.
 * Uses SHA-256 hash followed by URL-safe base64 encoding.
 * 
 * @param verifier - The PKCE code verifier
 * @returns The S256 code challenge
 */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  // Convert base64url string back to bytes
  const verifierBytes = base64UrlDecode(verifier);
  
  // Compute SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', verifierBytes);
  const hashBytes = new Uint8Array(hashBuffer);
  
  // Encode as base64url without padding
  return base64UrlEncode(hashBytes);
}

/**
 * Generate a secure state parameter for CSRF protection.
 * 
 * @returns A URL-safe base64-encoded string (16 bytes)
 */
export function generateState(): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  
  return base64UrlEncode(randomBytes);
}

/**
 * Store OAuth state in sessionStorage for validation on callback.
 * 
 * @param params - OAuth state parameters including state, code verifier, flow, and provider
 */
export function storeOAuthState(params: OAuthStateParams): void {
  const storageKey = `oauth_state_${params.state}`;
  
  const stateData: OAuthStateData = {
    ...params,
    timestamp: Date.now(),
  };
  
  sessionStorage.setItem(storageKey, JSON.stringify(stateData));
}

/**
 * Retrieve and validate OAuth state from sessionStorage.
 * Returns null if state is not found or has expired.
 * 
 * @param state - The state parameter from the OAuth callback
 * @returns The stored OAuth state data or null if invalid/expired
 */
export function getOAuthState(state: string): OAuthStateData | null {
  const storageKey = `oauth_state_${state}`;
  const storedData = sessionStorage.getItem(storageKey);
  
  if (!storedData) {
    return null;
  }
  
  try {
    const stateData: OAuthStateData = JSON.parse(storedData);
    
    // Check expiration
    const now = Date.now();
    const age = now - stateData.timestamp;
    
    if (age > STATE_EXPIRATION_MS) {
      // State has expired, clean up
      clearOAuthState(state);
      return null;
    }
    
    return stateData;
  } catch {
    // Invalid JSON, clean up
    clearOAuthState(state);
    return null;
  }
}

/**
 * Clear OAuth state from sessionStorage.
 * 
 * @param state - The state parameter to clear
 */
export function clearOAuthState(state: string): void {
  const storageKey = `oauth_state_${state}`;
  sessionStorage.removeItem(storageKey);
}

/**
 * Encode bytes to URL-safe base64 without padding.
 * 
 * @param bytes - The bytes to encode
 * @returns URL-safe base64 encoded string
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode URL-safe base64 string to bytes.
 * 
 * @param str - The URL-safe base64 string
 * @returns The decoded bytes
 */
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if necessary
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
