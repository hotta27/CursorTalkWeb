import "dotenv/config";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { session } from "electron";
import { fetchTodaySchedules } from "./notionService";
import { NotificationScheduler } from "./notificationScheduler";
import type { ScheduleItem } from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let scheduler: NotificationScheduler | null = null;
let latestSchedules: ScheduleItem[] = [];

async function loadSchedules(): Promise<ScheduleItem[]> {
  console.log("[main] Notion API request started");
  latestSchedules = await fetchTodaySchedules();
  console.log(`[main] Notion API request completed: ${latestSchedules.length} items`);
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
  ipcMain.handle("schedule:getToday", async () => {
    console.log("[main] IPC schedule:getToday received");
    return loadSchedules();
  });

  ipcMain.handle("schedule:refresh", async () => {
    console.log("[main] IPC schedule:refresh received");
    const data = await loadSchedules();
    mainWindow?.webContents.send("schedule:updated", data);
    return data;
  });

  ipcMain.handle("schedule:openNotionPage", async (_, url: string) => {
    console.log(`[main] IPC schedule:openNotionPage received: ${url}`);
    if (!url) {
      return false;
    }
    await shell.openExternal(url);
    return true;
  });
}

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'self';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

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
