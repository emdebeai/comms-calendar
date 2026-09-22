// Metrics catalogue — /metrics. Team → touchpoint type → the metrics that
// type has, where each lives, and whether we have access. Reads
// data/metrics-catalogue.csv straight from the repo: edit the CSV, the page
// follows. Plain TS + Tailwind, same shape as /marketing-edms.
import "../src/index.css";
import raw from "../data/metrics-catalogue.csv?raw";

interface Metric {
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
}

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

const table = parseCsv(raw);
const header = table[0];
const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? "").trim();
const METRICS: Metric[] = table.slice(1).map((r) => ({
  team: col(r, "team"),
  type: col(r, "touchpoint_type"),
  metric: col(r, "metric"),
  definition: col(r, "definition"),
  unit: col(r, "unit"),
  benchmark: col(r, "benchmark"),
  level: col(r, "benchmark_level"),
  system: col(r, "source_system"),
  owner: col(r, "source_owner"),
  access: col(r, "access"),
  joinKey: col(r, "join_key"),
  notes: col(r, "notes"),
}));

const TEAMS = [...new Set(METRICS.map((m) => m.team))];
const uniq = (xs: string[]) => [...new Set(xs)];

let team = TEAMS[0];
let type = "";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rmit-blue-interactive";

/** Access as a muted dot + word — scannable without shouting. */
function access(a: string): string {
  const on = /^yes/i.test(a);
  const via = /^via|^requested/i.test(a);
  const dot = on ? "bg-success" : via ? "bg-rmit-blue-interactive" : "bg-danger";
  return `<span class="inline-flex items-center gap-1.5"><span class="size-1.5 rounded-full ${dot}" aria-hidden></span>${esc(a || "No source yet")}</span>`;
}

/** The usual value for a group — shown once in the header; rows only say
 *  where they differ from it. */
