import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  reminderFindMany: vi.fn(),
  timetableFindMany: vi.fn(),
  noteFindMany: vi.fn(),
  fileFindMany: vi.fn(),
  conversationFindMany: vi.fn(),
  memoryFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  retrievalGroupBy: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUniqueOrThrow: dbMocks.findUniqueOrThrow,
    },
    reminder: {
      findMany: dbMocks.reminderFindMany,
    },
    timetableEntry: {
      findMany: dbMocks.timetableFindMany,
    },
    note: {
      findMany: dbMocks.noteFindMany,
    },
    storedFile: {
      findMany: dbMocks.fileFindMany,
    },
    conversation: {
      findMany: dbMocks.conversationFindMany,
    },
    memoryArtifact: {
      findMany: dbMocks.memoryFindMany,
    },
    notificationEvent: {
      findMany: dbMocks.notificationFindMany,
    },
    retrievalChunk: {
      groupBy: dbMocks.retrievalGroupBy,
    },
  },
}));

import {
  buildUserExport,
  EXPORT_DATASET,
  EXPORT_FORMAT,
  getAvailableCsvDatasets,
  getExportContentDisposition,
} from "@/lib/export/service";

const baseDate = new Date("2026-04-06T10:00:00.000Z");

describe("export service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMocks.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      clerkUserId: "clerk_1",
      telegramChatId: "12345",
      timezone: "Africa/Lagos",
      displayName: "Shift User",
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    dbMocks.reminderFindMany.mockResolvedValue([
      {
        id: "rem_1",
        userId: "user_1",
        title: "Submit assignment",
        description: "Operating systems report",
        type: "ONE_TIME",
        priority: "HIGH",
        category: "school",
        tags: ["school", "urgent"],
        dueAt: baseDate,
        recurrenceRule: null,
        recurrenceFrequency: null,
        recurrenceInterval: null,
        recurrenceDays: [],
        recurrenceEndAt: null,
        status: "ACTIVE",
        completedAt: null,
        snoozedUntil: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ]);

    dbMocks.timetableFindMany.mockResolvedValue([
      {
        id: "tt_1",
        userId: "user_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: "Dr Ada",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        semesterStart: baseDate,
        semesterEnd: baseDate,
        reminderLeadMinutes: 30,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ]);

    dbMocks.noteFindMany.mockResolvedValue([
      {
        id: "note_1",
        userId: "user_1",
        title: "Revision strategy",
        content: "Start with operating systems.",
        tags: ["revision"],
        summary: "Study plan",
        indexingStatus: "INDEXED",
        indexingError: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ]);

    dbMocks.fileFindMany.mockResolvedValue([
      {
        id: "file_1",
        userId: "user_1",
        blobUrl: "https://blob.test/file.pdf",
        blobPath: "uploads/user_1/file.pdf",
        originalFilename: "file.pdf",
        contentType: "application/pdf",
        byteSize: 512,
        extractedText: "PDF text",
        extractionStatus: "INDEXED",
        extractionError: null,
        indexingStatus: "INDEXED",
        indexingError: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ]);

    dbMocks.conversationFindMany.mockResolvedValue([
      {
        id: "conv_1",
        userId: "user_1",
        title: "web conversation",
        source: "web",
        latestMessageAt: baseDate,
        latestSummarizedMessageAt: null,
        summaryBackfilledAt: null,
        createdAt: baseDate,
        updatedAt: baseDate,
        messages: [
          {
            id: "msg_1",
            conversationId: "conv_1",
            role: "USER",
            content: "Help me plan revision",
            source: "web",
            structuredData: null,
            tokenEstimate: 5,
            summarizedAt: null,
            createdAt: baseDate,
          },
        ],
      },
    ]);

    dbMocks.memoryFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_1",
        conversationId: "conv_1",
        kind: "conversation-summary",
        status: "READY",
        summaryLevel: 1,
        sourceReference: null,
        title: "Study continuity",
        content: "You said revision starts with operating systems.",
        structuredData: { theme: "study" },
        tokenEstimate: 24,
        coveredFromMessageId: "msg_1",
        coveredToMessageId: "msg_1",
        coveredMessageCount: 1,
        sourceStartedAt: baseDate,
        sourceEndedAt: baseDate,
        indexingStatus: "INDEXED",
        indexingError: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ]);

    dbMocks.notificationFindMany.mockResolvedValue([
      {
        id: "evt_1",
        userId: "user_1",
        reminderId: "rem_1",
        timetableEntryId: null,
        sourceType: "REMINDER",
        sourceOccurrenceKey: "rem_1:2026-04-06T10:00:00.000Z",
        transport: "telegram",
        dedupeKey: "dedupe_1",
        status: "DELIVERED",
        providerMessageId: "777",
        failureReason: null,
        lastAttemptAt: baseDate,
        deliveredAt: baseDate,
        actionedAt: null,
        createdAt: baseDate,
      },
    ]);

    dbMocks.retrievalGroupBy.mockResolvedValue([
      {
        sourceType: "NOTE",
        _count: {
          _all: 1,
        },
      },
      {
        sourceType: "MEMORY",
        _count: {
          _all: 1,
        },
      },
    ]);
  });

  it("builds a full JSON export with source records and excluded derived datasets", async () => {
    const result = await buildUserExport("user_1", EXPORT_DATASET.FULL, EXPORT_FORMAT.JSON);

    expect(result.contentType).toContain("application/json");

    const payload = JSON.parse(result.body);
    expect(payload.user.id).toBe("user_1");
    expect(payload.reminders).toHaveLength(1);
    expect(payload.conversations[0].messages).toHaveLength(1);
    expect(payload.memoryArtifacts).toHaveLength(1);
    expect(payload.derivedData.excludedDatasets).toContain("retrievalChunks");
  });

  it("builds CSV exports for flat datasets", async () => {
    const result = await buildUserExport("user_1", EXPORT_DATASET.REMINDERS, EXPORT_FORMAT.CSV);

    expect(result.contentType).toContain("text/csv");
    expect(result.body).toContain("title");
    expect(result.body).toContain("Submit assignment");
  });

  it("builds dataset-specific JSON exports", async () => {
    const result = await buildUserExport("user_1", EXPORT_DATASET.NOTES, EXPORT_FORMAT.JSON);
    const payload = JSON.parse(result.body);

    expect(payload.dataset).toBe(EXPORT_DATASET.NOTES);
    expect(payload.records).toHaveLength(1);
    expect(payload.records[0].title).toBe("Revision strategy");
  });

  it("exposes the CSV dataset whitelist", () => {
    expect(getAvailableCsvDatasets()).toEqual([
      EXPORT_DATASET.REMINDERS,
      EXPORT_DATASET.TIMETABLE,
      EXPORT_DATASET.NOTES,
      EXPORT_DATASET.NOTIFICATION_EVENTS,
    ]);
  });

  it("builds attachment-friendly content disposition headers", () => {
    expect(getExportContentDisposition("shift-kronos.json")).toBe(
      'attachment; filename="shift-kronos.json"',
    );
  });
});
