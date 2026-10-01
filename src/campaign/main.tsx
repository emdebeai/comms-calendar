// Campaign review — /campaign/?campaign=<id>. Five sections, top to bottom,
// each one kind of view: the outcome (a number), the touchpoints (a table),
// where we lost sight of the student (a list of fixes), the pulse (a chart),
// and the questions we didn't answer (a list). The journey map is a link
// for context; the touchpoint panel is the map's own.
import { Fragment, StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, ExternalLink, Minus } from "lucide-react";
import "../index.css";
import { CommDetailPanel } from "../components/CommDetailPanel";
import { CampaignSections } from "../components/CampaignSections";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "../components/icons";
import { linkedCommIds, stageQuestions } from "../data/studentExperience";
import type { Comm } from "../data/types";
import {
  CAMPAIGN,
  OBJECTIVE_LABEL,
  STUDY_BY_DAY,
  WEB_BY_DAY,
  campaignComms,
  campaignInfo,
  compare,
  dayNumber,
  gapsFor,
  headline,
  shortDate,
  type Gap,
  type MetricValue,
} from "../lib/campaign";
import { addFeedbackEntry, loadFeedback, type FeedbackStore } from "../lib/feedback";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

const BLUE = "var(--color-rmit-blue-interactive)";
const MAP_HREF = `/?campaign=${CAMPAIGN.id}`;

// ── shared bits ───────────────────────────────────────────────────────────
const fmt = (s: string) => (/^\d+$/.test(s) ? Number(s).toLocaleString() : s);

function Judged({ v }: { v: MetricValue }) {
  const cmp = compare(v);
  const tone = cmp === "better" ? "text-success" : cmp === "worse" ? "text-danger" : "text-grey-90";
  const Arrow = cmp === "better" ? ArrowUpRight : cmp === "worse" ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`font-semibold ${tone}`}>{fmt(v.value)}</span>
      {v.benchmark ? (
        <span className={`inline-flex items-center gap-0.5 text-xs ${cmp === "better" ? "text-success" : cmp === "worse" ? "text-danger" : "text-grey-60"}`}>
          <Arrow size={12} strokeWidth={2} aria-hidden />
          <span className="sr-only">{cmp === "better" ? "better than" : cmp === "worse" ? "worse than" : "level with"} benchmark </span>
          {v.benchmark}
        </span>
      ) : (
        <span className="text-xs text-grey-60 italic">no benchmark</span>
      )}
    </span>
  );
}

