import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "mark" | "full";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  const mark = (
    <svg
      viewBox="0 0 80 80"
      className={cn("!size-10 shrink-0", variant === "mark" ? className : "")}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* L1 → L2 */}
      <line x1="16" y1="28" x2="40" y2="18" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="16" y1="28" x2="40" y2="40" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="16" y1="28" x2="40" y2="62" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="16" y1="52" x2="40" y2="18" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="16" y1="52" x2="40" y2="40" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="16" y1="52" x2="40" y2="62" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      {/* L2 → L3 */}
      <line x1="40" y1="18" x2="64" y2="28" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="40" y1="18" x2="64" y2="52" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="40" y1="40" x2="64" y2="28" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="40" y1="40" x2="64" y2="52" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="40" y1="62" x2="64" y2="28" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      <line x1="40" y1="62" x2="64" y2="52" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      {/* Layer 1 nodes */}
      <circle cx="16" cy="28" r="5" fill="currentColor"/>
      <circle cx="16" cy="52" r="5" fill="currentColor"/>
      {/* Layer 2 nodes */}
      <circle cx="40" cy="18" r="5" fill="currentColor"/>
      <circle cx="40" cy="40" r="5" fill="currentColor"/>
      <circle cx="40" cy="62" r="5" fill="currentColor"/>
      {/* Layer 3 nodes */}
      <circle cx="64" cy="28" r="5" fill="currentColor"/>
      <circle cx="64" cy="52" r="5" fill="currentColor"/>
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {mark}
      <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
        <span className="font-semibold tracking-tight">Nexus</span>
        <span className="text-xs text-muted-foreground">University App</span>
      </div>
    </div>
  );
}
