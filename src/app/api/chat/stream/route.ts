import { NextResponse } from "next/server";

const CURSORTALK_URL = process.env.CURSORTALK_URL;

interface ChatBody {
  message?: string;
  sessionId?: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ message: "リクエスト本文が不正です。" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ message: "message は必須です。" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${CURSORTALK_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, sessionId: body.sessionId }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          message: `CursorTalk サーバーからエラー応答: ${upstream.status} ${detail}`.trim(),
        },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: `CursorTalk サーバーに接続できませんでした: ${detail}` },
      { status: 500 },
    );
  }
}
