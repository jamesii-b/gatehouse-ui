import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
CreditCard,
CheckCircle2,
ArrowRight,
Users,
Server,
Shield,
Zap,
Building2,
HelpCircle,
} from "lucide-react";

const plans = [
{
name: "Starter",
description: "Perfect for small teams getting started with modern identity management.",
price: 29,
priceNote: "per user/month",
billed: "billed annually",
features: [
  "Up to 50 users",
  "1 organization",
  "Email/password authentication",
  "Google OAuth integration",
  "Basic MFA (TOTP)",
  "Up to 3 OIDC clients",
  "Up to 2 SSH CAs",
  "7-day audit log retention",
],
cta: "Start Free Trial",
highlighted: false,
},
{
name: "Business",
description: "For growing organizations that need complete identity and access management.",
price: 59,
priceNote: "per user/month",
billed: "billed annually",
features: [
  "Unlimited users",
  "Multiple organizations",
  "All OAuth providers",
  "WebAuthn/Passkey support",
  "Unlimited OIDC clients",
  "Unlimited SSH CAs",
  "Host certificate signing",
  "90-day audit log retention",
  "Department-based policies",
  "Registration tracking",
],
cta: "Start Free Trial",
highlighted: true,
badge: "Most Popular",
},
{
name: "Enterprise",
description: "For organizations with advanced security and compliance requirements.",
price: null,
priceNote: "custom pricing",
billed: "contact sales",
features: [
  "Everything in Business",
  "Self-hosted deployment",
  "Custom SLA",
  "Dedicated support",
  "Unlimited audit retention",
  "Custom branding",
  "SAML integration",
  "SCIM provisioning",
  "Priority feature requests",
  "On-premises option",
],
cta: "Contact Sales",
highlighted: false,
},
];

const faqs = [
{
question: "How does the free trial work?",
answer: "Start with a 14-day free trial with full access to all Business features. No credit card required. After the trial, choose the plan that fits your needs.",
},
{
question: "Can I switch plans later?",
answer: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any billing differences.",
},
{
question: "What counts as a user?",
answer: "A user is anyone with an active account in your organization. Pending invites and suspended accounts don't count toward your user limit.",
},
{
question: "Do you offer discounts for startups or non-profits?",
answer: "Yes! We offer 50% off for qualified startups and non-profit organizations. Contact our sales team to learn more.",
},
{
question: "Is there a self-hosted option?",
answer: "Yes, our Enterprise plan includes self-hosted deployment options. This is ideal for organizations with strict data residency requirements.",
},
{
question: "What payment methods do you accept?",
answer: "We accept all major credit cards, ACH transfers (US), and wire transfers for annual Enterprise contracts.",
},
];

export default function PricingPage() {
return (
  <>
    {/* Hero */}
    <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <CreditCard className="h-4 w-4" />
            Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            Simple Pricing for
            <span className="text-accent block mt-2">Organizations of All Sizes</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            No hidden fees. No surprise charges. Pay only for what you use, with plans that scale with your organization.
          </p>
        </div>
      </div>
    </section>

    {/* Pricing Cards */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.highlighted
                  ? "border-accent shadow-lg scale-105 z-10"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                    {plan.badge}
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  {plan.price !== null ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground">/{plan.priceNote}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.billed}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-foreground">Custom Pricing</p>
                      <p className="text-sm text-muted-foreground mt-1">Contact us for details</p>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.price === null ? "#" : "/register"}>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                    {plan.price !== null && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16">
          <Card className="bg-muted/30">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <Building2 className="h-4 w-4" />
                    Enterprise Solutions
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Need a Custom Solution?
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Our enterprise team can help with custom deployments, integrations, and volume pricing. Get a personalized quote for your organization.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Self-hosted deployment options
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Custom SLA and support tiers
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Dedicated customer success manager
                    </li>
                  </ul>
                </div>
                <div className="flex justify-center">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Talk to our team about your requirements
                    </p>
                    <Button variant="outline" className="gap-2">
                      Contact Sales
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    {/* Feature Comparison */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Compare Plans Side by Side
          </h2>
          <p className="text-lg text-muted-foreground">
            See which plan is right for your organization
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Starter</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground bg-accent/5">Business</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { feature: "Users", starter: "Up to 50", business: "Unlimited", enterprise: "Unlimited" },
                    { feature: "Organizations", starter: "1", business: "Multiple", enterprise: "Unlimited" },
                    { feature: "OAuth Providers", starter: "Google", business: "All", enterprise: "All + SAML" },
                    { feature: "MFA Methods", starter: "TOTP", business: "TOTP + WebAuthn", enterprise: "TOTP + WebAuthn" },
                    { feature: "OIDC Clients", starter: "3", business: "Unlimited", enterprise: "Unlimited" },
                    { feature: "SSH CAs", starter: "2", business: "Unlimited", enterprise: "Unlimited" },
                    { feature: "Host Certificates", starter: "—", business: "✓", enterprise: "✓" },
                    { feature: "Audit Log Retention", starter: "7 days", business: "90 days", enterprise: "Unlimited" },
                    { feature: "Self-Hosted", starter: "—", business: "—", enterprise: "✓" },
                    { feature: "Custom Branding", starter: "—", business: "—", enterprise: "✓" },
                    { feature: "SCIM Provisioning", starter: "—", business: "—", enterprise: "✓" },
                    { feature: "SLA", starter: "—", business: "99.9%", enterprise: "Custom" },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm text-foreground">{row.feature}</td>
                      <td className="px-6 py-4 text-sm text-center text-muted-foreground">{row.starter}</td>
                      <td className="px-6 py-4 text-sm text-center text-foreground bg-accent/5 font-medium">{row.business}</td>
                      <td className="px-6 py-4 text-sm text-center text-muted-foreground">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about pricing and billing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Start Your Free Trial Today
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Try Secuird free for 14 days. No credit card required. Full access to all Business features.
          </p>
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
        </div>
      </div>
    </section>
  </>
);
}