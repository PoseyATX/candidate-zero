/**
 * Log + toast juice — leaf (no session/main imports).
 */

import { STAMPS } from '../engine/resolve.js';
import { beatScale, countUp, reducedMotion } from './motion.js';
import type { PlayFeedback } from '../engine/feedback.js';
import type { Campaign } from '../engine/loop.js';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Fixed overlay toasts — never reflow the card grid (Phase 6 / UI-IA).
 */
/** Dialogs the player has to answer. A toast must not talk over one. */
const BLOCKING_OVERLAYS = ['#act-splash', '#outside-weather', '#ground-picker', '#card-detail'];

function modalOpen(): boolean {
  return BLOCKING_OVERLAYS.some(sel => {
    const el = document.querySelector(sel);
    if (!el || el.classList.contains('hidden')) return false;
    return (el as HTMLElement).offsetParent !== null || getComputedStyle(el).display !== 'none';
  });
}

/**
 * FULL-SCREEN RESULT.
 *
 * When a card resolves, that is the beat the whole game turns on — it is the
 * moment the player finds out whether the risk paid. It used to be a small
 * parchment bar docked over the hand that faded itself after 2.8 seconds, with
 * its ledger figures rendering at 1.02:1 (i.e. invisible). It got the whole
 * screen instead.
 *
 * Everything dramatised here is a number the ENGINE already computed and the UI
 * was throwing away:
 *
 *   fb.intensity  0-1, "how hard should this land" -> stamp overshoot, shake,
 *                 haptic strength, wash opacity
 *   fb.beat       whisper|hit|thump|crash|spark -> which treatment fires
 *   fb.streak     hot/cold run -> a pip row that lights one at a time
 *   fb.deltas     the figures -> big, staggered, counting up
 *   fb.milestone  a named threshold crossed -> its own banner
 *
 * Reduced motion is a real branch, not a shrug: every value is written final
 * first, no shake, no rays, no stagger. The screen still takes over, because
 * the point is that you cannot miss the result — that part is not decoration.
 */

/** Beat -> how physical the moment is. Drives shake and haptics. */
const BEAT_WEIGHT: Record<string, number> = {
  whisper: 0,
  hit: 0.35,
  thump: 0.6,
  crash: 1,
  spark: 0.85
};

function hapticFor(beat: string, intensity: number): void {
  // Progressive enhancement: absent on desktop and on iOS Safari, and silently
  // ignored where the user has disabled it. Never load-bearing.
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function' || reducedMotion()) return;
  const w = (BEAT_WEIGHT[beat] ?? 0.3) * Math.max(0.2, intensity);
  try {
    if (beat === 'crash') nav.vibrate([26, 40, 60]);
    else if (beat === 'spark') nav.vibrate([12, 30, 18, 30, 26]);
    else if (w > 0.4) nav.vibrate(Math.round(18 + w * 26));
    else if (w > 0) nav.vibrate(Math.round(8 + w * 12));
  } catch {
    /* vibration refused — nothing depends on it */
  }
}

