import { NextResponse } from "next/server";
import {
  isSwitchBotConfigured,
  sendSwitchBotCommand,
  type SwitchBotCommandType,
} from "@/lib/switchbot";

interface CommandBody {
  deviceId?: string;
  command?: string;
  parameter?: string;
  commandType?: SwitchBotCommandType;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSwitchBotConfigured()) {
    return NextResponse.json(
      { message: "SWITCHBOT_TOKEN または SWITCHBOT_SECRET が設定されていません。" },
      { status: 503 },
    );
  }

  let body: CommandBody;
  try {
    body = (await request.json()) as CommandBody;
  } catch {
    return NextResponse.json({ message: "リクエスト本文が不正です。" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim() ?? "";
  const command = body.command?.trim() ?? "";
  const parameter = body.parameter?.trim() || "default";
  const commandType = body.commandType === "customize" ? "customize" : "command";

  if (!deviceId || !command) {
    return NextResponse.json(
      { message: "deviceId と command は必須です。" },
      { status: 400 },
    );
  }

  try {
    await sendSwitchBotCommand(deviceId, command, parameter, commandType);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: `SwitchBot コマンドの送信に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
