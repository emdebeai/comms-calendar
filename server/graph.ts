// Talks to Microsoft Graph using an app-only (client-credentials) token —
// no per-user Microsoft sign-in, so "anyone with the link" still holds for
// people using the app. This requires an Azure AD (Entra ID) app
// registration with an *application* permission (not delegated) for
// Files.ReadWrite.All or Sites.Selected, admin-consented once by whoever
// manages RMIT's tenant. See ../.env.example for the exact steps.

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

interface GraphEnv {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl?: string; // e.g. https://rmit.sharepoint.com/sites/TeamSite
  filePath?: string; // e.g. /Shared Documents/comms-calendar.xlsx
  shareUrl?: string; // alternative to siteUrl+filePath: a share link to the file
  commsTable: string;
  feedbackTable: string;
}

function readEnv(): GraphEnv | null {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const siteUrl = process.env.EXCEL_SITE_URL;
  const filePath = process.env.EXCEL_FILE_PATH;
  const shareUrl = process.env.EXCEL_SHARE_URL;

  if (!tenantId || !clientId || !clientSecret) return null;
  if (!(siteUrl && filePath) && !shareUrl) return null;

  return {
    tenantId,
    clientId,
    clientSecret,
    siteUrl,
    filePath,
    shareUrl,
    commsTable: process.env.EXCEL_COMMS_TABLE || "CommsTable",
    feedbackTable: process.env.EXCEL_FEEDBACK_TABLE || "FeedbackTable",
  };
}

export function isGraphConfigured(): boolean {
  return readEnv() !== null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(env: GraphEnv): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.clientId,
        client_secret: env.clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Azure AD token request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function graphFetch(env: GraphEnv, path: string, init?: RequestInit) {
  const token = await getAccessToken(env);
  const res = await fetch(`${GRAPH_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Graph request failed (${path}): ${res.status} ${await res.text()}`);
  }
  return res.json();
}

let cachedFile: { driveId: string; itemId: string } | null = null;

async function resolveExcelFile(env: GraphEnv): Promise<{ driveId: string; itemId: string }> {
  if (cachedFile) return cachedFile;

  if (env.siteUrl && env.filePath) {
    // Recommended path: Sites.Selected scoped to one site, no tenant-wide grant.
    const url = new URL(env.siteUrl);
    const sitePath = url.pathname; // e.g. /sites/TeamSite
    const site = (await graphFetch(env, `/sites/${url.hostname}:${sitePath}`)) as { id: string };
    const drive = (await graphFetch(env, `/sites/${site.id}/drive`)) as { id: string };
    const encodedPath = env.filePath.split("/").map(encodeURIComponent).join("/");
    const item = (await graphFetch(env, `/drives/${drive.id}/root:${encodedPath}`)) as { id: string };
    cachedFile = { driveId: drive.id, itemId: item.id };
    return cachedFile;
  }

  // Fallback: resolve a share link directly (needs Files.Read/ReadWrite.All).
  const shareId =
    "u!" +
    Buffer.from(env.shareUrl!)
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\//g, "_")
      .replace(/\+/g, "-");
  const item = (await graphFetch(env, `/shares/${shareId}/driveItem`)) as {
    id: string;
    parentReference: { driveId: string };
  };
  cachedFile = { driveId: item.parentReference.driveId, itemId: item.id };
  return cachedFile;
}

async function workbookTablePath(env: GraphEnv, tableName: string, suffix = "") {
  const { driveId, itemId } = await resolveExcelFile(env);
  return `/drives/${driveId}/items/${itemId}/workbook/tables/${tableName}${suffix}`;
}

/** Reads a table's header + data rows. */
export async function readTable(
  tableName: string,
): Promise<{ header: string[]; rows: string[][] }> {
  const env = readEnv();
  if (!env) throw new Error("Graph isn't configured");

  const headerRange = (await graphFetch(
    env,
    `${await workbookTablePath(env, tableName, "/headerRowRange")}`,
  )) as { values: string[][] };
  const dataRows = (await graphFetch(env, `${await workbookTablePath(env, tableName, "/rows")}`)) as {
    value: Array<{ values: unknown[][] }>;
  };

  return {
    header: headerRange.values[0].map((h) => h.trim().toLowerCase()),
    rows: dataRows.value.map((r) => r.values[0].map((v) => (v === null ? "" : String(v)))),
  };
}

/** Appends one row (values in the same column order as the table header). */
export async function appendTableRow(tableName: string, values: string[]): Promise<void> {
  const env = readEnv();
  if (!env) throw new Error("Graph isn't configured");
  await graphFetch(env, `${await workbookTablePath(env, tableName, "/rows")}`, {
    method: "POST",
    body: JSON.stringify({ values: [values] }),
  });
}

export function tableNames(): { comms: string; feedback: string } {
  const env = readEnv();
  return { comms: env?.commsTable ?? "CommsTable", feedback: env?.feedbackTable ?? "FeedbackTable" };
}
