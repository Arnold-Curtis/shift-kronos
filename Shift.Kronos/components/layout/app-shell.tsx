import Link from "next/link";
import { primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  currentPath?: string;
  children: React.ReactNode;
};

export function AppShell({
  title,
  eyebrow,
  description,
  currentPath,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="mb-6 rounded-3xl border border-border bg-panel px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:px-6 sm:py-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
              {eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-foreground-muted sm:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {primaryNavigation.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition min-[360px]:min-h-[96px]",
                    isActive
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border bg-black/10 text-foreground-muted hover:border-white/20 hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-6">{children}</main>
    </div>
  );
}