function shared(ms: Metric[]): { system: string; owner: string; access: string; joinKey: string } {
  const most = (k: keyof Metric) => {
    const counts = new Map<string, number>();
    for (const m of ms) if (m[k]) counts.set(m[k], (counts.get(m[k]) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    return top && top[1] > ms.length / 2 ? top[0] : "";
  };
  return { system: most("system"), owner: most("owner"), access: most("access"), joinKey: most("joinKey") };
}

function row(m: Metric, common: ReturnType<typeof shared>): string {
  const meta = [
    m.system !== common.system && m.system && esc(m.system),
    m.owner !== common.owner && m.owner && esc(m.owner),
    m.access !== common.access && m.access && access(m.access),
    m.joinKey !== common.joinKey && m.joinKey && `<code class="rounded bg-grey-10 px-1">${esc(m.joinKey)}</code>`,
    m.benchmark && `Benchmark ${esc(m.benchmark)}${m.level ? ` (${esc(m.level.toLowerCase())})` : ""}`,
  ].filter(Boolean) as string[];
  return `<li class="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[14rem_1fr]">
      <div class="text-sm font-semibold text-grey-90">${esc(m.metric || "Not yet defined")}${m.unit ? ` <span class="font-normal text-grey-60">${esc(m.unit)}</span>` : ""}</div>
      <div>
        <p class="text-sm text-grey-80">${esc(m.definition)}</p>
        ${meta.length ? `<p class="mt-0.5 text-xs text-grey-60">${meta.join(" · ")}</p>` : ""}
        ${m.notes ? `<p class="mt-0.5 text-xs text-grey-60">${esc(m.notes)}</p>` : ""}
      </div>
    </li>`;
}

function section(type: string, ms: Metric[]): string {
  const common = shared(ms);
  const line = [
    common.system ? esc(common.system) : "",
    common.owner ? esc(common.owner) : "",
    common.access ? access(common.access) : "",
    common.joinKey ? `<code class="rounded bg-grey-10 px-1">${esc(common.joinKey)}</code>` : "",
  ].filter(Boolean).join(" · ");
  return `<section class="mt-8">
      <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-grey-30 pb-2">
        <h2 class="text-base font-semibold text-grey-90">${esc(type)}</h2>
        ${line ? `<p class="text-xs text-grey-60">${line}</p>` : ""}
      </div>
      <ul class="divide-y divide-grey-30">${ms.map((m) => row(m, common)).join("")}</ul>
    </section>`;
}

function render() {
  const inTeam = METRICS.filter((m) => m.team === team);
  const types = uniq(inTeam.map((m) => m.type));
  if (type && !types.includes(type)) type = "";
  const shown = type ? inTeam.filter((m) => m.type === type) : inTeam;
  const gaps = inTeam.filter((m) => !m.benchmark && m.level !== "n/a").length;
  const noSource = inTeam.filter((m) => !m.system).length;

  const teamTabs = TEAMS.map(
    (t) => `<button type="button" data-team="${esc(t)}" aria-pressed="${t === team}"
        class="rounded-full px-4 py-2 text-sm transition-colors ${FOCUS} ${
          t === team ? "bg-rmit-blue text-on-accent font-semibold" : "text-grey-80 hover:bg-grey-20"
        }">${esc(t)}<span class="ml-1.5 text-xs ${t === team ? "text-on-accent/70" : "text-grey-60"}">${METRICS.filter((m) => m.team === t).length}</span></button>`,
  ).join("");

  const chip = (label: string, value: string, on: boolean, n: number) =>
    `<button type="button" data-type="${esc(value)}" aria-pressed="${on}"
        class="rounded-full border px-3 py-1.5 text-sm transition-colors ${FOCUS} ${
          on ? "border-grey-90 bg-grey-90 text-on-accent" : "border-grey-30 bg-card text-grey-80 hover:bg-grey-10"
        }">${esc(label)} <span class="${on ? "text-on-accent/70" : "text-grey-60"}">${n}</span></button>`;
  const chips = [chip("All", "", type === "", inTeam.length)]
    .concat(types.map((t) => chip(t, t, type === t, inTeam.filter((m) => m.type === t).length)))
    .join("");

  // Group by type when showing everything, so the sections read like the map.
  const groups = type ? [type] : types;

  document.getElementById("app")!.innerHTML = `
    <div class="mx-auto max-w-4xl px-5 pt-10 pb-24">
      <h1 class="text-3xl font-bold text-rmit-blue">Metrics Catalogue</h1>
      <p class="mt-2 max-w-3xl text-grey-80">Every metric per touchpoint type for the Change of Preference pilot — where it lives and whether we can get it.</p>

      <nav aria-label="Team" class="mt-6 flex flex-wrap gap-1 rounded-full border border-grey-30 bg-grey-10 p-1">${teamTabs}</nav>

      <div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Touchpoint type">${chips}</div>

      <p class="mt-4 text-sm text-grey-70">
        <b class="text-grey-90">${shown.length}</b> metric${shown.length === 1 ? "" : "s"}
        · <b class="text-grey-90">${gaps}</b> without a benchmark
        ${noSource ? `· <b class="text-grey-90">${noSource}</b> with no known source` : ""}
      </p>

      ${groups.map((g) => section(g, shown.filter((m) => m.type === g))).join("")}

      <footer class="mt-10 border-t border-grey-30 pt-4 text-xs text-grey-60">
        Source: <code>data/metrics-catalogue.csv</code>. Edit the CSV to change what&rsquo;s here.
      </footer>
    </div>`;
}

document.addEventListener("click", (ev) => {
  const el = ev.target as HTMLElement;
  const t = el.closest<HTMLButtonElement>("button[data-team]");
  if (t) { team = t.dataset.team!; type = ""; render(); return; }
  const c = el.closest<HTMLButtonElement>("button[data-type]");
  if (c) { type = c.dataset.type!; render(); }
});

render();
