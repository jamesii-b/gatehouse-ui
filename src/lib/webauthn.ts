// WebAuthn utility functions for passkey authentication

// Convert Base64URL to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const base64Url = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const binary = atob(base64Url + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to Base64URL
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return !!(
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function' &&
    window.PublicKeyCredential
  );
}

// Check if platform authenticator is available (Touch ID, Face ID, Windows Hello)
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Types for WebAuthn API responses
export interface WebAuthnRegistrationOptions {
  rp: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  challenge: string;
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout: number;
  excludeCredentials: Array<{
    id: string;
    type: 'public-key';
    transports?: string[];
  }>;
  authenticatorSelection: {
    residentKey: string;
    userVerification: string;
    authenticatorAttachment?: string;
  };
  attestation: string;
}

export interface WebAuthnLoginOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: 'public-key';
    transports?: string[];
  }>;
  userVerification: string;
}

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

// Create registration credential from server options
export async function createRegistrationCredential(
  options: WebAuthnRegistrationOptions
): Promise<PublicKeyCredential> {
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: base64ToBuffer(options.challenge),
    user: {
      id: base64ToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    excludeCredentials: options.excludeCredentials.map((cred) => ({
      ...cred,
      id: base64ToBuffer(cred.id),
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    })),
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: {
      ...options.authenticatorSelection,
      residentKey: options.authenticatorSelection.residentKey as ResidentKeyRequirement,
      userVerification: options.authenticatorSelection.userVerification as UserVerificationRequirement,
      authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment | undefined,
    },
    attestation: options.attestation as AttestationConveyancePreference,
  };

  const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to create credential');
  }
  return credential;
}

// Format registration credential for server
export function formatRegistrationCredential(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufferToBase64(response.attestationObject),
      clientDataJSON: bufferToBase64(response.clientDataJSON),
    },
    transports: response.getTransports?.() || [],
  };
}

// Create login assertion from server options
export async function createLoginAssertion(
  options: WebAuthnLoginOptions
): Promise<PublicKeyCredential> {
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64ToBuffer(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials.map((cred) => ({
      ...cred,
      id: base64ToBuffer(cred.id),
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    })),
    userVerification: options.userVerification as UserVerificationRequirement,
  };

  const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
  if (!assertion || !(assertion instanceof PublicKeyCredential)) {
    throw new Error('Failed to get assertion');
  }
  return assertion;
}

// Format login assertion for server
export function formatLoginAssertion(assertion: PublicKeyCredential): Record<string, unknown> {
  const response = assertion.response as AuthenticatorAssertionResponse;
  return {
    id: assertion.id,
    rawId: bufferToBase64(assertion.rawId),
    type: assertion.type,
    response: {
      authenticatorData: bufferToBase64(response.authenticatorData),
      clientDataJSON: bufferToBase64(response.clientDataJSON),
      signature: bufferToBase64(response.signature),
      userHandle: response.userHandle ? bufferToBase64(response.userHandle) : null,
    },
  };
}
