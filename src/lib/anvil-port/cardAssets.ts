/**
 * Card art path resolver with Anvil-style greybox fallback.
 * Engine loads files only — no image generation here (Anvil hard rule).
 *
 * Convention: optional raster at `/assets/cards/{cardId}.png` (max ~300px).
 * Until art ships, faces use greybox plate + emblem overlay.
 */

import { greyboxSvg, labelFromPath } from './greybox.js';

export type CardArtHandle =
  | { kind: 'texture'; path: string; url: string }
  | { kind: 'greybox'; path: string; label: string };

const missingSet = new Set<string>();
const logged = new Set<string>();

/** cardId → relative path under public/ (override map for special names). */
export const CARD_ART_PATH: Record<string, string> = {
  // Fill when real art ships, e.g.:
  // PL01: 'assets/cards/PL01.png',
};

/** Public URL path for a card's optional raster. */
export function cardArtRelPath(cardId: string): string {
  return CARD_ART_PATH[cardId] ?? `assets/cards/${cardId}.png`;
}

export function missingCardArt(): string[] {
  return [...missingSet].sort();
}

export function clearMissingCardArt(): void {
  missingSet.clear();
  logged.clear();
}

/**
 * Vite Pages base (e.g. `/candidate-zero/`). Design K15: never bare `/assets/…`.
 */
export function cardArtBaseUrl(): string {
  try {
    // Vite injects import.meta.env.BASE_URL
    const b = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env
      ?.BASE_URL;
    if (b && typeof b === 'string') return b.endsWith('/') ? b : b + '/';
  } catch {
    /* non-vite */
  }
  return '/';
}

/** Resolved public URL for a relative asset path under base. */
export function cardArtUrl(relPath: string): string {
  const rel = relPath.replace(/^\/+/, '');
  return cardArtBaseUrl() + rel;
}

/**
 * Allowlist: must stay under BASE_URL + assets/cards/, no .., no remote.
 */
export function isSafeCardArtUrl(url: string): boolean {
  if (!url || /^(https?:)?\/\//i.test(url)) return false;
  if (url.includes('..')) return false;
  const base = cardArtBaseUrl();
  const prefix = base + 'assets/cards/';
  // K15: must use BASE_URL prefix (Pages: /candidate-zero/assets/cards/…)
  return url.startsWith(prefix);
}

/**
 * Browser: we cannot fs.stat. Prefer emblem+greybox unless CARD_ART_PATH is
 * set (opt-in load). Call noteMissing when a registered img onerror fires.
 * Unregistered cards use quiet greybox — not listed as ASSET_MISSING spam.
 */
export function resolveCardArt(cardId: string): CardArtHandle {
  const rel = cardArtRelPath(cardId);
  if (CARD_ART_PATH[cardId]) {
    const url = cardArtUrl(rel);
    if (!isSafeCardArtUrl(url)) {
      return noteMissing(rel);
    }
    return {
      kind: 'texture',
      path: rel,
      url
    };
  }
  return {
    kind: 'greybox',
    path: rel,
    label: labelFromPath(rel)
  };
}

export function noteMissing(relPath: string): CardArtHandle {
  missingSet.add(relPath);
  if (!logged.has(relPath)) {
    logged.add(relPath);
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`ASSET_MISSING path=${relPath}`);
    }
  }
  return {
    kind: 'greybox',
    path: relPath,
    label: labelFromPath(relPath)
  };
}

/**
 * HTML for the card art plate: greybox always as base; optional <img> when
 * path is registered. Emblem SVG is layered by the caller on top.
 */
export function cardArtPlateHtml(cardId: string): string {
  const handle = resolveCardArt(cardId);
  const grey = greyboxSvg(handle.path);
  if (handle.kind === 'texture') {
    const src = handle.url.replace(/"/g, '');
    return (
      `<span class="art-plate" data-art="${escapeAttr(handle.path)}">` +
      grey +
      `<img class="art-raster" src="${src}" alt="" loading="lazy" ` +
      `width="120" height="90" decoding="async" ` +
      `onerror="this.style.display='none';this.parentElement?.classList.add('art-miss')" />` +
      `</span>`
    );
  }
  return `<span class="art-plate art-grey" data-art="${escapeAttr(handle.path)}">${grey}</span>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
