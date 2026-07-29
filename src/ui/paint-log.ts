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

export function showJuice(fb: PlayFeedback): void {
  const host = document.getElementById('toast-host');
  if (!host) return;
  // Suppress rather than queue: by the time a splash is dismissed the result is
  // already in the log and the ledger, and a stale toast firing afterwards was
  // a large part of what read as mess.
  if (modalOpen()) return;
  const streak =
    fb.streak && fb.streak.count >= 2
      ? fb.streak.kind === 'hot'
        ? ` · hot ×${fb.streak.count}`
        : ` · cold ×${fb.streak.count}`
      : '';
  // One toast at a time. It used to keep up to three alive for 2.8s each, so a
  // brisk week stacked a wall of parchment over the act strip and goal strip —
  // the two things a player reads to know what to do. A newer result supersedes
  // an older one; the log keeps the full history either way.
  host.replaceChildren();

  const t = document.createElement('div');
  t.className = `toast toast-${fb.beat}`;
  t.setAttribute('role', 'status');
  // The number is the point: "GAIN. Bank it." with nothing moving on screen is
  // what alpha players called clicking blindly.
  const list = fb.deltas ?? [];
  // Each figure gets its own span so it can count up independently; the plain
  // string stays the fallback for reduced motion and for anything reading text.
  const deltaHtml = list.length
    ? `<div class="toast-deltas">` +
      list
        .map((d, i) => {
          const sign = d.amount >= 0 ? '+' : '\u2212';
          const money = d.label === '$';
          return (
            `${i ? '<span class="delta-sep"> · </span>' : ''}` +
            `<span class="delta" data-to="${Math.abs(d.amount)}" ` +
            `data-prefix="${sign}${money ? '$' : ''}" ` +
            `data-suffix="${money ? '' : ' ' + escapeHtml(d.label)}">` +
            `${sign}${money ? '$' : ''}${Math.abs(d.amount)}${money ? '' : ' ' + escapeHtml(d.label)}</span>`
          );
        })
        .join('') +
      `</div>`
    : '';
  t.innerHTML =
    `<div class="toast-stamp">${fb.stamp}${streak}</div>` +
    `<div class="toast-body">${escapeHtml(fb.juice)}</div>${deltaHtml}`;

  // Intensity is the engine's own read of how hard this moment should land.
  // Drive the entrance with it rather than treating every result the same.
  const hit = beatScale(fb.intensity);
  t.style.setProperty('--hit', hit.toFixed(3));
  host.appendChild(t);

  // The numbers are the answer to "did anything happen" — so they arrive last
  // and move, rather than being static text the eye skips.
  if (!reducedMotion()) {
    t.querySelectorAll<HTMLElement>('.delta').forEach(el => {
      const to = Number(el.dataset.to ?? '0');
      countUp(el, to, { prefix: el.dataset.prefix ?? '', suffix: el.dataset.suffix ?? '' });
    });
  }
  window.setTimeout(() => {
    t.classList.add('toast-out');
    window.setTimeout(() => t.remove(), 280);
  }, 2800);
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
