import { Outlet, Link } from "react-router-dom";
import { SecuirdLogo } from "@/components/branding/SecuirdLogo";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/30 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 w-full py-6 px-4">
        <div className="max-w-md mx-auto">
          <Link to="/" className="flex items-center gap-2.5 justify-center">
            <SecuirdLogo size="md" />
            <span className="text-xl font-semibold text-foreground tracking-tight">Secuird</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Secuird. Identity & Access.
          </p>
        </div>
      </footer>
    </div>
  );
}
