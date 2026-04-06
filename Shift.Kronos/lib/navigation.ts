export const primaryNavigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Today, upcoming focus, and core system health.",
  },
  {
    href: "/reminders",
    label: "Reminders",
    description: "One-time, recurring, habits, and inbox capture.",
  },
  {
    href: "/timetable",
    label: "Timetable",
    description: "Semester-aware class schedule and import workflow.",
  },
  {
    href: "/chat",
    label: "Chat",
    description: "Grounded assistant chat, quick capture, and schedule questions.",
  },
  {
    href: "/notes",
    label: "Notes",
    description: "Structured capture for second-brain context.",
  },
  {
    href: "/files",
    label: "Files",
    description: "Blob-backed file storage and retrieval foundation.",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Timezone, Telegram wiring, and future preferences.",
  },
] as const;

export const foundationChecklist = [
  "Next.js application shell with App Router and TypeScript",
  "Dark-first responsive layout and navigation",
  "Typed environment validation",
  "Prisma database boundary and schema foundation",
  "Clerk authentication wiring",
  "Blob integration boundary for future uploads",
  "Testing baseline with lint, typecheck, build, and unit tests",
];
