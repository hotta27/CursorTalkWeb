import { createHmac, randomUUID } from "node:crypto";

const API_BASE = "https://api.switch-bot.com/v1.1";

export type SwitchBotCommandType = "command" | "customize";

export interface SwitchBotButtonConfig {
  label: string;
  deviceName: string;
  deviceType: string;
  deviceId: string;
  command: string;
  parameter?: string;
  commandType?: SwitchBotCommandType;
}

export interface SwitchBotDeviceSummary {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  hubDeviceId?: string;
}

interface SwitchBotApiEnvelope<T> {
  statusCode: number;
  message?: string;
  body: T;
}

interface SwitchBotDeviceListBody {
  deviceList?: SwitchBotDeviceSummary[];
  infraredRemoteList?: Array<{
    deviceId: string;
    deviceName: string;
    remoteType: string;
    hubDeviceId: string;
  }>;
}

interface SwitchBotCommandPreset {
  label: string;
  command: string;
  parameter?: string;
  commandType?: SwitchBotCommandType;
}

function getCredentials(): { token: string; secret: string } | null {
  const token = process.env.SWITCHBOT_TOKEN?.trim() ?? "";
  const secret = process.env.SWITCHBOT_SECRET?.trim() ?? "";
  if (!token || !secret) {
    return null;
  }
  return { token, secret };
}

function buildAuthHeaders(token: string, secret: string): Record<string, string> {
  const t = String(Date.now());
  const nonce = randomUUID();
  const sign = createHmac("sha256", secret)
    .update(token + t + nonce)
    .digest("base64");

  return {
    Authorization: token,
    sign,
    nonce,
    t,
    "Content-Type": "application/json",
  };
}

async function switchBotRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<SwitchBotApiEnvelope<T>> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("SWITCHBOT_TOKEN または SWITCHBOT_SECRET が設定されていません。");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...buildAuthHeaders(credentials.token, credentials.secret),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as SwitchBotApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload.message ?? `SwitchBot API error (${response.status})`);
  }
  if (payload.statusCode !== 100) {
    throw new Error(payload.message ?? `SwitchBot API statusCode ${payload.statusCode}`);
  }
  return payload;
}

export function isSwitchBotConfigured(): boolean {
  return getCredentials() !== null;
}

function getCommandPresets(deviceType: string): SwitchBotCommandPreset[] {
  if (deviceType === "Bot") {
    return [
      { label: "押す", command: "press", parameter: "default", commandType: "command" },
      { label: "ON", command: "turnOn", parameter: "default", commandType: "command" },
      { label: "OFF", command: "turnOff", parameter: "default", commandType: "command" },
    ];
  }
  if (
    deviceType.startsWith("Plug") ||
    deviceType.startsWith("IR:") ||
    deviceType === "Humidifier" ||
    deviceType === "Color Bulb" ||
    deviceType === "Strip Light" ||
    deviceType === "Ceiling Light" ||
    deviceType === "VacuumCleaner" ||
    deviceType === "Robot Vacuum Cleaner S1" ||
    deviceType === "Robot Vacuum Cleaner S1 Plus"
  ) {
    return [
      { label: "ON", command: "turnOn", parameter: "default", commandType: "command" },
      { label: "OFF", command: "turnOff", parameter: "default", commandType: "command" },
    ];
  }
  if (deviceType === "Curtain" || deviceType === "Curtain 3") {
    return [
      { label: "開く", command: "turnOn", parameter: "default", commandType: "command" },
      { label: "閉じる", command: "turnOff", parameter: "default", commandType: "command" },
      { label: "一時停止", command: "pause", parameter: "default", commandType: "command" },
    ];
  }
  if (deviceType === "Lock" || deviceType === "Lock Pro") {
    return [
      { label: "施錠", command: "lock", parameter: "default", commandType: "command" },
      { label: "解錠", command: "unlock", parameter: "default", commandType: "command" },
    ];
  }
  return [];
}

export function buildSwitchBotButtons(
  devices: SwitchBotDeviceSummary[],
): SwitchBotButtonConfig[] {
  return devices.flatMap((device) =>
    getCommandPresets(device.deviceType).map((preset) => ({
      label: `${device.deviceName} ${preset.label}`,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      deviceId: device.deviceId,
      command: preset.command,
      parameter: preset.parameter ?? "default",
      commandType: preset.commandType ?? "command",
    })),
  );
}

export async function listSwitchBotDevices(): Promise<SwitchBotDeviceSummary[]> {
  const payload = await switchBotRequest<SwitchBotDeviceListBody>("/devices");
  const devices = payload.body.deviceList ?? [];
  const remotes = (payload.body.infraredRemoteList ?? []).map((remote) => ({
    deviceId: remote.deviceId,
    deviceName: remote.deviceName,
    deviceType: `IR:${remote.remoteType}`,
    hubDeviceId: remote.hubDeviceId,
  }));
  return [...devices, ...remotes];
}

export async function sendSwitchBotCommand(
  deviceId: string,
  command: string,
  parameter = "default",
  commandType: SwitchBotCommandType = "command",
): Promise<void> {
  await switchBotRequest(`/devices/${encodeURIComponent(deviceId)}/commands`, {
    method: "POST",
    body: JSON.stringify({ command, parameter, commandType }),
  });
}
