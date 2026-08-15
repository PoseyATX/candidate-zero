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
    '<path d="M12 8.5v7M13.8 10c-.5-.8-3.1-.9-3.4.4-.3 1.5 3.5 1 3.3 2.6-.2 1.4-2.9 1.3-3.5.4"/>',
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
    '<path d="M12 11v6M13.6 12.2c-.4-.7-2.7-.8-3 .3-.3 1.3 3.1.9 2.9 2.3-.2 1.2-2.5 1.1-3 .3"/>',
  clipboard:
    '<path d="M7 4.5h10V21H7z"/><path d="M10 2.5h4V6h-4z"/>' +
    '<path d="M9.5 10h5M9.5 13h5M9.5 16h3"/>',
  pennant: '<path d="M6 3v18"/><path d="M6 4.5h12l-3 4 3 4H6"/>',
  handshake:
    '<path d="M2.5 7l4-2 5 2.5L16 5l5.5 2.5v6L16 18l-4.5-2.5L7 18l-4.5-4z"/>' +
    '<path d="M11.5 7.5L8 11c1.5 1.5 3 1.5 4.5 0l1-1"/>',
  gavel:
    '<path d="M14 4l4 4-7 7-4-4z"/><path d="M7 15l-3 5"/><path d="M3.5 18.5h7"/>' +
    '<path d="M15.5 5.5l2.5-2.5"/>',
  hourglass:
    '<path d="M7 3.5h10"/><path d="M7 20.5h10"/><path d="M8 3.5c0 3.2 2 5 4 6.5 2-1.5 4-3.3 4-6.5"/>' +
    '<path d="M8 20.5c0-3.2 2-5 4-6.5 2 1.5 4 3.3 4 6.5"/><path d="M10.5 12h3"/>',
  network:
    '<circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="17" r="2"/><circle cx="18.5" cy="17" r="2"/>' +
    '<path d="M12 7.5v3.5M10.5 12.5L7 15.5M13.5 12.5L17 15.5"/><circle cx="12" cy="12.5" r="1.4"/>',
  seal:
    '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="5"/>' +
    '<path d="M12 7.5v9M8.5 9.5l7 5M15.5 9.5l-7 5"/>',
  // --- Field wave (PL23, PL80–PL92, MD_AL*): these 25 cards all rendered the
  // same star, so a hand of them read as one repeated card. Silhouettes, not
  // color, do the work — same woodcut stroke as the originals above.
  van:
    '<path d="M2.5 16.2V9.6h10.6v6.6"/><path d="M13.1 10.8h3.5l2.9 3.3v2.1"/>' +
    '<path d="M14.3 11.9v2.3h3.4"/><circle cx="7" cy="17.4" r="1.7"/>' +
    '<circle cx="16.4" cy="17.4" r="1.7"/><path d="M2.5 16.2h2.8M8.7 16.2h6M18.1 16.2h1.4"/>',
  crowd:
    '<circle cx="6.4" cy="8.6" r="1.9"/><circle cx="17.6" cy="8.6" r="1.9"/>' +
    '<circle cx="12" cy="7.2" r="2.3"/>' +
    '<path d="M2.8 17.4c0-2 1.6-3.6 3.6-3.6M17.6 13.8c2 0 3.6 1.6 3.6 3.6"/>' +
    '<path d="M7.6 20c0-2.4 2-4.4 4.4-4.4S16.4 17.6 16.4 20"/>',
  press:
    '<rect x="3.5" y="5" width="17" height="11.5"/><path d="M3.5 8.6h17"/>' +
    '<path d="M6.2 11.2h5M6.2 13.4h5M13.8 11.2h4M13.8 13.4h4"/>' +
    '<path d="M5.6 16.5v3M18.4 16.5v3"/><path d="M4 20h16"/>',
  church:
    '<path d="M12 2.4v3.4M10.5 3.9h3"/><path d="M12 6.2l4.4 3.9V20h-8.8V10.1z"/>' +
    '<path d="M4 20v-7.4l3.6-2.7M20 20v-7.4l-3.6-2.7"/>' +
    '<path d="M10.6 20v-4.1h2.8V20"/><path d="M2.8 20h18.4"/>',
  wreath:
    '<circle cx="12" cy="13.2" r="6.6"/><circle cx="12" cy="13.2" r="4.4"/>' +
    '<path d="M9.6 5.4L12 7.8l2.4-2.4"/><path d="M12 7.8V4"/>',
  ball:
    '<circle cx="12" cy="12" r="7.6"/>' +
    '<path d="M7.1 6.6c1.7 1.7 2.6 3.5 2.6 5.4s-.9 3.7-2.6 5.4"/>' +
    '<path d="M16.9 6.6c-1.7 1.7-2.6 3.5-2.6 5.4s.9 3.7 2.6 5.4"/>',
  typewriter:
    '<path d="M6.4 4.6h11.2v4.2H6.4z"/><path d="M4 10.2h16l1.2 6.4H2.8z"/>' +
    '<path d="M8.2 13.4h7.6"/><path d="M9.4 8.8v1.4M14.6 8.8v1.4"/><path d="M6.4 19.6h11.2"/>',
  hardhat:
    '<path d="M6.6 16.4v-3.2a5.4 5.4 0 0 1 10.8 0v3.2"/>' +
    '<path d="M10.3 8.3V5.5h3.4v2.8"/>' +
    '<path d="M3.4 16.4h17.2"/><path d="M3.4 16.4c0 1.3 1 2.2 2.2 2.2h12.8c1.2 0 2.2-.9 2.2-2.2"/>',
  screen:
    '<rect x="3" y="4.8" width="18" height="11.4" rx="1"/>' +
    '<path d="M9 20h6M12 16.2V20"/><circle cx="12" cy="10.5" r="2.6"/><path d="M12 6.6v1.6M12 12.8v1.6M8.1 10.5h1.6M14.3 10.5h1.6"/>',
  camera:
    '<path d="M3 8.4h3.8l1.6-2.2h7.2l1.6 2.2H21v10.2H3z"/>' +
    '<circle cx="12" cy="13.4" r="3.3"/><path d="M18.4 10.4h.9"/>',
  bolt: '<path d="M13.8 2.6L6 13.4h4.9l-1.4 8L18 10.4h-5.1z"/>',
  domino:
    '<rect x="7" y="2.8" width="10" height="18.4" rx="1.2"/><path d="M7 12h10"/>' +
    '<circle cx="10.4" cy="6.2" r="1"/><circle cx="13.6" cy="9" r="1"/>' +
    '<circle cx="10.4" cy="15.4" r="1"/><circle cx="13.6" cy="15.4" r="1"/>' +
    '<circle cx="10.4" cy="18.4" r="1"/><circle cx="13.6" cy="18.4" r="1"/>',

  // --- Identity marks (persona / issue / district / region) --------------
  // The nameplate draft printed a star on all 53 identity cards because a
  // partial map was judged worse than none. This completes it.
  medal:
    '<path d="M9 2.6l1.6 5.2M15 2.6l-1.6 5.2"/><circle cx="12" cy="14.4" r="5.8"/>' +
    '<path d="M12 11.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"/>',
  book:
    '<path d="M4 4.4h6.2c1 0 1.8.8 1.8 1.8v13c0-1-.8-1.8-1.8-1.8H4z"/>' +
    '<path d="M20 4.4h-6.2c-1 0-1.8.8-1.8 1.8v13c0-1 .8-1.8 1.8-1.8H20z"/><path d="M12 6.2v13"/>',
  store:
    '<path d="M4 9.4h16v10.2H4z"/><path d="M3 9.4l1.8-4.8h14.4L21 9.4z"/>' +
    '<path d="M7.4 4.6L6.6 9.4M12 4.6v4.8M16.6 4.6l.8 4.8"/><path d="M9.4 19.6v-5.4h5.2v5.4"/>',
  fist:
    '<path d="M6.2 11V7.6a1.5 1.5 0 0 1 3 0V11"/><path d="M9.2 10.6V6.4a1.5 1.5 0 0 1 3 0v4.2"/>' +
    '<path d="M12.2 10.8V7.4a1.5 1.5 0 0 1 3 0v3.6"/>' +
    '<path d="M15.2 11.4V9.2a1.4 1.4 0 0 1 2.8 0v4.6c0 3.2-2.4 5.8-5.6 5.8s-6.2-2-6.2-5.6V11"/>',
  tree:
    '<path d="M12 20.5v-5"/><path d="M12 15.5c-3.6 0-6-2.2-6-5 0-3.4 2.6-6 6-6s6 2.6 6 6c0 2.8-2.4 5-6 5z"/>' +
    '<path d="M12 15.5l-2.6-3M12 13l2.4-2.6"/><path d="M9 20.5h6"/>',
  scales:
    '<path d="M12 4.2v15.4"/><path d="M6 7.2h12"/><path d="M9.6 20h4.8"/>' +
    '<path d="M6 7.2L3.4 13h5.2z"/><path d="M18 7.2L15.4 13h5.2z"/><circle cx="12" cy="4.2" r="1.1"/>',
  key:
    '<circle cx="7.4" cy="8.4" r="3.6"/><path d="M10 11l8 8"/><path d="M15.4 16.4l2-2M17.6 18.6l2-2"/>',
  drop: '<path d="M12 3.2c3.4 4 5.4 6.8 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-2.8 2-5.6 5.4-9.6z"/>',
  schoolhouse:
    '<path d="M12 3l8 4.4v13H4v-13z"/><path d="M12 3v3.4"/><path d="M9.8 20.4v-5h4.4v5"/>' +
    '<path d="M9.6 9.4h4.8v3.4H9.6z"/>',
  fence:
    '<path d="M5 20V8.6l2.4-2.4L9.8 8.6V20"/><path d="M14.2 20V8.6l2.4-2.4L19 8.6V20"/>' +
    '<path d="M3 11.2h18M3 15.4h18"/>',
  cross: '<path d="M9.4 3.4h5.2v6h6v5.2h-6v6H9.4v-6h-6V9.4h6z"/>',
  road:
    '<path d="M8.6 3.4L4 20.6M15.4 3.4L20 20.6"/><path d="M12 4.6v2.8M12 10.4v3M12 16.4v3"/>',
  wheat:
    '<path d="M12 20.6V8"/><path d="M12 8c0-2.4 1-4.2 2.6-5.4C15.4 4.6 15 7 12 8z"/>' +
    '<path d="M12 8c0-2.4-1-4.2-2.6-5.4C8.6 4.6 9 7 12 8z"/>' +
    '<path d="M12 13c0-2.2 1.2-3.6 3-4.4.6 2-.4 4-3 4.4z"/>' +
    '<path d="M12 13c0-2.2-1.2-3.6-3-4.4-.6 2 .4 4 3 4.4z"/>',
  tower:
    '<path d="M8.6 20.6L12 6.4l3.4 14.2"/><path d="M9.8 15.4h4.4"/>' +
    '<path d="M6.4 8.6a7 7 0 0 1 0-5.2M17.6 3.4a7 7 0 0 1 0 5.2"/><circle cx="12" cy="4.6" r="1.2"/>',
  heart:
    '<path d="M12 20c-4.8-3.2-7.6-6-7.6-9.4A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.6 2.6c0 3.4-2.8 6.2-7.6 9.4z"/>',
  ticket:
    '<path d="M3.4 8.2h17.2v3a2 2 0 0 0 0 4v3H3.4v-3a2 2 0 0 0 0-4z"/>' +
    '<path d="M9.4 8.2v1.6M9.4 13v1.6M9.4 17.8v1.4"/>',
  ballotbox:
    '<path d="M3.6 11.4h16.8v8.2H3.6z"/><path d="M8.4 11.4V3.6h7.2v7.8"/>' +
    '<path d="M9.6 6.2h4.8M9.6 8.6h4.8"/><path d="M10.2 11.4h3.6v2.4h-3.6z"/>',
  pine:
    '<path d="M12 2.6l4 6h-8z"/><path d="M12 7l5 6.6H7z"/><path d="M12 11.6l6 7H6z"/>' +
    '<path d="M12 18.6v2.8"/>',
  hill:
    '<path d="M2.6 18.4l5-6.4 3.4 4.2 3.6-5.6 6.8 7.8z"/>' +
    '<path d="M2.6 18.4h18.8"/><circle cx="17.4" cy="6" r="2.2"/>',
  wave:
    '<path d="M2.6 9.4c2 0 2-1.8 4-1.8s2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 4 1.8"/>' +
    '<path d="M2.6 14c2 0 2-1.8 4-1.8s2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 4 1.8"/>' +
    '<path d="M2.6 18.6c2 0 2-1.8 4-1.8s2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 4 1.8"/>',
  rig:
    '<path d="M6.4 20.6L12 3.4l5.6 17.2"/><path d="M8.6 13.4h6.8M7.6 17h8.8"/>' +
    '<path d="M4 20.6h16"/>',
  house:
    '<path d="M3.4 11L12 4l8.6 7"/><path d="M5.6 9.6v10.8h12.8V9.6"/>' +
    '<path d="M10 20.4v-5.2h4v5.2"/><path d="M16 6.2V4h2.4v4.2"/>'
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
  PL17: 'cards',
  PL18: 'quill',
  PL19: 'megaphone',
  PL20: 'moneybag',
  PL21: 'moneybag',
  PL22: 'envelope',
  PL21B: 'pennant',
  PL39: 'clipboard',
  PR01: 'star',
  // Field wave — 40% of the catalog fell through to `star`, so a hand of five
  // different plays showed five identical marks. Iconic where the card is
  // iconic; reuse of an existing glyph beats inventing a near-duplicate.
  PL16: 'crowd',
  PL23: 'van',
  PL22B: 'press',
  PL29: 'wreath',
  PL30: 'church',
  PL32: 'cup',
  PL48: 'gavel',
  PL80: 'handshake',
  PL81: 'church',
  PL82: 'ball',
  PL83: 'typewriter',
  PL84: 'cup',
  PL85: 'hardhat',
  PL86: 'screen',
  PL87: 'van',
  PL88: 'camera',
  PL89: 'church',
  PL90: 'pennant',
  PL91: 'bolt',
  PL92: 'network',
  MD_AL02: 'clipboard',
  MD_AL09: 'crowd',
  MD_AL12: 'phone',
  MD_AL16: 'cards',
  // Alley plays — the four that open Act I's hand, so the most-seen cards in
  // the game were also four identical stars. (AL05–AL16 are allies, not cards.)
  AL01: 'domino',
  AL02: 'van',
  AL03: 'cup',
  AL04: 'pennant'
};

