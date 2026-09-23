// Metrics catalogue — /metrics. A working document: team → touchpoint type →
// the metrics that type has, where each lives, whether we have access.
//
// The committed CSV (data/metrics-catalogue.csv) is the baseline. Every edit
// made here — change a field, confirm a row, add or remove a metric — saves
// to the "metrics-catalogue" collection as you go, and is layered over the
// CSV on load. scripts/apply-metrics-catalogue.mjs folds the edits back into
// the CSV when you want git to catch up. Definitions and sources only, never
// figures. Plain TS + Tailwind, same shape as /marketing-edms.
import "../src/index.css";
import raw from "../data/metrics-catalogue.csv?raw";

interface Metric {
  metricId: string;
  team: string;
  type: string;
  metric: string;
  definition: string;
  unit: string;
  benchmark: string;
  level: string;
  system: string;
  owner: string;
  access: string;
  joinKey: string;
  notes: string;
  confirmed: boolean;
  deleted?: boolean;
}
type Field = Exclude<keyof Metric, "metricId" | "confirmed" | "deleted">;

const FIELDS: { key: Field; label: string; wide?: boolean; list?: string[] }[] = [
  { key: "metric", label: "Metric" },
  { key: "unit", label: "Unit" },
  { key: "definition", label: "Definition", wide: true },
  { key: "benchmark", label: "Benchmark" },
  { key: "level", label: "Benchmark level", list: ["Touchpoint", "Channel", "None exists", "n/a"] },
  { key: "system", label: "Source system" },
  { key: "owner", label: "Source owner" },
  { key: "access", label: "Access", list: ["Yes", "Requested", "No", "Via Study@ export", "Via export"] },
  { key: "joinKey", label: "Join key to the map" },
  { key: "notes", label: "Notes", wide: true },
  { key: "team", label: "Team" },
  { key: "type", label: "Touchpoint type" },
];

// ── baseline from the CSV ─────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const table = parseCsv(raw);
const header = table[0];
const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? "").trim();
const seen = new Map<string, number>();
const BASE: Metric[] = table.slice(1).map((r) => {
  const team = col(r, "team"), type = col(r, "touchpoint_type"), metric = col(r, "metric");
  let id = `${slug(team)}.${slug(type)}.${slug(metric) || "metric"}`;
  const n = (seen.get(id) ?? 0) + 1;
  seen.set(id, n);
  if (n > 1) id = `${id}-${n}`;
  return {
    metricId: id, team, type, metric,
    definition: col(r, "definition"), unit: col(r, "unit"), benchmark: col(r, "benchmark"),
    level: col(r, "benchmark_level"), system: col(r, "source_system"), owner: col(r, "source_owner"),
    access: col(r, "access"), joinKey: col(r, "join_key"), notes: col(r, "notes"),
    confirmed: /^(yes|true|1)$/i.test(col(r, "confirmed")),
  };
});

// ── state ─────────────────────────────────────────────────────────────────
const edits = new Map<string, Metric>(); // saved overrides + new rows, by id
let team = BASE[0]?.team ?? "";
let type = "";
let editing: string | null = null; // row currently expanded for editing
let banner = "";

const rows = (): Metric[] => {
  const byId = new Map(BASE.map((m) => [m.metricId, m]));
  for (const [id, e] of edits) byId.set(id, e);
  return [...byId.values()].filter((m) => !m.deleted);
};
const uniq = (xs: string[]) => [...new Set(xs)];
const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rmit-blue-interactive";
const CTRL =
  "w-full rounded-md border border-grey-30 bg-card px-2.5 py-1.5 text-sm text-grey-90 placeholder:text-grey-60 " +
  "focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";
const LINK = `rounded px-1 text-xs text-rmit-blue-interactive hover:underline ${FOCUS}`;

// ── rendering ─────────────────────────────────────────────────────────────
function access(a: string): string {
  const on = /^yes/i.test(a);
  const via = /^via|^requested/i.test(a);
  const dot = on ? "bg-success" : via ? "bg-rmit-blue-interactive" : "bg-danger";
  return `<span class="inline-flex items-center gap-1.5"><span class="size-1.5 rounded-full ${dot}" aria-hidden></span>${esc(a || "No source yet")}</span>`;
}

/** The usual value for a group — shown once in the header; rows only say
 *  where they differ from it. */
