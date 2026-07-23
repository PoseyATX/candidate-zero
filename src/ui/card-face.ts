/**
 * Card face rendering — pure leaf (no imports from main.ts).
 * Design: CardFaceView + computeCardFaceView; odds need GameState.
 * PR-1 behavior-identical extract from main.ts.
 */

import type { GameState, Ground, PlayCard } from '../engine/types.js';
import { pickDefaultGround, cardAttrMod } from '../engine/play.js';
import { emblemFor, kindMark, KIND_META } from './card-art.js';
import { cardArtPlateHtml } from '../lib/anvil-port/index.js';

export interface CardFaceOpts {
  camp?: boolean;
  shop?: boolean;
  locked?: boolean;
  lockReason?: string;
}

/** Precomputed face data (odds resolved against state). */
export interface CardFaceView {
  name: string;
  tag: string;
  risk: string;
  kind: string;
  seal: string;
  costSubs: string[];
  attrLine: string;
  oddsLabel: string;
  oddsPct: number | undefined;
  stampHtml: string;
  kindSealHtml: string;
  artPlateHtml: string;
  emblemHtml: string;
  lockReason: string;
  locked: boolean;
}

export function attrEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function costParts(card: PlayCard): { seal: string; subs: string[] } {
  const c = card.cost;
  const all: string[] = [];
  if (c.a) all.push(`${c.a} AP`);
  if (c.$) all.push(`$${c.$}`);
  if (c.vp) all.push(`${c.vp} vol`);
  if (c.m) all.push(`${c.m} mom`);
  if (c.fav) all.push(`${c.fav} fav`);
  if (!all.length) return { seal: 'free', subs: [] };
  return { seal: all[0]!, subs: all.slice(1) };
}

export function computeCardFaceView(
  state: GameState,
  card: PlayCard,
  opts: CardFaceOpts = {},
  ground?: Ground
): CardFaceView {
  const g = ground ?? pickDefaultGround(state);
  const base = card.odds?.(state, g);
  const mod = cardAttrMod(state, card);
  const p = base !== undefined ? Math.max(0.02, Math.min(0.95, base + mod)) : undefined;
  const { seal, subs } = costParts(card);
  const stamp = opts.shop
    ? '<span class="stamp stamp-shop">Shop</span>'
    : opts.camp
      ? '<span class="stamp stamp-camp">Camp</span>'
      : '';
  const kind = card.kind ?? 'action';
  const mark = kindMark(kind);
  const meta = KIND_META[kind];
  const kindSeal = mark
    ? `<span class="kind-seal" role="img" title="${meta?.label ?? ''} — ${meta?.blurb ?? ''}" aria-label="${meta?.label ?? ''}">${mark}</span>`
    : '';
  return {
    name: card.n,
    tag: card.tag,
    risk: card.risk,
    kind,
    seal,
    costSubs: subs,
    attrLine: card.attrs?.length ? card.attrs.join(' · ') : '',
    oddsLabel: p !== undefined ? `p≈${(p * 100).toFixed(0)}%` : '',
    oddsPct: p,
    stampHtml: stamp,
    kindSealHtml: kindSeal,
    artPlateHtml: cardArtPlateHtml(card.id),
    emblemHtml: emblemFor(card.id),
    lockReason: opts.lockReason ?? '',
    locked: !!opts.locked
  };
}

/**
 * Shared card body — hand, camp, drafts.
 * Pass state so odds resolve without importing main/campaign.
 */
export function cardInner(
  state: GameState,
  card: PlayCard,
  opts: CardFaceOpts = {}
): string {
  const v = computeCardFaceView(state, card, opts);
  const meter =
    v.oddsPct !== undefined
      ? `<span class="odds-meter"><i style="width:${Math.round(v.oddsPct * 100)}%"></i></span>`
      : '';
  return `
    ${v.kindSealHtml}
    <span class="name">${attrEscape(v.name)}</span>
    <span class="orn"><i></i>&#10022;<i></i></span>
    <span class="card-art">${v.artPlateHtml}<span class="card-emblem">${v.emblemHtml}</span>${v.stampHtml}</span>
    <span class="cost-seal">${attrEscape(v.seal)}</span>
    ${
      v.costSubs.length
        ? `<span class="cost-subs">${v.costSubs.map(s => `<span>${attrEscape(s)}</span>`).join('')}</span>`
        : ''
    }
    <span class="tagline">${attrEscape(v.tag)}</span>
    ${v.locked && v.lockReason ? `<span class="locked-reason">${attrEscape(v.lockReason)}</span>` : ''}
    <span class="card-footer">
      <span class="risk-tag">${attrEscape(v.risk)}</span>
      ${v.oddsLabel ? `<span class="odds">${v.oddsLabel}</span>` : ''}
    </span>
    ${meter}
    ${v.attrLine ? `<span class="attrs">${attrEscape(v.attrLine)}</span>` : ''}
  `;
}

export function cardClasses(card: PlayCard, opts: CardFaceOpts = {}): string {
  const kind = card.kind ?? 'action';
  return [
    'play-card',
    `risk-${card.risk.toLowerCase()}`,
    kind !== 'action' ? `kind-${kind}` : '',
    opts.shop ? 'shop' : '',
    opts.camp && !opts.shop ? 'camp' : '',
    opts.locked ? 'locked' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export function cardHtml(
  state: GameState,
  card: PlayCard,
  index: number,
  opts: CardFaceOpts = {}
): string {
  const desc = attrEscape(card.d);
  const label = `${attrEscape(card.n)} — ${desc}`;
  return `
    <button type="button" class="${cardClasses(card, opts)}" data-idx="${index}"
      title="${desc}" aria-label="${label}"
      ${opts.locked ? 'disabled aria-disabled="true"' : ''}>
      ${cardInner(state, card, opts)}
    </button>
  `;
}
