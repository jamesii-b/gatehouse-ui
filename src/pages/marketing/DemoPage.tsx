import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
Play,
ArrowRight,
Users,
Lock,
Terminal,
Shield,
MonitorPlay,
} from "lucide-react";

const demos = [
{
id: "getting-started",
title: "Getting Started with Secuird",
description: "A comprehensive overview of Secuird's features and how to set up your organization.",
duration: "12 min",
category: "Overview",
icon: Shield,
},
{
id: "social-login",
title: "Social Login Setup",
description: "Connect Microsoft 365, Google Workspace, or GitHub for seamless single sign-on.",
duration: "8 min",
category: "Authentication",
icon: Users,
},
{
id: "mfa-setup",
title: "MFA Configuration",
description: "Configure multi-factor authentication policies for your organization.",
duration: "6 min",
category: "Security",
icon: Lock,
},
{
id: "ssh-certificates",
title: "SSH Certificate Authority",
description: "Set up SSH certificate signing for secure, auditable server access.",
duration: "15 min",
category: "SSH Access",
icon: Terminal,
},
{
id: "oidc-clients",
title: "OIDC Client Setup",
description: "Register applications as OIDC clients for seamless authentication.",
duration: "10 min",
category: "Integration",
icon: MonitorPlay,
},
];

export default function DemoPage() {
return (
  <>
    {/* Hero */}
    <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Play className="h-4 w-4" />
            Product Demos
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            See Secuird in Action
          </h1>
          <p className="text-lg text-muted-foreground">
            Watch our demo videos to see how Secuird can simplify identity and access management for your organization.
          </p>
        </div>
      </div>
    </section>

    {/* Featured Demo */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Featured Demo</h2>
          <p className="text-muted-foreground">Start here for a complete overview of Secuird</p>
        </div>

        <Card className="overflow-hidden max-w-4xl mx-auto">
          <CardContent className="p-0">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Play className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground mb-2">Getting Started with Secuird</p>
                <p className="text-sm text-muted-foreground">Video placeholder — Coming soon</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Overview</span>
                <span className="text-sm text-muted-foreground">12 min</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Getting Started with Secuird</h3>
              <p className="text-muted-foreground">
                A comprehensive walkthrough of Secuird's core features. Learn how to set up your organization, 
                configure authentication methods, and enable SSH certificate signing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* All Demos */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            All Demo Videos
          </h2>
          <p className="text-lg text-muted-foreground">
            Explore specific features with our detailed walkthroughs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <Card key={demo.id} className="bg-card overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <demo.icon className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">{demo.category}</span>
                    <span className="text-xs text-muted-foreground">{demo.duration}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{demo.title}</h3>
                  <p className="text-sm text-muted-foreground">{demo.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Request Custom Demo */}
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-0">
          <CardContent className="p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Need a Custom Demo?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Our team can provide a personalized demo tailored to your organization's specific requirements. 
                  We'll walk through your use cases and show you how Secuird can help.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground">30-minute live session with our team</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground">Tailored to your specific use cases</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Play className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground">Q&A with product experts</span>
                  </li>
                </ul>
                <Button className="gap-2">
                  Schedule a Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-card rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Request Demo</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Work Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Company</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">What are you looking for?</label>
                    <select className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>SSO / Social Login</option>
                      <option>SSH Certificate Management</option>
                      <option>MFA / Security</option>
                      <option>OIDC Provider</option>
                      <option>Full IAM Solution</option>
                    </select>
                  </div>
                  <Button className="w-full">
                    Request Demo
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Try It Yourself?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start your free trial today. No credit card required. Full access to all features.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  </>
);
}