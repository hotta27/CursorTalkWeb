import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { ScheduleItem } from "@/lib/types";

const notionToken = process.env.NOTION_API_KEY ?? "";
const notionDatabaseId = process.env.NOTION_DATABASE_ID ?? "";
const notion = notionToken ? new Client({ auth: notionToken }) : null;

export class ScheduleFetchThrottledError extends Error {
  constructor() {
    super("前回の取得から10秒以内のため取得をスキップしました。");
    this.name = "ScheduleFetchThrottledError";
  }
}

const MIN_FETCH_INTERVAL_MS = 10_000;
let lastFetchAt = 0;

function readTitle(page: PageObjectResponse): string {
  const raw = page.properties["名前"];
  if (!raw || raw.type !== "title") {
    return "無題";
  }
  return raw.title.map((t) => t.plain_text).join("") || "無題";
}

function readDate(page: PageObjectResponse, which: "start" | "end"): string {
  const raw = page.properties["日付"];
  if (!raw || raw.type !== "date" || !raw.date) {
    return "";
  }
  return which === "start" ? (raw.date.start ?? "") : (raw.date.end ?? "");
}

function readUrl(page: PageObjectResponse): string {
  const raw = page.properties["URL"];
  if (raw && raw.type === "url" && raw.url) {
    return raw.url;
  }
  return page.url;
}

export async function fetchTodaySchedules(): Promise<ScheduleItem[]> {
  if (!notion || !notionDatabaseId) {
    throw new Error("NOTION_API_KEY または NOTION_DATABASE_ID が設定されていません。");
  }

  if (Date.now() - lastFetchAt < MIN_FETCH_INTERVAL_MS) {
    throw new ScheduleFetchThrottledError();
  }
  lastFetchAt = Date.now();

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    filter: {
      property: "ステータス",
      select: {
        equals: "進行中",
      },
    },
    sorts: [
      {
        property: "日付",
        direction: "ascending",
      },
    ],
  });

  return response.results
    .filter((r): r is PageObjectResponse => r.object === "page")
    .map((page) => ({
      id: page.id,
      title: readTitle(page),
      startAt: readDate(page, "start"),
      endAt: readDate(page, "end"),
      notionUrl: readUrl(page),
    }))
    .filter((item) => Boolean(item.startAt && item.endAt));
}