function Section({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="flex items-baseline gap-3 text-xl font-semibold text-grey-90">
          <span className="text-base font-normal text-grey-60">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ── 1 · the outcome ───────────────────────────────────────────────────────
// What the campaign asked for was action: people who clicked through from
// a send to a campaign page. The outcome metric itself (preference shift)
// isn't measurable yet, so this is the honest proxy, stated as such.
function Outcome() {
  const sends = campaignComms.filter((c) => c.type === "email" || c.type === "sms");
  let people = 0, measured = 0, total = 0;
  for (const c of sends) {
    const i = campaignInfo(c.id);
    if (!i) continue;
    for (const ch of i.chainsOut) {
      total++;
      if (ch.measured && ch.people) {
        measured++;
        people += ch.people;
      }
    }
  }
  const delivered = sends.reduce((a, c) => a + (Number((campaignInfo(c.id)?.values.find((v) => /delivered/i.test(v.metric))?.value ?? "0").replace(/,/g, "")) || 0), 0);
  return (
    <div className="mt-4 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-end">
      <div>
        <p className="text-5xl font-semibold text-grey-90">{people.toLocaleString()}</p>
        <p className="mt-1 text-sm text-grey-70">people clicked through from a send to a campaign page</p>
      </div>
      <dl className="grid max-w-md gap-1 text-sm">
        <div className="flex justify-between gap-4 border-b border-grey-30 py-1"><dt className="text-grey-70">Sends delivered</dt><dd className="font-semibold text-grey-90">{delivered.toLocaleString()}</dd></div>
        <div className="flex justify-between gap-4 border-b border-grey-30 py-1"><dt className="text-grey-70">Hand-offs we could count</dt><dd className="font-semibold text-grey-90">{measured} of {total}</dd></div>
        <div className="flex justify-between gap-4 border-b border-grey-30 py-1"><dt className="text-grey-70">Against last year</dt><dd className="text-grey-60 italic">not available</dd></div>
        <div className="flex justify-between gap-4 py-1"><dt className="text-grey-70">Preference shift (the outcome)</dt><dd className="text-grey-60 italic">not yet measurable</dd></div>
      </dl>
    </div>
  );
}

// ── 2 · the touchpoints ───────────────────────────────────────────────────
type Row = { comm: Comm; variants: Comm[] };
function rank(c: Comm): number {
  const i = campaignInfo(c.id);
  const h = i ? headline(c, i) : undefined;
  const cmp = h ? compare(h.value) : null;
  return cmp === "worse" ? 0 : cmp === null ? 1 : cmp === "level" ? 2 : 3;
}
function followed(c: Comm): { label: string; tone: string } {
  const i = campaignInfo(c.id);
  if (!i) return { label: "—", tone: "text-grey-60" };
  if (c.type === "webpage") {
    return i.nextSteps.length ? { label: "Yes", tone: "text-grey-90" } : { label: "No next steps", tone: "text-amber" };
  }
  if (!i.chainsOut.length) return { label: "Nowhere recorded", tone: "text-amber" };
  const bad = i.chainsOut.filter((ch) => !ch.measured);
  if (!bad.length) return { label: "Yes", tone: "text-grey-90" };
  if (bad.some((ch) => ch.utm === false)) return { label: "No — no UTM", tone: "text-amber" };
  return { label: "No — not measured", tone: "text-amber" };
}

function TouchpointTable({ onOpen }: { onOpen: (id: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rows: Row[] = useMemo(() => {
    const groups = new Map<string, Row>();
    for (const c of campaignComms) {
      const key = `${c.team}|${c.title}`;
      const g = groups.get(key);
      if (g) g.variants.push(c);
      else groups.set(key, { comm: c, variants: [c] });
    }
    return [...groups.values()].sort((a, b) => Math.min(...a.variants.map(rank)) - Math.min(...b.variants.map(rank)));
  }, []);
  const TEAM: Record<string, string> = { marketing: "Marketing", recruitment: "Recruitment and events", digital: "Digital" };
  const TD = "px-3 py-2.5 align-top text-sm";
  const line = (c: Comm, isVariant: boolean) => {
    const i = campaignInfo(c.id)!;
    const h = headline(c, i);
    const f = followed(c);
    const Icon = COMM_ICONS[c.type];
    const colors = COMM_COLORS[c.type];
    return (
      <tr key={c.id} className={`border-t border-grey-30 ${isVariant ? "bg-grey-10/60" : ""}`}>
        <td className={`${TD} ${isVariant ? "pl-12" : ""}`}>
          <button type="button" onClick={() => onOpen(c.id)} className={`flex items-center gap-2 rounded text-left hover:underline ${FOCUS_RING}`}>
            {!isVariant && (
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}>
                <Icon size={13} strokeWidth={2} aria-hidden />
              </span>
            )}
            <span className="text-grey-90">{isVariant ? c.audience : c.title}</span>
            {i.new2026 && !isVariant && <span className="rounded-sm border border-grey-60 px-1 text-[10px] font-semibold tracking-wider text-grey-70 uppercase">New</span>}
          </button>
        </td>
        <td className={`${TD} whitespace-nowrap text-grey-70`}>{isVariant ? "" : `${TEAM[c.team] ?? c.team} · ${COMM_LABELS[c.type]}`}</td>
        <td className={`${TD} whitespace-nowrap text-grey-70`}>{c.type === "webpage" ? "All window" : `${Math.round((c.month % 1) * 30) + 1} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Math.floor(c.month) % 12]}`}</td>
        <td className={`${TD} text-grey-90`}>{i.objective ? OBJECTIVE_LABEL[i.objective] : <span className="text-amber">Not set</span>}</td>
        <td className={`${TD} text-grey-70`}>{h?.label ?? <span className="text-grey-60">—</span>}</td>
        <td className={`${TD} whitespace-nowrap`}>{h ? <Judged v={h.value} /> : <span className="text-grey-60 italic">not measured</span>}</td>
        <td className={`${TD} whitespace-nowrap ${f.tone}`}>{f.label}</td>
      </tr>
    );
  };
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-grey-30 bg-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className={`bg-grey-10 text-grey-70 ${EYEBROW}`}>
            <th className="px-3 py-2 font-semibold">Touchpoint</th>
            <th className="px-3 py-2 font-semibold">Team</th>
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold">Objective</th>
            <th className="px-3 py-2 font-semibold">Success measure</th>
            <th className="px-3 py-2 font-semibold">Result</th>
            <th className="px-3 py-2 font-semibold">Next step followed?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ comm, variants }) => {
            if (variants.length === 1) return line(comm, false);
            const isOpen = open.has(comm.id);
            const i = campaignInfo(comm.id)!;
            const hs = variants.map((v) => headline(v, campaignInfo(v.id)!)).filter(Boolean) as { value: MetricValue; label: string }[];
            const worst = variants.map(rank).some((r) => r === 0);
            const range = hs.length ? `${Math.min(...hs.map((h) => parseFloat(h.value.value)))}–${Math.max(...hs.map((h) => parseFloat(h.value.value)))}%` : "";
            const Icon = COMM_ICONS[comm.type];
            const colors = COMM_COLORS[comm.type];
            return (
              <Fragment key={comm.id}>
                <tr className="border-t border-grey-30">
                  <td className={TD}>
                    <button type="button" onClick={() => setOpen((s) => { const n = new Set(s); n.has(comm.id) ? n.delete(comm.id) : n.add(comm.id); return n; })} aria-expanded={isOpen} className={`flex items-center gap-2 rounded text-left ${FOCUS_RING}`}>
                      {isOpen ? <ChevronDown size={14} strokeWidth={2} className="text-grey-60" aria-hidden /> : <ChevronRight size={14} strokeWidth={2} className="text-grey-60" aria-hidden />}
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}><Icon size={13} strokeWidth={2} aria-hidden /></span>
                      <span className="text-grey-90">{comm.title}</span>
                      <span className="text-xs text-grey-60">{variants.length} variants</span>
                      {i.new2026 && <span className="rounded-sm border border-grey-60 px-1 text-[10px] font-semibold tracking-wider text-grey-70 uppercase">New</span>}
                    </button>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-grey-70`}>{TEAM[comm.team] ?? comm.team} · {COMM_LABELS[comm.type]}</td>
                  <td className={`${TD} whitespace-nowrap text-grey-70`}>{`${Math.round((comm.month % 1) * 30) + 1} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Math.floor(comm.month) % 12]}`}</td>
                  <td className={`${TD} text-grey-90`}>{i.objective ? OBJECTIVE_LABEL[i.objective] : <span className="text-amber">Not set</span>}</td>
                  <td className={`${TD} text-grey-70`}>{hs[0]?.label ?? "—"}</td>
                  <td className={`${TD} whitespace-nowrap`}><span className={`font-semibold ${worst ? "text-danger" : "text-grey-90"}`}>{range}</span><span className="ml-1.5 text-xs text-grey-60">across variants</span></td>
                  <td className={`${TD} whitespace-nowrap ${followed(comm).tone}`}>{followed(comm).label}</td>
                </tr>
                {isOpen && variants.map((v) => line(v, true))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 3 · where we lost sight of the student ────────────────────────────────
const FIX: Record<Gap["kind"], string> = {
  "chain-broken": "Measure the next step — a tracked link, a registration source field, or a Salesforce referrer.",
  "no-chain": "Record where the CTA goes.",
  "no-utm": "Add a UTM to the CTA so the page can attribute the visit to this send.",
  "not-measured": "Load the metrics export for this touchpoint.",
  "no-benchmark": "Set a benchmark (touchpoint-level, or the channel's).",
  "no-cvp": "Write down the value proposition.",
};
function LostSight({ onOpen }: { onOpen: (id: string) => void }) {
  const kinds: Gap["kind"][] = ["no-utm", "no-chain", "chain-broken", "not-measured"];
  const items = kinds.map((kind) => ({ kind, comms: campaignComms.filter((c) => gapsFor(c).some((g) => g.kind === kind)) })).filter((x) => x.comms.length);
  if (!items.length) return <p className="mt-4 text-sm text-grey-70">Every hand-off can be followed.</p>;
  return (
    <ul className="mt-4 divide-y divide-grey-30 rounded-lg border border-grey-30 bg-card">
      {items.map(({ kind, comms }) => (
        <li key={kind} className="grid gap-x-8 gap-y-2 px-4 py-3 sm:grid-cols-[16rem_1fr]">
          <div>
            <p className="text-sm font-semibold text-grey-90">{gapsFor(comms[0]).find((g) => g.kind === kind)?.label} <span className="font-normal text-grey-60">· {comms.length}</span></p>
            <p className="mt-0.5 text-xs text-grey-70">{FIX[kind]}</p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {comms.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} className={`rounded text-sm text-grey-90 hover:underline ${FOCUS_RING}`}>
                  {c.title}{c.audience && campaignComms.filter((x) => x.title === c.title).length > 1 ? <span className="text-grey-60"> · {c.audience}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// ── 4 · the pulse ─────────────────────────────────────────────────────────
function Pulse() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const d0 = dayNumber(CAMPAIGN.from), d1 = dayNumber(CAMPAIGN.to), n = d1 - d0 + 1;
  const dayW = width / n;
  const x = (iso: string) => (dayNumber(iso) - d0 + 0.5) * dayW;
  const sends = campaignComms.filter((c) => c.type !== "webpage");
  const iso = (c: Comm) => `${new Date().getFullYear() + Math.floor((c.month - 24) / 12)}-${String((Math.floor(c.month) % 12) + 1).padStart(2, "0")}-${String(Math.round((c.month % 1) * 30) + 1).padStart(2, "0")}`;
  const Chart = ({ series, label, unit, red }: { series: { date: string; value: number; wait?: string }[]; label: string; unit: string; red?: (d: { wait?: string }) => boolean }) => {
    const H = 110, TOP = 24, BASE = H - 20;
    const max = Math.max(...series.map((s) => s.value));
    const y = (v: number) => BASE - (v / max) * (BASE - TOP);
    const line = series.map((s, i) => `${i ? "L" : "M"}${x(s.date).toFixed(1)},${y(s.value).toFixed(1)}`).join(" ");
    const peak = series.reduce((a, b) => (b.value > a.value ? b : a));
    const at = day ? series.find((s) => s.date === day) : undefined;
    return (
      <div className="relative" style={{ height: H }}>
        <p className="absolute top-0 left-0 text-xs text-grey-70">{label}</p>
        <p className="absolute top-0 right-0 text-xs text-grey-70" aria-live="polite">
          {at ? <>{shortDate(at.date)} · <b className="font-semibold text-grey-90">{at.value.toLocaleString()}</b> {unit}{at.wait && <> · wait <b className={`font-semibold ${red?.(at) ? "text-danger" : "text-grey-90"}`}>{at.wait}</b></>}</> : <>peak <b className="font-semibold text-grey-90">{peak.value.toLocaleString()}</b> on {shortDate(peak.date)}</>}
        </p>
        <svg width={width} height={H} className="absolute inset-0" role="img" aria-label={`${label}, peaking at ${peak.value.toLocaleString()} on ${shortDate(peak.date)}`}>
          <rect x={x(CAMPAIGN.coreFrom) - dayW / 2} y={TOP - 6} width={dayW * 3} height={BASE - TOP + 6} fill={BLUE} opacity={0.07} />
          <line x1={0} x2={width} y1={BASE} y2={BASE} stroke="var(--color-grey-30)" />
          <path d={`${line} L${x(series[series.length - 1].date)},${BASE} L${x(series[0].date)},${BASE} Z`} fill={BLUE} opacity={0.08} />
          <path d={line} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />
          {red && series.filter(red).map((s) => <circle key={s.date} cx={x(s.date)} cy={y(s.value)} r={4} fill="var(--color-danger)" stroke="var(--color-card)" strokeWidth={2} />)}
          {day && <line x1={x(day)} x2={x(day)} y1={TOP - 6} y2={BASE} stroke="var(--color-grey-60)" strokeDasharray="2 3" />}
        </svg>
        <table className="sr-only"><caption>{label}</caption><tbody>{series.map((s) => <tr key={s.date}><th>{shortDate(s.date)}</th><td>{s.value}</td></tr>)}</tbody></table>
      </div>
    );
  };
  const overloaded = (d: { wait?: string }) => { const [m] = (d.wait ?? "0:00").split(":").map(Number); return m >= 3; };
  return (
    <div ref={ref} className="relative mt-4 rounded-lg border border-grey-30 bg-card px-4 pt-3 pb-2" onMouseLeave={() => setDay(null)}
      onMouseMove={(e) => { const r = ref.current!.getBoundingClientRect(); const i = Math.floor(((e.clientX - r.left - 16) / (r.width - 32)) * n); setDay(i >= 0 && i < n ? new Date((d0 + i) * 86400000).toISOString().slice(0, 10) : null); }}>
      {/* sends on their day */}
      <div className="relative h-7">
        {sends.map((c, i) => {
          const colors = COMM_COLORS[c.type];
          const same = sends.slice(0, i).filter((o) => iso(o) === iso(c)).length;
          return <button key={c.id} type="button" aria-label={`${c.title}, ${shortDate(iso(c))}`} title={`${c.title} · ${shortDate(iso(c))}`} className={`absolute size-3 -translate-x-1/2 rounded-full ring-2 ring-card ${colors.accent} ${FOCUS_RING}`} style={{ left: x(iso(c)) - 16 + same * 9, top: 6 }} />;
        })}
      </div>
      <div className="flex flex-col gap-4">
        <Chart series={WEB_BY_DAY} label="Website · sessions per day" unit="sessions" />
        <Chart series={STUDY_BY_DAY} label="Study@RMIT · contacts per day" unit="contacts" red={overloaded} />
      </div>
      <div className="relative mt-1 h-5">
        {Array.from({ length: Math.floor((n - 1) / 7) + 1 }, (_, i) => d0 + i * 7).map((d) => (
          <span key={d} className="absolute text-xs text-grey-70" style={{ left: (d - d0 + 0.5) * dayW - 16, transform: "translateX(-50%)" }}>{shortDate(new Date(d * 86400000).toISOString().slice(0, 10))}</span>
        ))}
      </div>
      <p className="mt-1 text-xs text-grey-60">Dots are sends on their day. Red marks days the phone wait passed three minutes. Proxy figures.</p>
    </div>
  );
}

// ── 5 · what students asked that we didn't answer ─────────────────────────
function Questions() {
  const ids = new Set(campaignComms.map((c) => c.id));
  const qs = ["Wait", "Offer"].flatMap((stage) => stageQuestions(stage).map((question) => ({ stage, question, answered: linkedCommIds(stage, question).some((id) => ids.has(id)) })));
  const un = qs.filter((q) => !q.answered);
  return (
    <>
      <p className="mt-1 text-sm text-grey-70">{un.length} of {qs.length} questions students ask in this window have no campaign touchpoint.</p>
      <ul className="mt-3 divide-y divide-grey-30 rounded-lg border border-grey-30 bg-card">
        {un.map((q) => (
          <li key={q.question} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="text-grey-90">{q.question}</span>
            <span className="shrink-0 text-xs text-grey-60">{q.stage}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ── page ──────────────────────────────────────────────────────────────────
function Page() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackStore>({});
  useEffect(() => {
    loadFeedback().then(setFeedback).catch(() => {});
  }, []);
  const open = openId ? campaignComms.find((c) => c.id === openId) : undefined;
  const sendCount = campaignComms.length;
  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-24">
      <p className={`text-grey-70 ${EYEBROW}`}>Campaign review · proxy data</p>
      <h1 className="text-3xl font-bold text-rmit-blue">{CAMPAIGN.name}</h1>
      <p className="mt-1 text-grey-80">{CAMPAIGN.dates} · stage gate {shortDate(CAMPAIGN.stageGate)} · {sendCount} touchpoints</p>
      <a href={MAP_HREF} className={`mt-3 inline-flex items-center gap-1.5 rounded text-sm text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
        See these on the journey map <ExternalLink size={13} strokeWidth={2} aria-hidden />
      </a>

      <Section n={1} title="Did it do its job?"><Outcome /></Section>
      <Section n={2} title="Which touchpoints did theirs?" aside={<p className="text-sm text-grey-70">Worst first. Click a row for the detail.</p>}><TouchpointTable onOpen={setOpenId} /></Section>
      <Section n={3} title="Where did we lose sight of the student?"><LostSight onOpen={setOpenId} /></Section>
      <Section n={4} title="What happened to the people we sent?"><Pulse /></Section>
      <Section n={5} title="What did students ask that we didn't answer?"><Questions /></Section>

      {open && (
        <CommDetailPanel
          comm={open}
          allComms={campaignComms}
          entries={feedback[open.id] ?? []}
          onClose={() => setOpenId(null)}
          onAdd={async (entry) => {
            const saved = await addFeedbackEntry(open.id, entry);
            setFeedback((f) => ({ ...f, [open.id]: [...(f[open.id] ?? []), saved] }));
          }}
          onOpenComm={setOpenId}
          extraSections={<CampaignSections comm={open} allComms={campaignComms} onOpenComm={setOpenId} />}
        />
      )}
    </div>
  );
}

const host = document.getElementById("app")! as HTMLElement & { __root?: ReturnType<typeof createRoot> };
(host.__root ??= createRoot(host)).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
