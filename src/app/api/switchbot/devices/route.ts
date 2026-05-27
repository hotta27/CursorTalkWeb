import { NextResponse } from "next/server";
import { isSwitchBotConfigured, listSwitchBotDevices } from "@/lib/switchbot";

export async function GET(): Promise<NextResponse> {
  if (!isSwitchBotConfigured()) {
    return NextResponse.json(
      { message: "SWITCHBOT_TOKEN または SWITCHBOT_SECRET が設定されていません。" },
      { status: 503 },
    );
  }

  try {
    const devices = await listSwitchBotDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: `SwitchBot デバイス一覧の取得に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
