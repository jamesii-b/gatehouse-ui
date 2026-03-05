import { cn } from "@/lib/utils";

interface SecuirdLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  className?: string;
}

/**
 * Secuird Logo - Abstract gate/doorway mark
 * Represents controlled entry and policy enforcement
 * Two vertical pillars forming a gateway with negative space
 */
export function SecuirdLogo({ 
  size = "md", 
  variant = "default",
  className 
}: SecuirdLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  const bgClasses = {
    default: "bg-primary",
    light: "bg-sidebar-primary",
  };

  const iconColor = variant === "light" 
    ? "text-sidebar-primary-foreground" 
    : "text-primary-foreground";

  return (
    <div 
      className={cn(
        "rounded-lg flex items-center justify-center flex-shrink-0",
        sizeClasses[size],
        bgClasses[variant],
        className
      )}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className={cn(
          iconColor,
          size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-6 h-6"
        )}
      >
        {/* Abstract gate - two pillars with archway */}
        <path 
          d="M4 4h3v16H4V4z" 
          fill="currentColor"
        />
        <path 
          d="M17 4h3v16h-3V4z" 
          fill="currentColor"
        />
        <path 
          d="M7 4h10v3H7V4z" 
          fill="currentColor"
          opacity="0.7"
        />
        {/* Keyhole/entry indicator */}
        <circle 
          cx="12" 
          cy="14" 
          r="2" 
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
