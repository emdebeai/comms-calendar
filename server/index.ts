import "dotenv/config";
import cors from "cors";
import express from "express";
import { addComm, addFeedback, getComms, getFeedback, getEdmReview, saveEdmAnswer } from "./dataStore";
import { isGraphConfigured } from "./graph";
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

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] data source: ${isGraphConfigured() ? "SharePoint Excel (Graph)" : "local files (server/data/)"}`);
});
