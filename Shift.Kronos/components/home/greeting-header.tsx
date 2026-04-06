type GreetingHeaderProps = {
  displayName: string | null;
  agendaCount: number;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function GreetingHeader({ displayName, agendaCount }: GreetingHeaderProps) {
  const greeting = getGreeting();
  const name = displayName || "there";

  return (
    <header className="py-2">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
        {greeting}, {name}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {agendaCount === 0
          ? "You're all clear today."
          : agendaCount === 1
            ? "You have 1 thing on your plate today."
            : `You have ${agendaCount} things on your plate today.`}
      </p>
    </header>
  );
}
