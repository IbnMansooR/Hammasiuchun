// Every call to Claude goes through here: one place for the key, the model choice, the cost count
// (tokens per day and task, never any text) and the monthly budget that stops the spending.
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { tashkentDay } from "./analytics";

export type AiTask = "translate" | "describe" | "article" | "quote" | "fact" | "pairs" | "ocr" | "test";
export const AI_TASKS: Record<AiTask, string> = {
  translate: "Yangiliklar tarjimasi",
  describe: "Shrift tavsiflari",
  article: "Maqola qoralamalari",
  quote: "Iqtiboslar",
  fact: "Viktorina faktlari",
  pairs: "Shrift juftliklari",
  ocr: "Rasmdagi matnni oʻqish",
  test: "Sinov",
};

export type AiModel = "sonnet" | "haiku";
export const MODEL_ID: Record<AiModel, () => string> = {
  sonnet: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  haiku: () => process.env.ANTHROPIC_MODEL_CHEAP || "claude-haiku-5-5",
};
// US dollars per million tokens (input, output), from Anthropic's price list.
const PRICE: Record<string, [number, number]> = { "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [0.1, 0.5], "claude-opus-5-5": [4, 20] };
const priceOf = (model: string): [number, number] => PRICE[model] ?? PRICE["claude-sonnet-5-5"];
export const costUsd = (model: string, inTok: number, outTok: number) => (inTok * priceOf(model)[0] + outTok * priceOf(model)[1]) / 1e6;

export type AiSettings = { on: boolean; monthlyUsd: number };
const KEY = "ai-settings";
const DEFAULTS: AiSettings = { on: true, monthlyUsd: 20 };

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    const v = row ? (JSON.parse(row.value) as Partial<AiSettings>) : {};
    return { on: typeof v.on === "boolean" ? v.on : DEFAULTS.on, monthlyUsd: Number.isFinite(v.monthlyUsd) && v.monthlyUsd! > 0 ? Math.min(v.monthlyUsd!, 1000) : DEFAULTS.monthlyUsd };
  } catch {
    return { ...DEFAULTS };
  }
}
export async function saveAiSettings(s: AiSettings): Promise<void> {
  const value = JSON.stringify(s);
  await db.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
}

const monthStart = (day = tashkentDay()) => `${day.slice(0, 7)}-01`;

/** What the calendar month has cost so far, and per task. */
export async function monthUsage(day = tashkentDay()) {
  const rows = await db.aiUsage.findMany({ where: { day: { gte: monthStart(day) } } });
  const byTask = new Map<string, { calls: number; inTok: number; outTok: number; failures: number; usd: number }>();
  let usd = 0;
  for (const r of rows) {
    const c = costUsd(r.model, r.inTok, r.outTok);
    usd += c;
    const t = byTask.get(r.task) ?? { calls: 0, inTok: 0, outTok: 0, failures: 0, usd: 0 };
    t.calls += r.calls; t.inTok += r.inTok; t.outTok += r.outTok; t.failures += r.failures; t.usd += c;
    byTask.set(r.task, t);
  }
  return { usd, byTask, rows };
}

export const aiOn = () => !!process.env.ANTHROPIC_API_KEY;

export type AiResult = { ok: true; text: string; model: string } | { ok: false; reason: "nokey" | "off" | "budget" | "key" | "money" | "limit" | "model" | "other"; detail: string };

async function note(task: AiTask, model: string, inTok: number, outTok: number, failed: boolean) {
  try {
    const day = tashkentDay();
    await db.aiUsage.upsert({
      where: { day_task_model: { day, task, model } },
      create: { day, task, model, calls: 1, inTok, outTok, failures: failed ? 1 : 0 },
      update: { calls: { increment: 1 }, inTok: { increment: inTok }, outTok: { increment: outTok }, failures: { increment: failed ? 1 : 0 } },
    });
  } catch { /* counting must never break the call */ }
}

export type AiContent = string | Anthropic.Messages.ContentBlockParam[];

/** One call. `effort` keeps the thinking short (the default would think hard about a translation). */
export async function ai(o: { task: AiTask; model?: AiModel; system: string; user: AiContent; maxTokens?: number; effort?: "low" | "medium" | "high"; timeoutMs?: number }): Promise<AiResult> {
  if (!aiOn()) return { ok: false, reason: "nokey", detail: "ANTHROPIC_API_KEY sozlanmagan" };
  const model = MODEL_ID[o.model ?? "sonnet"]();
  if (o.task !== "test") {
    const [set, use] = await Promise.all([getAiSettings(), monthUsage()]);
    if (!set.on) return { ok: false, reason: "off", detail: "AI admin panelda oʻchirilgan" };
    if (use.usd >= set.monthlyUsd) return { ok: false, reason: "budget", detail: `oylik chegara ($${set.monthlyUsd}) tugadi` };
  }
  try {
    const client = new Anthropic({ maxRetries: 2, timeout: o.timeoutMs ?? 60_000, baseURL: process.env.ANTHROPIC_BASE_URL || undefined });
    const res = await client.messages.create({
      model,
      max_tokens: o.maxTokens ?? 4000,
      system: o.system,
      messages: [{ role: "user", content: o.user }],
      output_config: { effort: o.effort ?? "low" },
    });
    await note(o.task, model, res.usage?.input_tokens ?? 0, res.usage?.output_tokens ?? 0, false);
    return { ok: true, text: res.content.map((b) => (b.type === "text" ? b.text : "")).join(""), model };
  } catch (e) {
    await note(o.task, model, 0, 0, true);
    const err = e as { status?: number; message?: string };
    const msg = String(err.message ?? e).replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-…").slice(0, 160);
    const status = err.status ?? 0;
    const reason = status === 401 || status === 403 ? "key" : status === 402 || /credit|balance|billing/i.test(msg) ? "money" : status === 429 ? "limit" : status === 404 || /model/i.test(msg) ? "model" : "other";
    return { ok: false, reason, detail: `${status || "xato"}: ${msg}` };
  }
}
