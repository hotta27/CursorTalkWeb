import { BrowserWindow, Notification } from "electron";
import type { ScheduleItem, ScheduleWithFlags } from "../shared/types";

const GRACE_MS = 30_000;

export class NotificationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private schedules: ScheduleWithFlags[] = [];

  constructor(private readonly mainWindow: BrowserWindow) {}

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      this.tick();
    }, 15_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  replaceSchedules(items: ScheduleItem[]): void {
    this.schedules = items.map((i) => ({
      ...i,
      notifiedStart: false,
      notifiedEnd: false,
    }));
  }

  private tick(): void {
    const now = Date.now();

    for (const item of this.schedules) {
      const start = new Date(item.startAt).getTime();
      const end = new Date(item.endAt).getTime();

      if (!item.notifiedStart && Math.abs(now - start) <= GRACE_MS) {
        item.notifiedStart = true;
        this.notify("予定開始", `${item.title} が開始です`, "notify");
      }

      if (!item.notifiedEnd && Math.abs(now - end) <= GRACE_MS) {
        item.notifiedEnd = true;
        this.notify("予定終了", `${item.title} が終了です`, "talk");
      }
    }
  }

  private notify(
    title: string,
    body: string,
    characterState: "notify" | "talk",
  ): void {
    const toast = new Notification({
      title,
      body,
      silent: false,
    });
    toast.show();
    this.mainWindow.webContents.send("character:state", characterState);
  }
}
