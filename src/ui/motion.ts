/**
 * CANDIDATE ZERO — Motion helpers (presentation only, no rules).
 *
 * The engine has been computing an animation intent per play since long before
 * any of this existed: `PlayFeedback.beat` (whisper/hit/thump/crash/spark) and
 * `PlayFeedback.intensity`, documented in feedback.ts as "0–1 how hard the beat
 * hits (UI animation scale)". `beat` only ever changed a toast's outline colour
 * and `intensity` was read nowhere at all — computed every play, consulted
 * never, which is the same shape as `gated` and `handBonus` before it. This
 * module spends it.
 *
 * TWO RULES, both load-bearing:
 *
 * 1. `prefers-reduced-motion` is honoured everywhere, through `reducedMotion()`
 *    rather than by each caller remembering. The a11y gate (axe) does NOT test
 *    motion preferences, so nothing else will catch a regression here.
 *
 * 2. Nothing blocks. `smoke:ui` drives the app faster than any human, and an
 *    animation that gates state would make the suite flaky. Every helper here
 *    is fire-and-forget: the DOM reaches its final value immediately or within
 *    a few hundred ms, and no caller awaits it.
 */

/** Live check — the user can change this mid-session. */
export function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Beat -> how hard the UI should hit. Clamped so a bad value cannot flail. */
export function beatScale(intensity: number | undefined): number {
  const i = typeof intensity === 'number' && Number.isFinite(intensity) ? intensity : 0.5;
  return Math.max(0, Math.min(1, i));
}

/**
 * Count a number up to its final value. Returns immediately; the element is
 * written synchronously first so a reader (or a test) never sees a blank.
 */
export function countUp(el: HTMLElement, to: number, opts: { prefix?: string; suffix?: string; ms?: number } = {}): void {
  const prefix = opts.prefix ?? '';
  const suffix = opts.suffix ?? '';
  const final = `${prefix}${Math.round(to)}${suffix}`;
  // Final value first: if anything below fails or motion is reduced, the truth
  // is already on screen.
  el.textContent = final;
  if (reducedMotion() || to === 0) return;

  const ms = opts.ms ?? 480;
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / ms);
    // easeOutCubic — fast then settling, which reads as "landing" rather than linear.
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${prefix}${Math.round(to * eased)}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = final;
  };
  requestAnimationFrame(step);
}

/**
 * Play a one-shot class on an element and clean it up. Safe to call repeatedly:
 * the class is removed first so a re-fire restarts rather than no-ops.
 */
export function pulse(el: Element | null, cls: string, ms = 600): void {
  if (!el || reducedMotion()) return;
  el.classList.remove(cls);
  // Force reflow so removing and re-adding in the same frame restarts it.
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}
