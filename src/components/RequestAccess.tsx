import { useState } from "react";
import { Mail } from "lucide-react";
import { FOCUS_RING } from "../lib/styles";
import { requestInvite } from "../lib/invite";

const FIELD =
  "w-full rounded-md border border-grey-30 bg-card px-3 py-2.5 text-base text-grey-90 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";

/** The page the printed QR opens (#/request) — collects an RMIT email and
 *  sends a unique one-time link. Phone-first layout: this is scanned. */
export function RequestAccess() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  // While email sending is stubbed the API hands the link back — show it so
  // the flow works end-to-end before a sender is wired in.
  const [stubLink, setStubLink] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const r = await requestInvite(email.trim());
      setStubLink(r.stub && r.link ? r.link : null);
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
        <h1 className="mt-4 text-xl font-bold text-grey-90">Get your link to the map</h1>
        {state === "done" ? (
          <div className="mt-2 text-sm leading-relaxed text-grey-80">
            {stubLink ? (
              <>
                <p>
                  Email sending isn&rsquo;t wired up yet — here&rsquo;s your one-time link
                  directly:
                </p>
                <a
                  href={stubLink}
                  className={`mt-3 block break-all rounded-md bg-tint-blue px-3 py-2 text-sm font-medium text-rmit-blue-interactive ${FOCUS_RING}`}
                >
                  {stubLink}
                </a>
                <p className="mt-3 text-xs text-grey-70">
                  It works once, on one device, and expires in 7 days.
                </p>
              </>
            ) : (
              <p>
                Check your inbox — your unique link is on its way. It works once, on one
                device, and expires in 7 days.
              </p>
            )}
          </div>
        ) : (
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
              disabled={!email.trim() || state === "sending"}
              className={`rounded-md bg-rmit-blue-interactive px-4 py-2.5 text-base font-semibold text-on-accent transition-[filter] hover:brightness-110 disabled:opacity-50 ${FOCUS_RING}`}
            >
              {state === "sending" ? "One moment…" : "Email me my link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