/**
 * Kit prefix defaults (PR-4 / K12): SS→gavel, WA→hourglass, MV→network,
 * SIG→seal, BUY→coin. Per-id CARD_EMBLEM wins. Unmapped → star.
 */
export function emblemKeyFor(cardId: string): string {
  if (CARD_EMBLEM[cardId]) return CARD_EMBLEM[cardId]!;
  if (cardId.startsWith('SS')) return 'gavel';
  if (cardId.startsWith('WA')) return 'hourglass';
  if (cardId.startsWith('MV')) return 'network';
  if (cardId.startsWith('SIG')) return 'seal';
  if (cardId.startsWith('BUY')) return 'coin';
  // Machine doors are people who let you in — a handshake, unless the specific
  // card earns its own mark above.
  if (cardId.startsWith('MD_')) return 'handshake';
  // Act III/IV kit prefixes: hooks are leverage on a person, policy plays act
  // on the bill, member plays work a colleague.
  if (cardId.startsWith('HK')) return 'fish';
  if (cardId.startsWith('PO')) return 'folder';
  if (cardId.startsWith('MB')) return 'podium';
  return 'star';
}

/**
 * Identity marks for the nameplate draft, keyed `<kind>:<id>`.
 *
 * Complete by construction for the shipped catalog — the draft previously
 * printed one star on all 53 cards, on the reasoning that a partial map was
 * worse than none. Distinctness matters WITHIN a grid (you compare six
 * personas side by side), so a glyph may legitimately repeat across kinds:
 * `medal` is the veteran persona and the veterans' issue, and that rhyme is
 * the point. Anything unmapped still falls back to star.
 */
