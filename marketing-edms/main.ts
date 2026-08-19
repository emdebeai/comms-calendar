// Marketing's eDM question review — /marketing-edms.
//
// Deliberately plain TS + Tailwind (no React): one screen, one job, and it
// stays readable for whoever picks this up next. Answers save to
// /api/edm-review as you go; a failed save keeps your answer on screen and
// says why, rather than pretending.
import "../src/index.css";
import data from "./data.json";

interface Row {
  id: string; date: string; year: string; campaign: string; title: string;
  audience: string; theme: string; stage: string; q: string; qstage: string;
}
interface Answer {
  commId: string; verdict: string; question?: string; notes?: string;
  reviewer?: string; updatedAt: string;
}

const ROWS = data.rows as Row[];
const QUESTIONS = data.questions as { stage: string; q: string }[];

const answers = new Map<string, Answer>();
let reviewer = localStorage.getItem("edm-review-reviewer") ?? "";
let filter: "all" | "todo" | "done" = "all";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const VERDICTS = [
  { k: "yes", label: "Yes — correct" },
  { k: "wrong", label: "Wrong question" },
  { k: "none", label: "Doesn’t answer one" },
] as const;

const CHIP = "rounded-full px-2 py-0.5 text-xs whitespace-nowrap";
const FIELD =
  "w-full rounded-md border border-grey-30 bg-card px-3 py-2 text-sm text-grey-90 placeholder:text-grey-70 " +
  "focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";

function card(r: Row, i: number): string {
  const a = answers.get(r.id);
  const proposed = r.q
    ? `<div class="mb-3 rounded-md bg-tint-blue px-3.5 py-3">
         <p class="text-xs font-semibold tracking-wide text-rmit-blue uppercase">
           We think this send answers
           <span class="font-normal text-grey-70 normal-case">· ${esc(r.qstage)} stage</span>
         </p>
         <p class="mt-1 text-grey-90">${esc(r.q)}</p>
       </div>`
    : `<div class="mb-3 rounded-md border border-dashed border-grey-30 bg-grey-10 px-3.5 py-3">
         <p class="text-xs font-semibold tracking-wide text-grey-70 uppercase">No question assigned</p>
         <p class="mt-1 text-sm text-grey-70">We couldn’t confidently match this send to a student question — does it answer one?</p>
       </div>`;

  const buttons = VERDICTS.map(
    (v) => `<button type="button" data-verdict="${v.k}" aria-pressed="${a?.verdict === v.k}"
      class="min-h-11 rounded-full border px-3.5 py-2 text-sm ${
        a?.verdict === v.k
          ? v.k === "yes"
            ? "border-success bg-tint-green font-semibold text-success"
            : v.k === "wrong"
              ? "border-amber bg-tint-amber font-semibold text-amber"
              : "border-grey-60 bg-grey-20 font-semibold text-grey-80"
          : "border-grey-30 bg-card text-grey-80 hover:border-grey-60"
      } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rmit-blue-interactive">${v.label}</button>`,
  ).join("");

  const edge =
    a?.verdict === "yes" ? "border-l-success"
    : a?.verdict === "wrong" ? "border-l-amber"
    : a?.verdict === "none" ? "border-l-grey-60"
    : "border-l-grey-30";

  return `<article data-id="${esc(r.id)}"
      class="mb-3.5 rounded-lg border border-grey-30 border-l-4 ${edge} bg-card p-5">
      <div class="mb-2 flex flex-wrap items-center gap-1.5">
        <span class="${CHIP} bg-rmit-blue font-semibold text-white">${esc(r.date)}</span>
        <span class="${CHIP} bg-grey-20 text-grey-70">${esc(r.year)}</span>
        <span class="${CHIP} bg-grey-20 text-grey-70">${esc(r.campaign)}</span>
        <span class="${CHIP} bg-tint-blue text-rmit-blue">${esc(r.stage)} stage</span>
        <span class="ml-auto text-xs text-grey-60">#${i + 1}</span>
      </div>
      <h2 class="text-lg leading-snug font-semibold text-grey-90">${esc(r.title)}</h2>
      <p class="mt-1 mb-3 text-sm text-grey-70">
        <span class="text-xs tracking-wide text-grey-60 uppercase">To</span> ${esc(r.audience)}
        ${r.theme ? `<br><span class="text-xs tracking-wide text-grey-60 uppercase">Covers</span> ${esc(r.theme)}` : ""}
      </p>
      ${proposed}
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Does this look right?">${buttons}</div>
        <label class="block">
          <span class="mb-1 block text-xs text-grey-70">If it’s the wrong one, which question does it answer?</span>
          <input type="text" list="qlist" data-field="question" value="${esc(a?.question ?? "")}"
            placeholder="Start typing, or pick from the list…" autocomplete="off" class="${FIELD}">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-grey-70">Anything we should know</span>
          <input type="text" data-field="notes" value="${esc(a?.notes ?? "")}"
            placeholder="Optional note…" autocomplete="off" class="${FIELD}">
        </label>
      </div>
    </article>`;
}

