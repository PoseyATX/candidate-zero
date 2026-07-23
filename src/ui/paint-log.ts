/**
 * Log + toast juice — leaf (no session/main imports).
 */

import { STAMPS } from '../engine/resolve.js';
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
export function showJuice(fb: PlayFeedback): void {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const streak =
    fb.streak && fb.streak.count >= 2
      ? fb.streak.kind === 'hot'
        ? ` · hot ×${fb.streak.count}`
        : ` · cold ×${fb.streak.count}`
      : '';
  const t = document.createElement('div');
  t.className = `toast toast-${fb.beat}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<div class="toast-stamp">${fb.stamp}${streak}</div><div class="toast-body">${escapeHtml(fb.juice)}</div>`;
  host.appendChild(t);
  while (host.children.length > 3) {
    host.firstElementChild?.remove();
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
