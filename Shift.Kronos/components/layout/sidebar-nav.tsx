"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageCircle, User } from "lucide-react";
import { tabs } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  home: Home,
  calendar: Calendar,
  "message-circle": MessageCircle,
  user: User,
} as const;

export function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-[var(--sidebar-width)] flex-col border-r border-border-subtle bg-bg-base/60 backdrop-blur-2xl lg:flex">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-bold tracking-tight text-text-primary">
          <span className="text-accent-light">K</span>ronos
        </h1>
        <p className="mt-0.5 text-xs text-text-tertiary">Your life, organized</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon];
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent-muted text-accent-light"
                  : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary",
              )}
            >
              <Icon size={18} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Kronos v2</p>
      </div>
    </aside>
  );
}
