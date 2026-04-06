import { LoadingCard } from "@/components/feedback/loading-card";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <LoadingCard
        title="Loading your current Shift:Kronos workspace"
        description="Phase 7 adds explicit loading states so schedule, reminders, and knowledge surfaces do not fail silently while authenticated data is being assembled."
      />
    </div>
  );
}
