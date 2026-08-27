// Vercel serverless function — the QR invite flow (see server/invites.ts).
//
//   POST { action: "request", email }  → mint a one-time token + (stub) email
//   POST { action: "redeem", token }   → burn the token, return the email
//
// Relative imports carry explicit .js extensions — package.json sets
// "type": "module" and Node's ESM loader can't resolve extensionless ones.
import {
  createInvite,
  EMAIL_SENDING_LIVE,
  redeemInvite,
  sendInviteEmail,
  validInviteEmail,
} from "../server/invites.js";
import { isRedisConfigured } from "../server/redis.js";

interface Req {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "POST only" });
  if (!isRedisConfigured())
    return void res.status(503).json({ error: "No store configured — invites need Redis" });

  const body = (req.body ?? {}) as { action?: string; email?: string; token?: string };

  try {
    if (body.action === "request") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!validInviteEmail(email))
        return void res.status(400).json({ error: "Enter your RMIT email address" });
      const token = await createInvite(email);
      const origin = (req.headers?.["x-forwarded-host"] as string)
        ? `https://${req.headers?.["x-forwarded-host"]}`
        : "";
      const link = `${origin}/?invite=${token}`;
      const sent = await sendInviteEmail(email, link);
      // While email sending is stubbed, hand the link back so the flow is
      // testable end-to-end. Live mode never exposes the link to the requester.
      return void res
        .status(200)
        .json(EMAIL_SENDING_LIVE ? { sent } : { sent, link, stub: true });
    }

    if (body.action === "redeem") {
      const record = await redeemInvite(body.token ?? "");
      if (!record)
        return void res.status(410).json({ error: "This invite has been used or has expired" });
      return void res.status(200).json({ ok: true, email: record.email });
    }

    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
