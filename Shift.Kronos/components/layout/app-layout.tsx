"use client";

import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { VoiceFab } from "@/components/capture/voice-fab";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarNav />
      <div className="app-content min-h-[100dvh]">
        <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 lg:max-w-4xl lg:py-6">
          {children}
        </main>
      </div>
      <VoiceFab />
      <BottomTabBar />
    </>
  );
}
