import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  addComm,
  addFeedback,
  getComms,
  getFeedback,
  deleteFeedback,
  getEdmReview,
  saveEdmAnswer,
} from "./dataStore.js";
import { isGraphConfigured } from "./graph.js";
import { isRedisConfigured } from "./redis.js";
import { COLLECTIONS, DATASETS } from "./registry.js";
import { createInvite, EMAIL_SENDING_LIVE, redeemInvite, sendInviteEmail, validInviteEmail } from "./invites.js";
import { appendToCollection, readCollection, readDataset } from "./stores.js";
import { COMMS_COLUMNS } from "../src/lib/commsSchema.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ graphConfigured: isGraphConfigured() });
});

app.get("/api/comms", async (_req, res) => {
  try {
    const result = await getComms();
    if (result.issues.length > 0) {
      console.warn(`[api] ${result.issues.length} comm row(s) skipped on import:`);
      for (const issue of result.issues) console.warn(`  row ${issue.row}: ${issue.message}`);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/comms", async (req, res) => {
  try {
    const input: Record<string, string> = {};
    for (const col of COMMS_COLUMNS) input[col] = req.body[col] ?? "";
    res.status(201).json(await addComm(input as never));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Admin key gates comment deletion (a second gate above the site password).
const ADMIN_KEY = process.env.FEEDBACK_ADMIN_KEY || "touchpoints-admin";
const adminOk = (req: { headers: Record<string, string | string[] | undefined> }) => {
  const h = req.headers["x-admin-key"];
  const key = Array.isArray(h) ? h[0] : h;
  return typeof key === "string" && key.length > 0 && key === ADMIN_KEY;
};

app.delete("/api/feedback", async (req, res) => {
  try {
    if (!adminOk(req)) {
      res.status(401).json({ error: "Admin key required to delete." });
      return;
    }
    const { commId, entryId } = req.body ?? {};
    if (!commId || !entryId) {
      res.status(400).json({ error: "commId and entryId are required" });
      return;
    }
    await deleteFeedback(commId, entryId);
    res.status(200).json({ ok: true, commId, entryId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/feedback", async (_req, res) => {
  try {
    res.json(await getFeedback());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    if (req.body?.action === "verifyAdmin") {
      res.status(200).json({ ok: adminOk(req) });
      return;
    }
    const { commId, author, comment, metricLabel, metricValue } = req.body ?? {};
    if (!commId || !comment) {
      res.status(400).json({ error: "commId and comment are required" });
      return;
    }
    const entry = await addFeedback(commId, {
      author: author || "Anonymous",
      comment,
      metricLabel: metricLabel || undefined,
      metricValue: metricValue || undefined,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// eDM question review — the /marketing-edms page (dev only; production uses
// api/edm-review.ts).
app.get("/api/edm-review", async (_req, res) => {
  try {
    res.json(await getEdmReview());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/edm-review", async (req, res) => {
  try {
    const { commId } = req.body ?? {};
    if (!commId) {
      res.status(400).json({ error: "commId is required" });
      return;
    }
    res.status(201).json(await saveEdmAnswer(req.body));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Generic dataset / collection routes ───────────────────────────────────
// Dev mirrors of api/dataset/[name].ts and api/collection/[name].ts, so a new
// CSV ingestion or review works the same locally and deployed. See
// server/registry.ts to add one.
app.get("/api/dataset/:name", async (req, res) => {
  const { name } = req.params;
  if (!DATASETS[name]) return void res.status(404).json({ error: `Unknown dataset "${name}"` });
  if (!isRedisConfigured()) {
    return void res.status(503).json({
      error: "No Redis configured — set KV_REST_API_URL / KV_REST_API_TOKEN in .env.",
    });
  }
  try {
    const envelope = await readDataset(name);
    if (!envelope) {
      return void res
        .status(404)
        .json({ error: `Dataset "${name}" has not been seeded yet — run \`npm run seed\`.` });
    }
    res.json(envelope);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/collection/:name", async (req, res) => {
  const { name } = req.params;
  if (!COLLECTIONS[name]) return void res.status(404).json({ error: `Unknown collection "${name}"` });
  try {
    res.json(await readCollection(name));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/collection/:name", async (req, res) => {
  const { name } = req.params;
  const def = COLLECTIONS[name];
  if (!def) return void res.status(404).json({ error: `Unknown collection "${name}"` });
  try {
    const itemId = (req.body ?? {})[def.itemKey];
    if (typeof itemId !== "string" || !itemId.trim()) {
      return void res.status(400).json({ error: `${def.itemKey} is required` });
    }
    const entry = {
      ...req.body,
      [def.itemKey]: itemId.trim(),
      updatedAt: new Date().toISOString(),
    };
    await appendToCollection(name, entry);
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Export the map to a print-ready vector PDF (the on-map "Export PDF" button).
// Drives headless system Chrome against the running dev server's ?print&dots
// view. Local-dev only — Chrome + the dev server must be present.
app.get("/api/export-pdf", async (req, res) => {
  try {
    const { generateMapPdf } = await import("../scripts/exportMapPdf.mjs");
    const url =
      (req.query.url as string) ??
      `http://localhost:${process.env.CLIENT_PORT || 5173}/?print&dots`;
    const { pdf, widthM, heightM } = await generateMapPdf({ url, log: (m) => console.log(`[pdf] ${m}`) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="comms-map.pdf"');
    res.setHeader("X-Print-Size", `${widthM.toFixed(2)}x${heightM.toFixed(2)}m`);
    res.send(pdf);
  } catch (err) {
    console.error("[pdf] export failed:", err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// QR invite flow — mirrors api/invite.ts for local dev.
app.post("/api/invite", async (req, res) => {
  const body = (req.body ?? {}) as { action?: string; email?: string; token?: string };
  try {
    if (body.action === "request") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!validInviteEmail(email))
        return void res.status(400).json({ error: "Enter your RMIT email address" });
      const token = await createInvite(email);
      const link = `http://localhost:5173/?invite=${token}`;
      const sent = await sendInviteEmail(email, link);
      return void res.status(200).json(EMAIL_SENDING_LIVE ? { sent } : { sent, link, stub: true });
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
});

const port = Number(process.env.API_PORT) || 5174;
const feedbackSource = isGraphConfigured()
  ? "SharePoint (Graph)"
  : isRedisConfigured()
    ? "Redis (Vercel KV / Upstash)"
    : "local feedback.json";
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] comms: ${isGraphConfigured() ? "SharePoint Excel (Graph)" : "local comms.csv"} · feedback: ${feedbackSource}`);
});
