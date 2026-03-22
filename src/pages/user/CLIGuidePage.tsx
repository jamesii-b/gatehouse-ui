import { useState } from "react";
import { Terminal, Copy, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SIGN_URL = "https://api.secuird.tech";

// ── Code block with copy button ────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({ title: "Copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  return (
    <div className="relative rounded-md border border-zinc-700 bg-zinc-950 my-2 group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
        aria-label="Copy"
      >
        {copied
          ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="p-4 pr-10 text-sm text-green-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Numbered step ──────────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="font-medium text-sm">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ── Collapsible FAQ item ───────────────────────────────────────────────────────
function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2.5 text-sm hover:text-primary transition-colors">
        {open
          ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
          : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />}
        <span>{q}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3 pl-5 text-sm text-muted-foreground space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CLIGuidePage() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="page-title">Secuird CLI</h1>
        </div>
        <p className="page-description">
          Sign your SSH key from the command line. Browser login happens once — token is cached.
        </p>
      </div>

      <div className="max-w-2xl space-y-10">

        {/* Setup steps */}
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Setup</p>

          <Step n={1} title="Download the CLI script">
            <CodeBlock code="curl -o ~/.secuird/secuird-cli.py --create-dirs https://raw.githubusercontent.com/CoryHawkless/gatehouse-api/main/client/gatehouse-cli.py" />
          </Step>

          <Step n={2} title="Set up Python venv">
            <p className="text-xs text-muted-foreground">
              Creates an isolated virtualenv so nothing pollutes your system Python.
            </p>
            <p className="text-sm font-medium mt-2">Install dependencies</p>
            <CodeBlock code={`python3 -m venv ~/.secuird/venv\n~/.secuird/venv/bin/pip install requests PyJWT pytz python-dotenv sshkey-tools coloredlogs`} />
            <p className="text-sm font-medium">Create the <code className="bg-muted px-1 rounded text-xs">secuird</code> command</p>
            <CodeBlock code={`mkdir -p ~/.local/bin\n\ncat > ~/.local/bin/secuird << 'EOF'\n#!/usr/bin/env bash\nexec ~/.secuird/venv/bin/python ~/.secuird/secuird-cli.py "$@"\nEOF\n\nchmod +x ~/.local/bin/secuird\n\necho 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc\nsource ~/.bashrc`} />
          </Step>

          <Step n={3} title="Set your server URL">
            <CodeBlock code={`echo 'SIGN_URL=${SIGN_URL}' > ~/.secuird/.env`} />
          </Step>

          <Step n={4} title="Register your SSH key (once)">
            <CodeBlock code="secuird --add-key -k ~/.ssh/id_ed25519.pub" />
            <p className="text-xs text-muted-foreground">Your browser will open for login. Token is cached after first login.</p>
          </Step>

          <Step n={5} title="Request a signed certificate">
            <CodeBlock code="secuird --request-cert" />
            <p className="text-xs text-muted-foreground">Certificate saved to <code className="bg-muted px-1 rounded text-xs">/tmp/ssh-cert</code>. Re-run when it expires.</p>
          </Step>

          <Step n={6} title="SSH in">
            <CodeBlock code="ssh user@your-server -o CertificateFile=/tmp/ssh-cert" />
          </Step>
        </div>

        <hr className="border-border/50" />

        {/* Commands reference */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Commands</p>
          <div className="divide-y divide-border/50">
            {[
              ["--request-cert", "-r", "Request / renew a signed SSH certificate"],
              ["--add-key -k <file>", "-a", "Upload & verify an SSH public key"],
              ["--list-keys", "", "List your registered SSH keys"],
              ["--remove-key [id]", "", "Remove a key (interactive if no ID)"],
              ["--check-cert", "-c", "Exit 0 if cert valid, 1 if expired/missing"],
              ["--force", "-f", "Force renewal even if cert is still valid"],
              ["--clear-cache", "", "Delete cached auth token"],
            ].map(([flag, short, desc]) => (
              <div key={flag} className="flex items-baseline gap-3 py-2">
                <code className="text-primary text-xs font-mono w-44 shrink-0">{flag}</code>
                {short
                  ? <code className="text-xs text-muted-foreground w-6 shrink-0">{short}</code>
                  : <span className="w-6 shrink-0" />}
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border/50" />

        {/* FAQ */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">FAQ</p>
          <div className="divide-y divide-border/50">
            <FaqItem q="Do I need to log in every time?">
              <p>No — the token is cached at <code>~/.secuird/token_cache.json</code> and reused until it expires.</p>
            </FaqItem>
            <FaqItem q="My browser opened but nothing happened.">
              <p>The CLI listens on port <strong>8250</strong> locally. Make sure nothing else is using that port and complete the login before closing the tab.</p>
            </FaqItem>
            <FaqItem q="'No verified SSH keys found' error.">
              <p>Run <code>secuird --add-key -k ~/.ssh/id_ed25519.pub</code> then check with <code>secuird --list-keys</code>.</p>
            </FaqItem>
            <FaqItem q="Command not found after install.">
              <CodeBlock code={`echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc`} />
            </FaqItem>
            <FaqItem q="Auto-renew with cron.">
              <p>You can use a cron job to automatically renew your certificate before it expires. Run <code>secuird --request-cert</code> interactively at least once first so a cached token exists.</p>
            </FaqItem>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          <a
            href="https://github.com/CoryHawkless/gatehouse-api/blob/main/client/gatehouse-cli.py"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline underline-offset-2"
          >
            View source on GitHub
          </a>
          {" · "}
          <a href="/ssh-keys" className="hover:text-primary underline underline-offset-2">
            Manage SSH keys in the UI
          </a>
        </p>

      </div>
    </div>
  );
}
