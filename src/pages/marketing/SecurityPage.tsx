import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
Shield,
Lock,
Key,
Eye,
ShieldCheck,
Fingerprint,
Server,
Clock,
FileKey,
ArrowRight,
CheckCircle2,
} from "lucide-react";

const securityPrinciples = [
{
icon: Shield,
title: "Security by Design",
description: "Every feature is built with security as the foundation. No bolted-on security— it's integral to every component.",
},
{
icon: Lock,
title: "Defense in Depth",
description: "Multiple layers of security controls. If one layer fails, others provide protection.",
},
{
icon: Eye,
title: "Transparency & Auditability",
description: "Complete visibility into who did what, when. Every action is logged and auditable.",
},
{
icon: Key,
title: "Principle of Least Privilege",
description: "Users and services only have the minimum permissions needed to perform their tasks.",
},
];

const mfaCapabilities = [
{
icon: Fingerprint,
title: "WebAuthn/Passkeys",
description: "Phishing-resistant authentication using hardware security keys or platform authenticators like Touch ID, Face ID, and Windows Hello.",
features: ["FIDO2 compliant", "Platform authenticators", "Hardware keys (YubiKey, etc.)", "Resident credentials"],
},
{
icon: Shield,
title: "TOTP Authenticator Apps",
description: "Time-based one-time passwords work with any TOTP-compatible authenticator app.",
features: ["Google Authenticator", "Authy", "1Password", "Any TOTP app"],
},
{
icon: Clock,
title: "Grace Periods",
description: "Configurable enrollment windows let users set up MFA without blocking access immediately.",
features: ["Custom duration", "Reminder notifications", "Admin visibility", "Hard deadline enforcement"],
},
{
icon: ShieldCheck,
title: "Policy Enforcement",
description: "Organization-wide MFA requirements with compliance tracking per user.",
features: ["Require TOTP", "Require WebAuthn", "Require any MFA", "Compliance dashboards"],
},
];

const auditFeatures = [
{
title: "User Authentication",
description: "Login attempts, MFA challenges, session creation",
},
{
title: "Administrative Actions",
description: "User management, policy changes, role assignments",
},
{
title: "SSH Certificates",
description: "Certificate issuance, revocation, and usage",
},
{
title: "OIDC Flows",
description: "Authorization requests, token issuance, consent grants",
},
{
title: "Organization Events",
description: "Member invites, department changes, group assignments",
},
{
title: "Security Events",
description: "Failed logins, suspicious activity, policy violations",
},
];

const complianceFrameworks = [
{
name: "SOC 2 Type II",
description: "Security, availability, and confidentiality controls",
},
{
name: "HIPAA",
description: "Healthcare data protection requirements",
},
{
name: "GDPR",
description: "EU data protection regulation compliance",
},
{
name: "PCI DSS",
description: "Payment card industry security standards",
},
];

