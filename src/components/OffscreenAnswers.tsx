import { ChevronLeft, ChevronRight } from "lucide-react";
import { LABEL_W } from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";

interface Props {
  /** answering touchpoints scrolled off the left / right edge */
  left: number;
  right: number;
  onGoLeft: () => void;
  onGoRight: () => void;
  /** keep the hovered question alive while the cursor is on a pointer */
  onKeep: () => void;
  onRelease: () => void;
}

const PILL =
  "pointer-events-auto animate-pop-in fixed top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-blue-highlight py-2 pr-3.5 pl-3 text-sm font-semibold text-white shadow-lg transition-[filter] hover:brightness-110";

/** When a hovered question's answering touchpoints are scrolled out of view,
 *  a pointer at the corresponding edge shows how many are that way — so the
 *  spotlight never just dims to nothing. Click to scroll them into view. */
export function OffscreenAnswers({ left, right, onGoLeft, onGoRight, onKeep, onRelease }: Props) {
  const word = (n: number) => `${n} touchpoint${n === 1 ? "" : "s"} that answer this`;
  return (
    <>
      {left > 0 && (
        <button
          type="button"
          onClick={onGoLeft}
          onMouseEnter={onKeep}
          onMouseLeave={onRelease}
          className={`${PILL} ${FOCUS_RING}`}
          style={{ left: LABEL_W + 12 }}
          aria-label={`${word(left)} are off-screen to the left — scroll to them`}
          title={`${word(left)} this way`}
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
          {left}
        </button>
      )}
      {right > 0 && (
        <button
          type="button"
          onClick={onGoRight}
          onMouseEnter={onKeep}
          onMouseLeave={onRelease}
          className={`${PILL} ${FOCUS_RING} !pr-3 !pl-3.5`}
          style={{ right: 16 }}
          aria-label={`${word(right)} are off-screen to the right — scroll to them`}
          title={`${word(right)} this way`}
        >
          {right}
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </>
  );
}
