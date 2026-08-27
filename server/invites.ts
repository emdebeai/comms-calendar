// One-time invite links for the printed QR flow.
//
// The printed QR opens a static REQUEST page; the person enters their email;
// we mint an opaque one-time token, store it in Redis with an expiry, and
// email them their unique link (?invite=TOKEN). First redemption burns the
// token — a forwarded link fails. No AI anywhere: deterministic code, our own
// Redis, and (once wired) our own mail sender.
//
// EMAIL SENDING IS STUBBED until a sender is chosen (Graph sendMail once ITS
// provisions Azure, or a transactional service). While stubbed, the request
// response includes the link so the flow is testable end-to-end; set
// INVITE_EMAIL_MODE=live to suppress that once real sending is wired in.
import { randomUUID } from "node:crypto";
import { redisCommand } from "./redis.js";

const NS = "comms-calendar";
const inviteKey = (token: string) => `${NS}:invite:${token}`;
const EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface InviteRecord {
  email: string;
  createdAt: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Restrict to RMIT addresses; loosen or extend deliberately, not by accident.
const ALLOWED_DOMAINS = [/@rmit\.edu\.au$/i];

export function validInviteEmail(email: string): boolean {
  return EMAIL_RE.test(email) && ALLOWED_DOMAINS.some((re) => re.test(email));
}

/** Mint a one-time token for this email and store it with a 7-day expiry. */
export async function createInvite(email: string): Promise<string> {
  const token = randomUUID();
  const record: InviteRecord = { email: email.trim().toLowerCase(), createdAt: new Date().toISOString() };
  await redisCommand(["SET", inviteKey(token), JSON.stringify(record), "EX", String(EXPIRY_SECONDS)]);
  return token;
}

/** Redeem a token — burns it (GETDEL) so a second use fails. */
export async function redeemInvite(token: string): Promise<InviteRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const raw = await redisCommand<string | null>(["GETDEL", inviteKey(token)]);
  return raw ? (JSON.parse(raw) as InviteRecord) : null;
}

/** STUB — replace with the real sender (Graph sendMail / transactional API).
 *  Returns true when an email was actually dispatched. */
export async function sendInviteEmail(email: string, link: string): Promise<boolean> {
  // eslint-disable-next-line no-console
  console.log(`[invite] would email ${email}: ${link}`);
  return false; // nothing actually sent yet
}

export const EMAIL_SENDING_LIVE = process.env.INVITE_EMAIL_MODE === "live";