export function showJuice(fb: PlayFeedback): void {
  const host = document.getElementById('result-host');
  if (!host) return;
  // Suppress rather than queue: by the time a splash is dismissed the result is
  // already in the log and the ledger, and a stale result arriving afterwards
  // was a large part of what read as mess.
  if (modalOpen()) return;

  const stampClass = `stamp-${fb.stamp.toLowerCase()}`;
  const hit = beatScale(fb.intensity);
  const weight = BEAT_WEIGHT[fb.beat] ?? 0.3;
  const shake = !reducedMotion() && weight >= 0.6;
  const rays = !reducedMotion() && (fb.beat === 'spark' || fb.stamp === 'BREAKTHROUGH');

  const streakHtml = (() => {
    const st = fb.streak;
    if (!st || st.count < 2) return '';
    const pips = Array.from(
      { length: Math.min(st.count, 6) },
      (_, i) => `<i class="rs-pip" style="--i:${i}"></i>`
    ).join('');
    return (
      `<div class="result-streak rs-${st.kind}">` +
      `<span class="rs-pips" aria-hidden="true">${pips}</span>` +
      `<span class="rs-label">${st.kind === 'hot' ? 'Hot streak' : 'Cold run'} \u00d7${st.count}</span>` +
      `</div>`
    );
  })();

  const list = fb.deltas ?? [];
  const deltaHtml = list.length
    ? `<div class="result-deltas">` +
      list
        .map((d, i) => {
          const sign = d.amount >= 0 ? '+' : '\u2212';
          const money = d.label === '$';
          const up = d.amount >= 0;
          return (
            `<span class="result-delta ${up ? 'up' : 'down'}" style="--i:${i}">` +
            `<span class="rd-num" data-to="${Math.abs(d.amount)}" ` +
            `data-prefix="${sign}${money ? '$' : ''}" data-suffix="">` +
            `${sign}${money ? '$' : ''}${Math.abs(d.amount)}</span>` +
            `<span class="rd-label">${money ? 'cash' : escapeHtml(d.label)}</span>` +
            `</span>`
          );
        })
        .join('') +
      `</div>`
    : '';

  // The engine often sets milestone and juice to the same sentence, which
  // printed it twice on screen. Only show it when it says something new.
  const sameLine =
    !!fb.milestone && fb.juice.trim().toLowerCase() === fb.milestone.trim().toLowerCase();
  const milestoneHtml =
    fb.milestone && !sameLine
      ? `<div class="result-milestone"><span class="rm-key">Milestone</span>${escapeHtml(fb.milestone)}</div>`
      : '';
  const nearHtml = fb.nearMiss
    ? `<div class="result-near">On the line \u2014 ${escapeHtml(String(fb.nearMiss))}</div>`
    : '';

  host.className = `result-host beat-${fb.beat} ${stampClass}`;
  host.style.setProperty('--hit', hit.toFixed(3));
  // The stamp has to FIT. "BREAKTHROUGH" is 12 characters and was overflowing
  // both edges of a 390px screen at a fixed clamp; sizing from the length lets
  // CSS solve for the viewport instead of guessing.
  host.style.setProperty('--len', String(fb.stamp.length));
  host.style.setProperty('--wash', Math.min(0.28, 0.08 + fb.intensity * 0.18).toFixed(3));
  // A breakthrough is the rarest good thing that happens in a week; it gets a
  // flare ring and a deco burst that nothing else does, so the treatment itself
  // tells you how big the moment was before you read a word of it.
  const burst =
    !reducedMotion() && fb.stamp === 'BREAKTHROUGH'
      ? `<span class="result-flare" aria-hidden="true"></span>` +
        `<span class="result-burst" aria-hidden="true">` +
        Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${i % 3}"></i>`).join('') +
        `</span>`
      : '';

  host.innerHTML =
    `${rays ? '<span class="result-rays" aria-hidden="true"></span>' : ''}` +
    `<span class="result-wash" aria-hidden="true"></span>` +
    burst +
    `<div class="result-core${shake ? ' result-shake' : ''}">` +
    streakHtml +
    `<div class="result-stamp" id="result-stamp">${escapeHtml(fb.stamp)}</div>` +
    `<span class="result-rule" aria-hidden="true"></span>` +
    `<p class="result-juice" id="result-juice">${escapeHtml(fb.juice)}</p>` +
    deltaHtml +
    milestoneHtml +
    nearHtml +
    `<button type="button" class="result-go" id="result-go">Continue</button>` +
    `</div>`;
  host.classList.remove('hidden');
  document.body.classList.add('result-open');
  hapticFor(fb.beat, fb.intensity);

  // Fit the stamp by MEASURING it rather than guessing Cinzel's advance width.
  // The guessed factor either overflowed a 390px screen or left the headline
  // small; one measurement makes it fill the line exactly, at any word length.
  const stampEl = host.querySelector<HTMLElement>('.result-stamp');
  if (stampEl) {
    const target = host.clientWidth * 0.95;
    const BASE = 4.5 * 16;
    stampEl.style.fontSize = `${BASE}px`;
    const w = stampEl.scrollWidth;
    if (w > 0) {
      const px = Math.min(72, Math.max(26, (BASE * target) / w));
      stampEl.style.fontSize = `${px.toFixed(1)}px`;
      // The figures scale FROM the fitted stamp, so the headline is always the
      // headline. "BREAKTHROUGH" fits at ~28px on a 390px screen while the
      // delta was a fixed 8vw — the number ended up bigger than the stamp it
      // was supposed to be subordinate to.
      host.style.setProperty('--stamp-px', `${px.toFixed(1)}px`);
    }
  }

  if (!reducedMotion()) {
    // The figures arrive last and MOVE. A static number is one the eye skips,
    // which is exactly what "clicking blindly" meant.
    host.querySelectorAll<HTMLElement>('.rd-num').forEach((el, i) => {
      const to = Number(el.dataset.to ?? '0');
      window.setTimeout(
        () => countUp(el, to, { prefix: el.dataset.prefix ?? '', suffix: '' }),
        260 + i * 130
      );
    });
  }

  armResultDismiss(host);
}

