"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Trash2 } from "lucide-react";

const REVEAL_WIDTH = 76; // px — width of the delete panel revealed behind the row
const HYSTERESIS = 8; // px of movement before a gesture commits to an axis
const RUBBER_BAND_CONST = 0.55;
const PROJECTION_DECAY = 0.996; // a touch snappier than scroll's usual 0.998
const EXIT_DURATION_MS = 300; // must match the exit transition below

function rubberband(overshoot: number, dimension: number) {
  return (overshoot * dimension * RUBBER_BAND_CONST) / (dimension + RUBBER_BAND_CONST * Math.abs(overshoot));
}

function project(velocity: number) {
  return ((velocity / 1000) * PROJECTION_DECAY) / (1 - PROJECTION_DECAY);
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function liveTranslateX(el: HTMLElement | null, fallback: number) {
  if (!el) return fallback;
  try {
    return new DOMMatrixReadOnly(window.getComputedStyle(el).transform).m41;
  } catch {
    return fallback;
  }
}

export interface SwipeToDeleteHandle {
  close: () => void;
}

interface DragState {
  startX: number;
  startY: number;
  startTranslate: number;
  axisLocked: "x" | "y" | null;
  history: { x: number; t: number }[];
}

// Swipe a row left to reveal a delete action — direct 1:1 tracking, rubber-
// banded past its bounds, released with momentum projection so a fast flick
// commits even short of the full distance (apple-design skill, sections 2,
// 6, 9). Purely an enhancement: whatever delete control the row already has
// stays the accessible, gesture-free way to do the same thing.
const SwipeToDelete = forwardRef<
  SwipeToDeleteHandle,
  { children: React.ReactNode; onDelete: () => void; onOpenChange?: (open: boolean) => void }
>(function SwipeToDelete({ children, onDelete, onOpenChange }, ref) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const currentX = useRef(0);
  const suppressClick = useRef(false);

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const settleTo = (target: number) => {
    currentX.current = target;
    setTranslateX(target);
    onOpenChange?.(target !== 0);
  };

  const commitDelete = () => {
    const rowWidth = rowRef.current?.offsetWidth || 320;
    setIsExiting(true);
    currentX.current = -rowWidth;
    setTranslateX(-rowWidth);
    window.setTimeout(onDelete, reducedMotion() ? 0 : EXIT_DURATION_MS);
  };

  useImperativeHandle(ref, () => ({ close: () => settleTo(0) }));

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isExiting) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTranslate: currentX.current,
      axisLocked: null,
      history: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.axisLocked) {
      if (Math.abs(dx) < HYSTERESIS && Math.abs(dy) < HYSTERESIS) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag.current = null; // vertical intent — hand off to native scroll
        return;
      }
      state.axisLocked = "x";
      e.currentTarget.setPointerCapture(e.pointerId);
      // Start from the row's actual on-screen position, not a stale target —
      // it may still be mid-settle from a previous gesture (skill section 3).
      const live = liveTranslateX(trackRef.current, currentX.current);
      state.startTranslate = live - dx;
      currentX.current = live;
      suppressClick.current = true;
      setIsDragging(true);
    }

    e.preventDefault();
    state.history.push({ x: e.clientX, t: e.timeStamp });
    if (state.history.length > 5) state.history.shift();

    const rowWidth = rowRef.current?.offsetWidth || 320;
    const raw = state.startTranslate + dx;
    const next =
      raw > 0
        ? rubberband(raw, rowWidth)
        : raw < -REVEAL_WIDTH
          ? -REVEAL_WIDTH - rubberband(-raw - REVEAL_WIDTH, rowWidth)
          : raw;
    currentX.current = next;
    setTranslateX(next);
  };

  const handlePointerUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!state || state.axisLocked !== "x") return;
    setIsDragging(false);

    const rowWidth = rowRef.current?.offsetWidth || 320;
    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    const dt = Math.max(last.t - first.t, 1);
    const velocity = ((last.x - first.x) / dt) * 1000; // px/s

    const projected = currentX.current + project(velocity);
    if (projected < -rowWidth * 0.42) {
      commitDelete();
      return;
    }
    settleTo(projected < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0);
  };

  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (currentX.current !== 0) {
      e.preventDefault();
      e.stopPropagation();
      settleTo(0);
    }
  };

  return (
    <div ref={rowRef} className="relative overflow-hidden rounded-[var(--radius-lg)]">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }} aria-hidden>
        <button
          type="button"
          tabIndex={-1}
          onClick={commitDelete}
          className="press flex-1 flex items-center justify-center text-white"
          style={{ background: "var(--danger)" }}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : isExiting
              ? `transform ${EXIT_DURATION_MS}ms var(--ease-spring), opacity ${EXIT_DURATION_MS}ms var(--ease-out)`
              : "transform var(--dur-base) var(--ease-spring)",
          opacity: isExiting ? 0 : 1,
          touchAction: "pan-y",
          userSelect: isDragging ? "none" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default SwipeToDelete;
