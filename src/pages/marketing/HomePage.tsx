import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
Shield,
Key,
Users,
Lock,
Terminal,
Building2,
ShieldCheck,
ArrowRight,
CheckCircle2,
Globe,
Fingerprint,
Clock,
ArrowRightLeft,
Eye,
Settings,
UserCheck
} from "lucide-react";

const features = [
{
icon: Shield,
title: "Enterprise SSO Without Complexity",
description:
  "Enable single sign-on with Microsoft 365, Google Workspace, and GitHub. No complex federation setups—just connect and go.",
},
{
icon: Key,
title: "SSH Certificate Authority",
description:
  "Issue short-lived SSH certificates tied to user identities. Eliminate shared SSH keys and achieve complete auditability.",
},
{
icon: Lock,
title: "Multi-Factor Authentication",
description:
  "Enforce MFA policies across your organization with TOTP and WebAuthn/Passkey support. Compliance made simple.",
},
{
icon: ArrowRightLeft,
title: "OIDC Provider Built-In",
description:
  "Secuird acts as an OIDC identity provider for your internal applications. One identity, seamless access everywhere.",
},
];

const sshFeatures = [
{
icon: Terminal,
title: "Native SSH Integration",
description: "Use standard SSH clients—no custom agents or modified binaries required. Works with OpenSSH out of the box.",
},
{
icon: Clock,
title: "Short-Lived Certificates",
description: "Certificates expire automatically. Reduce blast radius and eliminate the headache of key rotation.",
},
{
icon: Eye,
title: "Complete Audit Trail",
description: "Every certificate issuance and SSH connection is logged. Know exactly who accessed what, when.",
},
{
icon: UserCheck,
title: "Identity-Linked Access",
description: "SSH access is tied to verified corporate identities. No more anonymous shared accounts.",
},
];

const socialProviders = [
{ name: "Microsoft 365", icon: Building2 },
{ name: "Google Workspace", icon: Globe },
{ name: "GitHub", icon: Key },
];

export default function HomePage() {
return (
  <>
    {/* Hero Section */}
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <ShieldCheck className="h-4 w-4" />
            Security-first identity platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            Enterprise Authentication,
            <span className="text-accent block mt-2">Without the Enterprise Complexity</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Secuird unifies social logins, MFA, and SSH certificate management in one platform.
            Your team gets seamless access. You get complete control and auditability.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-4">Trusted authentication providers</p>
            <div className="flex items-center gap-6 sm:gap-8">
              {socialProviders.map((provider) => (
                <div key={provider.name} className="flex items-center gap-2 text-muted-foreground">
                  <provider.icon className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">{provider.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features Grid */}
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need for Identity & Access
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From user authentication to SSH certificate management, Secuird provides a complete identity platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/features">
            <Button variant="outline" className="gap-2">
              View All Features
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* SSH Certificates Feature Highlight */}
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Terminal className="h-4 w-4" />
              SSH Certificate Authority
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Eliminate SSH Key Chaos
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Replace static SSH keys with short-lived certificates tied to verified identities.
              Every access is logged, every certificate is traceable.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Works with standard OpenSSH—no custom clients needed",
                "Certificates expire automatically—no more key rotation",
                "Full audit trail from issuance to usage",
                "Group-based access policies",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/ssh-certificates">
              <Button className="gap-2">
                Learn About SSH Certificates
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {sshFeatures.map((feature) => (
              <Card key={feature.title} className="bg-muted/50">
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
      </div>
    </section>

    {/* How It Works */}
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes, not months. No complex federation required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Connect Your Providers",
              description: "Link Microsoft 365, Google Workspace, or GitHub. Users authenticate with credentials they already have.",
              icon: Users,
            },
            {
              step: "02",
              title: "Configure Policies",
              description: "Set MFA requirements, access policies, and SSH certificate parameters. One policy, organization-wide.",
              icon: Settings,
            },
            {
              step: "03",
              title: "Connect Your Apps",
              description: "Register internal applications as OIDC clients. Users get seamless SSO access to everything.",
              icon: Fingerprint,
            },
          ].map((step) => (
            <div key={step.step} className="relative">
              <div className="text-6xl font-bold text-primary/10 mb-4">{step.step}</div>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <step.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Marketing & Registration Tracking */}
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-0">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Marketing Campaign A</p>
                      <p className="text-xs text-muted-foreground">utm_source=newsletter</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Partner Integration</p>
                      <p className="text-xs text-muted-foreground">referral_code=partner123</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Direct Signup</p>
                      <p className="text-xs text-muted-foreground">organic registration</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Auto-applied policies:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Trial Extended</span>
                      <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">Partner Group</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              Registration Tracking
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Know Where Your Users Come From
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Track user registration sources through marketing codes, UTM parameters, or referral links.
              Apply policies and group memberships automatically based on origin.
            </p>

            <ul className="space-y-3">
              {[
                "Automatic group assignment based on registration source",
                "UTM parameter tracking for marketing attribution",
                "Custom invite codes with policy presets",
                "Partner and affiliate tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* Security & Compliance */}
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield className="h-4 w-4" />
            Security First
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Built for Enterprise Security Requirements
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature is designed with security and compliance in mind. From MFA enforcement to complete audit trails.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Lock,
              title: "MFA Enforcement",
              description: "Organization-wide MFA policies. Require TOTP or WebAuthn for all users, with grace periods for enrollment.",
            },
            {
              icon: Eye,
              title: "Complete Audit Trail",
              description: "Every action is logged. From logins to SSH certificate usage, you have full visibility into who did what.",
            },
            {
              icon: ShieldCheck,
              title: "Compliance Ready",
              description: "Meet SOC 2, HIPAA, and other compliance requirements with documented security controls and audit logs.",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/security">
            <Button variant="outline" className="gap-2">
              Learn About Security
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0djJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <CardContent className="p-12 text-center relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Simplify Your Identity Stack?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Start your free trial today. No credit card required. Set up SSO and SSH certificates in under an hour.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                  View Pricing
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