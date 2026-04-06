"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AlertCircle } from "lucide-react";

export default function HomeError() {
  return (
    <div className="space-y-4 pb-4 pt-8">
      <GlassCard>
        <div className="flex items-center gap-3">
          <AlertCircle size={18} className="text-danger" />
          <p className="text-sm text-danger">Something went wrong loading your dashboard.</p>
        </div>
      </GlassCard>
    </div>
  );
}