const IDENTITY_EMBLEM: Record<string, string> = {
  // Personas — 24, all distinct.
  'persona:veteran': 'medal',
  'persona:teacher': 'book',
  'persona:preacher': 'church',
  'persona:smallbiz': 'store',
  'persona:PA_CLO': 'crowd',
  'persona:PA_CON': 'megaphone',
  'persona:PA_CRA': 'cards',
  'persona:PA_INK': 'gavel',
  'persona:PA_DIP': 'handshake',
  'persona:PA_CHA': 'mic',
  'persona:PA_CLO_CON': 'pennant',
  'persona:PA_CLO_CRA': 'fist',
  'persona:PA_CLO_INK': 'hardhat',
  'persona:PA_CLO_DIP': 'tree',
  'persona:PA_CLO_CHA': 'ball',
  'persona:PA_CON_CRA': 'bolt',
  'persona:PA_CON_INK': 'scales',
  'persona:PA_CON_DIP': 'podium',
  'persona:PA_CRA_INK': 'key',
  'persona:PA_CRA_DIP': 'moneybag',
  'persona:PA_CRA_CHA': 'camera',
  'persona:PA_INK_DIP': 'folder',
  'persona:PA_INK_CHA': 'clipboard',
  'persona:PA_DIP_CHA': 'seal',
  // Issues — 18, all distinct.
  'issue:taxes': 'coin',
  'issue:water': 'drop',
  'issue:schools': 'schoolhouse',
  'issue:border': 'fence',
  'issue:hospitals': 'cross',
  'issue:land': 'sign',
  'issue:tolls': 'road',
  'issue:teacherpay': 'book',
  'issue:ag-subsidies': 'wheat',
  'issue:corruption': 'envelope',
  'issue:broadband': 'tower',
  'issue:bail-reform': 'scales',
  'issue:mental-health': 'heart',
  'issue:veterans': 'medal',
  'issue:grid': 'bolt',
  'issue:payday-lending': 'fish',
  'issue:vouchers': 'ticket',
  'issue:election-integrity': 'ballotbox',
  // Districts — 4.
  'district:open': 'star',
  'district:incumb': 'podium',
  'district:comp': 'debate',
  'district:wrong': 'fence',
  // Regions — 7.
  'region:east': 'pine',
  'region:valley': 'drop',
  'region:hill': 'hill',
  'region:panhandle': 'wheat',
  'region:metro': 'tower',
  'region:gulf': 'wave',
  'region:west': 'rig'
};

