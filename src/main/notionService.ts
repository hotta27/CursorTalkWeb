import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { ScheduleItem } from "../shared/types";

const notionToken = process.env.NOTION_API_KEY ?? "";
const notionDatabaseId = process.env.NOTION_DATABASE_ID ?? "";

const notion = notionToken ? new Client({ auth: notionToken }) : null;

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readTitle(page: PageObjectResponse): string {
  const raw = page.properties["タイトル"];
  if (!raw || raw.type !== "title") {
    return "無題";
  }
  return raw.title.map((t) => t.plain_text).join("") || "無題";
}

function readDate(
  page: PageObjectResponse,
  propName: "開始時間" | "終了時間",
): string {
  const raw = page.properties[propName];
  if (!raw || raw.type !== "date" || !raw.date?.start) {
    return "";
  }
  return raw.date.start;
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
    throw new Error(
      "NOTION_API_KEY または NOTION_DATABASE_ID が設定されていません。",
    );
  }

  const today = new Date();
  const dateISO = toISODate(today);

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    filter: {
      property: "日付",
      date: {
        equals: dateISO,
      },
    },
    sorts: [
      {
        property: "開始時間",
        direction: "ascending",
      },
    ],
  });

  return response.results
    .filter((r): r is PageObjectResponse => r.object === "page")
    .map((page) => ({
      id: page.id,
      title: readTitle(page),
      startAt: readDate(page, "開始時間"),
      endAt: readDate(page, "終了時間"),
      notionUrl: readUrl(page),
    }))
    .filter((i) => Boolean(i.startAt && i.endAt));
}
