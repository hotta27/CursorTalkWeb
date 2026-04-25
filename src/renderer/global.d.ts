import type { CharacterState, ScheduleItem } from "../shared/types";

declare global {
  interface Window {
    api: {
      getTodaySchedules: () => Promise<ScheduleItem[]>;
      refreshSchedules: () => Promise<ScheduleItem[]>;
      openNotionPage: (url: string) => Promise<boolean>;
      onSchedulesUpdated: (listener: (items: ScheduleItem[]) => void) => void;
      onCharacterState: (listener: (state: CharacterState) => void) => void;
    };
  }
}

export {};
