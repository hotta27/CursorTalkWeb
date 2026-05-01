import type { ScheduleItem } from "@/lib/types";

export const MINUTES_PER_DAY = 24 * 60;
export const GRID_STEP_MINUTES = 30;

export function toMinuteOfDay(isoTime: string): number {
  const date = new Date(isoTime);
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinuteLabel(minute: number): string {
  const h = `${Math.floor(minute / 60)}`.padStart(2, "0");
  const m = `${minute % 60}`.padStart(2, "0");
  return `${h}:${m}`;
}

export function formatRange(item: ScheduleItem): string {
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  const h1 = `${start.getHours()}`.padStart(2, "0");
  const m1 = `${start.getMinutes()}`.padStart(2, "0");
  const h2 = `${end.getHours()}`.padStart(2, "0");
  const m2 = `${end.getMinutes()}`.padStart(2, "0");
  return `${h1}:${m1} - ${h2}:${m2}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifySchedule(
  item: ScheduleItem,
  nowMinute: number,
): "past" | "current" | "upcoming" {
  const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
  const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
  if (end <= nowMinute) {
    return "past";
  }
  if (start <= nowMinute && nowMinute < end) {
    return "current";
  }
  return "upcoming";
}
