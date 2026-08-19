import "dotenv/config";
import cors from "cors";
import express from "express";
import { addComm, addFeedback, getComms, getFeedback } from "./dataStore";
import { isGraphConfigured } from "./graph";
import { isRedisConfigured } from "./redis";
import { COMMS_COLUMNS } from "../src/lib/commsSchema";

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

app.get("/api/feedback", async (_req, res) => {
  try {
    res.json(await getFeedback());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
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