function shared(ms: Metric[]) {
  const most = (k: Field) => {
    const counts = new Map<string, number>();
    for (const m of ms) if (m[k]) counts.set(m[k], (counts.get(m[k]) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    return top && top[1] > ms.length / 2 ? top[0] : "";
  };
  return { system: most("system"), owner: most("owner"), access: most("access"), joinKey: most("joinKey") };
}

function view(m: Metric, common: ReturnType<typeof shared>): string {
  const meta = [
    m.system !== common.system && m.system && esc(m.system),
    m.owner !== common.owner && m.owner && esc(m.owner),
    m.access !== common.access && m.access && access(m.access),
    m.joinKey !== common.joinKey && m.joinKey && `<code class="rounded bg-grey-10 px-1">${esc(m.joinKey)}</code>`,
    m.benchmark && `Benchmark ${esc(m.benchmark)}${m.level ? ` (${esc(m.level.toLowerCase())})` : ""}`,
  ].filter(Boolean) as string[];
  return `<li data-id="${esc(m.metricId)}" class="group grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[1.25rem_13rem_1fr]">
      <input type="checkbox" data-action="confirm" ${m.confirmed ? "checked" : ""}
        aria-label="Confirmed: ${esc(m.metric)}" title="Confirmed by the source owner"
        class="mt-0.5 size-4 accent-rmit-blue ${FOCUS}">
      <div class="text-sm font-semibold ${m.confirmed ? "text-grey-90" : "text-grey-80"}">${esc(m.metric || "Untitled metric")}${m.unit ? ` <span class="font-normal text-grey-60">${esc(m.unit)}</span>` : ""}</div>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-grey-80">${esc(m.definition)}</p>
          ${meta.length ? `<p class="mt-0.5 text-xs text-grey-60">${meta.join(" · ")}</p>` : ""}
          ${m.notes ? `<p class="mt-0.5 text-xs text-grey-60">${esc(m.notes)}</p>` : ""}
        </div>
        <button type="button" data-action="edit" class="${LINK} shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">Edit</button>
      </div>
    </li>`;
}

function form(m: Metric): string {
  const teams = uniq(rows().map((r) => r.team));
  const types = uniq(rows().filter((r) => r.team === m.team).map((r) => r.type));
  const input = (f: (typeof FIELDS)[number]) => {
    const list = f.key === "team" ? teams : f.key === "type" ? types : f.list;
    const id = `dl-${m.metricId}-${f.key}`;
    return `<label class="flex flex-col gap-1 ${f.wide ? "sm:col-span-2" : ""}">
        <span class="text-xs text-grey-60">${f.label}</span>
        <input type="text" data-field="${f.key}" value="${esc(m[f.key])}" ${list ? `list="${id}"` : ""}
          autocomplete="off" class="${CTRL} ${f.key === "metric" ? "font-semibold" : ""}">
        ${list ? `<datalist id="${id}">${list.map((v) => `<option value="${esc(v)}">`).join("")}</datalist>` : ""}
      </label>`;
  };
  return `<li data-id="${esc(m.metricId)}" class="my-2 rounded-lg border border-rmit-blue-interactive bg-card p-4">
      <div class="grid gap-3 sm:grid-cols-2">${FIELDS.map(input).join("")}</div>
      <div class="mt-4 flex items-center justify-between">
        <button type="button" data-action="done" class="rounded-full bg-rmit-blue px-4 py-1.5 text-sm font-medium text-on-accent ${FOCUS}">Done</button>
        <button type="button" data-action="remove" class="rounded px-1 text-xs text-danger hover:underline ${FOCUS}">Remove this metric</button>
      </div>
    </li>`;
}

function section(t: string, ms: Metric[]): string {
  const common = shared(ms);
  const line = [
    common.system ? esc(common.system) : "",
    common.owner ? esc(common.owner) : "",
    common.access ? access(common.access) : "",
    common.joinKey ? `<code class="rounded bg-grey-10 px-1">${esc(common.joinKey)}</code>` : "",
  ].filter(Boolean).join(" · ");
  return `<section class="mt-8" data-type="${esc(t)}">
      <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-grey-30 pb-2">
        <h2 class="text-base font-semibold text-grey-90">${esc(t || "New touchpoint type")}</h2>
        ${line ? `<p class="text-xs text-grey-60">${line}</p>` : ""}
      </div>
      <ul class="divide-y divide-grey-30">${ms.map((m) => (editing === m.metricId ? form(m) : view(m, common))).join("")}</ul>
      <button type="button" data-action="add" data-type="${esc(t)}" class="${LINK} mt-2">+ Add a metric to ${esc(t || "this type")}</button>
    </section>`;
}

function render() {
  const all = rows();
  const teams = uniq(all.map((m) => m.team));
  if (!teams.includes(team)) team = teams[0] ?? "";
  const inTeam = all.filter((m) => m.team === team);
  const types = uniq(inTeam.map((m) => m.type));
  if (type && !types.includes(type)) type = "";
  const shown = type ? inTeam.filter((m) => m.type === type) : inTeam;
  const gaps = inTeam.filter((m) => !m.benchmark && m.level !== "n/a").length;
  const confirmed = inTeam.filter((m) => m.confirmed).length;

  const teamTabs = teams.map(
    (t) => `<button type="button" data-team="${esc(t)}" aria-pressed="${t === team}"
        class="rounded-full px-4 py-2 text-sm transition-colors ${FOCUS} ${
          t === team ? "bg-rmit-blue text-on-accent font-semibold" : "text-grey-80 hover:bg-grey-20"
        }">${esc(t || "New team")}<span class="ml-1.5 text-xs ${t === team ? "text-on-accent/70" : "text-grey-60"}">${all.filter((m) => m.team === t).length}</span></button>`,
  ).join("");

  const chip = (label: string, value: string, on: boolean, n: number) =>
    `<button type="button" data-type-filter="${esc(value)}" aria-pressed="${on}"
        class="rounded-full border px-3 py-1.5 text-sm transition-colors ${FOCUS} ${
          on ? "border-grey-90 bg-grey-90 text-on-accent" : "border-grey-30 bg-card text-grey-80 hover:bg-grey-10"
        }">${esc(label)} <span class="${on ? "text-on-accent/70" : "text-grey-60"}">${n}</span></button>`;
  const chips = [chip("All", "", type === "", inTeam.length)]
    .concat(types.map((t) => chip(t || "New touchpoint type", t, type === t, inTeam.filter((m) => m.type === t).length)))
    .join("");

  const groups = type ? [type] : types;

  document.getElementById("app")!.innerHTML = `
    <div class="mx-auto max-w-4xl px-5 pt-10 pb-24">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-3xl font-bold text-rmit-blue">Metrics Catalogue</h1>
          <p class="mt-2 max-w-3xl text-grey-80">Every metric per touchpoint type for the Change of Preference pilot — where it lives and whether we can get it.</p>
        </div>
        <span id="status" class="text-xs text-grey-60">All changes saved</span>
      </div>
      ${banner}

      <nav aria-label="Team" class="mt-6 flex flex-wrap gap-1 rounded-full border border-grey-30 bg-grey-10 p-1">${teamTabs}
        <button type="button" data-action="add-team" class="rounded-full px-3 py-2 text-sm text-grey-60 hover:bg-grey-20 ${FOCUS}">+ Team</button>
      </nav>

      <div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Touchpoint type">${chips}
        <button type="button" data-action="add-type" class="rounded-full border border-dashed border-grey-30 px-3 py-1.5 text-sm text-grey-60 hover:bg-grey-10 ${FOCUS}">+ Type</button>
      </div>

      <p class="mt-4 text-sm text-grey-70">
        <b class="text-grey-90">${shown.length}</b> metric${shown.length === 1 ? "" : "s"}
        · <b class="text-grey-90">${confirmed}</b> confirmed
        · <b class="text-grey-90">${gaps}</b> without a benchmark
      </p>

      ${groups.map((g) => section(g, shown.filter((m) => m.type === g))).join("")}

      <footer class="mt-10 border-t border-grey-30 pt-4 text-xs text-grey-60">
        Tick a row once its source owner has confirmed it. Edits save as you go; the baseline is <code>data/metrics-catalogue.csv</code>.
      </footer>
    </div>`;
  if (editing) document.querySelector<HTMLInputElement>(`li[data-id="${CSS.escape(editing)}"] input[data-field="metric"]`)?.focus();
}

// ── saving ────────────────────────────────────────────────────────────────
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function setStatus(text: string, tone: "idle" | "saving" | "error" = "idle") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text;
  el.className = `text-xs ${tone === "error" ? "text-danger" : tone === "saving" ? "text-rmit-blue-interactive" : "text-grey-60"}`;
}
async function save(id: string) {
  const m = edits.get(id);
  if (!m) return;
  setStatus("Saving…", "saving");
  try {
    const res = await fetch("/api/collection/metrics-catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || `The server returned ${res.status}`);
    }
    setStatus("All changes saved");
    banner = "";
  } catch (err) {
    setStatus("Not saved", "error");
    banner = `<div role="alert" class="mt-4 rounded-lg border border-danger bg-tint-red px-4 py-3 text-sm text-grey-90">
      <b>Your last change didn&rsquo;t save.</b> ${esc((err as Error).message)} It&rsquo;s still on screen and will save when the connection is back.</div>`;
    render();
  }
}
function patch(id: string, p: Partial<Metric>, ms = 800) {
  const cur = edits.get(id) ?? BASE.find((m) => m.metricId === id);
  if (!cur) return;
  edits.set(id, { ...cur, ...p });
  clearTimeout(pending.get(id));
  pending.set(id, setTimeout(() => save(id), ms));
}
function blank(t: string, ty: string): Metric {
  return {
    metricId: `new.${Date.now().toString(36)}`, team: t, type: ty, metric: "", definition: "", unit: "",
    benchmark: "", level: "", system: "", owner: "", access: "", joinKey: "", notes: "", confirmed: false,
  };
}

// ── events (delegated, so re-renders never lose handlers) ──────────────────
document.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>("button, input[type=checkbox]");
  if (!el) return;
  const t = el.dataset.team;
  if (t !== undefined) { team = t; type = ""; editing = null; render(); return; }
  const tf = el.dataset.typeFilter;
  if (tf !== undefined) { type = tf; editing = null; render(); return; }

  const id = el.closest<HTMLLIElement>("li[data-id]")?.dataset.id;
  switch (el.dataset.action) {
    case "edit": editing = id!; render(); break;
    case "done": editing = null; render(); break;
    case "confirm": patch(id!, { confirmed: (el as HTMLInputElement).checked }, 300); break;
    case "remove":
      if (window.confirm("Remove this metric from the catalogue?")) {
        patch(id!, { deleted: true }, 0);
        editing = null;
        render();
      }
      break;
    case "add":
    case "add-type":
    case "add-team": {
      const m = blank(el.dataset.action === "add-team" ? "" : team, el.dataset.action === "add" ? el.dataset.type! : "");
      edits.set(m.metricId, m);
      editing = m.metricId;
      if (el.dataset.action === "add-team") team = "";
      type = "";
      render();
      break;
    }
  }
});

