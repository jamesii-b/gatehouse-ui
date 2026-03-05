// ─── Shared utilities for the Certificate Authorities page ───────────────────

export function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type SshKeyMaterialKind = "certificate" | "public_key" | "private_key" | "unknown";

/**
 * Inspect the first token of a raw SSH key/cert string and classify it.
 * Used to warn the user before they accidentally paste a certificate where
 * a public key is expected, or vice-versa.
 */
export function classifySshKeyMaterial(raw: string): SshKeyMaterialKind {
  const line = raw.trim().split(/\s+/)[0] ?? "";
  if (/-cert-v01@openssh\.com$/.test(line)) return "certificate";
  if (
    /^(ssh-ed25519|ssh-rsa|ssh-dss|ecdsa-sha2-nistp\d+|sk-ssh-ed25519@openssh\.com)$/.test(line)
  )
    return "public_key";
  if (
    raw.trim().startsWith("-----BEGIN OPENSSH PRIVATE KEY-----") ||
    raw.trim().startsWith("-----BEGIN RSA PRIVATE KEY-----")
  )
    return "private_key";
  return "unknown";
}
