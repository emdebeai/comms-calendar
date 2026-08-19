import { useEffect, useRef } from "react";
import { ArrowRight, BookText, Bot, Library, Users } from "lucide-react";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

// Placeholder body copy — the real scope/purpose/why text is still being
// written, so these stay lorem ipsum on purpose.
const LOREM_SCOPE =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const LOREM_WHY =
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

interface Persona {
  code: string;
  name: string;
  ready: boolean;
}
const PERSONAS: Persona[] = [
  { code: "DOM SL", name: "Domestic school leaver", ready: true },
  { code: "NSL", name: "Non-school leaver", ready: false },
  { code: "INTON", name: "International (onshore)", ready: false },
];

interface RefSection {
  key: string;
  title: string;
  icon: typeof Library;
  body: string;
}
const REFERENCES: RefSection[] = [
  { key: "bibliography", title: "Bibliography", icon: Library, body: LOREM_WHY },
  { key: "glossary", title: "Glossary", icon: BookText, body: LOREM_WHY },
  { key: "people", title: "People consulted", icon: Users, body: LOREM_WHY },
  { key: "ai", title: "AI policy", icon: Bot, body: LOREM_WHY },
];

/** The landing page — the front door to the touchpoint map. Introduces what
 *  the map is and why it exists, offers the persona to open (only DOM SL is
 *  built), and holds the reference material (bibliography, glossary, people
 *  consulted, AI policy). Styled to the RMIT design system. */
export function Landing({ onEnter }: { onEnter: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => btnRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="min-h-screen bg-surface font-sans text-grey-90">
      <div className="mx-auto max-w-[952px] px-6 py-14 sm:py-20">
        {/* Hero — what this is */}
        <header>
          <div className="flex items-center gap-2">
            <p className={`${EYEBROW} text-grey-70`}>RMIT · Experience design</p>
            <span className="rounded-md bg-tint-blue px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-rmit-blue">
              Prototype
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-rmit-blue sm:text-5xl">
            Current State Touch Points
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-grey-80">{LOREM_SCOPE}</p>
        </header>

        {/* Why this map */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-grey-90">Why this map</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-grey-80">{LOREM_WHY}</p>
        </section>

        {/* Personas — DOM SL is the only one built; the others are placeholders */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-grey-90">Prospective student types</h2>
          <p className="mt-2 max-w-2xl text-sm text-grey-70">
            One map per prospective-student type. Only the domestic school leaver is mapped so far.
          </p>
          <ul className="mt-5 grid gap-6 sm:grid-cols-3">
            {PERSONAS.map((p) =>
              p.ready ? (
                <li key={p.code}>
                  <button
                    ref={btnRef}
                    type="button"
                    onClick={onEnter}
                    aria-label={`Open the ${p.name} touchpoint map`}
                    className={`group flex h-full w-full flex-col rounded-lg border border-rmit-blue bg-card p-6 text-left transition-colors hover:bg-tint-blue/40 ${FOCUS_RING}`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-widest text-rmit-blue">
                      {p.code}
                    </span>
                    <span className="mt-2 text-base font-semibold text-grey-90">{p.name}</span>
                    <span className="mt-1 text-sm text-grey-70">Mapped and ready to explore.</span>
                    <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-rmit-blue-interactive">
                      View the map
                      <ArrowRight
                        size={15}
                        strokeWidth={2.25}
                        className="transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </button>
                </li>
              ) : (
                <li key={p.code}>
                  <div
                    aria-disabled="true"
                    className="flex h-full cursor-not-allowed flex-col rounded-lg border border-grey-30 bg-card p-6 text-left opacity-60"
                  >
                    <span className="text-xs font-semibold uppercase tracking-widest text-grey-60">
                      {p.code}
                    </span>
                    <span className="mt-2 text-base font-semibold text-grey-80">{p.name}</span>
                    <span className="mt-1 text-sm text-grey-60">Not mapped yet.</span>
                    <span className="mt-5 inline-flex w-fit rounded-full bg-grey-20 px-2 py-0.5 text-xs font-medium text-grey-70">
                      Coming soon
                    </span>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>

        {/* Reference material */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-grey-90">Reference</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {REFERENCES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.key} className="rounded-lg border border-grey-30 bg-card p-6">
                  <div className="flex items-center gap-2.5">
                    <Icon size={18} strokeWidth={2} className="shrink-0 text-rmit-blue" aria-hidden />
                    <h3 className="text-base font-semibold text-grey-90">{r.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-grey-70">{r.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
