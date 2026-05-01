export type CharacterState = "idle" | "notify" | "talk";

export interface ScheduleItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  notionUrl: string;
}

export interface ScheduleWithFlags extends ScheduleItem {
  notifiedStart: boolean;
  notifiedEnd: boolean;
}
