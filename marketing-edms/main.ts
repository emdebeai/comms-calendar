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
  ctaPrimary?: string; ctaSecondary?: string; ctaTertiary?: string;
  reviewer?: string; updatedAt: string;
}

const ROWS = data.rows as Row[];
const QUESTIONS = data.questions as { stage: string; q: string }[];

// Journey order, so the dropdown's groups read in the order a student meets
// them rather than however the source file happens to list them.
const STAGE_ORDER = ["Understand", "Consider", "Decide", "Begin", "Submit", "Wait", "Offer", "Enrol"];
const BY_STAGE = STAGE_ORDER.map((stage) => ({
  stage,
  questions: QUESTIONS.filter((q) => q.stage === stage).map((q) => q.q),
})).filter((g) => g.questions.length);

const NONE = "__none__";     // "doesn't answer a student question"
const OTHER = "__other__";   // something not on the map yet — free text
const UNSURE = "__unsure__"; // reviewer isn't sure yet

const answers = new Map<string, Answer>();
let reviewer = localStorage.getItem("edm-review-reviewer") ?? "";
let filter: "all" | "todo" | "done" = "all";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);


const known = (q: string) => QUESTIONS.some((x) => x.q === q);

/** What the dropdown should show for a send, given what's saved so far. */
function selected(r: Row): string {
  const a = answers.get(r.id);
  if (!a || !a.verdict) return r.q;             // untouched → our proposal
  if (a.verdict === "unsure") return UNSURE;
  if (a.verdict === "none") return NONE;
  if (a.verdict === "wrong") return a.question && known(a.question) ? a.question : OTHER;
  return r.q;                                    // confirmed as-is
}

const TH = "border-b border-grey-30 px-3 py-2 text-left text-xs font-semibold tracking-wide text-grey-70 uppercase";
const TD = "border-b border-grey-30 px-3 py-3 align-top";
const CTRL =
  "w-full rounded-md border border-grey-30 bg-card px-2.5 py-2 text-sm text-grey-90 placeholder:text-grey-70 " +
  "focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";

function questionCell(r: Row): string {
  const a = answers.get(r.id);
  const sel = selected(r);
  const groups = BY_STAGE.map(
    (g) => `<optgroup label="${esc(g.stage)}">${g.questions
      .map((q) => `<option value="${esc(q)}"${q === sel ? " selected" : ""}>${esc(q)}</option>`)
      .join("")}</optgroup>`,
  ).join("");

  const custom =
    sel === OTHER
      ? `<input type="text" data-field="other" value="${esc(a?.question ?? "")}"
           placeholder="Type the question it answers" autocomplete="off" class="${CTRL} mt-1.5">`
      : "";

  // Keep our proposal visible once they've moved away from it — otherwise the
  // thing they're correcting disappears the moment they correct it.
  const ours =
    r.q && sel !== r.q
      ? `<p class="mt-1.5 text-xs text-grey-60">We picked: ${esc(r.q)}</p>`
      : !r.q
        ? `<p class="mt-1.5 text-xs text-grey-60">We didn&rsquo;t pick one.</p>`
        : "";

  return `<select data-field="question" class="${CTRL}" aria-label="Question this send answers">
      ${r.q ? "" : `<option value=""${sel === "" ? " selected" : ""}>Choose a question</option>`}
      <option value="${OTHER}"${sel === OTHER ? " selected" : ""}>Other / something else</option>
      <option value="${UNSURE}"${sel === UNSURE ? " selected" : ""}>Not sure</option>
      ${groups}
      <option value="${NONE}"${sel === NONE ? " selected" : ""}>Doesn&rsquo;t answer a student question</option>
    </select>${custom}${ours}`;
}

