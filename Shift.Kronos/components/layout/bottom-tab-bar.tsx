"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageCircle, User } from "lucide-react";
import { tabs } from "@/lib/navigation";

const iconMap = {
  home: Home,
  calendar: Calendar,
  "message-circle": MessageCircle,
  user: User,
} as const;

export function BottomTabBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-bg-base/80 backdrop-blur-2xl lg:hidden"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="flex h-[var(--tab-bar-height)] items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon];
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 py-1"
            >
              {active && (
                <span className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-accent" />
              )}
              <Icon
                size={22}
                className={
                  active
                    ? "text-accent-light transition-colors"
                    : "text-text-tertiary transition-colors group-hover:text-text-secondary"
                }
              />
              <span
                className={
                  active
                    ? "text-[10px] font-semibold text-accent-light"
                    : "text-[10px] font-medium text-text-tertiary group-hover:text-text-secondary"
                }
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
