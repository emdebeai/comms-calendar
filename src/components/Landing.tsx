import { useState } from "react";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { FOCUS_RING } from "../lib/styles";
import {
  ABOUT_PAGES,
  AI_POLICY,
  BIBLIOGRAPHY,
  GLOSSARY,
  INTRO,
  PEOPLE,
  PERSONAS,
  type AboutPage,
} from "../data/aboutContent";

type Page = "home" | AboutPage["slug"];

interface LandingProps {
  onEnter: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const CARD = "rounded-lg border border-grey-30 bg-card p-6";

export function Landing({ onEnter, theme, onToggleTheme }: LandingProps) {
  const [page, setPage] = useState<Page>("home");
  return (
    <div className="min-h-screen bg-surface font-sans text-grey-90">
      <SiteNav page={page} setPage={setPage} theme={theme} onToggleTheme={onToggleTheme} />
      <main className="mx-auto max-w-[952px] px-6 pt-10 pb-20">
        {page === "home" ? (
          <Home onEnter={onEnter} setPage={setPage} />
        ) : (
          <Reference slug={page} onBack={() => setPage("home")} />
        )}
      </main>
    </div>
  );
}

// ── Navigation ───────────────────────────────────────────────────────────
function SiteNav({
  page,
  setPage,
  theme,
  onToggleTheme,
}: {
  page: Page;
  setPage: (p: Page) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-grey-30 bg-card/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[952px] items-center justify-between gap-4 px-6 py-3">
        <button
          type="button"
          onClick={() => setPage("home")}
          className={`rounded-md text-sm font-bold text-rmit-blue ${FOCUS_RING}`}
        >
          Current State Touch Points
        </button>
        <div className="flex items-center gap-1">
          {ABOUT_PAGES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setPage(p.slug)}
              aria-current={page === p.slug ? "page" : undefined}
              className={`hidden rounded-md px-2.5 py-1 text-sm transition-colors sm:block ${FOCUS_RING} ${
                page === p.slug
                  ? "font-medium text-rmit-blue"
                  : "text-grey-70 hover:bg-grey-10 hover:text-grey-90"
              }`}
            >
              {p.title}
            </button>
          ))}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={`ml-1 flex h-8 w-8 items-center justify-center rounded-full text-grey-70 hover:bg-grey-10 ${FOCUS_RING}`}
          >
            {theme === "dark" ? (
              <Sun size={16} strokeWidth={2} aria-hidden />
            ) : (
              <Moon size={16} strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────
function Home({ onEnter, setPage }: { onEnter: () => void; setPage: (p: Page) => void }) {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero — scope / purpose (placeholder copy) */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-grey-60">
          {INTRO.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-rmit-blue">
          Current State Touch Points
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-grey-80">{INTRO.what}</p>
      </section>

      {/* Why a map */}
      <section>
        <h2 className="text-xl font-semibold text-grey-90">Why a map</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-grey-80">{INTRO.whyMap}</p>
      </section>

      {/* Personas */}
      <section>
        <h2 className="text-xl font-semibold text-grey-90">Choose a persona</h2>
        <p className="mt-2 max-w-2xl text-sm text-grey-70">
          The map is built for one persona at a time. Two more are planned.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {PERSONAS.map((p) =>
            p.available ? (
              <button
                key={p.code}
                type="button"
                onClick={onEnter}
                className={`group ${CARD} text-left transition-colors hover:border-rmit-blue-interactive ${FOCUS_RING}`}
              >
                <span className="inline-block rounded-md bg-tint-blue px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-rmit-blue">
                  {p.code}
                </span>
                <p className="mt-3 text-base font-semibold text-grey-90">{p.name}</p>
                <p className="mt-1 text-sm text-grey-70">{p.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rmit-blue-interactive">
                  View the map
                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </button>
            ) : (
              <div key={p.code} className={`${CARD} opacity-60`} aria-disabled="true">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-md bg-grey-20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-grey-70">
                    {p.code}
                  </span>
                  <span className="rounded-full bg-grey-10 px-2 py-0.5 text-xs text-grey-60">
                    Not mapped yet
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-grey-80">{p.name}</p>
                <p className="mt-1 text-sm text-grey-60">{p.blurb}</p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Reference pages */}
      <section>
        <h2 className="text-xl font-semibold text-grey-90">Reference</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ABOUT_PAGES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setPage(p.slug)}
              className={`group flex items-center justify-between gap-3 rounded-lg border border-grey-30 bg-card px-4 py-3 text-left transition-colors hover:border-rmit-blue-interactive ${FOCUS_RING}`}
            >
              <span>
                <span className="block text-sm font-medium text-grey-90">{p.title}</span>
                {p.intro && <span className="block text-xs text-grey-70">{p.intro}</span>}
              </span>
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="shrink-0 text-grey-60 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Reference pages ────────────────────────────────────────────────────────
function Reference({ slug, onBack }: { slug: AboutPage["slug"]; onBack: () => void }) {
  const meta = ABOUT_PAGES.find((p) => p.slug === slug)!;
  return (
    <article className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className={`rounded-md text-sm text-rmit-blue-interactive hover:underline ${FOCUS_RING}`}
        >
          ← Back to start
        </button>
        <h1 className="mt-3 text-3xl font-bold text-rmit-blue">{meta.title}</h1>
        {meta.intro && <p className="mt-2 max-w-2xl text-base text-grey-80">{meta.intro}</p>}
      </div>

      {slug === "glossary" && (
        <dl className={`${CARD} flex flex-col divide-y divide-grey-30`}>
          {GLOSSARY.map((g) => (
            <div key={g.term} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
              <dt className="w-40 shrink-0 text-sm font-semibold text-grey-90">{g.term}</dt>
              <dd className="text-sm text-grey-80">{g.def}</dd>
            </div>
          ))}
        </dl>
      )}

      {slug === "bibliography" && (
        <ul className="flex flex-col gap-3">
          {BIBLIOGRAPHY.map((b) => (
            <li key={b.cite} className={CARD}>
              <p className="text-sm font-semibold text-grey-90">{b.cite}</p>
              <p className="mt-1 text-sm text-grey-70">{b.note}</p>
            </li>
          ))}
        </ul>
      )}

      {slug === "people" && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {PEOPLE.map((p, i) => (
            <li key={i} className={CARD}>
              <p className="text-sm font-semibold text-grey-90">{p.name}</p>
              <p className="mt-1 text-sm text-grey-70">{p.role}</p>
            </li>
          ))}
        </ul>
      )}

      {slug === "ai-policy" && (
        <div className={`${CARD} flex flex-col gap-3`}>
          <p className="text-base text-grey-80">{AI_POLICY.intro}</p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-grey-80">
            {AI_POLICY.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
