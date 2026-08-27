import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { EYEBROW } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";

interface UserEntry {
  userId: string;
  firstName?: string;
  portfolio?: string;
  email?: string;
  event?: string;
  updatedAt?: string;
}

interface UserRow {
  userId: string;
  firstName: string;
  portfolio?: string;
  email?: string;
  firstSeen?: string;
  lastSeen?: string;
  visits: number;
}

function aggregate(byUser: Record<string, UserEntry[]>): UserRow[] {
  const rows: UserRow[] = [];
  for (const [userId, entries] of Object.entries(byUser)) {
    const stamps = entries.map((e) => e.updatedAt).filter(Boolean).sort() as string[];
    const named = [...entries].reverse().find((e) => e.firstName);
    rows.push({
      userId,
      firstName: named?.firstName ?? "(no name)",
      portfolio: [...entries].reverse().find((e) => e.portfolio)?.portfolio,
      email: [...entries].reverse().find((e) => e.email)?.email,
      firstSeen: stamps[0],
      lastSeen: stamps[stamps.length - 1],
      visits: entries.length, // register + one per later session
    });
  }
  // Most recently seen first.
  return rows.sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));
}

function fmt(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Admin-only access log: who has used the map, aggregated from the `users`
 *  collection (one register entry + one visit entry per browser session). */
export function UsersPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/collection/users")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API returned ${r.status}`))))
      .then((data) => live && setRows(aggregate(data)))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, []);

  return (
    <DetailPanelShell
      overline="Admin"
      title="Who's been in"
      iconChipClass="bg-tint-indigo text-indigo"
      icon={<UsersRound size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        {error && <p className="text-sm text-danger">Couldn&rsquo;t load the access log — {error}</p>}
        {!error && rows === null && <p className="text-sm text-grey-70">Loading…</p>}
        {rows && rows.length === 0 && (
          <p className="text-sm text-grey-70">No one has registered yet.</p>
        )}
        {rows && rows.length > 0 && (
          <>
            <p className={`text-grey-70 ${EYEBROW}`}>
              {rows.length} {rows.length === 1 ? "person" : "people"}
            </p>
            <ul className="mt-3 flex flex-col">
              {rows.map((u) => (
                <li
                  key={u.userId}
                  className="flex items-baseline justify-between gap-3 border-b border-grey-30 py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-grey-90">
                      {u.firstName}
                    </span>
                    {u.portfolio && (
                      <span className="block truncate text-xs text-grey-70">{u.portfolio}</span>
                    )}
                    {u.email && (
                      <span className="block truncate text-xs text-rmit-blue-interactive">
                        {u.email}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-grey-90">
                      {u.visits} {u.visits === 1 ? "visit" : "visits"}
                    </span>
                    <span className="block text-xs text-grey-70">
                      first {fmt(u.firstSeen)} · last {fmt(u.lastSeen)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </DetailPanelShell>
  );
}
