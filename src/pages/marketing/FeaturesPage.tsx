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
Globe,
ShieldCheck,
ArrowRight,
CheckCircle2,
Fingerprint,
ArrowRightLeft,
Eye,
Settings,
UserCheck,
Clock,
Server,
UserPlus,
FileKey,
Activity,
Layers,
ShieldAlert,
Network,
ScanLine,
LogIn,
AppWindow,
} from "lucide-react";

const authenticationFeatures = [
{
icon: Building2,
title: "Microsoft 365 SSO",
description: "Connect your Microsoft Entra ID (Azure AD) directory. Users authenticate with their corporate credentials instantly.",
},
{
icon: Globe,
title: "Google Workspace SSO",
description: "Seamless integration with Google Workspace. Enable single sign-on for all your internal applications.",
},
{
icon: Key,
title: "GitHub Authentication",
description: "Allow developers to authenticate using their GitHub accounts. Perfect for engineering teams.",
},
{
icon: Lock,
title: "Traditional Username/Password",
description: "Full support for traditional authentication with email verification and secure password policies.",
},
];

const mfaFeatures = [
{
icon: Fingerprint,
title: "WebAuthn/Passkeys",
description: "Hardware security keys and platform authenticators (Face ID, Touch ID, Windows Hello). Phishing-resistant authentication.",
},
{
icon: Shield,
title: "TOTP Authenticator Apps",
description: "Support for Google Authenticator, Authy, 1Password, and any TOTP-compatible authenticator app.",
},
{
icon: Clock,
title: "Grace Periods",
description: "Configure grace periods for MFA enrollment. Give users time to set up their authenticators without blocking access.",
},
{
icon: ShieldAlert,
title: "Policy Enforcement",
description: "Organization-wide MFA requirements. Require specific methods (TOTP only, Passkey only, or both).",
},
];

const oidcFeatures = [
{
icon: ArrowRightLeft,
title: "OIDC Provider",
description: "Secuird acts as a standards-compliant OpenID Connect provider. Connect any OIDC-compatible application.",
},
{
icon: AppWindow,
title: "Multiple Applications",
description: "Register unlimited client applications. Each gets unique credentials and configurable redirect URIs.",
},
{
icon: UserCheck,
title: "Consent Management",
description: "Users see and approve what information is shared. Transparent data access with user control.",
},
{
icon: Network,
title: "Scopes & Claims",
description: "Configure custom scopes and claims. Pass user roles, groups, and custom attributes to your applications.",
},
];

const sshFeatures = [
{
icon: Terminal,
title: "Native SSH Support",
description: "Use standard OpenSSH client. No custom agents or modified binaries required. Works everywhere SSH works.",
},
{
icon: FileKey,
title: "Short-Lived Certificates",
description: "Certificates expire in minutes or hours. Eliminate long-lived SSH keys that persist after employees leave.",
},
{
icon: Eye,
title: "Complete Audit Trail",
description: "Every certificate issuance and SSH connection is logged. Full chain of custody from creation to usage.",
},
{
icon: Users,
title: "Group-Based Access",
description: "Configure principals and policies per department or team. Automatic group membership from identity provider.",
},
{
icon: Server,
title: "Host Certificates",
description: "Issue certificates for servers too. Verify host identity without TOFU warnings or known_hosts management.",
},
{
icon: Activity,
title: "Real-Time Monitoring",
description: "Monitor certificate usage in real-time. Detect anomalies and suspicious access patterns.",
},
];

const organizationFeatures = [
{
icon: Users,
title: "Multi-Tenant Architecture",
description: "Separate organizations with complete isolation. Each org has its own members, policies, and resources.",
},
{
icon: UserPlus,
title: "Invite System",
description: "Invite users by email with role assignments. Automatic onboarding with pre-configured group memberships.",
},
{
icon: Layers,
title: "Department Management",
description: "Organize users into departments. Apply policies and SSH certificate settings per department.",
},
{
icon: ScanLine,
title: "Registration Tracking",
description: "Track user registration sources. UTM codes, referral links, and marketing campaigns are captured automatically.",
},
];

const complianceFeatures = [
{
icon: Eye,
title: "Audit Logging",
description: "Every action is logged with user, timestamp, IP address, and details. Export logs for SIEM integration.",
},
{
icon: Settings,
title: "Security Policies",
description: "Define organization-wide security policies. MFA requirements, password rules, and session settings.",
},
{
icon: ShieldCheck,
title: "Compliance Reports",
description: "Generate compliance reports for SOC 2, HIPAA, and other frameworks. Demonstrate security controls.",
},
{
icon: Activity,
title: "Activity Monitoring",
description: "Real-time visibility into user activity. Login patterns, certificate usage, and security events.",
},
];

