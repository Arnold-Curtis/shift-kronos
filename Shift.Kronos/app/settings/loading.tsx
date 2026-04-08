import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-4 pb-4">
      <Skeleton className="h-6 w-24" />
      <SkeletonCard />
    </div>
  );
}
