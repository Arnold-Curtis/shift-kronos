import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

export type DateRange = {
  start: Date;
  end: Date;
};

export function parseDateInput(value: string | Date) {
  return value instanceof Date ? value : parseISO(value);
}

export function startOfTodayRange(now: Date = new Date()): DateRange {
  return {
    start: startOfDay(now),
    end: endOfDay(now),
  };
}

export function getWeekRange(now: Date = new Date()): DateRange {
  return {
    start: startOfDay(now),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function getCalendarWeekStart(now: Date = new Date()) {
  return startOfWeek(now, { weekStartsOn: 1 });
}

export function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
}

export function getWeekdayFromDate(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function formatDateTimeLabel(date: Date) {
  return format(date, "EEE, MMM d 'at' HH:mm");
}

export function formatDateLabel(date: Date) {
  return format(date, "EEE, MMM d");
}

export function formatTimeLabel(date: Date) {
  return format(date, "HH:mm");
}

export function isDateToday(date: Date, now: Date = new Date()) {
  return isSameDay(date, now);
}

export function getCountdownDays(target: Date, now: Date = new Date()) {
  return differenceInCalendarDays(startOfDay(target), startOfDay(now));
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
