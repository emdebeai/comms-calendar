// Campaign page — /campaign/. One campaign (Change of Preference 2026) told
// as a flow ACROSS TEAMS: rows are the teams, columns are the kinds of
// touchpoint a student passes through (sends → pages → events and
// conversations), and the arrows between cards are the hand-offs. Its own
// page and its own data; the map is never touched.
import { StrictMode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Globe,
  Mail,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Minus,
  Phone,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import "../index.css";
import { COMM_COLORS } from "../components/icons";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import {
  CAMPAIGN,
  CHAINS,
  CONTACTS_BY_DAY,
  GAPS,
  GAP_ORDER,
  GAP_TITLES,
  KINDS,
  OUTCOMES,
  QUESTIONS,
  SUMMARY,
  TEAMS,
  TOUCHPOINTS,
  byId,
  chainsOf,
  compare,
  dayNumber,
  headline,
  num,
  referrersFor,
  shortDate,
  type Chain,
  type MetricValue,
  type TouchType,
  type Touchpoint,
} from "./data";

const TYPE: Record<TouchType, { Icon: LucideIcon; label: string; chip: string; text: string; accent: string }> = {
  email: { Icon: Mail, label: "eDM", ...COMM_COLORS.email },
  sms: { Icon: MessageSquare, label: "SMS", ...COMM_COLORS.sms },
  paid: { Icon: Megaphone, label: "Paid media", ...COMM_COLORS.event },
  webinar: { Icon: Video, label: "Webinar", ...COMM_COLORS.webinar },
  webpage: { Icon: Globe, label: "Webpage", ...COMM_COLORS.webpage },
  call: { Icon: Phone, label: "Phone", ...COMM_COLORS.call },
  chat: { Icon: MessagesSquare, label: "Live chat", ...COMM_COLORS.sms },
  inperson: { Icon: Users, label: "Face to face", ...COMM_COLORS.event },
};

const BLUE = "var(--color-rmit-blue-interactive)";
const AMBER = "var(--color-amber)";

// ── small pieces ──────────────────────────────────────────────────────────
function Versus({ v }: { v: MetricValue }) {
  const cmp = compare(v);
  if (!v.benchmark) return null;
  const Arrow = cmp === "better" ? ArrowUpRight : cmp === "worse" ? ArrowDownRight : Minus;
  const tone = cmp === "better" ? "text-success" : cmp === "worse" ? "text-danger" : "text-grey-60";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${tone}`}>
      <Arrow size={12} strokeWidth={2} aria-hidden />
      <span className="sr-only">{cmp === "better" ? "better than" : cmp === "worse" ? "worse than" : "level with"} benchmark</span>
      {v.benchmark}
    </span>
  );
}

/** A rate against its benchmark: a thin bar with the benchmark as a tick. */
function Bullet({ v, label }: { v: MetricValue; label?: string }) {
  const value = num(v.value), bench = v.benchmark ? num(v.benchmark) : NaN;
  const max = Math.max(70, value, Number.isFinite(bench) ? bench : 0) * 1.05;
  return (
    <span className="flex items-center gap-2">
      {label && <span className="w-20 shrink-0 truncate text-xs text-grey-70">{label}</span>}
      <span className="relative h-1.5 min-w-10 flex-1 rounded-full bg-grey-30">
        <span className="absolute inset-y-0 left-0 rounded-full bg-rmit-blue-interactive" style={{ width: `${(value / max) * 100}%` }} />
        {Number.isFinite(bench) && (
          <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-grey-90" style={{ left: `${(bench / max) * 100}%` }} aria-hidden />
        )}
      </span>
      <span className="w-9 shrink-0 text-right text-xs font-semibold text-grey-90">{v.value}</span>
    </span>
  );
}

function Spark({ series }: { series: { date: string; value: number }[] }) {
  const w = 200, h = 28;
  const max = Math.max(...series.map((s) => s.value));
  const pts = series.map((s, i) => [(i / (series.length - 1)) * w, h - 2 - (s.value / max) * (h - 6)] as const);
  const peak = pts[series.findIndex((s) => s.value === max)];
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={BLUE} opacity={0.1} />
      <path d={d} fill="none" stroke={BLUE} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={peak[0]} cy={peak[1]} r={3} fill={BLUE} stroke="var(--color-card)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── the window: sends against Study@ contacts per day ─────────────────────
function WindowStrip({ hovered, onHover }: { hovered: string | null; onHover: (id: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [day, setDay] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const d0 = dayNumber(CAMPAIGN.from), d1 = dayNumber(CAMPAIGN.to);
  const H = 156, TOP = 70, BASE = 130;
  const x = (iso: string | number) => (((typeof iso === "number" ? iso : dayNumber(iso)) - d0 + 0.5) / (d1 - d0 + 1)) * width;
  const max = Math.max(...CONTACTS_BY_DAY.map((p) => p.value));
  const y = (v: number) => BASE - (v / max) * (BASE - TOP - 4);
  const line = CONTACTS_BY_DAY.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const peak = CONTACTS_BY_DAY.reduce((a, b) => (b.value > a.value ? b : a));
  const dated = TOUCHPOINTS.filter((t) => t.date);
  const stack = new Map<string, number>();
  const ticks = Array.from({ length: Math.floor((d1 - d0) / 7) + 1 }, (_, i) => d0 + i * 7);
  const iso = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
  const at = day !== null ? CONTACTS_BY_DAY.find((p) => dayNumber(p.date) === day) : undefined;

  return (
    <div
      ref={ref}
      className="relative mt-3 rounded-lg border border-grey-30 bg-card"
      style={{ height: H }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setDay(Math.min(d1, Math.max(d0, d0 + Math.floor(((e.clientX - r.left) / r.width) * (d1 - d0 + 1)))));
      }}
      onMouseLeave={() => setDay(null)}
    >
      <svg width={width} height={H} className="absolute inset-0" role="img" aria-label={`Study@ contacts per day, ${shortDate(CAMPAIGN.from)} to ${shortDate(CAMPAIGN.to)}, peaking at ${peak.value} on ${shortDate(peak.date)}`}>
        {/* the three-day COP period */}
        <rect x={x(dayNumber(CAMPAIGN.coreFrom) - 0.5)} y={0} width={x(dayNumber(CAMPAIGN.coreTo) + 0.5) - x(dayNumber(CAMPAIGN.coreFrom) - 0.5)} height={BASE} fill={BLUE} opacity={0.08} />
        <line x1={0} x2={width} y1={BASE} y2={BASE} stroke="var(--color-grey-30)" />
        <path d={`${line} L${x(CAMPAIGN.to)},${BASE} L${x(CAMPAIGN.from)},${BASE} Z`} fill={BLUE} opacity={0.1} />
        <path d={line} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={x(peak.date)} cy={y(peak.value)} r={4} fill={BLUE} stroke="var(--color-card)" strokeWidth={2} />
        {day !== null && <line x1={x(day)} x2={x(day)} y1={0} y2={BASE} stroke="var(--color-grey-60)" strokeDasharray="2 3" />}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 7} textAnchor="middle" className="fill-grey-70 text-xs">{shortDate(iso(t))}</text>
        ))}
      </svg>
      <span className="pointer-events-none absolute text-xs text-grey-70" style={{ left: x(peak.date) - 112, top: y(peak.value) - 9, width: 104, textAlign: "right" }}>
        <b className="font-semibold text-grey-90">{peak.value.toLocaleString()}</b> contacts
      </span>
      <span className="pointer-events-none absolute top-1.5 text-xs font-semibold text-rmit-blue" style={{ left: x(dayNumber(CAMPAIGN.coreFrom) - 0.5) + 6 }}>
        COP
      </span>
      {/* sends and events, on their day */}
      {dated.map((t) => {
        const n = stack.get(t.date!) ?? 0;
        stack.set(t.date!, n + 1);
        const T = TYPE[t.type];
        return (
          <button
            key={t.id}
            type="button"
            aria-label={`${t.title}, ${shortDate(t.date!)}`}
            onMouseEnter={() => onHover(t.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(t.id)}
            onBlur={() => onHover(null)}
            onClick={() => document.getElementById(`tp-${t.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}
            className={`absolute size-3 -translate-x-1/2 rounded-full ring-2 ring-card transition-transform ${T.accent} ${hovered === t.id ? "scale-150" : ""} ${FOCUS_RING}`}
            style={{ left: x(t.date!), top: 30 + n * 0, marginLeft: n * 10 }}
          />
        );
      })}
      {day !== null && at && (
        <div className="pointer-events-none absolute z-10 rounded-md bg-tooltip px-2.5 py-1.5 text-xs text-white shadow-md" style={{ left: Math.min(x(day) + 10, width - 200), top: 56 }}>
          <p className="font-semibold">{shortDate(at.date)}</p>
          <p>{at.value.toLocaleString()} Study@ contacts</p>
          {dated.filter((t) => t.date === at.date).map((t) => (
            <p key={t.id} className="opacity-80">{TYPE[t.type].label} · {t.title}</p>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>Study@ contacts per day</caption>
        <tbody>{CONTACTS_BY_DAY.map((p) => <tr key={p.date}><th>{shortDate(p.date)}</th><td>{p.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ── a touchpoint card ─────────────────────────────────────────────────────
function Card({ t, dim, active, onHover, onOpen, register }: {
  t: Touchpoint;
  dim: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  register: (id: string, el: HTMLElement | null) => void;
}) {
  const T = TYPE[t.type];
  const gaps = GAPS.get(t.id) ?? [];
  const loud = gaps.filter((g) => g.kind === "chain-broken" || g.kind === "no-chain" || g.kind === "no-utm" || g.kind === "not-measured");
  const head = headline(t.values);
  const rate = head && head.value.includes("%");
  const sub = [t.date && shortDate(t.date), t.variants.length > 1 ? `${t.variants.length} variants` : t.audience, t.new2026 && "new"].filter(Boolean).join(" · ");
  return (
    <button
      id={`tp-${t.id}`}
      ref={(el) => register(t.id, el)}
      type="button"
      onMouseEnter={() => onHover(t.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(t.id)}
      onBlur={() => onHover(null)}
      onClick={() => onOpen(t.id)}
      className={`relative z-10 flex w-full flex-col gap-1 rounded-lg border bg-card px-3 py-2 text-left transition-[opacity,box-shadow] duration-200 ${
        active ? "border-rmit-blue-interactive shadow-md" : "border-grey-30"
      } ${dim ? "opacity-35" : ""} ${FOCUS_RING}`}
    >
      <span className="flex items-start gap-2">
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${T.chip} ${T.text}`}>
          <T.Icon size={13} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-semibold text-grey-90">{t.title}</span>
          {sub && <span className="block truncate text-xs text-grey-70">{sub}</span>}
        </span>
      </span>
      {t.series && <Spark series={t.series} />}
      {head && rate && t.variants.length > 1
        ? t.variants.map((v) => {
            const hv = headline(v.values);
            return hv ? <Bullet key={v.id} v={hv} label={v.audience.replace(/^Year 12 · ?/, "") || "Year 12"} /> : null;
          })
        : head && rate
          ? <Bullet v={head} label={head.metric} />
          : head && (
              <span className="flex items-baseline gap-1.5 text-xs text-grey-70">
                <span className="text-sm font-semibold text-grey-90">{/^\d+$/.test(head.value) ? Number(head.value).toLocaleString() : head.value}</span>
                {head.metric.toLowerCase()}
              </span>
            )}
      {t.series && t.values[1] && (
        <span className="flex items-baseline gap-1.5 text-xs text-grey-70">
          <span className="font-semibold text-grey-90">{t.values[1].value}</span>
          {t.values[1].metric.replace(/^./, (c) => c.toLowerCase())}
          <Versus v={t.values[1]} />
        </span>
      )}
      {!head && <span className="text-xs text-grey-60 italic">Not measured</span>}
      {loud[0] && (
        <span className="w-fit rounded bg-tint-amber px-1.5 py-0.5 text-xs text-grey-90">
          {loud[0].label}
          {loud.length > 1 && <span className="text-grey-70"> +{loud.length - 1}</span>}
        </span>
      )}
    </button>
  );
}

// ── the flow: teams × kinds, with the hand-offs drawn ─────────────────────
type Box = { left: number; right: number; top: number; bottom: number };

function Flow({ hovered, onHover, onOpen }: { hovered: string | null; onHover: (id: string | null) => void; onOpen: (id: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [boxes, setBoxes] = useState<Map<string, Box>>(new Map());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hotChain, setHotChain] = useState<string | null>(null);
  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  }, []);
  const measure = useCallback(() => {
    const root = wrap.current;
    if (!root) return;
    const r0 = root.getBoundingClientRect();
    const next = new Map<string, Box>();
    for (const [id, el] of els.current) {
      const r = el.getBoundingClientRect();
      next.set(id, { left: r.left - r0.left, right: r.right - r0.left, top: r.top - r0.top, bottom: r.bottom - r0.top });
    }
    setBoxes(next);
    setSize({ w: root.scrollWidth, h: root.scrollHeight });
  }, []);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const connected = useMemo(() => {
    if (!hovered) return null;
    return new Set([hovered, ...chainsOf(hovered).map((ch) => (ch.from === hovered ? ch.to : ch.from))]);
  }, [hovered]);

  // Spread arrivals and departures down each card's edge, in the order of
  // where they come from / go to, so lines fan instead of piling on a point.
  const routes = useMemo(() => {
    const mid = (b: Box) => (b.top + b.bottom) / 2;
    const slot = (list: Chain[], ch: Chain, b: Box, other: (c: Chain) => string) => {
      const sorted = [...list].sort((a, z) => mid(boxes.get(other(a))!) - mid(boxes.get(other(z))!));
      return b.top + ((sorted.indexOf(ch) + 1) * (b.bottom - b.top)) / (sorted.length + 1);
    };
    const ok = CHAINS.filter((ch) => boxes.has(ch.from) && boxes.has(ch.to));
    return ok.map((ch) => {
      const a = boxes.get(ch.from)!, b = boxes.get(ch.to)!;
      const y1 = slot(ok.filter((c) => c.from === ch.from), ch, a, (c) => c.to);
      const y2 = slot(ok.filter((c) => c.to === ch.to), ch, b, (c) => c.from);
      const sameColumn = Math.abs(a.left - b.left) < 8;
      let d: string, end: [number, number], dir: 1 | -1, label: [number, number];
      if (sameColumn) {
        // page → page: bracket down the gap to the right of the column
        const x1 = a.right, x2 = b.right + 7, bulge = Math.max(a.right, b.right) + 44;
        d = `M${x1},${y1} C${bulge},${y1} ${bulge},${y2} ${x2},${y2}`;
        end = [x2, y2]; dir = -1; label = [bulge + 4, (y1 + y2) / 2];
      } else {
        const x1 = a.right, x2 = b.left - 7, k = Math.max(40, (x2 - x1) / 2);
        d = `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}`;
        end = [x2, y2]; dir = 1; label = [(x1 + x2) / 2, (y1 + y2) / 2 - 6];
      }
      const w = ch.measured && ch.people ? Math.min(7, 1.5 + Math.sqrt(ch.people) / 8) : 1.5;
      return { ch, key: `${ch.from}>${ch.to}`, d, end, dir, label, w };
    });
  }, [boxes]);

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-grey-30 bg-grey-10">
      <div ref={wrap} className="relative min-w-[60rem] p-5">
        <svg width={size.w} height={size.h} className="pointer-events-none absolute top-0 left-0 z-0" aria-hidden>
          {routes.map(({ ch, key, d, end, dir, label, w }) => {
            const hot = hotChain === key || (hovered !== null && (ch.from === hovered || ch.to === hovered));
            const faded = (hovered !== null || hotChain !== null) && !hot;
            const stroke = ch.measured ? BLUE : AMBER;
            const text = !ch.measured
              ? `${ch.via ? `${ch.via} · ` : ""}not measured`
              : `${ch.via ?? "next page"}${ch.people ? ` · ${ch.people.toLocaleString()} people` : ""}${ch.resolution === "channel" ? " · channel only" : ""}`;
            return (
              <g key={key} opacity={faded ? 0.1 : hot ? 1 : 0.5} className="transition-opacity duration-200">
                <path d={d} fill="none" stroke="var(--color-grey-10)" strokeWidth={w + 3} />
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={w}
                  strokeLinecap="round"
                  strokeDasharray={!ch.measured ? "6 5" : ch.resolution === "channel" ? "2 5" : undefined}
                />
                <path d={`M${end[0] + 7 * dir},${end[1]} l${-7 * dir},-4.5 v9 Z`} fill={stroke} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="pointer-events-auto" onMouseEnter={() => setHotChain(key)} onMouseLeave={() => setHotChain(null)} />
                {hot && (
                  <text x={label[0]} y={label[1]} textAnchor={dir === 1 ? "middle" : "start"} className="fill-grey-90 text-xs font-semibold" stroke="var(--color-grey-10)" strokeWidth={4} paintOrder="stroke">
                    {text}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Columns are what the student passes through, left to right; inside
            each, one labelled block per team. An arrow that leaves a block is
            a hand-off between teams. */}
        <div className="grid grid-cols-3 gap-x-32 pb-3">
          {KINDS.map((k) => (
            <h3 key={k.kind} className={`text-grey-70 ${EYEBROW}`}>{k.label}</h3>
          ))}
        </div>
        <div className="grid grid-cols-3 items-center gap-x-32">
          {KINDS.map((k) => (
            <div key={k.kind} className="flex flex-col gap-4 self-center">
              {TEAMS.filter((team) => TOUCHPOINTS.some((t) => t.team === team && t.kind === k.kind)).map((team) => (
                <section key={team} aria-label={team} className="rounded-xl border border-grey-30 bg-surface p-2.5">
                  <p className="px-1 pb-2 text-sm font-semibold text-grey-90">{team}</p>
                  <div className="flex flex-col gap-2">
                    {TOUCHPOINTS.filter((t) => t.team === team && t.kind === k.kind).map((t) => (
                      <Card
                        key={t.id}
                        t={t}
                        register={register}
                        onHover={onHover}
                        onOpen={onOpen}
                        active={hovered === t.id}
                        dim={connected !== null && !connected.has(t.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))}
        </div>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-grey-30 pt-3 text-xs text-grey-70">
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={BLUE} strokeWidth={3} /></svg>Hand-off we can follow (thicker = more people)</li>
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={AMBER} strokeWidth={1.5} strokeDasharray="6 5" /></svg>Hand-off not measured</li>
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={BLUE} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" /></svg>Known by channel only</li>
          <li className="flex items-center gap-1.5"><span className="h-3.5 w-0.5 rounded-full bg-grey-90" aria-hidden />Benchmark</li>
        </ul>
      </div>
    </div>
  );
}

// ── detail panel ──────────────────────────────────────────────────────────
function Values({ values }: { values: MetricValue[] }) {
  return (
    <ul className="divide-y divide-grey-30">
      {values.map((v) => (
        <li key={v.metric} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-sm text-grey-80">{v.metric.replace(/^Link — /, "")}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-grey-90">{/^\d+$/.test(v.value) ? Number(v.value).toLocaleString() : v.value}</span>
            {v.benchmark ? <Versus v={v} /> : <span className="text-xs text-grey-60 italic">no benchmark</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ t, onClose, onOpen }: { t: Touchpoint; onClose: () => void; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const T = TYPE[t.type];
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, t.id]);
  const H = ({ children }: { children: string }) => <h3 className={`mt-6 border-t border-grey-30 pt-5 text-grey-70 ${EYEBROW}`}>{children}</h3>;
  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex gap-3 py-1">
        <dt className="w-28 shrink-0 text-sm text-grey-70">{label}</dt>
        <dd className="min-w-0 text-sm text-grey-90">{value}</dd>
      </div>
    ) : null;
  const gaps = GAPS.get(t.id) ?? [];
  const refs = referrersFor(t);
  const chains = chainsOf(t.id);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={t.title}
      tabIndex={-1}
      className="fixed top-0 right-0 z-40 flex h-full w-full max-w-md flex-col border-l border-grey-30 bg-card shadow-xl outline-none"
    >
      <header className="flex items-start gap-3 border-b border-grey-30 p-5">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${T.chip} ${T.text}`}>
          <T.Icon size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-grey-70 ${EYEBROW}`}>{[T.label, t.team, t.date && shortDate(t.date)].filter(Boolean).join(" · ")}</p>
          <h2 className="text-xl font-semibold text-grey-90">{t.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className={`rounded-md p-1.5 text-grey-70 hover:bg-grey-10 ${FOCUS_RING}`}>
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {gaps.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {gaps.map((g) => (
              <li key={g.kind} className="rounded-md bg-tint-amber px-3 py-2 text-sm text-grey-90">
                <b className="font-semibold">{g.label}.</b> {g.detail}
              </li>
            ))}
          </ul>
        )}
        <dl className={gaps.length ? "mt-4" : ""}>
          <Row label="Audience" value={t.variants.length > 1 ? undefined : t.audience} />
          <Row label="Primary CTA" value={t.cta} />
          <Row label="Secondary CTA" value={t.secondaryCta} />
          <Row label="UTM tagged" value={t.utm === "yes" ? "Yes" : t.utm === "no" ? "No" : undefined} />
          <Row label="New for 2026" value={t.new2026 ? "Yes" : undefined} />
          {t.url && (
            <div className="flex gap-3 py-1">
              <dt className="w-28 shrink-0 text-sm text-grey-70">Page</dt>
              <dd className="min-w-0 truncate text-sm">
                <a href={t.url} target="_blank" rel="noreferrer" className={`text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>{t.url.replace(/^https?:\/\/(www\.)?/, "")}</a>
              </dd>
            </div>
          )}
        </dl>

        <H>Value Proposition</H>
        <p className={`mt-2 text-sm ${t.cvp ? "text-grey-90" : "text-grey-70 italic"}`}>{t.cvp ? `“${t.cvp}”` : "None recorded."}</p>

        <H>Performance</H>
        {t.variants.length > 1 ? (
          t.variants.map((v) => (
            <div key={v.id} className="mt-3">
              <p className="text-sm font-semibold text-grey-90">{v.audience}</p>
              <p className="text-xs text-grey-70">{t.variantBasis}</p>
              <Values values={v.values.filter((x) => !x.cta)} />
            </div>
          ))
        ) : t.values.length ? (
          <div className="mt-2"><Values values={t.values.filter((x) => !x.cta)} /></div>
        ) : (
          <p className="mt-2 text-sm text-grey-70 italic">Not measured.</p>
        )}
        {(["primary", "secondary"] as const).map((k) => {
          const vals = t.values.filter((x) => x.cta === k);
          return vals.length ? (
            <div key={k} className="mt-3 border-l-2 border-grey-30 pl-3">
              <p className="text-xs text-grey-70">{k === "primary" ? "Primary" : "Secondary"} CTA · <span className="text-grey-90">{k === "primary" ? t.cta : t.secondaryCta}</span></p>
              <Values values={vals} />
            </div>
          ) : null;
        })}

        {refs.length > 0 && (
          <>
            <H>Arrives From</H>
            <ul className="mt-2 flex flex-col gap-1.5">
              {refs.map((r) => (
                <li key={r.channel + r.utmSource} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-2 text-sm">
                  <span className="truncate text-grey-80">{r.channel}{r.utmSource && <span className="text-grey-60"> · {r.utmSource}</span>}</span>
                  <span className="h-1.5 rounded-full bg-grey-30"><span className="block h-full rounded-full bg-rmit-blue-interactive" style={{ width: r.share }} /></span>
                  <span className="text-right font-semibold text-grey-90">{r.share}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <H>Hand-offs</H>
        {chains.length ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {chains.map((ch) => {
              const out = ch.from === t.id;
              const other = byId.get(out ? ch.to : ch.from)!;
              return (
                <li key={ch.from + ch.to}>
                  <button
                    type="button"
                    onClick={() => onOpen(other.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-grey-10 ${ch.measured ? "border-grey-30" : "border-dashed border-amber"} ${FOCUS_RING}`}
                  >
                    <span className="text-grey-90">{out ? "To" : "From"} <b className="font-semibold">{other.title}</b></span>
                    <span className="block text-xs text-grey-70">
                      {[other.team, ch.via && `via “${ch.via}”`, ch.measured ? ch.people && `${ch.people.toLocaleString()} people` : "not measured", ch.resolution === "channel" && "channel only"].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-grey-70 italic">None recorded.</p>
        )}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────
function Page() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? byId.get(openId) : undefined;
  const stats: [string, string, string][] = [
    [String(SUMMARY.total), "", `touchpoints, ${SUMMARY.teams} teams`],
    [String(SUMMARY.measured), ` / ${SUMMARY.total}`, "measured"],
    [String(SUMMARY.chains - SUMMARY.brokenChains), ` / ${SUMMARY.chains}`, "hand-offs we can follow"],
    [String(SUMMARY.questions - SUMMARY.unanswered), ` / ${SUMMARY.questions}`, "student questions answered"],
    [String(SUMMARY.withCvp), ` / ${SUMMARY.total}`, "with a value proposition"],
  ];
  const maxOutcome = Math.max(...OUTCOMES.map((o) => o.preferenceChanged));
  return (
    <div className="mx-auto max-w-[92rem] px-5 pt-8 pb-24">
      <a href="/" className={`inline-flex items-center gap-1 rounded text-sm text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
        <ArrowLeft size={14} strokeWidth={2} aria-hidden /> Current State Touchpoints
      </a>
      <p className={`mt-5 text-grey-70 ${EYEBROW}`}>Campaign · pilot · proxy data</p>
      <h1 className="text-3xl font-bold text-rmit-blue">{CAMPAIGN.name}</h1>
      <p className="mt-1 text-grey-80">
        {shortDate(CAMPAIGN.from)} – {shortDate(CAMPAIGN.to)} · stage gate {shortDate(CAMPAIGN.stageGate)}
      </p>

      <p className="mt-5 max-w-3xl text-lg text-grey-90">{SUMMARY.story}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([n, of, label]) => (
          <div key={label}>
            <dd className="text-3xl font-semibold text-grey-90">{n}<span className="text-base font-normal text-grey-60">{of}</span></dd>
            <dt className="text-sm text-grey-70">{label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-xl font-semibold text-grey-90">Sends Against Study@ Contacts per Day</h2>
      <WindowStrip hovered={hovered} onHover={setHovered} />

      <h2 className="mt-10 text-xl font-semibold text-grey-90">Across the Teams</h2>
      <Flow hovered={hovered} onHover={setHovered} onOpen={setOpenId} />

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-grey-90">What Students Ask</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {[...QUESTIONS].sort((a, b) => a.answeredBy.length - b.answeredBy.length).map((q) => (
              <li key={q.stage + q.question} className={`rounded-md border px-3 py-2 ${q.answeredBy.length ? "border-grey-30 bg-card" : "border-dashed border-grey-60"}`}>
                <p className="text-sm text-grey-90">{q.question}</p>
                {q.answeredBy.length ? (
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                    {q.answeredBy.map((t) => (
                      <button key={t.id} type="button" onClick={() => setOpenId(t.id)} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)} className={`rounded text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
                        {t.title}
                      </button>
                    ))}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-grey-70">No touchpoint in the window</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-grey-90">What We Can&rsquo;t See</h2>
          {GAP_ORDER.map((kind) => {
            const items = TOUCHPOINTS.filter((t) => (GAPS.get(t.id) ?? []).some((g) => g.kind === kind));
            if (!items.length) return null;
            return (
              <div key={kind} className="mt-3 rounded-md border border-grey-30 bg-card px-3 py-2.5">
                <p className="text-sm font-semibold text-grey-90">{GAP_TITLES[kind].title} <span className="font-normal text-grey-60">· {items.length}</span></p>
                <p className="text-xs text-grey-70">{GAP_TITLES[kind].why}</p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {items.map((t) => (
                    <button key={t.id} type="button" onClick={() => setOpenId(t.id)} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)} className={`rounded-full bg-grey-10 px-2 py-0.5 text-xs text-grey-90 hover:bg-grey-20 ${FOCUS_RING}`}>
                      {t.title}
                    </button>
                  ))}
                </p>
              </div>
            );
          })}

          <h2 className="mt-10 text-xl font-semibold text-grey-90">Preference Changes Recorded by Study@</h2>
          <p className="mt-1 text-sm text-grey-70">By week. Not linked to any touchpoint.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {OUTCOMES.map((o) => (
              <li key={o.week} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm" title={`${o.preferenceChanged} preference changes from ${o.contacts.toLocaleString()} contacts`}>
                <span className="text-grey-70">Week of {shortDate(o.week)}</span>
                <span className="h-3"><span className="block h-full rounded-r bg-rmit-blue-interactive" style={{ width: `${(o.preferenceChanged / maxOutcome) * 100}%` }} /></span>
                <span className="text-right font-semibold text-grey-90">{o.preferenceChanged}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {open && <Panel t={open} onClose={() => setOpenId(null)} onOpen={setOpenId} />}
    </div>
  );
}

const host = document.getElementById("app")! as HTMLElement & { __root?: ReturnType<typeof createRoot> };
(host.__root ??= createRoot(host)).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
