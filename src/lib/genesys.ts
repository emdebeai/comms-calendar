// Genesys queue exports → studyat-daily.csv. Genesys hands Study@ one CSV a
// day: a row per queue per media type, with the interval, offered and
// answered counts, abandon rate and the average wait and handle times in
// seconds. This folds any number of those files into the per-day,
// per-channel file the campaign reads. Runs in the browser on files the
// user picked; nothing here touches the network.
import { parseCsvRows } from "./csv";

/** True when a CSV's header row is a Genesys queue export. */
export const GENESYS_HEADER = ["interval start", "media type", "queue name", "offer"];
export function isGenesys(header: string[]): boolean {
  const h = header.map((c) => c.trim().toLowerCase());
  return GENESYS_HEADER.every((c) => h.includes(c));
}

// Only the Study@ queues count; the same export can carry other queues.
const STUDY_QUEUE = /study@/i;
const CHANNEL: Record<string, string> = { voice: "phone", message: "chat", chat: "chat" };

/** "11/19/25 04:00 AM" (US order, as Genesys writes it) → "2025-11-19". */
export function genesysDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const n = (s: string | undefined) => Number(s) || 0;

type Bucket = { offer: number; answer: number; abandon: number; wait: number; handle: number };

export type GenesysResult = { csv: string; days: number; files: number; from: string; to: string; channels: string[]; skipped: number };

/** Merge Genesys daily exports into studyat-daily.csv text. A queue + media
 *  type seen twice for one day (a re-exported file) keeps the later copy.
 *  Contacts = Offer, everything that arrived; averages are weighted by
 *  answered contacts; CSAT is left blank for Qualtrics. */
export function genesysToDaily(texts: string[]): GenesysResult {
  const seen = new Map<string, Record<string, string>>();
  let skipped = 0;
  for (const text of texts) {
    for (const r of parseCsvRows(text)) {
      const date = genesysDate(r["interval start"] ?? "");
      const channel = CHANNEL[(r["media type"] ?? "").toLowerCase()];
      if (!date || !channel || !STUDY_QUEUE.test(r["queue name"] ?? "")) { skipped++; continue; }
      seen.set(`${date}|${channel}|${r["queue id"] || r["queue name"]}`, r);
    }
  }
  const buckets = new Map<string, Bucket>();
  for (const [key, r] of seen) {
    const [date, channel] = key.split("|");
    const k = `${date}|${channel}`;
    const b = buckets.get(k) ?? { offer: 0, answer: 0, abandon: 0, wait: 0, handle: 0 };
    const answer = n(r.answer);
    b.offer += n(r.offer);
    b.answer += answer;
    b.abandon += n(r.abandon);
    b.wait += n(r["avg wait"]) * answer;
    b.handle += n(r["avg handle"]) * answer;
    buckets.set(k, b);
  }
  const keys = [...buckets.keys()].sort();
  const lines = keys.map((k) => {
    const [date, channel] = k.split("|");
    const b = buckets.get(k)!;
    const avg = (sum: number) => (b.answer ? clock(sum / b.answer) : "");
    const abandon = b.offer ? `${Math.round((b.abandon / b.offer) * 1000) / 10}%` : "";
    return [date, channel, b.offer, avg(b.handle), avg(b.wait), abandon, "", ""].join(",");
  });
  const dates = keys.map((k) => k.split("|")[0]);
  return {
    csv: ["date,channel,contacts,handle_time,wait_time,abandonment_rate,csat,csat_responses", ...lines].join("\n") + "\n",
    days: new Set(dates).size,
    files: texts.length,
    from: dates[0] ?? "",
    to: dates[dates.length - 1] ?? "",
    channels: [...new Set(keys.map((k) => k.split("|")[1]))],
    skipped,
  };
}
