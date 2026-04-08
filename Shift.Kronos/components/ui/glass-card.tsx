import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "strong" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  style?: React.CSSProperties;
};

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const variantMap = {
  default: "glass",
  strong: "glass-strong",
  interactive: "glass-interactive",
};

export function GlassCard({
  children,
  className,
  variant = "default",
  padding = "md",
  style,
}: GlassCardProps) {
  return (
    <div className={cn(variantMap[variant], paddingMap[padding], className)} style={style}>
      {children}
    </div>
  );
}
