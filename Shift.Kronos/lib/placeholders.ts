export const integrationStatus = [
  {
    name: "Authentication",
    state: "Ready for Clerk wiring",
    detail: "Public and protected application paths will be formalized in this phase.",
  },
  {
    name: "Database",
    state: "Ready for Prisma migrations",
    detail: "The relational schema will anchor reminders, timetable, files, and memory records.",
  },
  {
    name: "Telegram",
    state: "Planned boundary",
    detail: "Notification delivery stays outside the UI layer so scheduler work can arrive later cleanly.",
  },
  {
    name: "AI services",
    state: "Planned boundary",
    detail: "AI remains an augmentation layer, not the source of truth for reminders or schedules.",
  },
];
