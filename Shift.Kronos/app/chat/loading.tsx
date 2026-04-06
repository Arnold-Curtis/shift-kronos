import { SkeletonCard } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="pb-4">
      <SkeletonCard className="h-[60vh]" />
    </div>
  );
}