export default function SecurityPage() {
return (
  <>
    {/* Hero */}
    <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Security First
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            Built for Enterprise
            <span className="text-accent block mt-2">Security Requirements</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Security isn't an afterthought—it's the foundation. Every feature is designed with security, auditability, and compliance in mind.
          </p>
        </div>
      </div>
    </section>

    {/* Security Principles */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Our Security Principles
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            These principles guide every decision we make about security and architecture.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityPrinciples.map((principle) => (
            <Card key={principle.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <principle.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{principle.title}</h3>
                <p className="text-sm text-muted-foreground">{principle.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* MFA Deep Dive */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Lock className="h-4 w-4" />
            Multi-Factor Authentication
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Modern MFA That Works for Everyone
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From phishing-resistant hardware keys to simple authenticator apps, we support the MFA methods your team needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {mfaCapabilities.map((capability) => (
            <Card key={capability.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <capability.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{capability.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{capability.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {capability.features.map((feature) => (
                        <span key={feature} className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* SSH Certificate Security */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <FileKey className="h-4 w-4" />
              SSH Certificate Security
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              SSH Keys Are a Security Nightmare
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Static SSH keys never expire. They get shared, copied, and forgotten. When employees leave, their keys often remain on servers.
            </p>
            <p className="text-muted-foreground mb-8">
              SSH certificates solve this by being short-lived and tied to verified identities. Every certificate is traceable from issuance to usage.
            </p>
            <ul className="space-y-3">
              {[
                "Certificates expire automatically—no key rotation needed",
                "Each certificate is linked to a verified user identity",
                "Complete audit trail of every certificate used",
                "Revoke access instantly by disabling the user",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/ssh-certificates">
                <Button className="gap-2">
                  Learn About SSH Certificates
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Key className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Static SSH Keys</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Never expire</li>
                      <li>• Often shared between users</li>
                      <li>• No audit trail</li>
                      <li>• Hard to rotate</li>
                      <li>• Survive employee departure</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileKey className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">SSH Certificates</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Expire in minutes/hours</li>
                      <li>• Linked to verified identity</li>
                      <li>• Complete audit trail</li>
                      <li>• Auto-expire, no rotation</li>
                      <li>• Revoked when user disabled</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>

    {/* Audit Logging */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <Card className="bg-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/60"></div>
                  <div className="h-3 w-3 rounded-full bg-warning/60"></div>
                  <div className="h-3 w-3 rounded-full bg-success/60"></div>
                  <span className="text-xs text-muted-foreground ml-2">Audit Log</span>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="divide-y text-sm font-mono">
                  {[
                    { time: "14:32:01", event: "user.login.success", user: "john@example.com", ip: "192.168.1.100" },
                    { time: "14:32:45", event: "mfa.totp.verify", user: "john@example.com", ip: "192.168.1.100" },
                    { time: "14:33:12", event: "ssh.cert.issue", user: "john@example.com", cert: "cert_abc123" },
                    { time: "14:35:00", event: "ssh.connect", user: "john@example.com", host: "prod-server-01" },
                    { time: "14:45:22", event: "oidc.token.issue", user: "john@example.com", client: "internal-app" },
                  ].map((log, i) => (
                    <div key={i} className="px-4 py-2 hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{log.time}</span>
                        <span className="text-accent">{log.event}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>user: {log.user}</span>
                        <span>ip: {log.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Eye className="h-4 w-4" />
              Complete Audit Trail
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Every Action is Logged
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              From user logins to SSH certificate usage, every action is recorded with full context. Know exactly who did what, when.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {auditFeatures.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Infrastructure Security */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Infrastructure Security
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your data is protected by industry-leading security practices.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Server,
              title: "Encrypted at Rest",
              description: "All data is encrypted using AES-256 encryption. Database backups are also encrypted.",
            },
            {
              icon: Key,
              title: "Encrypted in Transit",
              description: "TLS 1.3 for all connections. Certificate pinning for internal communications.",
            },
            {
              icon: Shield,
              title: "Secure Key Storage",
              description: "SSH CA private keys are stored in hardware security modules (HSMs) or equivalent.",
            },
            {
              icon: Lock,
              title: "Access Controls",
              description: "Principle of least privilege. Staff access is logged and time-limited.",
            },
            {
              icon: Eye,
              title: "Intrusion Detection",
              description: "Continuous monitoring for suspicious activity. Automated threat response.",
            },
            {
              icon: Clock,
              title: "Regular Audits",
              description: "Third-party security assessments and penetration testing conducted annually.",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Compliance */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Compliance Ready
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Secuird helps you meet your compliance requirements with comprehensive logging and security controls.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {complianceFrameworks.map((framework) => (
            <Card key={framework.name} className="bg-card text-center">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{framework.name}</h3>
                <p className="text-sm text-muted-foreground">{framework.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need compliance documentation or have specific requirements?
          </p>
          <Button variant="outline">
            Contact Compliance Team
          </Button>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0djJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <CardContent className="p-12 text-center relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              Security Questions?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Our security team is available to discuss your specific requirements and help you evaluate Secuird for your organization.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                Contact Security Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </>
);
}