// Chains — where a touchpoint sends people next (eDM → page → form →
// registration). Two resolutions: "send" links one exact touchpoint to
// another; "channel" links a whole lane to a page — what CJA can say today
// ("EDM Clicked drove this page") when no UTM names the send. A channel
// chain is a chain AND a gap at the same time. Read from data/chains.csv.
import raw from "../../data/chains.csv?raw";
import { parseCsvRows } from "./csv";

export interface Chain {
  /** a comm id, or "lane:<team>" for a channel-level chain */
  from: string;
  to: string;
  /** the CTA that carries the link, when known */
  via?: string;
  resolution: "send" | "channel";
  /** whether the downstream side is measured — a "no" is a broken chain */
  measured: boolean;
}

export const CHAINS: Chain[] = parseCsvRows(raw).map((r) => ({
  from: r.from.trim(),
  to: r.to.trim(),
  via: r.via?.trim() || undefined,
  resolution: r.resolution?.trim() === "channel" ? "channel" : "send",
  measured: /^(y|yes|true|1)$/i.test(r.measured || ""),
}));

export const isLaneRef = (id: string) => id.startsWith("lane:");
export const laneOf = (id: string) => id.slice("lane:".length);

export const upstreamOf = (commId: string) => CHAINS.filter((c) => c.to === commId);
export const downstreamOf = (commId: string) =>
  CHAINS.filter((c) => c.from === commId || (isLaneRef(c.from) && false));
/** chains a comm takes part in on either side (lane chains count for every
 *  comm of that lane) */
export const chainsFor = (commId: string, team: string) =>
  CHAINS.filter((c) => c.from === commId || c.to === commId || c.from === `lane:${team}`);
