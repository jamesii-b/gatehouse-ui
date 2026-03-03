/**
 * OrgSetupPage — shown after registration or first login when the user has no org.
 *
 * Layout:
 *  - If the user has pending invitations → show each invite card with a "Join" button.
 *    Only one org can be joined (once joined, redirect immediately).
 *  - Always show a "Create a new organisation" expandable section below.
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Plus, ArrowRight, Loader2, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BannerAlert } from "@/components/auth/BannerAlert";
import { api, ApiError, PendingInvite, tokenManager } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

interface LocationState {
  pendingInvites?: PendingInvite[];
  isFirstUser?: boolean;
}

export default function OrgSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, checkOrgAdmin, isOrgMember, isLoading } = useAuth();

  // If the user already belongs to an org (e.g. they bookmarked /org-setup),
  // redirect them straight to their profile so they don't get stuck.
  useEffect(() => {
    if (!isLoading && isOrgMember) {
      navigate("/profile", { replace: true });
    }
  }, [isLoading, isOrgMember, navigate]);

  // Seed from navigation state on first render (avoids flicker), then always
  // fetch from the API so refreshing the page still shows the real invites.
  const locationState = (location.state ?? {}) as LocationState;
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(
    locationState.pendingInvites ?? []
  );
  const [invitesLoading, setInvitesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.users.getMyInvites()
      .then((res) => {
        if (!cancelled) {
          setPendingInvites(res.invites);
          setInvitesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setInvitesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const hasInvites = pendingInvites.length > 0;

  // Invite acceptance
  const [joiningToken, setJoiningToken] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create org form — open by default; collapses once we know there are invites
  const [createOpen, setCreateOpen] = useState(false);

  // Once invite fetch resolves: if no invites, open the create form automatically
  useEffect(() => {
    if (!invitesLoading) {
      setCreateOpen(pendingInvites.length === 0);
    }
  }, [invitesLoading, pendingInvites.length]);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setOrgName(value);
    if (!slugTouched) setOrgSlug(toSlug(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setOrgSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const done = async () => {
    await refreshUser();
    await checkOrgAdmin();
    navigate("/profile", { replace: true });
  };

  // ── Accept an invite ───────────────────────────────────────────────────────
  const handleJoinOrg = async (invite: PendingInvite) => {
    setJoinError(null);
    setJoiningToken(invite.token);
    try {
      const result = await api.invites.accept(invite.token);
      if (result.token) tokenManager.setToken(result.token, result.expires_at ?? null);
      await done();
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Failed to join organisation. Please try again.");
      setJoiningToken(null);
    }
  };

  // ── Create a new org ───────────────────────────────────────────────────────
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!orgName.trim()) { setCreateError("Organisation name is required."); return; }
    if (!orgSlug.trim()) { setCreateError("Slug is required."); return; }
    setIsCreating(true);
    try {
      await api.organizations.create(orgName.trim(), orgSlug.trim());
      await done();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create organisation. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="auth-card" data-testid="org-setup-page">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {hasInvites ? "You have an invitation!" : "Set up your organisation"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {hasInvites
            ? "Join an existing organisation or create your own."
            : "Create your organisation to get started. You'll be set as the Owner."}
        </p>
      </div>

      {/* Loading skeleton while fetching invites */}
      {invitesLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>

      {/* ── Pending invitations ────────────────────────────────────────────── */}
      {hasInvites && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            <Mail className="w-3.5 h-3.5" />
            Invitation{pendingInvites.length > 1 ? "s" : ""} for your email
          </div>

          {joinError && <BannerAlert type="error" message={joinError} className="mb-2" />}

          {pendingInvites.map((invite) => (
            <div
              key={invite.token}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 gap-4"
              data-testid="invite-card"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {invite.organization.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You were invited as{" "}
                  <span className="font-medium capitalize">{invite.role}</span>
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={joiningToken !== null}
                onClick={() => handleJoinOrg(invite)}
                data-testid="join-org-btn"
              >
                {joiningToken === invite.token ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Join"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      {hasInvites && (
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
      )}

      {/* ── Create organisation (collapsible when invites are present) ─────── */}
      {hasInvites ? (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Toggle header */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setCreateOpen((o) => !o)}
            data-testid="create-org-toggle"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Create a new organisation
            </span>
            {createOpen
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {/* Collapsible form */}
          {createOpen && (
            <div className="border-t border-border px-4 py-4">
              <CreateOrgForm
                orgName={orgName}
                orgSlug={orgSlug}
                isCreating={isCreating}
                createError={createError}
                onNameChange={handleNameChange}
                onSlugChange={handleSlugChange}
                onSubmit={handleCreateOrg}
              />
            </div>
          )}
        </div>
      ) : (
        /* No invites — show the form directly */
        <CreateOrgForm
          orgName={orgName}
          orgSlug={orgSlug}
          isCreating={isCreating}
          createError={createError}
          onNameChange={handleNameChange}
          onSlugChange={handleSlugChange}
          onSubmit={handleCreateOrg}
        />
      )}
      </>
      )}
    </div>
  );
}

// ── Reusable create-org form ─────────────────────────────────────────────────
interface CreateOrgFormProps {
  orgName: string;
  orgSlug: string;
  isCreating: boolean;
  createError: string | null;
  onNameChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function CreateOrgForm({
  orgName, orgSlug, isCreating, createError,
  onNameChange, onSlugChange, onSubmit,
}: CreateOrgFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="org-setup-create">
      {createError && <BannerAlert type="error" message={createError} />}

      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organisation name</Label>
        <Input
          id="orgName"
          type="text"
          placeholder="Acme Corp"
          value={orgName}
          onChange={(e) => onNameChange(e.target.value)}
          required
          autoFocus
          data-testid="org-name-input"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="orgSlug">
          Slug{" "}
          <span className="text-xs text-muted-foreground font-normal">
            — used in URLs, lowercase &amp; hyphens only
          </span>
        </Label>
        <Input
          id="orgSlug"
          type="text"
          placeholder="acme-corp"
          value={orgSlug}
          onChange={(e) => onSlugChange(e.target.value)}
          required
          pattern="[a-z0-9][a-z0-9\-]*"
          title="Lowercase letters, numbers, and hyphens only"
          data-testid="org-slug-input"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isCreating || !orgName.trim() || !orgSlug.trim()}
        data-testid="create-org-btn"
      >
        {isCreating
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
          : <><ArrowRight className="w-4 h-4 mr-2" />Create organisation</>
        }
      </Button>
    </form>
  );
}
