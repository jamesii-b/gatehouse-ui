import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
Terminal,
FileKey,
Clock,
Users,
Eye,
ShieldCheck,
ArrowRight,
CheckCircle2,
Server,
Key,
Copy,
RefreshCw,
Lock,
} from "lucide-react";

const benefits = [
{
icon: Clock,
title: "Short-Lived by Design",
description: "Certificates expire in minutes or hours. No more managing key rotation schedules or dealing with stale keys.",
},
{
icon: Eye,
title: "Complete Audit Trail",
description: "Every certificate issuance and SSH connection is logged. Know exactly who accessed what, when.",
},
{
icon: Users,
title: "Identity-Linked Access",
description: "Certificates are tied to verified user identities. No more anonymous shared accounts.",
},
{
icon: ShieldCheck,
title: "Instant Revocation",
description: "Disable a user and their certificates become useless. No more hunting for keys on servers.",
},
];

const howItWorks = [
{
step: "01",
title: "Register SSH Public Key",
description: "Users register their SSH public key in Secuird. This is a one-time setup—no private keys are ever stored.",
code: "ssh-keygen -t ed25519",
},
{
step: "02",
title: "Request a Certificate",
description: "When users need to connect, they request a certificate. Secuird verifies their identity and issues a short-lived cert.",
code: "ssh secuird.example.com sign",
},
{
step: "03",
title: "Connect Normally",
description: "Use standard SSH to connect to servers. The certificate is automatically used for authentication.",
code: "ssh user@server.example.com",
},
{
step: "04",
title: "Automatic Expiration",
description: "The certificate expires automatically. Users request new certificates as needed—no manual key rotation.",
code: "# Certificate auto-expires",
},
];

const comparisonFeatures = [
{ feature: "Lifetime", static: "Permanent", cert: "Minutes to hours" },
{ feature: "Rotation", static: "Manual, error-prone", cert: "Automatic" },
{ feature: "Auditability", static: "None", cert: "Full chain of custody" },
{ feature: "Revocation", static: "Distribute to all servers", cert: "Disable user" },
{ feature: "Access Control", static: "Manual key distribution", cert: "Group-based policies" },
{ feature: "Identity Link", static: "Anonymous", cert: "Verified identity" },
{ feature: "Onboarding", static: "Copy keys manually", cert: "Self-service" },
{ feature: "Offboarding", static: "Hunt and remove keys", cert: "Instant revocation" },
];

const useCases = [
{
title: "Engineering Teams",
description: "Engineers get SSH access based on team membership. New team members get access automatically.",
features: ["Department-based principals", "Self-service certificate issuance", "Full audit trail for compliance"],
},
{
title: "Infrastructure Teams",
description: "Manage SSH access to production servers with fine-grained control and complete visibility.",
features: ["Host certificates for servers", "Bastion host support", "Production access policies"],
},
{
title: "Security Teams",
description: "Eliminate the security risks of static SSH keys while maintaining complete visibility.",
features: ["Certificate expiration alerts", "Anomaly detection", "Compliance reporting"],
},
];

export default function SSHCertificatesPage() {
return (
  <>
    {/* Hero */}
    <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Terminal className="h-4 w-4" />
              SSH Certificate Authority
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Eliminate SSH Key Chaos
              <span className="text-accent block mt-2">With Short-Lived Certificates</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Replace permanent SSH keys with short-lived certificates tied to verified identities. Works with standard OpenSSH—no custom clients needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <Card className="bg-card shadow-xl">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/60"></div>
                  <div className="h-3 w-3 rounded-full bg-warning/60"></div>
                  <div className="h-3 w-3 rounded-full bg-success/60"></div>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">Terminal</span>
                </div>
              </div>
              <CardContent className="p-0">
                <pre className="p-4 text-sm font-mono text-foreground overflow-x-auto">
                  <code>
{`# Request SSH certificate
$ ssh user@securd.example.com sign

✓ Identity verified
✓ Certificate issued
✓ Valid for 1 hour

# Connect to server
$ ssh user@prod-server-01
Welcome to prod-server-01!
Last login: Mon 10:32 from 192.168.1.100

# Certificate auto-expires
# No key rotation needed`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>

    {/* Benefits */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Why SSH Certificates?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Static SSH keys create security risks and operational headaches. Certificates solve both.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No custom clients required. Works with standard OpenSSH on servers and user machines.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((step) => (
            <Card key={step.step} className="bg-card">
              <CardContent className="pt-6">
                <div className="text-5xl font-bold text-primary/10 mb-2">{step.step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                <pre className="p-2 bg-muted rounded text-xs font-mono text-muted-foreground overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            The only requirement is OpenSSH 5.6+ on both client and server. Works on Linux, macOS, and most Unix systems.
          </p>
        </div>
      </div>
    </section>

    {/* Static Keys vs Certificates */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Static Keys vs. Certificates
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See why organizations are switching from static SSH keys to certificate-based authentication.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-destructive">Static SSH Keys</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-accent bg-accent/5">SSH Certificates</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{row.feature}</td>
                      <td className="px-6 py-4 text-sm text-center text-destructive/80">{row.static}</td>
                      <td className="px-6 py-4 text-sm text-center text-accent bg-accent/5 font-medium">{row.cert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* Use Cases */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Use Cases
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            SSH certificates work for teams of all sizes and across different use cases.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((useCase) => (
            <Card key={useCase.title} className="bg-card">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Server Setup */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Server className="h-4 w-4" />
              Server Configuration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple Server Setup
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Configure your servers to trust the Secuird CA. One configuration change, and all your servers accept certificates.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Works with standard OpenSSH",
                "No custom server software needed",
                "One-time CA key distribution",
                "Host certificates for server verification",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Card className="bg-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/60"></div>
                  <div className="h-3 w-3 rounded-full bg-warning/60"></div>
                  <div className="h-3 w-3 rounded-full bg-success/60"></div>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">/etc/ssh/sshd_config</span>
                </div>
              </div>
              <CardContent className="p-0">
                <pre className="p-4 text-sm font-mono text-foreground overflow-x-auto">
                  <code>
{`# Trust Secuird CA for user authentication
TrustedUserCAKeys /etc/ssh/securd_user_ca.pub

# (Optional) Use host certificates
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub
TrustedUserCAKeys /etc/ssh/securd_host_ca.pub

# Restart SSH to apply changes
$ systemctl restart sshd`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>

    {/* Features Deep Dive */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage SSH access at scale.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Key,
              title: "Multiple CAs",
              description: "Create separate CAs for different environments—production, staging, development.",
            },
            {
              icon: Users,
              title: "Principal Mapping",
              description: "Map users to principals based on group membership. Automatic access based on teams.",
            },
            {
              icon: Clock,
              title: "Custom Validity",
              description: "Set certificate validity per CA. Hours for production, days for development.",
            },
            {
              icon: Copy,
              title: "One-Time Setup",
              description: "Users register their public key once. No private keys ever touch our servers.",
            },
            {
              icon: RefreshCw,
              title: "Self-Service",
              description: "Users request and receive certificates themselves. No admin intervention needed.",
            },
            {
              icon: Lock,
              title: "Instant Revocation",
              description: "Disable a user and all their certificates become invalid immediately.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
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
              Ready to Modernize SSH Access?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Start your free trial today. Set up your first SSH CA in minutes and see the difference certificates make.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </>
);
}