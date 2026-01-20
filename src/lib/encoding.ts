/**
 * Encoding utilities for OAuth and cryptographic operations.
 */

/**
 * Encodes a Uint8Array to a base64url-encoded string without padding.
 * This encoding is URL-safe and commonly used in OAuth and JWT operations.
 * 
 * @param data - The byte array to encode
 * @returns A base64url-encoded string
 */
export function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  
  // Replace URL-unsafe characters to make it base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Remove padding
}

/**
 * Decodes a base64url-encoded string to a Uint8Array.
 * 
 * @param base64Url - The base64url-encoded string
 * @returns The decoded byte array
 */
export function base64UrlDecode(base64Url: string): Uint8Array {
  // Add padding if necessary
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
