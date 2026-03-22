import {
  MoreHorizontal,
  RefreshCw,
  Server,
  ServerCog,
  Settings,
  ShieldOff,
  Terminal,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { OrgCA } from "@/lib/api";
import { formatDate } from "./utils";
import { CopyButton } from "./CopyButton";

interface CADetailCardProps {
  ca: OrgCA;
  onEdit: (ca: OrgCA) => void;
  onRotate: (ca: OrgCA) => void;
  onDelete: (ca: OrgCA) => void;
}

export function CADetailCard({ ca, onEdit, onRotate, onDelete }: CADetailCardProps) {
  const isUser = ca.ca_type === "user";
  const isSystem = !!ca.is_system;

  // ── User CA: server trusts this public key so it accepts user certs ──────
  const userCaServerSnippet = `# On each SSH server — trust Secuird-issued user certificates:
echo '${ca.public_key.trim()}' >> /etc/ssh/trusted_user_ca

# /etc/ssh/sshd_config  (add once, then reload sshd):
TrustedUserCAKeys /etc/ssh/trusted_user_ca
AuthorizedPrincipalsFile /etc/ssh/auth_principals/%u
# Create /etc/ssh/auth_principals/<unix-user> containing one principal per line.`;

  // ── Host CA: clients trust this public key so they can verify server certs ─
  const hostCaClientSnippet = `# On SSH clients — trust host certificates signed by this CA:
# Add to ~/.ssh/known_hosts  (or /etc/ssh/ssh_known_hosts for system-wide):
@cert-authority * ${ca.public_key.trim()}

# ─── Server side (separate step) ────────────────────────────────────────────
# 1. Collect the server's HOST public key:
#    cat /etc/ssh/ssh_host_ed25519_key.pub
# 2. Submit it to Secuird → "Issue Host Certificate" to get a signed cert.
# 3. Install the cert on the server:
#    /etc/ssh/sshd_config:
#    HostKey         /etc/ssh/ssh_host_ed25519_key
#    HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub
# 4. Verify the cert (NOT this CA key):
#    ssh-keygen -L -f /etc/ssh/ssh_host_ed25519_key-cert.pub
#    ↳ Type must be: ssh-ed25519-cert-v01@openssh.com host certificate`;

  const sshConfig = isUser ? userCaServerSnippet : hostCaClientSnippet;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {isSystem ? (
                <ServerCog className="w-4 h-4 flex-shrink-0" />
              ) : isUser ? (
                <User className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Server className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{ca.name}</span>
              {isSystem ? (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <ServerCog className="w-3 h-3" />
                  System
                </Badge>
              ) : ca.is_active ? (
                <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Active</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </CardTitle>
            {ca.description && (
              <CardDescription className="mt-1">{ca.description}</CardDescription>
            )}
          </div>

          {/* Right side: key-type badge + actions menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="outline" className="text-xs font-mono">{ca.key_type}</Badge>

            {/* ⋯ actions — only for non-system CAs */}
            {!isSystem && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="sr-only">CA actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEdit(ca)}>
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    Edit configuration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRotate(ca)}>
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                    Rotate key
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(ca)}
                    className="text-destructive focus:text-destructive"
                  >
                    <ShieldOff className="w-3.5 h-3.5 mr-2" />
                    Delete CA
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row — hidden for system CAs */}
        {!isSystem && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">{ca.active_certs}</p>
              <p className="text-xs text-muted-foreground">Active certs</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">{ca.total_certs}</p>
              <p className="text-xs text-muted-foreground">Total issued</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">{ca.default_cert_validity_hours}h</p>
              <p className="text-xs text-muted-foreground">Default validity</p>
            </div>
          
          </div>
        )}

        {/* Fingerprint — with copy button */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Fingerprint</p>
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all flex-1">
              {ca.fingerprint}
            </code>
            <CopyButton text={ca.fingerprint} />
          </div>
        </div>

        {/* Public key */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-medium">
                {isUser ? "User CA public key" : "Host CA public key"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isUser
                  ? "Distribute to SSH servers → TrustedUserCAKeys"
                  : "Distribute to SSH clients → known_hosts @cert-authority (NOT HostCertificate)"}
              </p>
            </div>
            <CopyButton text={ca.public_key} />
          </div>
          <Textarea readOnly value={ca.public_key} className="font-mono text-xs min-h-[60px]" />
        </div>

        {/* Setup instructions — collapsible */}
        <Accordion type="single" collapsible className="border rounded-lg px-1">
          <AccordionItem value="setup" className="border-none">
            <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                {isUser
                  ? "Server setup — trust Secuird user certificates"
                  : "Client setup — trust Secuird host certificates"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {!isUser && (
                <div className="mb-2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Two separate steps:</strong> (1) Put this CA public key in client{" "}
                  <code className="font-mono">known_hosts</code>. (2) Issue a host certificate
                  for each server via Secuird and install it as{" "}
                  <code className="font-mono">HostCertificate</code>.
                </div>
              )}
              <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted rounded p-3">
                {sshConfig}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ca.created_at && <span>Created {formatDate(ca.created_at)}</span>}
          {ca.rotated_at && (
            <span>
              Key rotated {formatDate(ca.rotated_at)}
              {ca.rotation_reason && <> — {ca.rotation_reason}</>}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
