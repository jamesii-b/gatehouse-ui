/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth authentication.
 * Provides secure code_verifier/code_challenge generation and state management.
 */

import { base64UrlEncode } from './encoding';

/**
 * OAuth flow types supported by the application.
 */
export type OAuthFlowType = 'login' | 'register' | 'link';

/**
 * OAuth provider types.
 */
export type OAuthProvider = 'google' | 'github' | 'microsoft';

/**
 * Interface representing stored OAuth state in sessionStorage.
 */
export interface OAuthState {
  /** The state parameter for CSRF protection */
  state: string;
  /** The code_verifier for PKCE exchange */
  codeVerifier: string;
  /** The type of OAuth flow */
  flowType: OAuthFlowType;
  /** The OAuth provider */
  provider: OAuthProvider;
  /** The redirect URI for the callback */
  redirectUri: string;
  /** Timestamp when the state expires */
  expiresAt: number;
}

/**
 * Storage key prefix for OAuth state in sessionStorage.
 */
const OAUTH_STATE_PREFIX = 'oauth_state_';

/**
 * Default expiry time for OAuth state in milliseconds (10 minutes).
 */
const DEFAULT_OAUTH_STATE_EXPIRY = 10 * 60 * 1000;

/**
 * Generates a cryptographically secure code_verifier.
 * Per RFC 7636, the code_verifier should be 43-128 characters
 * consisting of [A-Z], [a-z], [0-9], "-", ".", "_", "~".
 * 
 * @returns A random URL-safe code_verifier string
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits) for the verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Encode as base64url without padding
  return base64UrlEncode(array);
}

/**
 * Generates a cryptographically secure state parameter for CSRF protection.
 * 
 * @returns A random URL-safe state string
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Computes the S256 code_challenge from a code_verifier.
 * Uses SHA-256 hash followed by base64url encoding without padding.
 * 
 * @param verifier - The code_verifier to compute the challenge from
 * @returns The S256 code_challenge as a base64url-encoded string
 */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Stores OAuth state in sessionStorage with an expiry time.
 *
 * @param stateData - Object containing OAuth state parameters
 */
export function storeOAuthState(stateData: {
  state: string;
  codeVerifier: string;
  flow: OAuthFlowType;
  provider: OAuthProvider;
  redirectUri: string;
}): void {
  const expiresAt = Date.now() + DEFAULT_OAUTH_STATE_EXPIRY;
  
  const oauthState: OAuthState = {
    state: stateData.state,
    codeVerifier: stateData.codeVerifier,
    flowType: stateData.flow,
    provider: stateData.provider,
    redirectUri: stateData.redirectUri,
    expiresAt,
  };
  
  const storageKey = `${OAUTH_STATE_PREFIX}${stateData.state}`;
  sessionStorage.setItem(storageKey, JSON.stringify(oauthState));
}

/**
 * Retrieves OAuth state from sessionStorage if it exists and hasn't expired.
 * 
 * @param state - The state parameter to look up
 * @returns The OAuthState if found and valid, null otherwise
 */
export function getOAuthState(state: string): OAuthState | null {
  const storageKey = `${OAUTH_STATE_PREFIX}${state}`;
  const stored = sessionStorage.getItem(storageKey);
  
  if (!stored) {
    return null;
  }
  
  try {
    const oauthState: OAuthState = JSON.parse(stored);
    
    // Check if the state has expired
    if (Date.now() > oauthState.expiresAt) {
      // Clean up expired state
      clearOAuthState(state);
      return null;
    }
    
    return oauthState;
  } catch {
    // Invalid JSON, clean up and return null
    clearOAuthState(state);
    return null;
  }
}

/**
 * Clears OAuth state from sessionStorage.
 * 
 * @param state - The state parameter to clear
 */
export function clearOAuthState(state: string): void {
  const storageKey = `${OAUTH_STATE_PREFIX}${state}`;
  sessionStorage.removeItem(storageKey);
}

/**
 * Clears all expired OAuth states from sessionStorage.
 * Useful for cleanup operations.
 */
export function cleanupExpiredOAuthStates(): void {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    
    if (key && key.startsWith(OAUTH_STATE_PREFIX)) {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          const oauthState: OAuthState = JSON.parse(stored);
          
          if (Date.now() > oauthState.expiresAt) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Invalid entry, remove it
        sessionStorage.removeItem(key);
      }
    }
  }
}

/**
 * Validates that a code_verifier meets PKCE requirements.
 * Per RFC 7636, the code_verifier must be 43-128 characters
 * and match the character set [A-Z], [a-z], [0-9], "-", ".", "_", "~".
 * 
 * @param verifier - The code_verifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // RFC 7636 defines the character set for code_verifier
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  
  // Check length requirements (43-128 characters)
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  
  // Check character set
  return validPattern.test(verifier);
}
