import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  variant?: "text" | "card" | "circle";
};

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  const baseStyles = "animate-shimmer rounded-lg";

  if (variant === "circle") {
    return <div className={cn(baseStyles, "h-10 w-10 rounded-full", className)} />;
  }

  if (variant === "card") {
    return <div className={cn(baseStyles, "glass h-32 w-full", className)} />;
  }

  return <div className={cn(baseStyles, "h-4 w-full rounded", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass p-4 space-y-3", className)}>
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
