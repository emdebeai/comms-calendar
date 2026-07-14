import { ChevronDown, ChevronRight, Quote } from "lucide-react";
import { STAGES } from "../data/journey";
import { STUDENT_EXPERIENCE } from "../data/studentExperience";
import { LABEL_W, SXL_BODY_H, SXL_TOGGLE_H, TOTAL_W, scaleX } from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";

interface Props {
  open: boolean;
  onToggle: () => void;
}

/** Student experience layer — a collapsible band under the journey-stage
 *  header. One column per stage (aligned to the stage spans above) showing
 *  what students are thinking, needing, asking, deciding and doing there, so
 *  stakeholders can check the comms in each stage against real student needs.
 *  Content sticks to the left of wide stages while scrolling, like the stage
 *  labels do. */
interface SxItem {
  stage: (typeof STAGES)[number];
  data: (typeof STUDENT_EXPERIENCE)[number];
}
interface SxGroup {
  from: number;
  to: number;
  items: SxItem[];
}

/** One readable column per journey stage — the stages are deliberately kept
 *  distinct (the scale magnifies the short Decide/Begin/Submit crunch so they
 *  don't collapse into slivers). Kept as single-item groups so the render can
 *  still share code with any future grouping. */
function buildGroups(): SxGroup[] {
  return STAGES.flatMap((stage) => {
    const data = STUDENT_EXPERIENCE.find((e) => e.stage === stage.label);
    return data ? [{ from: stage.from, to: stage.to, items: [{ stage, data }] }] : [];
  });
}

export function StudentExperienceBand({ open, onToggle }: Props) {
  const height = SXL_TOGGLE_H + (open ? SXL_BODY_H : 0);
  const groups = buildGroups();

  return (
    <div className="relative z-30" style={{ height }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
        <div
          className="flex items-center border-b border-grey-30 bg-tint-blue"
          style={{ height: SXL_TOGGLE_H }}
        >
          <span
            className="px-3 text-xs text-rmit-blue"
            style={{ position: "sticky", left: LABEL_W + 8 }}
          >
            The questions students are asking at each stage — check the comms
            below actually answer them
          </span>
        </div>

        {open && (
          <div
            id="student-experience-body"
            role="region"
            aria-label="Student experience by journey stage"
            className="relative border-b border-grey-30 bg-white"
            style={{ height: SXL_BODY_H }}
          >
            {groups.map((group, gi) => {
              const left = scaleX(group.from);
              const width = scaleX(group.to) - scaleX(group.from);
              return (
                <div
                  key={group.items[0].stage.label}
                  className={`absolute top-0 h-full ${gi > 0 ? "border-l border-grey-20" : ""}`}
                  style={{ left, width }}
                >
                  {/* Sticky-left so a wide stage's content stays in view while
                      scrolling through it; min 150px so merged narrow stages
                      stay readable rather than wrapping into slivers. */}
                  <div
                    className="h-full py-2"
                    style={{
                      position: "sticky",
                      left: LABEL_W + 8,
                      maxWidth: Math.max(Math.min(width - 12, 440), 150),
                    }}
                  >
                    {/* Questions only — the sharpest alignment test ("does
                        this comm answer what students are asking here?").
                        The full voice/needs/decisions/actions content stays
                        in studentExperience.ts if a deeper view is wanted. */}
                    {/* Pulled-quote style — no fill (so nothing competes with
                        the type-coloured comm chips below); a neutral left
                        rule + italic + one small quote glyph. */}
                    <div className="relative h-full">
                      <div className="h-full overflow-y-auto px-3 pb-4">
                        {group.items.length > 1 ? (
                          /* Merged crunch (Decide → Submit): one combined
                             header + all questions flat, so it stays compact. */
                          <>
                            <p className="text-xs font-bold text-grey-90">
                              {group.items[0].stage.label} → {group.items[group.items.length - 1].stage.label}
                              <span className="font-normal text-grey-70">
                                {" "}
                                · {group.items[0].data.timing}
                              </span>
                            </p>
                            <ul className="mt-1.5 flex flex-col gap-2">
                              {group.items
                                .flatMap((it) =>
                                  it.data.blocks.flatMap((b) =>
                                    b.groups.filter((g) => g.heading === "Questions").flatMap((g) => g.items),
                                  ),
                                )
                                .map((q) => (
                                  <li
                                    key={q}
                                    className="flex gap-1.5 border-l-2 border-grey-30 pl-2 text-xs leading-snug text-grey-80 italic"
                                  >
                                    <Quote size={11} strokeWidth={0} fill="currentColor" className="mt-0.5 shrink-0 text-grey-40" aria-hidden />
                                    <span>{q}</span>
                                  </li>
                                ))}
                            </ul>
                          </>
                        ) : (
                          group.items.map((item) => (
                            <div key={item.stage.label}>
                              <p className="text-xs font-bold text-grey-90">
                                {item.stage.label}
                                <span className="font-normal text-grey-70"> · {item.data.timing}</span>
                              </p>
                              {item.data.blocks.map((block, bi) => (
                                <div key={bi} className={bi > 0 ? "mt-2 border-t border-grey-20 pt-1.5" : ""}>
                                  {block.label && (
                                    <p className="mt-1 text-xs font-semibold text-rmit-blue">{block.label}</p>
                                  )}
                                  {block.groups
                                    .filter((g) => g.heading === "Questions")
                                    .map((g) => (
                                      <ul key={g.heading} className="mt-1.5 flex flex-col gap-2">
                                        {g.items.map((q) => (
                                          <li
                                            key={q}
                                            className="flex gap-1.5 border-l-2 border-grey-30 pl-2 text-xs leading-snug text-grey-80 italic"
                                          >
                                            <Quote size={11} strokeWidth={0} fill="currentColor" className="mt-0.5 shrink-0 text-grey-40" aria-hidden />
                                            <span>{q}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ))}
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                      {/* soft fade so any clipped questions hint "scroll for more" */}
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky gutter: the toggle ── */}
      <div
        className="sticky left-0 h-full border-r border-grey-30 bg-white"
        style={{ width: LABEL_W }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={open}
          aria-controls="student-experience-body"
          className={`flex w-full items-center gap-1.5 border-b border-grey-30 bg-tint-blue px-3 text-left text-xs font-semibold text-rmit-blue hover:bg-tint-blue/70 ${FOCUS_RING}`}
          style={{ height: SXL_TOGGLE_H }}
        >
          {open ? (
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          ) : (
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          )}
          Student experience
        </button>
      </div>
    </div>
  );
}