document.addEventListener("input", (ev) => {
  const el = ev.target as HTMLInputElement;
  const f = el.dataset.field as Field | undefined;
  const id = el.closest<HTMLLIElement>("li[data-id]")?.dataset.id;
  if (!f || !id) return;
  patch(id, { [f]: el.value } as Partial<Metric>);
  // Team / type changes move the row; the view follows it on Done.
  if (f === "team") team = el.value;
  if (f === "type" && type) type = el.value;
});

// ── boot ──────────────────────────────────────────────────────────────────
render();
fetch("/api/collection/metrics-catalogue")
  .then(async (res) => {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || `The server returned ${res.status}`);
    }
    return res.json() as Promise<Record<string, Metric>>;
  })
  .then((saved) => {
    // Overrides for rows the CSV no longer has (renamed, removed) are stale —
    // only rows added on this page ("new.…") stand on their own.
    const base = new Set(BASE.map((m) => m.metricId));
    for (const [id, m] of Object.entries(saved)) {
      if (!base.has(id) && !id.startsWith("new.")) continue;
      edits.set(id, { ...m, metricId: id });
    }
    render();
  })
  .catch((err: Error) => {
    banner = `<div role="alert" class="mt-4 rounded-lg border border-amber bg-tint-amber px-4 py-3 text-sm text-grey-90">
      <b>Edits can&rsquo;t be saved yet.</b> ${esc(err.message)}</div>`;
    setStatus("Not connected", "error");
    render();
  });
