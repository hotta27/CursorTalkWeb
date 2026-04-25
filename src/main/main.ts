import "dotenv/config";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fetchTodaySchedules } from "./notionService";
import { NotificationScheduler } from "./notificationScheduler";
import type { ScheduleItem } from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let scheduler: NotificationScheduler | null = null;
let latestSchedules: ScheduleItem[] = [];

async function loadSchedules(): Promise<ScheduleItem[]> {
  latestSchedules = await fetchTodaySchedules();
  scheduler?.replaceSchedules(latestSchedules);
  return latestSchedules;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "../renderer/index.html"));

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  return win;
}

function setupAutoLaunch(): void {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
  });
}

function setupIpc(): void {
  ipcMain.handle("schedule:getToday", async () => loadSchedules());

  ipcMain.handle("schedule:refresh", async () => {
    const data = await loadSchedules();
    mainWindow?.webContents.send("schedule:updated", data);
    return data;
  });

  ipcMain.handle("schedule:openNotionPage", async (_, url: string) => {
    if (!url) {
      return false;
    }
    await shell.openExternal(url);
    return true;
  });
}

app.whenReady().then(async () => {
  setupAutoLaunch();
  setupIpc();

  mainWindow = createMainWindow();
  scheduler = new NotificationScheduler(mainWindow);
  scheduler.start();

  try {
    await loadSchedules();
  } catch (error) {
    // 初回ロード失敗時でもUIは起動継続する
    console.error("Failed to load schedules:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      scheduler = new NotificationScheduler(mainWindow);
      scheduler.start();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
