import { useEffect, useRef, useState } from "react";
import { FOCUS_RING } from "../lib/styles";
import { registerUser, type MapUser } from "../lib/user";

/** One-time first-name prompt, shown right after the site password. The name
 *  identifies who is using the map (access log + comment authorship) and is
 *  stored only in this browser and the app's own store — never sent to any
 *  AI service. Blocking on purpose: the whole point is knowing who's here. */
export function NameGate({ onDone }: { onDone: (user: MapUser) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    onDone(await registerUser(trimmed));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="namegate-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-grey-90/40 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-lg border border-grey-30 bg-card p-6 shadow-xl">
        <h2 id="namegate-title" className="text-lg font-bold text-grey-90">
          Before you start
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-grey-70">
          Your first name signs your comments and tells the team who&rsquo;s using the map. It
          stays within this tool.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-grey-70">First name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={40}
              className="w-full rounded-md border border-grey-30 bg-card px-2.5 py-1.5 text-sm text-grey-90 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className={`rounded-md bg-rmit-blue-interactive px-4 py-2 text-sm font-semibold text-on-accent transition-[filter] hover:brightness-110 disabled:opacity-50 ${FOCUS_RING}`}
          >
            {saving ? "One moment…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
