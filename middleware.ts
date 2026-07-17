// Vercel Edge Middleware — HTTP Basic Auth gate for the whole prototype.
// Runs on every request before any static asset is served, so nothing loads
// until the visitor enters the password.
//
// Credentials come from env vars, with a default fallback so the gate is live
// on the very first deploy. To change them: Vercel → Project → Settings →
// Environment Variables → set BASIC_AUTH_USER / BASIC_AUTH_PASSWORD, then
// redeploy. (This is a lightweight prototype gate, not hardened auth.)
export const config = { matcher: "/(.*)" };

export default function middleware(request: Request): Response | undefined {
  const user = process.env.BASIC_AUTH_USER || "rmit";
  const pass = process.env.BASIC_AUTH_PASSWORD || "touchpoints2026";

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [u, p] = atob(header.slice(6)).split(":");
      if (u === user && p === pass) return undefined; // authorised → continue
    } catch {
      // malformed header — fall through to the prompt below
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Comms Calendar (prototype)", charset="UTF-8"',
    },
  });
}