/** Emblem key for a nameplate identity card. Unmapped → star. */
export function identityEmblemKey(kind: string, id: string): string {
  return IDENTITY_EMBLEM[`${kind}:${id}`] ?? 'star';
}

/** Emblem SVG markup for a nameplate identity card. */
export function identityEmblem(kind: string, id: string): string {
  return emblem(identityEmblemKey(kind, id));
}

/**
 * Grounds are places, and the picker showed eight interchangeable text tiles.
 * A ground you cannot recognise at a glance is a row in a spreadsheet, which
 * is the same complaint docs/DESIGN-DIRECTIONS.md §3 makes about the model
 * underneath it. Keyed by the ids in engine/state.ts.
 */
const GROUND_EMBLEM: Record<string, string> = {
  GR01: 'gavel', // Courthouse Square
  GR02: 'road', // The FM Roads
  GR03: 'house', // The New Subdivisions
  GR04: 'church', // Church Corridor
  GR05: 'hardhat', // The Plant Gate
  GR06: 'medal', // VFW & Legion Halls
  GR07: 'wave', // Lake Country
  GR08: 'crowd' // Southside Blocks
};

/** Emblem SVG markup for a ground id. Unmapped → star. */
export function groundEmblem(groundId: string): string {
  return emblem(GROUND_EMBLEM[groundId] ?? 'star');
}

