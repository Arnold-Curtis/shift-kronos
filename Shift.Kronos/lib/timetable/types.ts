export type TimetableImportEntry = {
  subject: string;
  location?: string;
  lecturer?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  semesterStart: Date;
  semesterEnd: Date;
  reminderLeadMinutes?: number;
};

export type TimetableOccurrence = {
  entryId: string;
  subject: string;
  location: string | null;
  lecturer: string | null;
  startsAt: Date;
  endsAt: Date;
  reminderLeadMinutes: number;
};
