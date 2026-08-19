// Vercel serverless function — marketing's answers to "does this eDM answer
// the student question we've assigned it?" (the /marketing-edms page).
//
// Same storage story as api/feedback.ts: SharePoint via Graph once the
// AZURE_*/EXCEL_* vars are set, otherwise Redis over REST (Vercel KV /
// Upstash), otherwise an honest 503 so the page can say "not saved".
//
// Answers are stored append-only, one entry per save, and the latest entry
// per comm id wins on read — so two reviewers working at the same time can
// never overwrite each other mid-write.
// Relative imports carry explicit .js extensions — see the note in
// api/feedback.ts. Node's ESM loader can't resolve extensionless specifiers.
import { appendTableRow, isGraphConfigured, readTable } from "../server/graph.js";

export interface EdmAnswer {
  /** comm id from server/data/comms.csv (the slugified title) */
  commId: string;
  /** "yes" | "wrong" | "none" — blank string clears the verdict */
  verdict: string;
  /** the question they think it answers, when ours was wrong */
  question?: string;
  notes?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  ctaTertiary?: string;
  reviewer?: string;
  updatedAt: string;
}

type Answers = Record<string, EdmAnswer>;

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

const LIST_KEY = "comms-calendar:edm-review";
const TABLE = process.env.EXCEL_EDM_REVIEW_TABLE || "EdmReviewTable";

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(command: unknown[]): Promise<unknown> {
  const env = redisEnv();
  if (!env) throw new Error("redis not configured");
  const res = await fetch(env.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`redis ${res.status}: ${await res.text().catch(() => "")}`);
  return ((await res.json()) as { result?: unknown }).result;
}

/** Append-only log, last write per comm wins. */
function collapse(entries: EdmAnswer[]): Answers {
  const out: Answers = {};
  for (const e of entries) {
    if (!e || !e.commId) continue;
    const prev = out[e.commId];
    if (!prev || (e.updatedAt ?? "") >= (prev.updatedAt ?? "")) out[e.commId] = e;
  }
  return out;
}

async function readFromRedis(): Promise<Answers> {
  const items = (await redis(["LRANGE", LIST_KEY, "0", "-1"])) as string[];
  const parsed: EdmAnswer[] = [];
  for (const raw of items ?? []) {
    try {
      parsed.push(JSON.parse(raw) as EdmAnswer);
    } catch {
      // skip a malformed row rather than lose the rest
    }
  }
  return collapse(parsed);
}

async function readFromGraph(): Promise<Answers> {
  const { header, rows } = await readTable(TABLE);
  const idx = (name: string) => header.indexOf(name);
  return collapse(
    rows.map((v) => ({
      commId: v[idx("comm_id")] || "",
      verdict: v[idx("verdict")] || "",
      question: v[idx("question")] || undefined,
      notes: v[idx("notes")] || undefined,
      ctaPrimary: v[idx("cta_primary")] || undefined,
      ctaSecondary: v[idx("cta_secondary")] || undefined,
      ctaTertiary: v[idx("cta_tertiary")] || undefined,
      reviewer: v[idx("reviewer")] || undefined,
      updatedAt: v[idx("updated_at")] || "",
    })),
  );
}

export default async function handler(req: Req, res: Res) {
  const graph = isGraphConfigured();
  const kv = redisEnv() !== null;

  if (!graph && !kv) {
    return res.status(503).json({
      error:
        "No store is configured for this deployment. Add a Redis (Vercel KV / Upstash) " +
        "integration, or set the AZURE_* and EXCEL_* variables to use the SharePoint workbook.",
    });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json(graph ? await readFromGraph() : await readFromRedis());
    }

    if (req.method === "POST") {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
      const commId = str("commId");
      if (!commId) return res.status(400).json({ error: "commId is required" });

      const entry: EdmAnswer = {
        commId,
        verdict: str("verdict"),
        question: str("question") || undefined,
        notes: str("notes") || undefined,
        ctaPrimary: str("ctaPrimary") || undefined,
        ctaSecondary: str("ctaSecondary") || undefined,
        ctaTertiary: str("ctaTertiary") || undefined,
        reviewer: str("reviewer") || undefined,
        updatedAt: new Date().toISOString(),
      };

      if (graph) {
        await appendTableRow(TABLE, [
          entry.commId,
          entry.verdict,
          entry.question ?? "",
          entry.notes ?? "",
          entry.ctaPrimary ?? "",
          entry.ctaSecondary ?? "",
          entry.ctaTertiary ?? "",
          entry.reviewer ?? "",
          entry.updatedAt,
        ]);
      } else {
        await redis(["RPUSH", LIST_KEY, JSON.stringify(entry)]);
      }
      return res.status(201).json(entry);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
