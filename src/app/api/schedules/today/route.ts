import { NextResponse } from "next/server";
import { fetchTodaySchedules } from "@/lib/notion";

export async function GET(): Promise<NextResponse> {
  try {
    const schedules = await fetchTodaySchedules();
    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: `Notionから予定を取得できませんでした: ${message}` },
      { status: 500 },
    );
  }
}
