import { SkeletonCard } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-2 py-2">
        <div className="animate-shimmer h-6 w-32 rounded-lg" />
        <div className="animate-shimmer h-4 w-48 rounded" />
      </div>
      <div className="glass p-4 space-y-2">
        <div className="flex justify-between">
          <div className="animate-shimmer h-8 w-40 rounded-lg" />
          <div className="animate-shimmer h-8 w-28 rounded-lg" />
        </div>
        <SkeletonCard className="h-48" />
      </div>
    </div>
  );
}
