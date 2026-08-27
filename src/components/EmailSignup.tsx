import { useState } from "react";
import { Mail } from "lucide-react";
import { FOCUS_RING } from "../lib/styles";

const FIELD =
  "w-full rounded-md border border-grey-30 bg-card px-3 py-2.5 text-base text-grey-90 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The page the printed QR opens (#/signup) — captures an email into the
 *  signups collection, nothing more. The team exports the list and emails
 *  people individually, by hand. Phone-first: this is what gets scanned. */
export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!value || state === "saving") return;
    if (!EMAIL_RE.test(value) || !/@rmit\.edu\.au$/i.test(value)) {
      setError("Enter your RMIT email address");
      return;
    }
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/collection/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API returned ${res.status}`);
      }
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-grey-30 bg-card p-6 shadow-lg">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint-blue text-rmit-blue">
          <Mail size={20} strokeWidth={2} aria-hidden />
        </span>
        {state === "done" ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-grey-90">You&rsquo;re on the list</h1>
            <p className="mt-2 text-sm leading-relaxed text-grey-70">
              We&rsquo;ll email you the link to the map.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-bold text-grey-90">Get the map</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-grey-70">
              Leave your email and we&rsquo;ll send you the link.
            </p>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs text-grey-70">RMIT email address</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="first.last@rmit.edu.au"
                  className={FIELD}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={!email.trim() || state === "saving"}
                className={`rounded-md bg-rmit-blue-interactive px-4 py-2.5 text-base font-semibold text-on-accent transition-[filter] hover:brightness-110 disabled:opacity-50 ${FOCUS_RING}`}
              >
                {state === "saving" ? "One moment…" : "Send me the link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