function row(r: Row, i: number): string {
  const a = answers.get(r.id);
  const done = !!a?.verdict;
  return `<tr data-id="${esc(r.id)}" class="${done ? "bg-tint-green/30" : ""} hover:bg-grey-10">
      <td class="${TD} text-center">
        <input type="checkbox" data-field="reviewed" ${done ? "checked" : ""}
          aria-label="Reviewed: ${esc(r.title)}"
          class="size-4 accent-rmit-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rmit-blue-interactive">
      </td>
      <td class="${TD} whitespace-nowrap">
        <span class="text-sm font-semibold text-grey-90">${esc(r.date)}</span>
        <span class="block text-xs text-grey-60">${esc(r.year)}</span>
      </td>
      <td class="${TD} min-w-56">
        <span class="text-sm font-semibold text-grey-90">${esc(r.title)}</span>
        <span class="mt-0.5 block text-xs text-grey-70">${esc(r.audience)}</span>
        ${r.theme ? `<span class="mt-0.5 block text-xs text-grey-60">${esc(r.theme)}</span>` : ""}
      </td>
      <td class="${TD} whitespace-nowrap">
        <span class="rounded-full bg-grey-20 px-2 py-0.5 text-xs text-grey-70">${esc(r.campaign)}</span>
        <span class="mt-1 block rounded-full bg-tint-blue px-2 py-0.5 text-center text-xs text-rmit-blue">${esc(r.stage)}</span>
      </td>
      <td class="${TD} min-w-80">${questionCell(r)}</td>
      <td class="${TD} min-w-40">
        <input type="text" data-field="ctaPrimary" value="${esc(a?.ctaPrimary ?? "")}"
          placeholder="Primary CTA" autocomplete="off" class="${CTRL}">
      </td>
      <td class="${TD} min-w-40">
        <input type="text" data-field="ctaSecondary" value="${esc(a?.ctaSecondary ?? "")}"
          placeholder="Secondary CTA" autocomplete="off" class="${CTRL}">
      </td>
      <td class="${TD} min-w-40">
        <input type="text" data-field="ctaTertiary" value="${esc(a?.ctaTertiary ?? "")}"
          placeholder="Tertiary CTA" autocomplete="off" class="${CTRL}">
      </td>
      <td class="${TD} min-w-44">
        <input type="text" data-field="notes" value="${esc(a?.notes ?? "")}"
          placeholder="Optional note" autocomplete="off" class="${CTRL}">
      </td>
      <td class="${TD} text-right text-xs text-grey-60">#${i + 1}</td>
    </tr>`;
}

