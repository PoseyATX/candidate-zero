/**
 * Contextual opportunity engine (spec §4).
 * No static offer menu. No forced fallback filler. Empty is legal.
 */

import type { GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { ZERO_KIT_IDS, ZERO_PERSONA_IDS, type ZeroPersonaId } from '../data/zero-deck.js';
import { random } from './rng.js';
import { upgradeOptionId, upgradableCardIds } from './upgrades.js';

const RARITY_W: Record<string, number> = { common: 6, uncommon: 2, rare: 1 };

/** Attrs each Zero persona leans on — thematic filter for what can appear. */
const PERSONA_THEME: Record<ZeroPersonaId, Set<string>> = {
  blockwalker: new Set(['CLO', 'CHA', 'DIP', 'CON']),
  believer: new Set(['CON', 'CLO', 'CHA']),
  staffer: new Set(['INK', 'CRA', 'DIP']),
  faded: new Set(['DIP', 'CHA', 'CRA'])
};

function personaTheme(state: GameState): Set<string> | null {
  const id = state.personaId;
  if (id && ZERO_PERSONA_IDS.includes(id as ZeroPersonaId)) {
    return PERSONA_THEME[id as ZeroPersonaId];
  }
  return null;
}

function rarityOf(id: string): string {
  const p = PLAYS.find(c => c.id === id);
  return p?.rarity ?? 'common';
}

function thematicOk(state: GameState, card: PlayCard): boolean {
  const theme = personaTheme(state);
  if (!theme) return true;
  // Ballot doors always plausible for nobodies
  if (card.id === 'PL04' || card.id === 'PL05') return true;
  if (!card.attrs?.length) return true;
  return card.attrs.some(a => theme.has(a));
}

function contextOk(state: GameState, card: PlayCard): boolean {
  if (card.show && !card.show(state)) return false;
  if (card.req && !card.req(state)) return false;
  // Believer rigidity: no soft compromise alleys while liability lives
  if (
    (state.deck ?? []).includes('ZL_RIGIDITY') &&
    (card.id.startsWith('AL') || card.tag?.includes('deal'))
  ) {
    return false;
  }
  // Pre-ballot: prefer labor/money door themed, not general luxury
  if (!state.ballot && card.cost.$ && (card.cost.$ as number) > 500) {
    if (state.money < (card.cost.$ as number) * 0.5) return false;
  }
  // After disasters, endurance/repair-ish cards weigh in via rarity only —
  // context: need some name before media vanity
  if ((card.id === 'PL09' || card.id === 'PL15') && state.nameID < 3) return false;
  return true;
}

/**
 * Pool of card ids that could become opportunities right now.
 * Never includes Zero kit intrinsics already owned as "new" filler spam.
 */
export function opportunityPool(state: GameState): string[] {
  const owned = new Set(state.deck || []);
  const recent = String(state.sessionFlags?.recentOffers || '')
    .split(',')
    .filter(Boolean);
  const recentSet = new Set(recent);

  return PLAYS.filter(p => {
    if (owned.has(p.id)) return false;
    if (ZERO_KIT_IDS.includes(p.id)) return false;
    if (recentSet.has(p.id)) return false;
    if (p.id.startsWith('BUY') || p.id.startsWith('SS') || p.id.startsWith('WA')) return false;
    if (p.id.startsWith('PR') || p.promoRate) return false;
    if (!thematicOk(state, p)) return false;
    if (!contextOk(state, p)) return false;
    return true;
  }).map(p => p.id);
}

function weight(state: GameState, id: string): number {
  const r = RARITY_W[rarityOf(id)] ?? 6;
  const card = PLAYS.find(c => c.id === id);
  let t = 1;
  const theme = personaTheme(state);
  if (theme && card?.attrs) {
    for (const a of card.attrs) {
      if (theme.has(a)) t += 2;
    }
  }
  // Live obligations densify related plays
  if (state.obls?.length && card?.tag?.includes('debt')) t += 2;
  if ((state.hitPieces || 0) > 0 && (card?.id === 'ZN_ENDURE' || card?.n?.includes('Endure')))
    t += 1;
  return r * t;
}

function pickWeighted(ids: string[], state: GameState): number {
  if (!ids.length) return -1;
  const total = ids.reduce((s, id) => s + weight(state, id), 0);
  let roll = random() * total;
  for (let i = 0; i < ids.length; i++) {
    roll -= weight(state, ids[i]!);
    if (roll <= 0) return i;
  }
  return ids.length - 1;
}

function remember(state: GameState, shown: string[]): void {
  const prev = String(state.sessionFlags?.recentOffers || '')
    .split(',')
    .filter(Boolean);
  const next = [...shown, ...prev].slice(0, 14);
  state.sessionFlags = { ...state.sessionFlags, recentOffers: next.join(',') };
}

/**
 * Build an opportunity set. May be empty — scarcity is content.
 * Options may include UP:id practise offers when depth warrants.
 */
export function generateOpportunities(
  state: GameState,
  count = 3
): { phase: number; options: string[] } {
  const options: string[] = [];
  const ownedUp = upgradableCardIds(state, state.deck ?? []);
  // Rare practise slot — only if something is owned and theme has depth
  if (ownedUp.length && count > 1 && random() < 0.35) {
    options.push(upgradeOptionId(ownedUp[Math.floor(random() * ownedUp.length)]!));
  }

  const pool = opportunityPool(state);
  const working = [...pool];
  while (options.length < count && working.length > 0) {
    const idx = pickWeighted(working, state);
    if (idx < 0) break;
    const [id] = working.splice(idx, 1);
    if (id) options.push(id);
  }

  if (options.length) {
    remember(
      state,
      options.map(o => (o.startsWith('UP:') ? o.slice(3) : o))
    );
  }
  return { phase: 0, options };
}
