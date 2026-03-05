import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileKey,
  HelpCircle,
  Loader2,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError, OrgCA } from "@/lib/api";
import { classifySshKeyMaterial } from "./utils";
import { CopyButton } from "./CopyButton";

interface IssueHostCertPanelProps {
  ca: OrgCA;
}

// Preset validity options: [label, hours]
const VALIDITY_PRESETS: [string, number][] = [
  ["1d", 24],
  ["7d", 168],
  ["30d", 720],
  ["1y", 8760],
];

export function IssueHostCertPanel({ ca }: IssueHostCertPanelProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [hostPubKey, setHostPubKey] = useState("");
  const [principals, setPrincipals] = useState("");
  const [validityHours, setValidityHours] = useState("720");
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [hostCert, setHostCert] = useState<string | null>(null);
  const [keyWarning, setKeyWarning] = useState<string | null>(null);

  const handlePubKeyChange = (value: string) => {
    setHostPubKey(value);
    setIssueError(null);
    setKeyWarning(null);
    if (!value.trim()) return;
    const kind = classifySshKeyMaterial(value.trim());
    if (kind === "certificate") {
      setKeyWarning(
        "⚠ This looks like a certificate (ssh-…-cert-v01@openssh.com), not a public key. " +
          "Paste the server's host PUBLIC key (from /etc/ssh/ssh_host_ed25519_key.pub), not an existing certificate.",
      );
    } else if (kind === "private_key") {
      setKeyWarning("⚠ This looks like a PRIVATE key. Never paste private keys here. Use the .pub file.");
    } else if (kind === "unknown") {
      setKeyWarning("⚠ Unrecognised key format. Expected: ssh-ed25519 AAAA… or ecdsa-sha2-nistp256 AAAA…");
    }
  };

  const handleIssue = async () => {
    setIssueError(null);
    setHostCert(null);
    const kind = classifySshKeyMaterial(hostPubKey.trim());
    if (kind === "certificate") {
      setIssueError(
        "You pasted a certificate, not a host public key. " +
          "Get the server's host public key: cat /etc/ssh/ssh_host_ed25519_key.pub",
      );
      return;
    }
    if (kind === "private_key") {
      setIssueError("Private keys must never be pasted here. Use the .pub file.");
      return;
    }
    const principalList = principals
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (principalList.length === 0) {
      setIssueError("At least one principal (hostname/FQDN) is required.");
      return;
    }
    const hours = parseInt(validityHours, 10);
    if (!hours || hours < 1) {
      setIssueError("Validity must be a positive number of hours.");
      return;
    }
    setIsIssuing(true);
    try {
      const result = await api.ssh.signHostCert(hostPubKey.trim(), principalList, hours, ca.id);
      setHostCert(result.certificate);
      toast({ title: "Host certificate issued", description: `Serial #${result.serial}` });
    } catch (err) {
      setIssueError(
        err instanceof ApiError ? err.message : "Failed to issue host certificate",
      );
    } finally {
      setIsIssuing(false);
    }
  };

  const serverInstallSnippet = hostCert
    ? `# 1. Copy the certificate to the server:
cat > /etc/ssh/ssh_host_ed25519_key-cert.pub << 'CERT'
${hostCert.trim()}
CERT

# 2. /etc/ssh/sshd_config  (ensure these two lines exist):
HostKey         /etc/ssh/ssh_host_ed25519_key
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub

# 3. Reload sshd:
systemctl reload sshd

# 4. Verify the cert (must show type = host certificate):
ssh-keygen -L -f /etc/ssh/ssh_host_ed25519_key-cert.pub`
    : "";

  return (
    <Card className="border-dashed border-blue-300 dark:border-blue-700">
      <CardHeader
        className="py-3 cursor-pointer select-none"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          <FileKey className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Issue Host Certificate
          <span className="ml-auto">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Paste a server's host public key to receive a signed certificate to install as{" "}
          <code>HostCertificate</code> in <code>sshd_config</code>.
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* ── "How it works" — collapsed by default ──────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How host certificates work
              {showHowItWorks ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {showHowItWorks && (
              <div className="mt-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                <p>
                  <strong>Step 1 (done above):</strong> Distribute the Host CA public key to SSH
                  clients via <code className="font-mono">@cert-authority</code> in{" "}
                  <code className="font-mono">known_hosts</code>.
                </p>
                <p>
                  <strong>Step 2 (here):</strong> For each server, collect its host public key,
                  paste it below, and Gatehouse will sign it. Install the resulting certificate
                  as <code className="font-mono">HostCertificate</code> in{" "}
                  <code className="font-mono">sshd_config</code>.
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  ⚠ Do <strong>not</strong> put the CA public key from Step 1 into{" "}
                  <code className="font-mono">HostCertificate</code> — that directive requires a
                  signed certificate, not a CA public key.
                </p>
              </div>
            )}
          </div>

          {issueError && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {issueError}
            </div>
          )}

          {!hostCert ? (
            <>
              {/* Host public key */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Server host public key{" "}
                  <span className="ml-1 font-normal text-muted-foreground">
                    (<code>/etc/ssh/ssh_host_ed25519_key.pub</code>)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Run{" "}
                  <code className="font-mono bg-muted px-1 rounded">
                    cat /etc/ssh/ssh_host_ed25519_key.pub
                  </code>{" "}
                  on the server and paste the result.
                </p>
                <Textarea
                  placeholder="ssh-ed25519 AAAA... root@server"
                  value={hostPubKey}
                  onChange={(e) => handlePubKeyChange(e.target.value)}
                  className="font-mono text-xs min-h-[80px]"
                  disabled={isIssuing}
                />
                {keyWarning && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">{keyWarning}</p>
                )}
              </div>

              {/* Principals */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Principals{" "}
                  <span className="ml-1 font-normal text-muted-foreground">
                    (hostnames/FQDNs, space or comma separated)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Must match what clients type in{" "}
                  <code className="font-mono">ssh user@&lt;principal&gt;</code>.
                </p>
                <Input
                  placeholder="prod.example.com web01.internal"
                  value={principals}
                  onChange={(e) => setPrincipals(e.target.value)}
                  disabled={isIssuing}
                />
              </div>

              {/* Validity */}
              <div className="space-y-1.5">
                <Label className="text-sm">Validity (hours)</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="number"
                    min={1}
                    value={validityHours}
                    onChange={(e) => setValidityHours(e.target.value)}
                    className="w-28"
                    disabled={isIssuing}
                  />
                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-1">
                    {VALIDITY_PRESETS.map(([label, hours]) => (
                      <Button
                        key={label}
                        type="button"
                        size="sm"
                        variant={validityHours === String(hours) ? "default" : "outline"}
                        className="h-8 px-2 text-xs"
                        onClick={() => setValidityHours(String(hours))}
                        disabled={isIssuing}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Host certs are typically longer-lived than user certs.
                </p>
              </div>

              <Button
                onClick={handleIssue}
                disabled={isIssuing || !hostPubKey.trim() || !principals.trim() || !!keyWarning}
                size="sm"
              >
                {isIssuing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <FileKey className="w-4 h-4 mr-2" />
                Issue host certificate
              </Button>
            </>
          ) : (
            /* ── Success view ─────────────────────────────────────── */
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Host certificate issued
              </p>

              {/* Certificate text */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Certificate</Label>
                  <CopyButton text={hostCert} />
                </div>
                <Textarea
                  readOnly
                  value={hostCert}
                  className="font-mono text-xs min-h-[80px]"
                />
              </div>

              {/* Install snippet */}
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    Install on the server
                  </p>
                  <CopyButton text={serverInstallSnippet} />
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {serverInstallSnippet}
                </pre>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHostCert(null);
                  setHostPubKey("");
                  setPrincipals("");
                }}
              >
                Issue another
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
