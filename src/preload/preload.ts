import { contextBridge, ipcRenderer } from "electron";
import type { CharacterState, ScheduleItem } from "../shared/types";

contextBridge.exposeInMainWorld("api", {
  getTodaySchedules: (): Promise<ScheduleItem[]> =>
    ipcRenderer.invoke("schedule:getToday"),
  refreshSchedules: (): Promise<ScheduleItem[]> =>
    ipcRenderer.invoke("schedule:refresh"),
  openNotionPage: (url: string): Promise<boolean> =>
    ipcRenderer.invoke("schedule:openNotionPage", url),
  onSchedulesUpdated: (listener: (items: ScheduleItem[]) => void): void => {
    ipcRenderer.on("schedule:updated", (_, items: ScheduleItem[]) => {
      listener(items);
    });
  },
  onCharacterState: (listener: (state: CharacterState) => void): void => {
    ipcRenderer.on("character:state", (_, state: CharacterState) => {
      listener(state);
    });
  },
});
