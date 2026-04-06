"use client";

type RouteErrorProps = {
  title: string;
  description: string;
  reset: () => void;
};

export function RouteError({ title, description, reset }: RouteErrorProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full rounded-3xl border border-border bg-panel-strong px-6 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">Phase 7</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-muted">{description}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
