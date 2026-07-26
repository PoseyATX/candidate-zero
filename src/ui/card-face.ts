/**
 * Card face rendering — pure leaf (no imports from main.ts).
 *
 * Full-bleed card art (PlayCard.fullBleedArt = true) is inlined at build time
 * from src/assets/full-art/<card id>.svg — no fetch, no 404, no raster fallback.
 * To add a new full-bleed card: drop `<id>.svg` in that folder and set
 * `fullBleedArt: true` on the card's data. Nothing else needs to change.
 */

import type { GameState, Ground, PlayCard } from '../engine/types.js';
import { pickDefaultGround, cardAttrMod } from '../engine/play.js';
import { emblemFor, kindMark, KIND_META } from './card-art.js';

export interface CardFaceOpts {
  camp?: boolean;
  shop?: boolean;
  locked?: boolean;
  lockReason?: string;
}

export type CardArtEntry = { file: string; fullFace?: boolean };

/** Raster card art (png/webp served from public/assets/cards) — none shipped yet. */
export const CARD_ART: Record<string, CardArtEntry> = {};

// import.meta.glob is a Vite build-time macro — unavailable when this module
// is loaded directly under plain node/tsx (harness scripts), so guard it.
let FULL_ART_MODULES: Record<string, string> = {};
try {
  FULL_ART_MODULES = import.meta.glob('../assets/full-art/*.svg', {
    eager: true,
    query: '?raw',
    import: 'default'
  }) as Record<string, string>;
} catch {
  /* non-Vite runtime (e.g. harness) — full-bleed art unavailable, chrome fallback used */
}

/** cardId → inline SVG markup, keyed by filename (built from the glob above). */
const FULL_ART: Record<string, string> = {};
for (const [path, svg] of Object.entries(FULL_ART_MODULES)) {
  const id = path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/, '');
  FULL_ART[id] = svg;
}

function fullBleedArt(card: PlayCard): boolean {
  return !!card.fullBleedArt && !!FULL_ART[card.id];
}

export function cardArtBase(): string {
  try {
    const b = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env
      ?.BASE_URL;
    if (b && typeof b === 'string') return b.endsWith('/') ? b : `${b}/`;
  } catch {
    /* non-vite */
  }
  return '/';
}

export function cardArtUrl(file: string): string {
  if (!file || /^(https?:)?\/\//i.test(file) || file.includes('://') || file.includes('..')) {
    return '';
  }
  const cleaned = file.replace(/^\/+/, '').replace(/^assets\/cards\//, '');
  if (!cleaned || cleaned.includes('..') || (cleaned.includes('/') && cleaned.split('/').some(p => p === '..'))) {
    return '';
  }
  if (cleaned.includes('\\')) return '';
  return `${cardArtBase()}assets/cards/${cleaned}`;
}

export function isSafeCardArtUrl(url: string): boolean {
  if (!url || /^(https?:)?\/\//i.test(url) || url.includes('..')) return false;
  const base = cardArtBase();
  const prefix = `${base}assets/cards/`;
  return url.startsWith(prefix);
}

export function artPlateHtml(cardId: string): string {
  const full = FULL_ART[cardId];
  if (full) {
    return `<span class="art-plate has-raster art-plate-inline">${full}</span>`;
  }
  const entry = CARD_ART[cardId];
  if (entry?.file) {
    const url = cardArtUrl(entry.file);
    if (isSafeCardArtUrl(url)) {
      const src = attrEscape(url);
      return (
        `<span class="art-plate has-raster" data-art="${attrEscape(entry.file)}">` +
        `<img class="art-raster" src="${src}" alt="" loading="lazy" width="120" height="180" decoding="async" />` +
        `</span>`
      );
    }
  }
  return '';
}

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
  fullFace: boolean;
}

export function attrEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function costParts(card: PlayCard): { seal: string; subs: string[]; full: string } {
  const c = card.cost;
  const all: string[] = [];
  if (c.a) all.push(`${c.a} AP`);
  if (c.$) all.push(`$${c.$}`);
  if (c.vp) all.push(`${c.vp} vol`);
  if (c.m) all.push(`${c.m} mom`);
  if (c.fav) all.push(`${c.fav} fav`);
  if (!all.length) return { seal: 'free', subs: [], full: 'free' };
  return { seal: all[0]!, subs: all.slice(1), full: all.join(' · ') };
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
  const fullFace = fullBleedArt(card);
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
    artPlateHtml: artPlateHtml(card.id),
    emblemHtml: fullFace ? '' : emblemFor(card.id),
    lockReason: opts.lockReason ?? '',
    locked: !!opts.locked,
    fullFace
  };
}

export function cardInner(
  state: GameState,
  card: PlayCard,
  opts: CardFaceOpts = {}
): string {
  const v = computeCardFaceView(state, card, opts);
  const { full } = costParts(card);
  if (v.fullFace && v.artPlateHtml) {
    return `<span class="card-art card-art-full">${v.artPlateHtml}</span>`;
  }
  return `
    <span class="card-art">${v.artPlateHtml}<span class="card-emblem">${v.emblemHtml}</span></span>
    <span class="name">${attrEscape(v.name)}</span>
    <span class="cost-seal">${attrEscape(full)}</span>
  `;
}

export function cardClasses(card: PlayCard, opts: CardFaceOpts = {}): string {
  const kind = card.kind ?? 'action';
  const fullFace = fullBleedArt(card);
  return [
    'play-card',
    `risk-${card.risk.toLowerCase()}`,
    kind !== 'action' ? `kind-${kind}` : '',
    kind === 'promo' ? 'kind-promo' : '',
    fullFace ? 'full-art' : '',
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
  const { full } = costParts(card);
  const label = `${attrEscape(card.n)} · ${attrEscape(full)}${opts.locked && opts.lockReason ? ` — ${attrEscape(opts.lockReason)}` : ''}. Tap for full text.`;
  return `
    <button type="button" class="${cardClasses(card, opts)}" data-idx="${index}"
      title="${desc}" aria-label="${label}"
      ${opts.locked ? 'aria-disabled="true" data-locked="1"' : ''}
      ${opts.lockReason ? `data-lock-reason="${attrEscape(opts.lockReason)}"` : ''}>
      ${cardInner(state, card, opts)}
    </button>
  `;
}