/**
 * The result waits for the player. One click anywhere, Enter, Space or Escape
 * continues — it is the only thing on screen asking for an answer, so every
 * obvious input should satisfy it.
 */
function armResultDismiss(host: HTMLElement): void {
  const go = host.querySelector<HTMLButtonElement>('#result-go');
  let done = false;
  const dismiss = (): void => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    host.classList.add('result-out');
    window.setTimeout(() => {
      host.classList.add('hidden');
      host.classList.remove('result-out');
      host.innerHTML = '';
      document.body.classList.remove('result-open');
    }, 200);
  };
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismiss();
    }
  }
  host.addEventListener('pointerdown', e => {
    // preventDefault stops the focus/selection side effects of a raw press.
    e.preventDefault();
    swallowNextClick();
    dismiss();
  });
  window.addEventListener('keydown', onKey, true);
  // Focus the affordance so a keyboard or switch user lands on it directly.
  go?.focus({ preventScroll: true });
}

/**
 * Eat the click that follows the dismissing press.
 *
 * THE BUG THIS FIXES: dismissal runs on `pointerdown`, which feels instant —
 * but the browser still delivers `pointerup` and then `click`, and by then the
 * overlay has gone (`pointer-events: none` during the exit fade). So the click
 * landed on whatever was underneath, and tapping Continue opened a card behind
 * the result. Touch makes it worse: it can emit a ghost click up to ~300ms
 * later, after the overlay is fully removed.
 *
 * Capture phase on window, so it fires before anything else can react, and it
 * removes itself on the first click or after 700ms — long enough for the ghost,
 * short enough that a deliberate second tap still works.
 */
function swallowNextClick(): void {
  const eat = (e: Event): void => {
    e.stopPropagation();
    e.preventDefault();
    cleanup();
  };
  const cleanup = (): void => {
    window.clearTimeout(timer);
    window.removeEventListener('click', eat, true);
    window.removeEventListener('pointerup', stopOnly, true);
  };
  // pointerup only needs stopping, not cancelling — cancelling it can suppress
  // the click we actually want to eat on some engines.
  const stopOnly = (e: Event): void => e.stopPropagation();
  const timer = window.setTimeout(cleanup, 700);
  window.addEventListener('click', eat, true);
  window.addEventListener('pointerup', stopOnly, true);
}

export function renderLog(campaign: Campaign): void {
  const box = $('log');
  box.innerHTML = campaign.state.log
    .slice(-60)
    .map(e => {
      const stamp =
        e.tier !== undefined && e.kind === 'play'
          ? `[${STAMPS[e.tier as 0 | 1 | 2 | 3] ?? '?'}] `
          : '';
      const cls = [
        'log-line',
        e.kind === 'juice' ? 'juice' : '',
        e.kind === 'summary' ? 'summary' : '',
        e.tier !== undefined ? `tier-${e.tier}` : ''
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}"><span class="w">W${e.week}</span> ${stamp}${escapeHtml(e.text)}</div>`;
    })
    .join('');
  box.scrollTop = box.scrollHeight;
}
