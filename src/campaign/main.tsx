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

// ── a touchpoint card: one line, one number ───────────────────────────────
function Card({ t, dim, active, onHover, onOpen, register }: {
  t: Touchpoint;
  dim: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  register: (id: string, el: HTMLElement | null) => void;
}) {
  const T = TYPE[t.type];
  const gaps = (GAPS.get(t.id) ?? []).filter((g) => g.kind === "chain-broken" || g.kind === "no-chain" || g.kind === "no-utm" || g.kind === "not-measured");
  const head = headline(t.values);
  const heads = t.variants.map((v) => headline(v.values)).filter((v): v is MetricValue => Boolean(v));
  let number = "", unit = "";
  if (t.variants.length > 1 && heads.length > 1 && heads.every((h) => h.value.includes("%"))) {
    const ns = heads.map((h) => num(h.value));
    number = `${Math.min(...ns)}–${Math.max(...ns)}%`;
    unit = `${heads[0].metric.toLowerCase()} · ${t.variants.length} variants`;
  } else if (head) {
    number = /^\d+$/.test(head.value) ? Number(head.value).toLocaleString() : head.value;
    unit = head.metric.toLowerCase();
  }
  const cmp = head && t.variants.length === 1 ? compare(head) : null;
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
      aria-label={`${t.title}${number ? `, ${number} ${unit}` : ", not measured"}${gaps[0] ? `, ${gaps[0].label}` : ""}`}
      className={`relative z-10 flex w-full items-center gap-2.5 rounded-lg border bg-card py-2 pr-3 pl-2.5 text-left transition-[opacity,box-shadow,border-color] duration-200 ${
        active ? "border-rmit-blue-interactive shadow-md" : "border-grey-30"
      } ${dim ? "opacity-30" : ""} ${FOCUS_RING}`}
    >
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${T.chip} ${T.text}`}>
        <T.Icon size={13} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-grey-90">{t.title}</span>
      {number ? (
        <span className="shrink-0 text-right text-sm">
          <span className={`font-semibold ${cmp === "worse" ? "text-danger" : "text-grey-90"}`}>{number}</span>
          <span className="block text-xs leading-none text-grey-60">{unit}</span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-grey-60 italic">not measured</span>
      )}
      {gaps[0] && (
        <span title={gaps.map((g) => `${g.label} — ${g.detail}`).join("\n")} className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber ring-2 ring-card" aria-hidden />
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
    // Page-to-page links live in the panel; drawing them added loops the
    // diagram doesn't need.
    const ok = CHAINS.filter((ch) => boxes.has(ch.from) && boxes.has(ch.to) && Math.abs(boxes.get(ch.from)!.left - boxes.get(ch.to)!.left) >= 8);
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
      const w = 1.5;
      return { ch, key: `${ch.from}>${ch.to}>${ch.cta ?? ""}`, d, end, dir, label, w };
    });
  }, [boxes]);

  return (
    <div className="mt-4 overflow-x-auto">
      <div ref={wrap} className="relative min-w-[60rem] py-2">
        <svg width={size.w} height={size.h} className="pointer-events-none absolute top-0 left-0 z-0" aria-hidden>
          {routes.map(({ ch, key, d, end, dir, label, w }) => {
            const hot = hotChain === key || (hovered !== null && (ch.from === hovered || ch.to === hovered));
            const faded = (hovered !== null || hotChain !== null) && !hot;
            const sw = hot ? 2.5 : w;
            const stroke = ch.measured ? BLUE : AMBER;
            const ctaLabel = ch.cta ? `${ch.cta[0].toUpperCase()}${ch.cta.slice(1)} CTA` : "";
            const text = [
              ctaLabel && ch.via ? `${ctaLabel} “${ch.via}”` : ctaLabel || ch.via || "next page",
              ch.measured ? ch.people && `${ch.people.toLocaleString()} people` : "not measured",
              ch.utm === false && "no UTM",
              ch.resolution === "channel" && "channel only",
            ].filter(Boolean).join(" · ");
            return (
              <g key={key} opacity={faded ? 0.08 : hot ? 1 : 0.45} className="transition-opacity duration-200">
                <path d={d} fill="none" stroke="var(--color-surface)" strokeWidth={sw + 3} />
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeDasharray={!ch.measured ? "6 5" : ch.resolution === "channel" ? "2 5" : undefined}
                />
                <path d={`M${end[0] + 7 * dir},${end[1]} l${-7 * dir},-4.5 v9 Z`} fill={stroke} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="pointer-events-auto" onMouseEnter={() => setHotChain(key)} onMouseLeave={() => setHotChain(null)} />
                {hot && (
                  <text x={label[0]} y={label[1]} textAnchor={dir === 1 ? "middle" : "start"} className="fill-grey-90 text-xs font-semibold" stroke="var(--color-surface)" strokeWidth={4} paintOrder="stroke">
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
        {/* Columns are what the student passes through, left to right; inside
            each, a quiet team label above its cards. An arrow that leaves a
            group is a hand-off between teams. */}
        <div className="grid grid-cols-3 items-center gap-x-40">
          {KINDS.map((k) => (
            <div key={k.kind} className="flex flex-col gap-7 self-center">
              {TEAMS.filter((team) => TOUCHPOINTS.some((t) => t.team === team && t.kind === k.kind)).map((team) => (
                <section key={team} aria-label={`${team} — ${k.label}`}>
                  <p className={`mb-2 text-grey-70 ${EYEBROW}`}>{team}</p>
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

        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-grey-70">
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={BLUE} strokeWidth={1.5} /></svg>Hand-off we can follow</li>
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={AMBER} strokeWidth={1.5} strokeDasharray="6 5" /></svg>Not measured</li>
          <li className="flex items-center gap-1.5"><svg width="28" height="8" aria-hidden><path d="M0,4 H28" stroke={BLUE} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" /></svg>Known by channel only</li>
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber" aria-hidden />Something we can&rsquo;t see — hover for what</li>
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
  // Variants are a toggle, not stacked tables — each chip carries the
  // headline number so the comparison is on the chips, the detail below.
  const [variantId, setVariantId] = useState(t.variants[0]?.id);
  useEffect(() => setVariantId(t.variants[0]?.id), [t.id, t.variants]);
  const variant = t.variants.find((v) => v.id === variantId) ?? t.variants[0];
  const shown = variant?.values ?? t.values;
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
        {t.variants.length > 1 && (
          <>
            <p className="mt-2 text-xs text-grey-70">{t.variants.length} variants · {t.variantBasis ?? "audience splits"}</p>
            <div role="group" aria-label="Variant" className="mt-2 flex flex-wrap gap-1.5">
              {t.variants.map((v) => {
                const hv = headline(v.values);
                const on = v.id === variant?.id;
                const worse = hv && compare(hv) === "worse";
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setVariantId(v.id)}
                    className={`flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      on ? "border-grey-90 bg-grey-90 text-on-accent" : "border-grey-30 bg-card text-grey-80 hover:bg-grey-10"
                    } ${FOCUS_RING}`}
                  >
                    {v.audience.replace(/^Year 12 · ?/, "") || "Year 12"}
                    {hv && <span className={`font-semibold ${on ? "" : worse ? "text-danger" : "text-grey-90"}`}>{hv.value}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {shown.length ? (
          <div className="mt-2"><Values values={shown.filter((x) => !x.cta)} /></div>
        ) : (
          <p className="mt-2 text-sm text-grey-70 italic">Not measured.</p>
        )}
        {(["primary", "secondary"] as const).map((k) => {
          const vals = shown.filter((x) => x.cta === k);
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
                <li key={ch.from + ch.to + (ch.cta ?? "")}>
                  <button
                    type="button"
                    onClick={() => onOpen(other.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-grey-10 ${ch.measured ? "border-grey-30" : "border-dashed border-amber"} ${FOCUS_RING}`}
                    key={ch.from + ch.to + ch.cta}
                  >
                    <span className="text-grey-90">{out ? "To" : "From"} <b className="font-semibold">{other.title}</b></span>
                    <span className="block text-xs text-grey-70">
                      {[
                        other.team,
                        out && ch.cta && `${ch.cta} CTA`,
                        ch.via && `“${ch.via}”`,
                        ch.measured ? ch.people && `${ch.people.toLocaleString()} people` : "not measured",
                        ch.utm === false && "no UTM",
                        ch.resolution === "channel" && "channel only",
                      ].filter(Boolean).join(" · ")}
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
  const maxOutcome = Math.max(...OUTCOMES.map((o) => o.preferenceChanged));
  return (
    <div className="mx-auto max-w-[88rem] px-6 pt-8 pb-24">
      <a href="/" className={`inline-flex items-center gap-1 rounded text-sm text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
        <ArrowLeft size={14} strokeWidth={2} aria-hidden /> Current State Touchpoints
      </a>
      <p className={`mt-6 text-grey-70 ${EYEBROW}`}>Campaign · proxy data</p>
      <h1 className="text-3xl font-bold text-rmit-blue">{CAMPAIGN.name}</h1>
      <p className="mt-1 text-grey-70">
        {shortDate(CAMPAIGN.from)} – {shortDate(CAMPAIGN.to)} · stage gate {shortDate(CAMPAIGN.stageGate)}
      </p>
      <p className="mt-6 max-w-3xl text-xl leading-relaxed text-grey-90">{SUMMARY.story}</p>

      <Flow hovered={hovered} onHover={setHovered} onOpen={setOpenId} />

      <div className="mt-16 max-w-4xl">
        <h2 className="text-base font-semibold text-grey-90">Sends against Study@ contacts per day</h2>
        <WindowStrip hovered={hovered} onHover={setHovered} />

        <h2 className="mt-14 text-base font-semibold text-grey-90">What we can&rsquo;t see</h2>
        <ul className="mt-3 divide-y divide-grey-30">
          {GAP_ORDER.map((kind) => {
            const items = TOUCHPOINTS.filter((t) => (GAPS.get(t.id) ?? []).some((g) => g.kind === kind));
            if (!items.length) return null;
            return (
              <li key={kind} className="grid gap-x-8 gap-y-1 py-3 sm:grid-cols-[14rem_1fr]">
                <div>
                  <p className="text-sm font-semibold text-grey-90">{GAP_TITLES[kind].title} <span className="font-normal text-grey-60">· {items.length}</span></p>
                  <p className="text-xs text-grey-70">{GAP_TITLES[kind].why}</p>
                </div>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {items.map((t) => (
                    <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className={`rounded text-grey-80 hover:text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
                      {t.title}
                    </button>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-14 text-base font-semibold text-grey-90">What students ask</h2>
        <ul className="mt-3 divide-y divide-grey-30">
          {[...QUESTIONS].sort((a, b) => a.answeredBy.length - b.answeredBy.length).map((q) => (
            <li key={q.stage + q.question} className="grid gap-x-8 gap-y-1 py-2.5 sm:grid-cols-[1fr_14rem]">
              <p className="text-sm text-grey-90">{q.question}</p>
              {q.answeredBy.length ? (
                <p className="flex flex-wrap gap-x-2 text-sm">
                  {q.answeredBy.map((t) => (
                    <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className={`rounded text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>{t.title}</button>
                  ))}
                </p>
              ) : (
                <p className="text-sm text-grey-60">No touchpoint</p>
              )}
            </li>
          ))}
        </ul>

        <h2 className="mt-14 text-base font-semibold text-grey-90">Preference changes recorded by Study@</h2>
        <p className="mt-1 text-sm text-grey-70">By week. Not linked to any touchpoint.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {OUTCOMES.map((o) => (
            <li key={o.week} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm" title={`${o.preferenceChanged} preference changes from ${o.contacts.toLocaleString()} contacts`}>
              <span className="text-grey-70">Week of {shortDate(o.week)}</span>
              <span className="h-2.5"><span className="block h-full rounded-r bg-rmit-blue-interactive" style={{ width: `${(o.preferenceChanged / maxOutcome) * 100}%` }} /></span>
              <span className="text-right font-semibold text-grey-90">{o.preferenceChanged}</span>
            </li>
          ))}
        </ul>
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
