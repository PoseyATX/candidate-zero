/**
 * CANDIDATE ZERO — minimal tween runner for the 3D table.
 *
 * The scene animates constantly (cards lift, fly, flip; the camera drifts),
 * and a dependency for that is not worth it. One array, stepped from the
 * render loop, easing in place. No allocation per frame.
 */

export type Easing = (t: number) => number;

export const easeOutCubic: Easing = t => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: Easing = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutBack: Easing = t => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Tween {
  elapsed: number;
  dur: number;
  delay: number;
  ease: Easing;
  step: (t: number) => void;
  done?: () => void;
  dead: boolean;
  tag?: string;
}

const tweens: Tween[] = [];

export interface TweenOpts {
  dur: number;
  delay?: number;
  ease?: Easing;
  step: (t: number) => void;
  done?: () => void;
  /** Starting a tween with the same tag cancels the previous one. */
  tag?: string;
}

export function tween(opts: TweenOpts): void {
  if (opts.tag) cancel(opts.tag);
  tweens.push({
    elapsed: 0,
    dur: Math.max(0.0001, opts.dur),
    delay: opts.delay ?? 0,
    ease: opts.ease ?? easeOutCubic,
    step: opts.step,
    done: opts.done,
    dead: false,
    tag: opts.tag
  });
}

/**
 * Cancel every tween under `tag` — and SETTLE each one.
 *
 * A cancelled tween used to be dropped without calling `done`, which stranded
 * anything awaiting it forever. That is a deadlock, not a leak: a card animating
 * into the light was superseded by the hover tween that fires when the pointer
 * moves, and the play that was awaiting it never continued — the engine was
 * asked nothing, the HUD never repainted, and the turn simply stopped. An
 * interrupted animation is over; its awaiters must be told so.
 */
export function cancel(tag: string): void {
  for (const t of tweens) {
    if (t.tag !== tag || t.dead) continue;
    t.dead = true;
    t.done?.();
  }
}

/** Resolves after `sec`, on the render clock — so it pauses when the tab does. */
export function wait(sec: number): Promise<void> {
  return new Promise(resolve => {
    tween({ dur: Math.max(0.0001, sec), step: () => {}, done: () => resolve() });
  });
}

export function stepTweens(dt: number): void {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.dead) {
      tweens.splice(i, 1);
      continue;
    }
    if (tw.delay > 0) {
      tw.delay -= dt;
      continue;
    }
    tw.elapsed += dt;
    const raw = Math.min(1, tw.elapsed / tw.dur);
    tw.step(tw.ease(raw));
    if (raw >= 1) {
      tweens.splice(i, 1);
      tw.done?.();
    }
  }
}

/** Live count — the client waits on this to settle before it repaints state. */
export function activeTweens(): number {
  return tweens.length;
}