function render() {
  document.getElementById("app")!.innerHTML = `
    <div class="mx-auto max-w-[100rem] px-5 pt-10 pb-24">
      <h1 class="text-3xl font-bold text-rmit-blue">Linking eDMs to student experience questions</h1>
      <p class="mt-2 max-w-3xl text-grey-80">
        Every 2026 domestic school leaver eDM, with the student question we think it answers on the
        Current State Touch Points map.
      </p>
      <div class="mt-4 max-w-3xl rounded-lg border border-grey-30 bg-card p-4 text-sm text-grey-80">
        <p class="font-semibold text-grey-90">How this works</p>
        <ul class="mt-2 list-disc pl-5">
          <li>The question we picked is already selected. If it looks right, tick the box.</li>
          <li>If it looks wrong, choose a different one. The list is grouped by journey stage.</li>
          <li>You can also choose &lsquo;Doesn&rsquo;t answer a student question&rsquo; or &lsquo;Other&rsquo;.</li>
          <li>Skip anything you&rsquo;re not sure about. Answers save as you go.</li>
        </ul>
      </div>
      <div id="banner" class="mt-4"></div>

      <div class="sticky top-0 z-20 -mx-5 mt-5 border-b border-grey-30 bg-surface px-5 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-grey-80"><b id="done" class="text-rmit-blue">0</b> of ${ROWS.length} reviewed</p>
            <div class="mt-1.5 h-1.5 w-52 overflow-hidden rounded-full bg-grey-30">
              <div id="fill" class="h-full w-0 bg-success transition-[width] duration-300"></div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-grey-70">Reviewed by
              <input id="reviewer" type="text" value="${esc(reviewer)}" placeholder="Your name (optional)"
                autocomplete="off" class="${CTRL} w-44">
            </label>
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

      <div class="mt-4 overflow-x-auto rounded-lg border border-grey-30 bg-card">
        <table class="w-full border-collapse">
          <thead class="bg-grey-10">
            <tr>
              <th class="${TH} w-10 text-center">✓</th>
              <th class="${TH}">Send</th>
              <th class="${TH}">eDM</th>
              <th class="${TH}">Campaign / stage</th>
              <th class="${TH}">Question it answers</th>
              <th class="${TH}">Primary CTA</th>
              <th class="${TH}">Secondary CTA</th>
              <th class="${TH}">Tertiary CTA</th>
              <th class="${TH}">Notes</th>
              <th class="${TH} text-right">#</th>
            </tr>
          </thead>
          <tbody>${ROWS.filter(visible).map((r) => row(r, ROWS.indexOf(r))).join("")}</tbody>
        </table>
      </div>

      <p class="mt-6 max-w-3xl rounded-lg border border-grey-30 bg-card p-4 text-sm text-grey-70">
        <b class="text-grey-90">Answers save automatically.</b> There is nothing to submit and no file to send back.
        More than one person can fill this in at once.
      </p>
      <footer class="mt-7 border-t border-grey-30 pt-4 text-xs text-grey-60">
        RMIT EDC, Current State Touch Points. Persona 01, domestic school leaver (VTAC).
        Sends from the 2026 DOM eDM Planner.
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

const banner = (html: string) => { document.getElementById("banner")!.innerHTML = html; };

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
      <b>Your last answer didn&rsquo;t save.</b> ${esc((err as Error).message)} Your answers are still on screen and will
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

/** Dropdown choice → the stored verdict/question pair. */
function fromChoice(r: Row, value: string, custom?: string): Partial<Answer> {
  if (value === UNSURE) return { verdict: "unsure", question: undefined };
  if (value === NONE) return { verdict: "none", question: undefined };
  if (value === OTHER) return { verdict: "wrong", question: custom ?? answers.get(r.id)?.question ?? "" };
  if (value === "") return { verdict: "", question: undefined };
  return value === r.q ? { verdict: "yes", question: undefined } : { verdict: "wrong", question: value };
}

// ── events (delegated, so re-renders never lose handlers) ──────────────────
document.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement | HTMLSelectElement;
  const tr = el.closest<HTMLTableRowElement>("tr[data-id]");
  if (!tr) return;
  const r = ROWS.find((x) => x.id === tr.dataset.id)!;

  if (el.dataset.field === "question") {
    update(r.id, fromChoice(r, (el as HTMLSelectElement).value), 300);
    render();
  } else if (el.dataset.field === "reviewed") {
    const on = (el as HTMLInputElement).checked;
    // Ticking with nothing chosen means "our proposal is right".
    update(r.id, on ? fromChoice(r, selected(r)) : { verdict: "" }, 300);
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
  const tr = el.closest<HTMLTableRowElement>("tr[data-id]");
  if (!tr) return;
  if (el.dataset.field === "notes") update(tr.dataset.id!, { notes: el.value }, 1200);
  if (el.dataset.field === "other") update(tr.dataset.id!, { verdict: "wrong", question: el.value }, 1200);
  if (el.dataset.field === "ctaPrimary") update(tr.dataset.id!, { ctaPrimary: el.value }, 1200);
  if (el.dataset.field === "ctaSecondary") update(tr.dataset.id!, { ctaSecondary: el.value }, 1200);
  if (el.dataset.field === "ctaTertiary") update(tr.dataset.id!, { ctaTertiary: el.value }, 1200);
});

document.addEventListener("click", (ev) => {
  const f = (ev.target as HTMLElement).closest<HTMLButtonElement>("button[data-filter]");
  if (!f) return;
  filter = f.dataset.filter as typeof filter;
  render();
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
