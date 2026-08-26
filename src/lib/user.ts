// Lightweight user identity for the gated map.
//
// After the site password, each person gives their FIRST NAME once (NameGate).
// The name pairs with a random opaque userId and is stored in exactly two
// places: this browser's localStorage, and the app's own Redis store behind
// the Vercel API (the "users" collection — register + per-session visit
// entries, so the team can see who is actually using the map and when).
//
// PRIVACY RULE: the name and userId are NEVER sent to any AI service or any
// third party — the only network hop is the app's own /api. Keep it that way.

export interface MapUser {
  userId: string;
  firstName: string;
}

const KEY = "cc-user";
const SESSION_FLAG = "cc-visit-logged";

export function getUser(): MapUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as MapUser;
    return u.userId && u.firstName ? u : null;
  } catch {
    return null;
  }
}

async function post(entry: Record<string, string>): Promise<void> {
  // Best-effort: the standalone build has no API; a gated viewer with a
  // flaky connection must never be locked out of the map by logging.
  try {
    await fetch("/api/collection/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    /* logging is best-effort by design */
  }
}

/** First-run registration: mint an opaque id, persist locally, log remotely. */
export async function registerUser(firstName: string): Promise<MapUser> {
  const user: MapUser = { userId: crypto.randomUUID(), firstName: firstName.trim() };
  localStorage.setItem(KEY, JSON.stringify(user));
  sessionStorage.setItem(SESSION_FLAG, "1");
  await post({ ...user, event: "register" });
  return user;
}

/** Once per browser session, log that this known user opened the map. */
export function logVisit(user: MapUser): void {
  if (sessionStorage.getItem(SESSION_FLAG)) return;
  sessionStorage.setItem(SESSION_FLAG, "1");
  void post({ ...user, event: "visit" });
}
