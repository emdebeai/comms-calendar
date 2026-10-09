import { ChevronRight } from "lucide-react";
import type { Comm } from "../data/types";
import {
  OBJECTIVE_LABEL,
  VALUES_ARE_PROXY,
  campaignInfo,
  compare,
  delta,
  gapsFor,
  headline,
  successMetric,
  variantsOf,
  type Chain,
  type MetricValue,
} from "../lib/campaign";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { PageBadge, Versus, fmt } from "./CampaignUi";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import { TokenText } from "./TokenText";

// The campaign's sections of a comm's detail panel — rendered by
// CommDetailPanel in campaign mode, between Details and the comments.
// Send: Audience (other variants) · Objective · Value Proposition ·
// Performance · Destinations. Page: Value Proposition · Performance ·
// Top 3 Actions · Arrives From.


function Values({ values }: { values: MetricValue[] }) {
  return (
    <ul className="divide-y divide-grey-30">
      {values.map((v) => (
        <li key={v.metric} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-sm text-grey-80">{v.metric.replace(/^Link — /, "")}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-grey-90">{fmt(v.value)}</span>
            <Versus v={v} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A panel section: collapsible, open by default, the heading is the toggle. */
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <details open className="group mt-6 border-t border-grey-30 pt-5">
    <summary className={`flex cursor-pointer list-none items-center gap-1.5 rounded text-grey-70 ${EYEBROW} ${FOCUS_RING}`}>
      <ChevronRight size={13} strokeWidth={2} aria-hidden className="transition-transform group-open:rotate-90" />
      {title}
    </summary>
    {children}
  </details>
);

/** The same clickable comm card the panel uses for related comms. */
function CommLink({ c, note, onOpen }: { c: Comm; note?: string; onOpen?: (id: string) => void }) {
  const Icon = COMM_ICONS[c.type];
  const colors = COMM_COLORS[c.type];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(c.id)}
      disabled={!onOpen}
      className={`flex w-full items-center gap-2.5 rounded-md border border-grey-30 bg-card px-2.5 py-2 text-left transition-colors ${onOpen ? "hover:border-rmit-blue-interactive/60 hover:bg-tint-blue/30" : ""} ${FOCUS_RING}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}>
        <Icon size={13} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-grey-90"><TokenText text={c.title} /></span>
        <span className="block text-xs text-grey-70">{note ?? COMM_LABELS[c.type]}</span>
      </span>
    </button>
  );
}

export function CampaignSections({ comm, allComms, onOpenComm }: { comm: Comm; allComms: Comm[]; onOpenComm?: (id: string) => void }) {
  const i = campaignInfo(comm.id);
  if (!i) return null;
  const byId = (id: string) => allComms.find((c) => c.id === id);
  const isPage = comm.type === "webpage";
  const isSend = comm.type === "email" || comm.type === "sms";
  const gaps = gapsFor(comm);
  const sm = successMetric(comm, i);
  const head = headline(comm, i);
  // Other audiences of the same send — the map stacks them as variants;
  // here they're one tap away, each with its own success measure.
  const siblings = allComms.filter((c) => c.id !== comm.id && c.title === comm.title && c.team === comm.team);
  // Only what's wrong is said; a tagged, measured link needs no caption.
  const status = (ch: Chain | null): string | null =>
    !ch ? "No destination recorded"
      : ch.utm === false ? "No UTM — the page can't tell it was this send"
      : !ch.measured ? "Next step not measured"
      : ch.resolution === "channel" ? "Known by channel only"
      : null;
  const metric = (k: string, name: string) => i.values.find((x) => x.cta === k && x.metric === name)?.value;
  const slots = (["primary", "secondary", "tertiary"] as const)
    .map((k) => ({ k, text: k === "primary" ? comm.cta : k === "secondary" ? comm.secondaryCta : comm.tertiaryCta, chains: i.chainsOut.filter((ch) => ch.cta === k) }))
    .filter((sl) => sl.text || sl.chains.length);
  // Primary, secondary, then every other link by people clicked.
  const destinations = [
    ...slots.flatMap((sl) => (sl.chains.length ? sl.chains : [null]).map((ch) => ({ k: sl.k as string, text: (sl.k === "tertiary" ? ch?.via : sl.text ?? ch?.via) || "", ch }))),
    ...i.chainsOut.filter((ch) => !ch.cta).map((ch) => ({ k: "", text: ch.via || "", ch })),
  ].sort((a, b) => {
    const r = (k: string) => (k === "primary" ? 0 : k === "secondary" ? 1 : 2);
    return r(a.k) - r(b.k) || (b.ch?.people ?? 0) - (a.ch?.people ?? 0);
  });
  const edmIn = i.chainsIn.filter((ch) => byId(ch.from)?.type === "email").sort((a, b) => (b.measured ? b.people ?? 0 : -1) - (a.measured ? a.people ?? 0 : -1));
  const edmTotal = edmIn.reduce((a, ch) => a + (ch.measured ? ch.people ?? 0 : 0), 0);
  const edmShare = i.referrers.filter((r) => /edm/i.test(r.channel)).reduce((a, r) => a + Number(r.share.replace("%", "")), 0);

  return (
    <>
      {gaps.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {gaps.map((g) => (
            <li key={g.kind} className="rounded-md bg-tint-amber px-3 py-2 text-sm text-grey-90">
              <b className="font-semibold">{g.label}.</b> {g.detail}
            </li>
          ))}
        </ul>
      )}

      {(i.objective || i.new2026 || i.template) && (
        <p className="mt-4 text-sm text-grey-90">
          {i.objective && (
            <>
              <span className="text-grey-70">Objective </span>{OBJECTIVE_LABEL[i.objective]}
              {sm && <><span className="text-grey-70"> · success is </span>{sm.label}</>}
            </>
          )}
          {i.new2026 && <span className="text-grey-70">{i.objective ? " · " : ""}new for 2026</span>}
          {i.template && <span className="text-grey-70">{i.objective || i.new2026 ? " · " : ""}template loaded</span>}
        </p>
      )}
      {i.url && (
        <a href={i.url} target="_blank" rel="noreferrer" className={`mt-1 block truncate rounded text-sm text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
          {i.url.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      )}

      {/* ── Audience — one section: the variants as chips (this one selected,
          the others one tap away, each with its gap to benchmark), then how
          the send is cut. Replaces the map's Audience & Tailoring here. ── */}
      {isSend && (
        <Sec title={`Audience${siblings.length ? ` · ${siblings.length + 1} variants` : ""}`}>
          {siblings.length > 0 ? (
            <>
              {/* One measure across every chip — the open variant's success
                  measure — so the chips compare like with like. */}
              <div role="group" aria-label="Audience variant" className="mt-2 flex flex-wrap gap-1.5">
                {variantsOf(comm).map((v) => {
                  const ci = campaignInfo(v.id);
                  const hv = ci && head ? { value: ci.values.find((x) => !x.cta && x.metric === head.value.metric), label: head.label } : undefined;
                  const on = v.id === comm.id;
                  const c = hv?.value ? compare(hv.value) : null;
                  const d = hv?.value ? delta(hv.value) : null;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => !on && onOpenComm?.(v.id)}
                      className={`flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        on ? "border-grey-90 bg-grey-90 text-on-accent" : "border-grey-30 bg-card text-grey-80 hover:bg-grey-10"
                      } ${FOCUS_RING}`}
                    >
                      {(v.audience ?? "").replace(/^Year 12 · ?/, "") || "Year 12"}
                      {head && <span className={`font-semibold ${on ? "" : c === "worse" ? "text-danger" : c === "better" ? "text-success" : "text-grey-90"}`}>{hv?.value ? d ?? fmt(hv.value.value) : "—"}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-grey-70">
                {head ? `${head.label.charAt(0).toUpperCase()}${head.label.slice(1)} by variant` : "Variants"}
                {head && variantsOf(comm).some((v) => campaignInfo(v.id)?.values.some((x) => !x.cta && x.metric === head.value.metric && x.benchmark)) ? " · gap to benchmark" : ""}
                {i.variantBasis ? ` · split by ${i.variantBasis}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-grey-90">{comm.audience ?? "—"}</p>
          )}
        </Sec>
      )}

      <Sec title="Customer Value Proposition (CVP)">
      {i.cvp ? (
        <blockquote className={`mt-3 border-l-4 pl-4 ${COMM_COLORS[comm.type].text.replace("text-", "border-")}`}>
          <p className="text-lg leading-snug font-medium text-grey-90">“{i.cvp}”</p>
        </blockquote>
      ) : (
        <p className="mt-2 text-sm text-grey-70 italic">None recorded.</p>
      )}
      </Sec>

      <Sec title="Performance">
      {sm && (
        <div className="mt-2 flex items-baseline justify-between gap-3 rounded-md bg-grey-10 px-3 py-2">
          <span className="text-sm font-semibold text-grey-90">
            {sm.value.cta ? `Primary CTA · ${sm.value.metric.replace(/^Link — /, "")}` : sm.value.metric} <span className="font-normal text-grey-70">· success measure</span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className={`text-lg font-semibold ${compare(sm.value) === "better" ? "text-success" : compare(sm.value) === "worse" ? "text-danger" : "text-grey-90"}`}>{fmt(sm.value.value)}</span>
            <Versus v={sm.value} />
          </span>
        </div>
      )}
      {i.values.filter((x) => !x.cta && x !== sm?.value).length ? (
        <div className="mt-2"><Values values={i.values.filter((x) => !x.cta && x !== sm?.value)} /></div>
      ) : (
        <p className="mt-2 text-sm text-grey-70 italic">Not measured{head ? "" : " — no metrics loaded"}.</p>
      )}
      {VALUES_ARE_PROXY && i.values.length > 0 && <p className="mt-1 text-xs text-grey-60">Proxy figures.</p>}
      </Sec>


      {isSend && (
        <Sec title="Destinations">
          {destinations.length === 0 && <p className="mt-2 text-sm text-grey-70 italic">None recorded.</p>}
          <ul className="mt-2 divide-y divide-grey-30">
            {destinations.map(({ k, text, ch }, n) => {
              const dest = ch ? byId(ch.to) : undefined;
              const ranked = k === "primary" || k === "secondary";
              // Per-link counts live on the chain; the slot-level metric is
              // only unambiguous for the one primary and one secondary.
              const people = ch?.people ?? (ranked ? metric(k, "Link — people") : undefined);
              const pct = ranked ? metric(k, "Link — % of people") : undefined;
              const st = status(ch);
              return (
                <li key={`${k}-${n}`} className="grid grid-cols-[1fr_auto] items-start gap-x-4 py-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      {ranked && <span className={`rounded bg-grey-10 px-1.5 py-px text-grey-70 ${EYEBROW}`}>{k}</span>}
                      {dest?.type === "webpage" ? (
                        <PageBadge c={dest} onOpen={onOpenComm} />
                      ) : dest ? (
                        <button type="button" onClick={() => onOpenComm?.(dest.id)} className={`rounded text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}>
                          {dest.title}
                        </button>
                      ) : (
                        <span className="text-grey-60 italic">nowhere recorded</span>
                      )}
                    </p>
                    {text && <p className="mt-0.5 truncate text-xs text-grey-70">“{text}”</p>}
                    {st && <p className="mt-0.5 text-xs text-amber">{st}</p>}
                  </div>
                  <div className="text-right">
                    {people ? (
                      <>
                        <p className="text-base leading-tight font-semibold text-grey-90">{fmt(String(people))}</p>
                        <p className="text-xs text-grey-70">people{pct ? ` · ${pct}` : ""}</p>
                      </>
                    ) : (
                      <p className="text-xs text-grey-60 italic">no clicks recorded</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Sec>
      )}

      {isPage && (
        <Sec title="Destinations">
          <p className="mt-1 text-xs text-grey-70">Top 3 actions people took next</p>
          {i.nextSteps.length ? (
            <ol className="mt-2 divide-y divide-grey-30">
              {i.nextSteps.slice(0, 3).map((st, n) => {
                const to = st.to ? byId(st.to) : undefined;
                return (
                  <li key={st.action} className="flex items-baseline gap-3 py-2">
                    <span className="w-4 shrink-0 text-sm text-grey-60">{n + 1}</span>
                    <span className="min-w-0 flex-1 text-sm text-grey-90">
                      {to?.type === "webpage" ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">{st.action.replace(/^Click to .*/, "Click to")} <PageBadge c={to} onOpen={onOpenComm} /></span>
                      ) : to ? (
                        <button type="button" onClick={() => onOpenComm?.(to.id)} className={`rounded text-left hover:underline ${FOCUS_RING}`}>{st.action}</button>
                      ) : st.action}
                    </span>
                    <span className="shrink-0 text-sm"><b className="font-semibold text-grey-90">{st.share}</b> <span className="text-xs text-grey-70">· {st.people.toLocaleString()}</span></span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-grey-70 italic">Not measured.</p>
          )}

        </Sec>
      )}

      {/* ── Destinations for events and conversations ── */}
      {!isSend && !isPage && (
        <Sec title="Destinations">
          {i.chainsOut.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {i.chainsOut.map((ch) => {
                const dest = byId(ch.to);
                if (!dest) return null;
                const note = [ch.via && `“${ch.via}”`, ch.measured ? ch.people && `${ch.people.toLocaleString()} people` : "not measured"].filter(Boolean).join(" · ");
                return dest.type === "webpage" ? (
                  <li key={ch.to + (ch.cta ?? "")} className="flex flex-wrap items-center gap-2 py-1 text-sm"><PageBadge c={dest} onOpen={onOpenComm} /><span className="text-xs text-grey-70">{note}</span></li>
                ) : (
                  <li key={ch.to + (ch.cta ?? "")}><CommLink c={dest} onOpen={onOpenComm} note={note} /></li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-grey-70 italic">None recorded.</p>
          )}
        </Sec>
      )}

      {/* ── Referrers — the same section on every touchpoint ── */}
      {isSend ? (
        <Sec title="Referrers">
          <p className="mt-2 text-sm text-grey-70 italic">This type of touchpoint doesn&rsquo;t have traced referrers.</p>
        </Sec>
      ) : isPage ? (
        i.referrers.length > 0 || edmIn.length > 0 ? (
          <Sec title="Referrers">
              <ul className="mt-2 divide-y divide-grey-30">
                {edmIn.length > 0 && (
                  <li className="py-2">
                    <details>
                      <summary className={`grid cursor-pointer list-none grid-cols-[1fr_5rem_2.5rem] items-center gap-2 rounded text-sm ${FOCUS_RING}`}>
                        <span className="text-grey-80">eDMs <span className="text-grey-60">· {edmIn.length} CTAs</span></span>
                        <span className="h-1.5 rounded-full bg-grey-30"><span className="block h-full rounded-full bg-rmit-blue-interactive" style={{ width: `${edmShare}%` }} /></span>
                        <span className="text-right font-semibold text-grey-90">{edmShare}%</span>
                      </summary>
                      <ul className="mt-2 ml-3 divide-y divide-grey-30 border-l-2 border-grey-30 pl-3">
                        <li className="pb-1 text-xs text-grey-60">Share of the {edmTotal.toLocaleString()} people eDMs delivered here</li>
                        {(() => {
                          // One row per SEND: the share is the sum over its
                          // variants, the CTA is quoted once, the variants
                          // are one compact line beneath.
                          const bySend = new Map<string, typeof edmIn>();
                          for (const ch of edmIn) {
                            const src = byId(ch.from)!;
                            const key = `${src.title}|${ch.cta ?? ""}`;
                            bySend.set(key, [...(bySend.get(key) ?? []), ch]);
                          }
                          return [...bySend.values()]
                            .map((chs) => ({ chs, people: chs.reduce((a, ch) => a + (ch.measured ? ch.people ?? 0 : 0), 0), counted: chs.some((ch) => ch.measured && ch.people) }))
                            .sort((a, b) => (b.counted ? b.people : -1) - (a.counted ? a.people : -1))
                            .map(({ chs, people, counted }) => {
                              const first = byId(chs[0].from)!;
                              const pct = counted ? Math.round((people / edmTotal) * 100) : null;
                              const ch0 = chs[0];
                              return (
                                <li key={first.title + (ch0.cta ?? "")} className="py-2">
                                  <div className="grid grid-cols-[1fr_4rem_2.5rem] items-center gap-2">
                                    <button type="button" onClick={() => onOpenComm?.(first.id)} className={`min-w-0 rounded text-left text-sm text-grey-90 hover:underline ${FOCUS_RING}`}>
                                      {first.title}
                                    </button>
                                    {pct !== null ? (
                                      <>
                                        <span className="h-1.5 rounded-full bg-grey-30"><span className="block h-full rounded-full bg-rmit-blue-interactive" style={{ width: `${pct}%` }} /></span>
                                        <span className="text-right text-sm font-semibold text-grey-90">{pct}%</span>
                                      </>
                                    ) : (
                                      <span className="col-span-2 text-right text-xs text-amber">{ch0.utm === false ? "no UTM" : "not measured"}</span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-grey-70">
                                    {ch0.cta ? `${ch0.cta} CTA` : "CTA"}{ch0.via ? ` “${ch0.via}”` : ""}
                                  </p>
                                  {chs.length > 1 && (
                                    <p className="mt-0.5 text-xs text-grey-70">
                                      {chs
                                        .map((ch) => ({ ch, src: byId(ch.from)!, p: ch.measured && ch.people ? Math.round(((ch.people ?? 0) / edmTotal) * 100) : null }))
                                        .sort((a, b) => (b.p ?? -1) - (a.p ?? -1))
                                        .map(({ ch, src, p }, n) => (
                                          <span key={ch.from}>
                                            {n > 0 && " · "}
                                            <button type="button" onClick={() => onOpenComm?.(src.id)} className={`rounded hover:underline ${FOCUS_RING}`}>
                                              {(src.audience ?? "").replace(/^Year 12 · ?/, "") || "Year 12"}
                                            </button>{" "}
                                            <span className={p === null ? "text-amber" : "font-semibold text-grey-90"}>{p === null ? "—" : `${p}%`}</span>
                                          </span>
                                        ))}
                                    </p>
                                  )}
                                </li>
                              );
                            });
                        })()}
                      </ul>
                    </details>
                  </li>
                )}
                {i.referrers.filter((r) => !/edm/i.test(r.channel)).map((r) => (
                  <li key={r.channel + r.utmSource} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-2 py-2 text-sm">
                    <span className="truncate text-grey-80">{r.channel}{r.utmSource && <span className="text-grey-60"> · {r.utmSource}</span>}</span>
                    <span className="h-1.5 rounded-full bg-grey-30"><span className="block h-full rounded-full bg-rmit-blue-interactive" style={{ width: r.share }} /></span>
                    <span className="text-right font-semibold text-grey-90">{r.share}</span>
                  </li>
                ))}
              </ul>
          </Sec>
        ) : (
          <Sec title="Referrers">
            <p className="mt-2 text-sm text-grey-70 italic">Not measured.</p>
          </Sec>
        )
      ) : (
        <Sec title="Referrers">
          {i.chainsIn.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {i.chainsIn.map((ch) => {
                const src = byId(ch.from);
                return src ? <li key={ch.from + (ch.cta ?? "")}><CommLink c={src} onOpen={onOpenComm} note={[ch.via && `“${ch.via}”`, ch.measured ? ch.people && `${ch.people.toLocaleString()} people` : "not measured"].filter(Boolean).join(" · ")} /></li> : null;
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-grey-70 italic">None recorded.</p>
          )}
        </Sec>
      )}
    </>
  );
}
