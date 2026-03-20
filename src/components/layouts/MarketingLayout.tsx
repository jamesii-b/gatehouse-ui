import { Link, Outlet, useLocation } from "react-router-dom";
import { GatehouseLogo } from "@/components/branding/GatehouseLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
Shield,
Key,
CreditCard,
Play,
Lock,
Menu,
X
} from "lucide-react";
import { useState } from "react";

const navigation = [
{ name: "Features", href: "/features" },
{ name: "Security", href: "/security" },
{ name: "SSH Certificates", href: "/ssh-certificates" },
{ name: "Pricing", href: "/pricing" },
{ name: "Demo", href: "/demo" },
];

export default function MarketingLayout() {
const location = useLocation();
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

return (
<div className="min-h-screen bg-background flex flex-col">
  {/* Header */}
  <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <GatehouseLogo size="md" />
          <span className="text-xl font-semibold text-foreground tracking-tight">Secuird</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === item.href
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">
              Get started
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden py-4 border-t">
          <div className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  location.pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  </header>

  {/* Main Content */}
  <main className="flex-1">
    <Outlet />
  </main>

  {/* Footer */}
  <footer className="border-t bg-muted/30">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2.5">
            <GatehouseLogo size="sm" />
            <span className="text-lg font-semibold text-foreground tracking-tight">Secuird</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Enterprise identity and access management. Secure by design, simple by choice.
          </p>
        </div>

        {/* Product */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
          <ul className="space-y-2">
            <li><Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
            <li><Link to="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
            <li><Link to="/ssh-certificates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">SSH Certificates</Link></li>
            <li><Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
          <ul className="space-y-2">
            <li><Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo</Link></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Reference</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Status</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Company</h3>
          <ul className="space-y-2">
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
          <ul className="space-y-2">
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Compliance</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Secuird. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            <Shield className="h-4 w-4" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            <Key className="h-4 w-4" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            <Lock className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  </footer>
</div>
);
}