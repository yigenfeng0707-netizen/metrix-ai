import { config } from "../config";

const ACTIONS = new Set(["update_strategy", "close_position", "set_risk", "unknown"]);

export function llmConfigured(): boolean {
  return config.llmApiKey.length > 0;
}

/** Pull one JSON object out of a model reply. */
export function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function modelPayloadOk(value: unknown): value is {
  action: string;
  params: Record<string, unknown>;
  note: string;
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.action !== "string" || !ACTIONS.has(v.action)) return false;
  if (v.params != null && typeof v.params !== "object") return false;
  if (typeof v.note !== "string" || !v.note.trim()) return false;
  return true;
}

/**
 * One non-streaming chat completion against ModelScope API-Inference.
 * Does not log the key or the full prompt.
 */
export async function completeChat(system: string, user: string): Promise<string> {
  const base = config.llmApiBase.replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${config.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.llmModel,
        temperature: 0,
        enable_thinking: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`modelscope_http_${res.status}`);
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content?.trim()) throw new Error("modelscope_empty");
    return content;
  } finally {
    clearTimeout(timer);
  }
}
