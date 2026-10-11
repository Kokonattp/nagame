// System One client (TypeSafe Jev; Laya's local server speaks the same protocol).
// Contract: https://docs.typesafe.ai/api.md — POST /v1/systemone, Bearer auth,
// questions keyed by id, answers returned under the same keys.
//
// Kept dependency-free and alias-free so build scripts can import it directly
// with Node's type stripping, and the Next.js server can import it as usual.

export type NoulQuestion = { type: "noul"; instructions: unknown; criteria?: { true?: string; false?: string } };
export type ChoiceQuestion = { type: "choice"; instructions: unknown; criteria: Record<string, unknown> };
export type ScoreQuestion = { type: "score"; instructions: unknown; criteria: string[] };
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number };
export type ChoiceAnswer = { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number };
/** `score` is probability-weighted and 0-based (level index), verified in M0-B. */
export type ScoreAnswer = { type: "score"; score: number; probabilities: Record<string, number>; confidence: number };

type AnswerFor<Q> = Q extends NoulQuestion ? NoulAnswer : Q extends ChoiceQuestion ? ChoiceAnswer : ScoreAnswer;
export type Answers<Qs extends Record<string, Question>> = { [K in keyof Qs]: AnswerFor<Qs[K]> };

export type SystemOneUsage = { latencyMs: number; inputTokens: number | null; outputTokens: number | null };

export class SystemOneUnavailable extends Error {}

const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";

function config() {
  const url = process.env.SYSTEM_ONE_URL ?? TYPESAFE_URL;
  return {
    url,
    model: process.env.SYSTEM_ONE_MODEL ?? "jev-latest",
    key: process.env.TYPESAFE_API_KEY,
    remote: url.startsWith("https://api.typesafe.ai"),
  };
}

// ── daily token budget (abuse guard) ──
// Someone hammering the chat must not drain the TypeSafe allowance. On the web server
// (NEXT_RUNTIME is set) calls stop for the rest of the UTC day once the cap is reached and
// Tabi answers with its keyword fallback. Build scripts (no NEXT_RUNTIME) are not capped.
// Per server instance; JEV_DAILY_TOKEN_CAP overrides the default 3M tokens/day.
const usageToday = { day: "", tokens: 0 };
function dailyCap() {
  const fallback = process.env.NEXT_RUNTIME ? 3_000_000 : Infinity;
  const raw = process.env.JEV_DAILY_TOKEN_CAP?.trim();
  if (!raw) return fallback;
  const n = Number(raw.replace(/_/g, ""));
  // 0 means "stop Jev now"; anything unreadable keeps the safe default instead of removing the cap
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
export function jevBudgetLeft(): number {
  if (usageToday.day !== today()) { usageToday.day = today(); usageToday.tokens = 0; }
  return dailyCap() - usageToday.tokens;
}
function spend(tokens: number) {
  jevBudgetLeft(); // rolls the day over
  usageToday.tokens += tokens;
}

export function systemOneConfigured(): boolean {
  const { remote, key } = config();
  return (!remote || Boolean(key)) && jevBudgetLeft() > 0;
}

export async function askSystemOne<Qs extends Record<string, Question>>(
  state: unknown,
  questions: Qs,
  opts: { timeoutMs?: number; onUsage?: (u: SystemOneUsage) => void } = {},
): Promise<Answers<Qs>> {
  const { url, model, key, remote } = config();
  if (remote && !key) throw new SystemOneUnavailable("TYPESAFE_API_KEY is not set");
  if (jevBudgetLeft() <= 0) throw new SystemOneUnavailable("daily Jev token budget reached");

  const body = JSON.stringify({ model, state, questions });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (remote && key) headers.Authorization = `Bearer ${key}`;

  // Bounded for chat latency: a timeout or network error fails fast (callers fall back);
  // only explicit "busy" answers get one short retry. Review found 3×8 s retries could
  // chain to ~50 s per chat turn.
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = performance.now();
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(opts.timeoutMs ?? 5000) });
    } catch {
      throw new SystemOneUnavailable("System One request failed or timed out");
    }
    if ((res.status === 429 || res.status === 529 || res.status === 503) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    if (!res.ok) throw new SystemOneUnavailable(`System One HTTP ${res.status}`);

    const json = (await res.json()) as { answers: Answers<Qs>; usage?: { input_tokens?: number; output_tokens?: number } };
    // no usage reported → count a typical request (~1,500 tokens) so the cap still holds
    spend((json.usage?.input_tokens ?? 1_500) + (json.usage?.output_tokens ?? 0));
    opts.onUsage?.({
      latencyMs: Math.round(performance.now() - started),
      inputTokens: json.usage?.input_tokens ?? null,
      outputTokens: json.usage?.output_tokens ?? null,
    });
    return json.answers;
  }
  throw new SystemOneUnavailable("System One unavailable after retries");
}
