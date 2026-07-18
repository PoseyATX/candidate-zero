/**
 * CANDIDATE ZERO — Card emblems
 *
 * Engraved-lineart SVG marks, one per card, drawn in currentColor so the
 * card CSS controls the ink. Deliberately woodcut-simple: heavy consistent
 * stroke, no fills, recognizable silhouettes at ~56px. The aesthetic brief
 * is Southern gothic / Art Deco / rustic — line engraving on parchment,
 * not flat-design iconography.
 */

const WRAP_OPEN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const WRAP_CLOSE = '</svg>';

const EMBLEMS: Record<string, string> = {
  boot:
    '<path d="M8 3h5.5v7.2c2.6.4 4.9 1.3 6 2.9.9 1.3.3 2.7-1.3 2.7H8.6L8 10.5z"/>' +
    '<path d="M8 3v7.5"/><path d="M13.5 11c1.6.2 3 .7 4.2 1.5"/>' +
    '<path d="M7.2 18h11.3"/><path d="M7.2 18v2.5h3.4V18"/>',
  phone:
    '<path d="M5.5 4.5C5 3.5 6.5 2.5 8 3l1.6 2.2c.5.7.3 1.5-.3 2.2l-.9 1c.6 1.7 2.5 3.6 4.2 4.2l1-.9c.7-.6 1.5-.8 2.2-.3L18 13c1.5.5 1.5 2 .5 2.5-2.5 1.3-6.5-.2-9.4-3.1S4.2 7 5.5 4.5z"/>' +
    '<path d="M14 4.5c2.5.5 4.5 2.5 5 5"/>',
  sign:
    '<rect x="4" y="4.5" width="16" height="9"/>' +
    '<path d="M8.5 13.5v7M15.5 13.5v7"/>' +
    '<path d="M7.5 9h9M9.5 11.2h5"/>',
  quill:
    '<path d="M20 3c-6.5.5-11 4.5-13 10.5l-.8 3 3-.5C15 15 19 10.5 20 3z"/>' +
    '<path d="M6.2 16.5C10 10.5 14 6.5 19 4.5"/>' +
    '<path d="M6.2 16.5L3.5 21"/>' +
    '<path d="M10.5 12.8l2.3.2M12.6 10l2.2.3M15 7.6l2 .4"/>',
  coin:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.6"/>' +
    '<path d="M12 8.5v7M10.2 10c.5-.8 3.1-.9 3.4.4.3 1.5-3.5 1-3.3 2.6.2 1.4 2.9 1.3 3.5.4"/>',
  podium:
    '<path d="M6.5 8.5h11l1.2 3H5.3z"/><path d="M9 11.5h6v8.5H9z"/>' +
    '<path d="M12 8.5V6"/><circle cx="12" cy="4.8" r="1.1"/><path d="M9 20h6"/>',
  debate:
    '<path d="M3 5.5h8.5V11H7.8L5.5 13v-2H3z"/>' +
    '<path d="M12.5 10h8.5v5.5h-2.2v2.1l-2.3-2.1h-4z"/>',
  cup:
    '<path d="M5.5 9h11v5.5c0 3-2.2 5-5.5 5s-5.5-2-5.5-5z"/>' +
    '<path d="M16.5 10.5h1.8c2.2 0 2.2 4 0 4h-2"/>' +
    '<path d="M8.5 6.5c0-1 1-1 1-2M12 6.5c0-1 1-1 1-2"/>',
  mic:
    '<rect x="9" y="3" width="6" height="11" rx="3"/>' +
    '<path d="M6 10.5a6 6 0 0 0 12 0"/><path d="M12 16.5V20M8.5 20h7"/>',
  news:
    '<path d="M4 4.5h13V20H4z"/><path d="M17 8h3v10c0 1.3-.8 2-2 2"/>' +
    '<path d="M6.5 8h8M6.5 11h8M6.5 14h5M6.5 17h5"/>',
  jar:
    '<path d="M6 8.5h12V19c0 1.2-.9 2-2 2H8c-1.1 0-2-.8-2-2z"/>' +
    '<path d="M5 6.5h14v2H5z"/><path d="M10.5 2.5l3.5 1-1 3.5-3.5-1z"/>',
  fish:
    '<path d="M3 13c3.5-4.5 8.5-5.5 12-2.5l5-3.5-1.2 5.5L20 18l-5-3.5C11.5 17.5 6.5 16.5 3 13z"/>' +
    '<circle cx="7" cy="12" r=".4"/><path d="M12 10.5c1 1.5 1 3 0 4.5"/>',
  pie:
    '<path d="M4 13.5c0-4.5 3.5-7 8-7s8 2.5 8 7"/>' +
    '<path d="M3 13.5h18l-1.6 4.2H4.6z"/>' +
    '<path d="M9 4.5c0-1 1-1 1-2.5M14 4.5c0-1 1-1 1-2.5"/>',
  folder:
    '<path d="M3 7c0-1.2.8-2 2-2h4l2 2h8c1.2 0 2 .8 2 2v8c0 1.2-.8 2-2 2H5c-1.2 0-2-.8-2-2z"/>' +
    '<path d="M3 10h18"/>',
  envelope:
    '<rect x="3" y="5.5" width="18" height="13"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  star:
    '<path d="M12 2.5l2.7 6.6 7.1.5-5.4 4.6 1.7 6.9-6.1-3.8-6.1 3.8 1.7-6.9L2.2 9.6l7.1-.5z"/>',
  cards:
    '<path d="M5 8.5l9.5-3 1.4 4.3"/><rect x="5.5" y="10" width="13" height="9.5"/>' +
    '<path d="M8 13h8M8 15.5h5"/>',
  megaphone:
    '<path d="M4 10h4L20 4v15l-12-5H4c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1z"/>' +
    '<path d="M7.5 14.5V18c0 1.4 2.4 1.4 2.4 0v-2.6"/>',
  moneybag:
    '<path d="M10 6.5h4l2.2-3h-8.4z"/>' +
    '<path d="M8.5 7.5h7c2.8 2.8 4 5.4 4 8 0 3-3 5-7.5 5s-7.5-2-7.5-5c0-2.6 1.2-5.2 4-8z"/>' +
    '<path d="M12 11v6M10.4 12.2c.4-.7 2.7-.8 3 .3.3 1.3-3.1.9-2.9 2.3.2 1.2 2.5 1.1 3 .3"/>',
  clipboard:
    '<path d="M7 4.5h10V21H7z"/><path d="M10 2.5h4V6h-4z"/>' +
    '<path d="M9.5 10h5M9.5 13h5M9.5 16h3"/>',
  pennant: '<path d="M6 3v18"/><path d="M6 4.5h12l-3 4 3 4H6"/>',
  handshake:
    '<path d="M2.5 7l4-2 5 2.5L16 5l5.5 2.5v6L16 18l-4.5-2.5L7 18l-4.5-4z"/>' +
    '<path d="M11.5 7.5L8 11c1.5 1.5 3 1.5 4.5 0l1-1"/>'
};

