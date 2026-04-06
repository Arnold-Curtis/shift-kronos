import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function TimetableLoading() {
  return (
    <div className="space-y-4 pb-4">
      <Skeleton className="h-6 w-32" />
      <SkeletonCard className="h-48" />
    </div>
  );
}