/** Emblem SVG markup for a card id, with kit-prefix then star fallback. */
export function emblemFor(cardId: string): string {
  const key = emblemKeyFor(cardId);
  return WRAP_OPEN + (EMBLEMS[key] ?? EMBLEMS.star) + WRAP_CLOSE;
}

/** Direct emblem lookup for non-card surfaces (terminal choices, etc). */
export function emblem(name: keyof typeof EMBLEMS | string): string {
  return WRAP_OPEN + (EMBLEMS[name] ?? EMBLEMS.star) + WRAP_CLOSE;
}

const MARK_OPEN =
  "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' " +
  "stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>";

const KIND_MARK: Record<string, string> = {
  bargain:
    "<circle cx='13' cy='3.6' r='1.1'/><path d='M13 4.6v8a4 4 0 1 1-4-4'/>" +
    "<path d='M9 8.6l-1.7 1M9 8.6l1 1.7'/>",
  ally: "<circle cx='12' cy='7.5' r='3.1'/><path d='M5.5 20c0-3.7 2.9-6.3 6.5-6.3S18.5 16.3 18.5 20'/>",
  item: "<path d='M12 3l6.5 9-6.5 9-6.5-9z'/><path d='M6 12h12'/>",
  location: "<path d='M12 21c4.2-5.2 6.2-8.3 6.2-11.4A6.2 6.2 0 1 0 5.8 9.6C5.8 12.7 7.8 15.8 12 21z'/><circle cx='12' cy='9.6' r='2.2'/>",
  liability:
    "<rect x='3.5' y='9' width='8.5' height='6' rx='3'/>" +
    "<rect x='12' y='9' width='8.5' height='6' rx='3'/>",
  blackmail: "<rect x='3.5' y='6' width='17' height='12' rx='1'/><path d='M3.5 7.2l8.5 6 8.5-6'/>"
  // promo: no corner seal — pink wash alone is the signal
};

export interface KindMeta {
  label: string;
  blurb: string;
}

export const KIND_META: Record<string, KindMeta> = {
  action: { label: 'Action', blurb: 'A play you make.' },
  bargain: { label: 'Bargain', blurb: 'A deal with strings — the benefit is real, and so are they.' },
  ally: { label: 'Ally', blurb: 'A person who joins your machine.' },
  item: { label: 'Item', blurb: 'An asset you hold.' },
  location: { label: 'Location', blurb: 'A place with its own rules.' },
  liability: { label: 'Liability', blurb: 'A weight you carry, win or lose.' },
  blackmail: { label: 'Blackmail', blurb: 'Leverage — held on you, or by you.' },
  promo: { label: 'Favor', blurb: 'A rare card from someone who can afford to be kind.' }
};

/** Corner-seal mark SVG for a card kind, or '' for the unmarked default. */
export function kindMark(kind: string | undefined): string {
  if (!kind || kind === 'action' || kind === 'promo' || !KIND_MARK[kind]) return '';
  return MARK_OPEN + KIND_MARK[kind] + WRAP_CLOSE;
}