function render() {
  document.getElementById("app")!.innerHTML = `
    <div class="mx-auto max-w-4xl px-5 pt-10 pb-24">
      <h1 class="text-3xl font-bold text-rmit-blue">eDM question review</h1>
      <p class="mt-2 max-w-2xl text-grey-80">
        Every 2026 domestic school-leaver eDM, with the one student question we think it answers on the
        Current State Touch Points map. We’ve made a first pass — we need you to tell us where we got it wrong.
      </p>
      <div class="mt-4 rounded-lg border border-grey-30 bg-card p-4 text-sm text-grey-80">
        <p class="font-semibold text-grey-90">How this works</p>
        <ul class="mt-2 list-disc pl-5">
          <li>For each send, say whether the question we’ve proposed looks right.</li>
          <li>If it’s the wrong one, type or pick the question you think it does answer.</li>
          <li>“Doesn’t answer one” is a perfectly good answer — not every send answers a student question.</li>
          <li>Skip anything you’re unsure about. Answers save on their own, so you can come back to it.</li>
        </ul>
      </div>
      <div id="banner" class="mt-4"></div>

      <div class="sticky top-0 z-10 -mx-5 mt-5 border-b border-grey-30 bg-surface px-5 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-grey-80"><b id="done" class="text-rmit-blue">0</b> of ${ROWS.length} reviewed</p>
            <div class="mt-1.5 h-1.5 w-52 overflow-hidden rounded-full bg-grey-30">
              <div id="fill" class="h-full w-0 bg-success transition-[width] duration-300"></div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span id="status" class="text-xs text-grey-60">All changes saved</span>
            <div class="flex gap-1 rounded-full border border-grey-30 bg-grey-20 p-1" role="group" aria-label="Filter sends">
              ${(["all", "todo", "done"] as const)
                .map((f) => `<button type="button" data-filter="${f}" aria-pressed="${filter === f}"
                  class="rounded-full px-3 py-1.5 text-xs ${
                    filter === f ? "bg-card font-semibold text-rmit-blue shadow-sm" : "text-grey-70 hover:text-grey-90"
                  }">${f === "all" ? "All" : f === "todo" ? "Still to review" : "Reviewed"}</button>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <label class="mt-4 mb-5 flex items-center gap-2 text-sm text-grey-70">
        Reviewed by
        <input id="reviewer" type="text" value="${esc(reviewer)}" placeholder="Your name (optional)"
          autocomplete="off" class="${FIELD} max-w-xs">
      </label>

      <datalist id="qlist">${QUESTIONS.map((q) => `<option value="${esc(q.q)}"></option>`).join("")}</datalist>
      <div id="cards">${ROWS.filter(visible).map((r) => card(r, ROWS.indexOf(r))).join("")}</div>

      <p class="mt-6 rounded-lg border border-grey-30 bg-card p-4 text-sm text-grey-70">
        <b class="text-grey-90">Everything saves automatically</b> as you go — there’s nothing to submit and no file to
        send back. Several people can review at once.
      </p>
      <footer class="mt-7 border-t border-grey-30 pt-4 text-xs text-grey-60">
        RMIT EDC · Current State Touch Points — Persona 01, domestic school leaver (VTAC).
        Sends sourced from the 2026 DOM eDM Planner.
      </footer>
    </div>`;
  progress();
}

function visible(r: Row): boolean {
  const has = !!answers.get(r.id)?.verdict;
  return filter === "all" || (filter === "todo" ? !has : has);
}

function progress() {
  const n = ROWS.filter((r) => answers.get(r.id)?.verdict).length;
  document.getElementById("done")!.textContent = String(n);
  (document.getElementById("fill") as HTMLElement).style.width = `${(n / ROWS.length) * 100}%`;
}

function setStatus(text: string, tone: "idle" | "saving" | "error" = "idle") {
  const el = document.getElementById("status")!;
  el.textContent = text;
  el.className = `text-xs ${tone === "error" ? "text-danger" : tone === "saving" ? "text-rmit-blue-interactive" : "text-grey-60"}`;
}

function banner(html: string) {
  document.getElementById("banner")!.innerHTML = html;
}

// ── saving ────────────────────────────────────────────────────────────────
const pending = new Map<string, ReturnType<typeof setTimeout>>();

async function save(commId: string) {
  const a = answers.get(commId);
  if (!a) return;
  setStatus("Saving…", "saving");
  try {
    const res = await fetch("/api/edm-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, reviewer }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || `The server returned ${res.status}`);
    }
    setStatus("All changes saved");
  } catch (err) {
    setStatus("Not saved", "error");
    banner(`<div role="alert" class="rounded-lg border border-danger bg-tint-red px-4 py-3 text-sm text-grey-90">
      <b>Your last answer didn’t save.</b> ${esc((err as Error).message)} Your answers are still on screen — they’ll
      save when the connection is back.</div>`);
  }
}

function queue(commId: string, ms: number) {
  clearTimeout(pending.get(commId));
  pending.set(commId, setTimeout(() => save(commId), ms));
}

function update(commId: string, patch: Partial<Answer>, ms: number) {
  const prev = answers.get(commId) ?? { commId, verdict: "", updatedAt: "" };
  answers.set(commId, { ...prev, ...patch, commId, updatedAt: new Date().toISOString() });
  queue(commId, ms);
}

// ── events (delegated, so re-renders never lose handlers) ──────────────────
document.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;

  const v = t.closest<HTMLButtonElement>("button[data-verdict]");
  if (v) {
    const id = v.closest("article")!.dataset.id!;
    const next = answers.get(id)?.verdict === v.dataset.verdict ? "" : v.dataset.verdict!;
    update(id, { verdict: next }, 400);
    render();
    return;
  }

  const f = t.closest<HTMLButtonElement>("button[data-filter]");
  if (f) {
    filter = f.dataset.filter as typeof filter;
    render();
  }
});

document.addEventListener("input", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === "reviewer") {
    reviewer = el.value;
    localStorage.setItem("edm-review-reviewer", reviewer);
    return;
  }
  const field = el.dataset.field;
  if (!field) return;
  const id = el.closest("article")!.dataset.id!;
  update(id, { [field]: el.value } as Partial<Answer>, 1200);
});

// ── boot ──────────────────────────────────────────────────────────────────
render();
fetch("/api/edm-review")
  .then(async (res) => {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || `The server returned ${res.status}`);
    }
    return res.json() as Promise<Record<string, Answer>>;
  })
  .then((saved) => {
    for (const [id, a] of Object.entries(saved)) answers.set(id, a);
    render();
  })
  .catch((err: Error) => {
    banner(`<div role="alert" class="rounded-lg border border-amber bg-tint-amber px-4 py-3 text-sm text-grey-90">
      <b>Answers can’t be saved yet.</b> ${esc(err.message)}</div>`);
    setStatus("Not connected", "error");
  });
