import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

const weekdayMap: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const lookup = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    weekday: weekdayMap[lookup.weekday] ?? 1,
  };
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const zoned = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second, 0);
  return asUtc - date.getTime();
}

export function makeDateInTimeZone(
  input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number },
  timeZone: string,
) {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
    input.millisecond ?? 0,
  );
  const offset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function addDaysInTimeZone(date: Date, days: number, timeZone: string) {
  const zoned = getZonedParts(date, timeZone);
  return makeDateInTimeZone(
    {
      year: zoned.year,
      month: zoned.month,
      day: zoned.day + days,
      hour: zoned.hour,
      minute: zoned.minute,
      second: zoned.second,
      millisecond: 0,
    },
    timeZone,
  );
}

export type DateRange = {
  start: Date;
  end: Date;
};

export function parseDateInput(value: string | Date) {
  return value instanceof Date ? value : parseISO(value);
}

export function startOfTodayRange(now: Date = new Date(), timeZone: string = "UTC"): DateRange {
  const zoned = getZonedParts(now, timeZone);
  return {
    start: makeDateInTimeZone({ year: zoned.year, month: zoned.month, day: zoned.day, hour: 0, minute: 0, second: 0, millisecond: 0 }, timeZone),
    end: makeDateInTimeZone({ year: zoned.year, month: zoned.month, day: zoned.day, hour: 23, minute: 59, second: 59, millisecond: 999 }, timeZone),
  };
}

export function getWeekRange(now: Date = new Date(), timeZone: string = "UTC"): DateRange {
  const today = startOfTodayRange(now, timeZone);
  const weekday = getWeekdayFromDate(now, timeZone);
  const weekEndDate = addDaysInTimeZone(today.start, 7 - weekday, timeZone);
  const weekEnd = getZonedParts(weekEndDate, timeZone);

  return {
    start: today.start,
    end: makeDateInTimeZone(
      {
        year: weekEnd.year,
        month: weekEnd.month,
        day: weekEnd.day,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      },
      timeZone,
    ),
  };
}

export function getCalendarWeekStart(now: Date = new Date()) {
  return startOfWeek(now, { weekStartsOn: 1 });
}

export function combineDateAndTime(date: Date, time: string, timeZone: string = "UTC") {
  const [hours, minutes] = time.split(":").map(Number);
  const zoned = getZonedParts(date, timeZone);

  return makeDateInTimeZone(
    {
      year: zoned.year,
      month: zoned.month,
      day: zoned.day,
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  );
}

export function getWeekdayFromDate(date: Date, timeZone: string = "UTC") {
  return getZonedParts(date, timeZone).weekday;
}

export function formatDateTimeLabel(date: Date, timeZone?: string) {
  if (!timeZone) {
    return format(date, "EEE, MMM d 'at' HH:mm");
  }

  const [weekday, datePart, timePart] = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "")
    .split(" ");

  return `${weekday}, ${datePart} at ${timePart}`;
}

export function formatDateLabel(date: Date, timeZone?: string) {
  if (!timeZone) {
    return format(date, "EEE, MMM d");
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeLabel(date: Date, timeZone?: string) {
  if (!timeZone) {
    return format(date, "HH:mm");
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isDateToday(date: Date, now: Date = new Date()) {
  return startOfTodayRange(date).start.getTime() === startOfTodayRange(now).start.getTime();
}

export function getCountdownDays(target: Date, now: Date = new Date()) {
  return differenceInCalendarDays(startOfTodayRange(target).start, startOfTodayRange(now).start);
}

export function addRecurrence(date: Date, frequency: "DAILY" | "WEEKLY" | "MONTHLY", interval: number) {
  if (frequency === "DAILY") {
    return addDays(date, interval);
  }

  if (frequency === "WEEKLY") {
    return addWeeks(date, interval);
  }

  return addMonths(date, interval);
}
