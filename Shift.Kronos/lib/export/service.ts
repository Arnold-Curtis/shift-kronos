import { RetrievalSourceType } from "@prisma/client";
import { db } from "@/lib/db";

export const EXPORT_FORMAT = {
  JSON: "json",
  CSV: "csv",
} as const;

export const EXPORT_DATASET = {
  FULL: "full",
  REMINDERS: "reminders",
  TIMETABLE: "timetable",
  NOTES: "notes",
  NOTIFICATION_EVENTS: "notification-events",
} as const;

export type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT];
export type ExportDataset = (typeof EXPORT_DATASET)[keyof typeof EXPORT_DATASET];

type ExportRow = Record<string, string | number | boolean | null>;

function formatTimestamp(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeStringList(values: string[]) {
  return values.length > 0 ? values.join(" | ") : null;
}

function serializeNumberList(values: number[]) {
  return values.length > 0 ? values.join(" | ") : null;
}

function escapeCsvCell(value: string | number | boolean | null) {
  if (value === null) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function toCsv(rows: ExportRow[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header] ?? null)).join(","));
  }

  return lines.join("\n");
}

function buildExportFilename(dataset: ExportDataset, format: ExportFormat) {
  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  return `shift-kronos-${dataset}-${stamp}.${format === EXPORT_FORMAT.JSON ? "json" : "csv"}`;
}

