/**
 * Card face rendering — pure leaf (no imports from main.ts).
 * PR01: full-bleed promo art inlined so it cannot 404 or fall back to the star shell.
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

export const CARD_ART: Record<string, CardArtEntry> = {
  PR01: { file: 'PR01.svg', fullFace: true }
};

const FULL_FACE_ART = new Set(['PR01']);

/** PR01 full face — inlined SVG. Pink wash, gold star, title, FREE. No external asset. */
const PR01_FULL_FACE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
  '<defs>' +
  '<linearGradient id="pr01p" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0%" stop-color="#fdf2f5"/>' +
  '<stop offset="40%" stop-color="#f8d5e0"/>' +
  '<stop offset="100%" stop-color="#f0d4e4"/>' +
  '</linearGradient>' +
  '<radialGradient id="pr01w" cx="50%" cy="40%" r="55%">' +
  '<stop offset="0%" stop-color="#fff8fb" stop-opacity=".92"/>' +
  '<stop offset="100%" stop-color="#e8a0b8" stop-opacity=".22"/>' +
  '</radialGradient>' +
  '</defs>' +
  '<rect width="600" height="900" rx="16" fill="url(#pr01p)"/>' +
  '<rect width="600" height="900" rx="16" fill="url(#pr01w)"/>' +
  '<g opacity=".22" fill="#e5739a">' +
  '<ellipse cx="300" cy="420" rx="120" ry="60"/>' +
  '<path d="M200 410c45-40 100-40 155 0 45-40 100-40 155 0-35 55-100 85-155 85s-120-30-155-85z"/>' +
  '</g>' +
  '<g fill="none" stroke="#c9a06a" stroke-width="2" opacity=".85">' +
  '<path d="M40 85c0-26 20-46 46-46"/>' +
  '<path d="M560 85c0-26-20-46-46-46"/>' +
  '<path d="M40 815c0 26 20 46 46 46"/>' +
  '<path d="M560 815c0 26-20 46-46 46"/>' +
  '</g>' +
  '<g fill="#c9a06a" opacity=".65">' +
  '<path d="M52 58c10-14 24-22 40-26 3 8 5 14 5 22-14 2-26 6-34 14z"/>' +
  '<path d="M548 58c-10-14-24-22-40-26-3 8-5 14-5 22 14 2 26 6 34 14z"/>' +
  '<path d="M52 842c10 14 24 22 40 26 3-8 5-14 5-22-14-2-26-6-34-14z"/>' +
  '<path d="M548 842c-10 14-24 22-40 26-3-8-5-14-5-22 14-2 26-6 34-14z"/>' +
  '</g>' +
  '<rect x="40" y="50" width="520" height="800" rx="8" fill="none" stroke="#c9a06a" stroke-width="1.3" opacity=".5"/>' +
  '<g transform="translate(300 240)">' +
  '<path d="M0-68 L17-20 68-17 28 17 40 68 0 40 -40 68 -28 17 -68-17 -17-20 Z" fill="#c9a84c"/>' +
  '<path d="M0-52 L12-16 50-13 22 12 30 50 0 30 -30 50 -22 12 -50-13 -12-16 Z" fill="#e8d48a" opacity=".5"/>' +
  '</g>' +
  '<g fill="#5c1a32" font-family="Georgia, Times New Roman, serif" font-weight="700" text-anchor="middle">' +
  '<text x="300" y="410" font-size="40" letter-spacing="1.5">MORE THAN</text>' +
  '<text x="300" y="466" font-size="40" letter-spacing="1.5">JUST A</text>' +
  '<text x="300" y="522" font-size="40" letter-spacing="1.5">PRETTY</text>' +
  '<text x="300" y="578" font-size="40" letter-spacing="1.5">FACE</text>' +
  '</g>' +
  '<g transform="translate(300 760)">' +
  '<ellipse rx="74" ry="26" fill="none" stroke="#c9a06a" stroke-width="2.4"/>' +
  '<ellipse rx="66" ry="20" fill="none" stroke="#c9a06a" stroke-width="1.1" opacity=".65"/>' +
  '<text x="0" y="6" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-weight="700" fill="#6b2038" letter-spacing="3.5">FREE</text>' +
  '</g>' +
  '</svg>';

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
  if (cardId === 'PR01') {
    return `<span class="art-plate has-raster art-plate-inline">${PR01_FULL_FACE_SVG}</span>`;
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
  const fullFace = FULL_FACE_ART.has(card.id);
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
  const fullFace = FULL_FACE_ART.has(card.id);
  return [
    'play-card',
    `risk-${card.risk.toLowerCase()}`,
    kind !== 'action' ? `kind-${kind}` : '',
    card.id === 'PR01' || kind === 'promo' ? 'kind-promo' : '',
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
