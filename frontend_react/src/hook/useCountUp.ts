import { useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 900;

/** Ease-out cubic: quick off the mark, gentle landing on the real number. */
const easeOut = (progress: number): number => 1 - (1 - progress) ** 3;

/**
 * `matchMedia` is missing in jsdom, so the optional call matters: without it the
 * hook would throw in tests rather than falling back to animating.
 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Animates from the currently displayed value to `target`.
 *
 * Interpolating from what is on screen rather than from zero is what makes a
 * mid-flight change behave: if the number updates while a previous count-up is
 * still running, it continues from where it got to instead of snapping back.
 *
 * Honours `prefers-reduced-motion` by landing on the value immediately - a
 * counter that animates for a user who asked for stillness is a bug, not polish.
 */
export const useCountUp = (
  target: number,
  durationMs: number = DEFAULT_DURATION_MS
): number => {
  const [value, setValue] = useState(0);
  // Read by the animation, never rendered from: writing it per frame would
  // re-render on every tick for no visible gain.
  const displayed = useRef(0);

  useEffect(() => {
    if (durationMs <= 0 || prefersReducedMotion()) {
      displayed.current = target;
      setValue(target);

      return;
    }

    const origin = displayed.current;

    if (origin === target) {
      return;
    }

    const startedAt = performance.now();
    let frame = requestAnimationFrame(function step(now: number): void {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const next =
        progress === 1
          ? target
          : Math.round(origin + (target - origin) * easeOut(progress));

      displayed.current = next;
      setValue(next);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
};