async function getUserExportData(userId: string) {
  const [
    user,
    reminders,
    timetableEntries,
    notes,
    files,
    conversations,
    memoryArtifacts,
    notificationEvents,
  ] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        clerkUserId: true,
        telegramChatId: true,
        timezone: true,
        displayName: true,
        assistantProvider: true,
        assistantModel: true,
        transcriptionProvider: true,
        transcriptionModel: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.reminder.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }],
    }),
    db.timetableEntry.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    db.note.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.storedFile.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    }),
    db.conversation.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        messages: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    }),
    db.memoryArtifact.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    }),
    db.notificationEvent.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const retrievalStats = await db.retrievalChunk.groupBy({
    by: ["sourceType"],
    where: {
      userId,
      sourceType: {
        in: [RetrievalSourceType.NOTE, RetrievalSourceType.FILE, RetrievalSourceType.MEMORY],
      },
    },
    _count: {
      _all: true,
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    user: {
      ...user,
      createdAt: formatTimestamp(user.createdAt),
      updatedAt: formatTimestamp(user.updatedAt),
    },
    reminders: reminders.map((item) => ({
      ...item,
      dueAt: formatTimestamp(item.dueAt),
      recurrenceEndAt: formatTimestamp(item.recurrenceEndAt),
      completedAt: formatTimestamp(item.completedAt),
      snoozedUntil: formatTimestamp(item.snoozedUntil),
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
    })),
    timetableEntries: timetableEntries.map((item) => ({
      ...item,
      semesterStart: formatTimestamp(item.semesterStart),
      semesterEnd: formatTimestamp(item.semesterEnd),
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
    })),
    notes: notes.map((item) => ({
      ...item,
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
    })),
    files: files.map((item) => ({
      ...item,
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
    })),
    conversations: conversations.map((item) => ({
      id: item.id,
      userId: item.userId,
      title: item.title,
      source: item.source,
      latestMessageAt: formatTimestamp(item.latestMessageAt),
      latestSummarizedMessageAt: formatTimestamp(item.latestSummarizedMessageAt),
      summaryBackfilledAt: formatTimestamp(item.summaryBackfilledAt),
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
      messages: item.messages.map((message) => ({
        ...message,
        createdAt: formatTimestamp(message.createdAt),
        summarizedAt: formatTimestamp(message.summarizedAt),
      })),
    })),
    memoryArtifacts: memoryArtifacts.map((item) => ({
      ...item,
      sourceStartedAt: formatTimestamp(item.sourceStartedAt),
      sourceEndedAt: formatTimestamp(item.sourceEndedAt),
      createdAt: formatTimestamp(item.createdAt),
      updatedAt: formatTimestamp(item.updatedAt),
    })),
    notificationEvents: notificationEvents.map((item) => ({
      ...item,
      lastAttemptAt: formatTimestamp(item.lastAttemptAt),
      deliveredAt: formatTimestamp(item.deliveredAt),
      actionedAt: formatTimestamp(item.actionedAt),
      createdAt: formatTimestamp(item.createdAt),
    })),
    derivedData: {
      retrievalChunkCounts: retrievalStats.map((entry) => ({
        sourceType: entry.sourceType,
        count: entry._count._all,
      })),
      excludedDatasets: ["retrievalChunks"],
    },
  };
}

function buildReminderRows(data: Awaited<ReturnType<typeof getUserExportData>>): ExportRow[] {
  return data.reminders.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    priority: item.priority,
    category: item.category,
    tags: serializeStringList(item.tags),
    status: item.status,
    dueAt: item.dueAt,
    recurrenceRule: item.recurrenceRule,
    recurrenceFrequency: item.recurrenceFrequency,
    recurrenceInterval: item.recurrenceInterval,
    recurrenceDays: serializeNumberList(item.recurrenceDays),
    recurrenceEndAt: item.recurrenceEndAt,
    completedAt: item.completedAt,
    snoozedUntil: item.snoozedUntil,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

function buildTimetableRows(data: Awaited<ReturnType<typeof getUserExportData>>): ExportRow[] {
  return data.timetableEntries.map((item) => ({
    id: item.id,
    subject: item.subject,
    location: item.location,
    lecturer: item.lecturer,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    endTime: item.endTime,
    semesterStart: item.semesterStart,
    semesterEnd: item.semesterEnd,
    reminderLeadMinutes: item.reminderLeadMinutes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

function buildNoteRows(data: Awaited<ReturnType<typeof getUserExportData>>): ExportRow[] {
  return data.notes.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    tags: serializeStringList(item.tags),
    indexingStatus: item.indexingStatus,
    indexingError: item.indexingError,
    content: item.content,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

function buildNotificationEventRows(data: Awaited<ReturnType<typeof getUserExportData>>): ExportRow[] {
  return data.notificationEvents.map((item) => ({
    id: item.id,
    reminderId: item.reminderId,
    timetableEntryId: item.timetableEntryId,
    sourceType: item.sourceType,
    sourceOccurrenceKey: item.sourceOccurrenceKey,
    transport: item.transport,
    dedupeKey: item.dedupeKey,
    status: item.status,
    providerMessageId: item.providerMessageId,
    failureReason: item.failureReason,
    lastAttemptAt: item.lastAttemptAt,
    deliveredAt: item.deliveredAt,
    actionedAt: item.actionedAt,
    createdAt: item.createdAt,
  }));
}

function getCsvRows(dataset: ExportDataset, data: Awaited<ReturnType<typeof getUserExportData>>) {
  switch (dataset) {
    case EXPORT_DATASET.REMINDERS:
      return buildReminderRows(data);
    case EXPORT_DATASET.TIMETABLE:
      return buildTimetableRows(data);
    case EXPORT_DATASET.NOTES:
      return buildNoteRows(data);
    case EXPORT_DATASET.NOTIFICATION_EVENTS:
      return buildNotificationEventRows(data);
    default:
      throw new Error("CSV export is not available for this dataset.");
  }
}

export async function buildUserExport(userId: string, dataset: ExportDataset, format: ExportFormat) {
  const data = await getUserExportData(userId);

  if (format === EXPORT_FORMAT.JSON) {
    const jsonPayload =
      dataset === EXPORT_DATASET.FULL
        ? data
        : {
            exportedAt: data.exportedAt,
            user: data.user,
            dataset,
            records:
              dataset === EXPORT_DATASET.REMINDERS
                ? data.reminders
                : dataset === EXPORT_DATASET.TIMETABLE
                  ? data.timetableEntries
                  : dataset === EXPORT_DATASET.NOTES
                    ? data.notes
                    : dataset === EXPORT_DATASET.NOTIFICATION_EVENTS
                      ? data.notificationEvents
                      : data,
          };

    return {
      filename: buildExportFilename(dataset, format),
      contentType: "application/json; charset=utf-8",
      body: `${JSON.stringify(jsonPayload, null, 2)}\n`,
    };
  }

  const rows = getCsvRows(dataset, data);

  return {
    filename: buildExportFilename(dataset, format),
    contentType: "text/csv; charset=utf-8",
    body: `${toCsv(rows)}\n`,
  };
}

export function getExportContentDisposition(filename: string) {
  return `attachment; filename="${filename}"`;
}

export function getAvailableCsvDatasets() {
  return [
    EXPORT_DATASET.REMINDERS,
    EXPORT_DATASET.TIMETABLE,
    EXPORT_DATASET.NOTES,
    EXPORT_DATASET.NOTIFICATION_EVENTS,
  ] satisfies ExportDataset[];
}

export function getExportDatasetLabel(dataset: ExportDataset) {
  switch (dataset) {
    case EXPORT_DATASET.FULL:
      return "Full system export";
    case EXPORT_DATASET.REMINDERS:
      return "Reminders";
    case EXPORT_DATASET.TIMETABLE:
      return "Timetable";
    case EXPORT_DATASET.NOTES:
      return "Notes";
    case EXPORT_DATASET.NOTIFICATION_EVENTS:
      return "Notification events";
  }
}

export function getExportDatasetDescription(dataset: ExportDataset) {
  switch (dataset) {
    case EXPORT_DATASET.FULL:
      return "Exports the complete user dataset in JSON, including reminders, timetable entries, notes, files metadata, conversations, memory artifacts, and notification history.";
    case EXPORT_DATASET.REMINDERS:
      return "Exports reminder records with scheduling, recurrence, status, and metadata fields.";
    case EXPORT_DATASET.TIMETABLE:
      return "Exports timetable entries with semester ranges and notification lead times.";
    case EXPORT_DATASET.NOTES:
      return "Exports notes with summaries, tags, content, and indexing state.";
    case EXPORT_DATASET.NOTIFICATION_EVENTS:
      return "Exports notification delivery history and callback outcomes for operational auditing.";
  }
}
