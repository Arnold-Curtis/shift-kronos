import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function FilesLoading() {
  return (
    <div className="space-y-4 pb-4">
      <Skeleton className="h-6 w-32" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