/** Per-card emblem assignments — iconic where the card is iconic. */
const CARD_EMBLEM: Record<string, string> = {
  PL01: 'boot',
  PL02: 'phone',
  PL03: 'sign',
  PL04: 'quill',
  PL05: 'coin',
  PL06: 'podium',
  PL07: 'debate',
  PL08: 'cup',
  PL09: 'mic',
  PL10: 'news',
  PL11: 'jar',
  PL12: 'podium',
  PL13: 'fish',
  PL14: 'pie',
  PL15: 'folder',
  PL16: 'star',
  PL17: 'cards',
  PL18: 'quill',
  PL19: 'megaphone',
  PL20: 'moneybag',
  PL21: 'moneybag',
  PL22: 'envelope',
  PL21B: 'pennant',
  PL39: 'clipboard'
};

/** Emblem SVG markup for a card id, with a safe generic fallback. */
export function emblemFor(cardId: string): string {
  const key = CARD_EMBLEM[cardId] ?? 'star';
  return WRAP_OPEN + (EMBLEMS[key] ?? EMBLEMS.star) + WRAP_CLOSE;
}

/** Direct emblem lookup for non-card surfaces (terminal choices, etc). */
export function emblem(name: keyof typeof EMBLEMS | string): string {
  return WRAP_OPEN + (EMBLEMS[name] ?? EMBLEMS.star) + WRAP_CLOSE;
}
