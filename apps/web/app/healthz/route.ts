import { NextResponse } from "next/server";

const AGENT = process.env.AGENT_INTERNAL_URL || "http://127.0.0.1:8787";

export async function GET() {
  try {
    const r = await fetch(`${AGENT}/healthz`, { cache: "no-store" });
    const body = await r.json();
    return NextResponse.json(body, { status: r.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, web: true, agent: "unreachable" }, { status: 503 });
  }
}
