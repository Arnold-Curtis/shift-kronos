export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatRelativeWindow(start: string, end: string) {
  return `${start} to ${end}`;
}
