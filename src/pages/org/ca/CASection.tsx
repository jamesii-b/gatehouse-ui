import { AlertCircle, Plus, Server, ServerCog, ShieldAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrgCA } from "@/lib/api";
import { CADetailCard } from "./CADetailCard";
import { IssueHostCertPanel } from "./IssueHostCertPanel";

interface CASectionProps {
  caType: "user" | "host";
  ca: OrgCA | null;
  onCreateClick: (caType: "user" | "host") => void;
  onEdit: (ca: OrgCA) => void;
  onRotate: (ca: OrgCA) => void;
  onDelete: (ca: OrgCA) => void;
}

const SECTION_META = {
  user: {
    title: "User CA",
    subtitle:
      "Signs SSH user certificates. Servers trust users who present a valid cert by adding this CA's public key to TrustedUserCAKeys.",
    emptyDescription:
      "No User CA configured. Generate a key pair to start issuing SSH user certificates.",
  },
  host: {
    title: "Host CA",
    subtitle:
      "Signs SSH host certificates. Clients trust servers whose cert is signed by this CA. The CA public key goes in the client's known_hosts — not HostCertificate (that is issued per-server separately).",
    emptyDescription:
      "No Host CA configured. Generate a key pair to start issuing SSH host certificates.",
  },
} as const;

// ── Tiny numbered step label used in the Host CA flow ────────────────────────
function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
        {n}
      </span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export function CASection({
  caType,
  ca,
  onCreateClick,
  onEdit,
  onRotate,
  onDelete,
}: CASectionProps) {
  const isUser = caType === "user";
  const { title, subtitle, emptyDescription } = SECTION_META[caType];
  const Icon = isUser ? User : Server;
  const isSystem = !!ca?.is_system;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            {/* Only show the verbose subtitle when there's no CA yet */}
            {!ca && (
              <p className="text-xs text-muted-foreground max-w-prose">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ca ? (
            isSystem ? (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <ServerCog className="w-3 h-3" />
                System (read-only)
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Configured</Badge>
            )
          ) : (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Not configured
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      {ca ? (
        <div className="space-y-6">
          {isUser ? (
            /* ── User CA: single card, no numbered steps needed ─────────── */
            <CADetailCard ca={ca} onEdit={onEdit} onRotate={onRotate} onDelete={onDelete} />
          ) : (
            /* ── Host CA: two explicit numbered steps ────────────────────── */
            <>
              {/* Step 1 — CA key → clients' known_hosts */}
              <div className="space-y-2">
                <StepLabel n={1} label="Distribute CA key to clients" />
                <CADetailCard ca={ca} onEdit={onEdit} onRotate={onRotate} onDelete={onDelete} />
              </div>

              {/* Step 2 — sign each server's host public key */}
              {!isSystem && (
                <div className="space-y-2">
                  <StepLabel n={2} label="Sign each server's host key" />
                  <IssueHostCertPanel ca={ca} />
                </div>
              )}
            </>
          )}

          {/* System CA upgrade prompt */}
          {isSystem && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Using server-configured CA</p>
                <p>
                  Certificates are being signed by a CA key loaded from the server
                  configuration, not managed through this UI. Generate a managed key below to
                  take full control of certificate issuance from Gatehouse.
                </p>
              </div>
              <Button
                onClick={() => onCreateClick(caType)}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                <Plus className="w-3 h-3 mr-1" />
                Generate managed key
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No {title} configured</p>
            <p className="text-xs text-center mb-4 max-w-sm">{emptyDescription}</p>
            <Button onClick={() => onCreateClick(caType)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Generate {title}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
