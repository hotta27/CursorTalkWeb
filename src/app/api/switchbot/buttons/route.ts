import { NextResponse } from "next/server";
import {
  buildSwitchBotButtons,
  isSwitchBotConfigured,
  listSwitchBotDevices,
} from "@/lib/switchbot";

export async function GET(): Promise<NextResponse> {
  if (!isSwitchBotConfigured()) {
    return NextResponse.json({ configured: false, buttons: [] });
  }

  try {
    const devices = await listSwitchBotDevices();
    const buttons = buildSwitchBotButtons(devices);
    return NextResponse.json({ configured: true, buttons });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
