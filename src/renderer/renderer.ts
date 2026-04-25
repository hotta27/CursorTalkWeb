import type { CharacterState, ScheduleItem } from "../shared/types";
import { VrmScene } from "./vrmScene.js";

const timelineEl = document.getElementById("timeline") as HTMLUListElement;
const refreshButton = document.getElementById("refreshButton") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLDivElement;
const stateEl = document.getElementById("characterState") as HTMLDivElement;
const vrmContainer = document.getElementById("vrmCanvas") as HTMLDivElement;
const vrmFallbackEl = document.getElementById("vrmFallback") as HTMLDivElement;

const scene = new VrmScene(vrmContainer);
scene
  .load("./assets/avatar.vrm")
  .catch((error) => {
    console.error("[renderer] VRM load failed", error);
    vrmFallbackEl.classList.add("show");
  });

function setError(text: string): void {
  errorEl.textContent = text;
}

function formatRange(item: ScheduleItem): string {
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  const h1 = `${start.getHours()}`.padStart(2, "0");
  const m1 = `${start.getMinutes()}`.padStart(2, "0");
  const h2 = `${end.getHours()}`.padStart(2, "0");
  const m2 = `${end.getMinutes()}`.padStart(2, "0");
  return `${h1}:${m1} - ${h2}:${m2}`;
}

function renderSchedules(items: ScheduleItem[]): void {
  timelineEl.innerHTML = "";
  if (items.length === 0) {
    timelineEl.innerHTML = "<li>スケジュールがありません</li>";
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div class="title">${item.title}</div><div class="time">${formatRange(item)}</div>`;
    li.addEventListener("click", () => {
      void window.api.openNotionPage(item.notionUrl);
    });
    timelineEl.appendChild(li);
  }
}

function applyState(state: CharacterState): void {
  stateEl.textContent = `state: ${state}`;
  scene.setState(state);
  if (state !== "idle") {
    setTimeout(() => {
      scene.setState("idle");
      stateEl.textContent = "state: idle";
    }, 4000);
  }
}

async function boot(): Promise<void> {
  try {
    console.log("[renderer] boot: getTodaySchedules request");
    const items = await window.api.getTodaySchedules();
    console.log(`[renderer] boot: getTodaySchedules response (${items.length} items)`);
    renderSchedules(items);
  } catch (error) {
    console.error(error);
    setError("Notionから予定を取得できませんでした。設定を確認してください。");
  }
}

refreshButton.addEventListener("click", async () => {
  console.log("[renderer] refresh button clicked");
  setError("");
  try {
    console.log("[renderer] refresh: schedule API request");
    const items = await window.api.refreshSchedules();
    console.log(`[renderer] refresh: schedule API response (${items.length} items)`);
    renderSchedules(items);
  } catch (error) {
    console.error(error);
    setError("更新に失敗しました。時間をおいて再実行してください。");
  }
});

window.api.onSchedulesUpdated((items) => renderSchedules(items));
window.api.onCharacterState((state) => applyState(state));

void boot();