export default function FeaturesPage() {
return (
  <>
    {/* Hero */}
    <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Layers className="h-4 w-4" />
            Complete Feature Set
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            Everything You Need for
            <span className="text-accent block mt-2">Enterprise Identity</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Secuird provides a complete identity and access management platform. From social login to SSH certificates, we've got you covered.
          </p>
        </div>
      </div>
    </section>

    {/* Authentication Methods */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <LogIn className="h-4 w-4" />
              Authentication
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Flexible Authentication Options
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Let users authenticate with their existing corporate accounts. No new passwords to remember, no onboarding friction.
            </p>
            <p className="text-muted-foreground mb-8">
              Or combine methods—require social login for some users, traditional password + MFA for others. You're in complete control.
            </p>
            <ul className="space-y-3">
              {[
                "Single sign-on with major providers",
                "Traditional email/password authentication",
                "Combine multiple methods per user",
                "Automatic account linking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {authenticationFeatures.map((feature) => (
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
      </div>
    </section>

    {/* Multi-Factor Authentication */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="grid sm:grid-cols-2 gap-4">
              {mfaFeatures.map((feature) => (
                <Card key={feature.title} className="bg-card">
                  <CardContent className="pt-6">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Multi-Factor Authentication
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Enforce MFA Across Your Organization
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Modern authentication needs modern security. Require hardware keys or authenticator apps for all users—or specific groups.
            </p>
            <p className="text-muted-foreground mb-8">
              With grace periods, users aren't immediately locked out. They get time to set up their authenticators while staying productive.
            </p>
            <ul className="space-y-3">
              {[
                "WebAuthn/Passkey support for phishing-resistant auth",
                "TOTP support for all authenticator apps",
                "Organization-wide MFA policies",
                "Per-user compliance tracking",
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

    {/* OIDC Provider */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <ArrowRightLeft className="h-4 w-4" />
              OIDC Provider
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              One Identity for All Your Apps
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Secuird acts as an OpenID Connect provider. Connect any OIDC-compatible application—internal tools, dashboards, APIs—with a single identity source.
            </p>
            <p className="text-muted-foreground mb-8">
              Users authenticate once with Secuird, then seamlessly access all connected applications. No separate passwords, no repeated logins.
            </p>
            <ul className="space-y-3">
              {[
                "Standards-compliant OIDC implementation",
                "Unlimited client applications",
                "Custom scopes and claims",
                "User consent management",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {oidcFeatures.map((feature) => (
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

    {/* SSH Certificates */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Terminal className="h-4 w-4" />
            SSH Certificate Authority
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Modern SSH Access Management
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Replace static SSH keys with short-lived certificates tied to verified identities. Complete auditability with zero infrastructure changes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sshFeatures.map((feature) => (
            <Card key={feature.title} className="bg-card">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/ssh-certificates">
            <Button className="gap-2">
              Learn More About SSH Certificates
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Organization Management */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="grid sm:grid-cols-2 gap-4">
              {organizationFeatures.map((feature) => (
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

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              Organization Management
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Manage Users, Groups, and Policies
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Complete organization management. Invite users, organize them into departments, and apply policies at any level.
            </p>
            <p className="text-muted-foreground mb-8">
              Track where users came from with registration tracking. Marketing codes and UTM parameters are captured automatically, and you can apply policies based on origin.
            </p>
            <ul className="space-y-3">
              {[
                "Multi-tenant with complete isolation",
                "Role-based access control",
                "Department-based organization",
                "Registration source tracking",
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

    {/* Compliance & Audit */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <ShieldCheck className="h-4 w-4" />
              Compliance & Audit
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Meet Your Compliance Requirements
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Every action is logged. From user logins to SSH certificate usage, you have complete visibility for audits and compliance reports.
            </p>
            <p className="text-muted-foreground mb-8">
              Generate reports for SOC 2, HIPAA, and other frameworks. Demonstrate your security controls with comprehensive audit trails.
            </p>
            <ul className="space-y-3">
              {[
                "Complete audit logging",
                "Organization-level and system-level views",
                "Export for SIEM integration",
                "Compliance report generation",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {complianceFeatures.map((feature) => (
              <Card key={feature.title} className="bg-card">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-accent" />
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

    {/* CTA */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0djJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <CardContent className="p-12 text-center relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Start your free trial today. No credit card required. Experience all features with your team.
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