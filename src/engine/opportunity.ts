/**
 * CANDIDATE ZERO — opportunities, which are not a shop and not a menu.
 *
 * What this replaces: a phase turn built three options off the unowned pool and
 * handed them over because a phase had elapsed. Same three-ish cards, every
 * run, in every persona, regardless of what had actually happened to you. That
 * is a vending machine with a Texas skin on it.
 *
 * An opportunity fires off the run instead. Three gates, in order:
 *
 *   1. THEME. What this persona could plausibly encounter at all. The
 *      Blockwalker is not offered a lobbyist retainer in week two — not because
 *      it is balanced badly but because nobody would offer it to her. This gate
 *      alone should make two personas' runs read differently from the first
 *      phase turn onward.
 *   2. RARITY. The compendium tiers already exist; they set frequency inside
 *      whatever theme permits, so a rare stays rare instead of being one of
 *      three things on a list.
 *   3. CONTEXT. Live state — where you are, who you have met, what you owe,
 *      what just went wrong. Money doors open when you are broke, not on a
 *      schedule. Somebody offers to take a debt off you when you are carrying
 *      one.
 *
 * AND IT IS ALLOWED TO RETURN NOTHING. If no theme-legal, context-live card
 * qualifies, the week offers nothing at all. Scarcity is content. There is no
 * fallback, no filler, and nothing is topped up to a count — a stretch of empty
 * weeks is a correct outcome and the rest of the loop handles it, because
 * `pendingDraft` was always allowed to be absent.
 *
 * The gradient comes free: more contacts, more obligations, more people met
 * means more context firing, which means denser opportunities later without any
 * difficulty dial anywhere.
 */

import type { GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { ZERO_INTRINSIC_IDS } from './deck.js';
import { random } from './rng.js';
import { upgradableCardIds, upgradeOptionId } from './upgrades.js';
import { OBLS } from '../data/obligations.js';
import type { AttrId } from './types.js';

/** Prefix for an option that sheds an obligation somebody has agreed to carry. */
export const SHED_PREFIX = 'shed:';

/**
 * What each starting persona could plausibly be in front of.
 *
 * `attrs` is the grain of the persona — a card tagged outside it is somebody
 * else's kind of politics. `denyKinds` is the harder line: the Believer cannot
 * be offered a bargain because bargaining is the thing she is constitutionally
 * unable to do, and the Blockwalker cannot be offered blackmail because nobody
 * brings that to a woman who knocks doors for a living.
 */
interface PersonaTheme {
  attrs: AttrId[];
  denyKinds: string[];
  /** Money asks above this are not offered until the campaign has that money. */
  reach: number;
}

const THEMES: Record<string, PersonaTheme> = {
  // Retail and stamina. No procedure, no angles, no deals — she has never been
  // in a room where those are the currency.
  blockwalker: { attrs: ['CLO', 'CON', 'CHA'], denyKinds: ['blackmail', 'bargain'], reach: 400 },
  // Conviction and the rules she wants changed. She will not trade and she does
  // not buy things: both are the same refusal, and it is the whole persona.
  believer:    { attrs: ['CON', 'CHA', 'INK'], denyKinds: ['blackmail', 'bargain', 'item'], reach: 300 },
  // The building. He knows the rule and the back way in, and nobody is offering
  // him a crowd.
  staffer:     { attrs: ['INK', 'CRA', 'DIP'], denyKinds: ['blackmail'],            reach: 600 },
  // Rooms that open on a surname, and things money can still do.
  fadedname:   { attrs: ['DIP', 'CHA', 'CRA'], denyKinds: ['blackmail'],            reach: 2000 }
};

/** Personas outside the starting four (deep unlocks, harness fixtures) see everything. */
function themeFor(personaId: string | null | undefined): PersonaTheme | null {
  return THEMES[personaId ?? ''] ?? null;
}

/** Gate 1 — could this persona be in front of this at all? */
export function themeAllows(state: GameState, card: PlayCard): boolean {
  const theme = themeFor(state.personaId);
  if (!theme) return true;
  if (card.kind && theme.denyKinds.includes(card.kind)) return false;
  // An untagged card is nobody's speciality; let it through.
  if (card.attrs?.length) {
    if (!card.attrs.some(a => theme.attrs.includes(a))) return false;
  }
  // Money you could not conceivably raise is not an offer, it is a taunt.
  const price = card.cost?.$ ?? 0;
  if (price > theme.reach && price > state.money) return false;
  return true;
}

/** Gate 3 — is the run actually in a place where this is a live thing? */
export function contextAllows(state: GameState, card: PlayCard): boolean {
  const price = card.cost?.$ ?? 0;
  // Nobody offers you a thing you cannot pay for this week or next.
  if (price > 0 && price > state.money * 1.5) return false;

  // Volunteer-hungry plays need volunteers to exist.
  if ((card.cost?.vp ?? 0) > state.volPool) return false;
  // Favor-priced plays need somebody who owes you.
  if ((card.cost?.fav ?? 0) > state.favors) return false;

  // Ally-shaped opportunities want somebody already in your orbit.
  if (card.kind === 'ally' && (state.allies?.length ?? 0) === 0 && state.contacts < 120) {
    return false;
  }

  // The card's own gates are context too, and they are already written.
  if (card.show && !card.show(state)) return false;
  if (card.req && !card.req(state)) return false;
  return true;
}

const RARITY_WEIGHT: Record<string, number> = { common: 6, uncommon: 2, rare: 1 };

/**
 * How much the world has to say to you right now.
 *
 * This is the gradient, and it is deliberately not a difficulty setting: it
 * counts what you have actually accumulated. A first-week nobody gets at most
 * one thing. Somebody eight weeks in with a machine, debts and a district that
 * knows their name gets more, because there is more of them to catch on.
 */
export function contextDensity(state: GameState): number {
  let d = 0;
  if ((state.allies?.length ?? 0) >= 1) d++;
  if ((state.allies?.length ?? 0) >= 3) d++;
  if ((state.obls?.length ?? 0) >= 1) d++;
  if ((state.contacts ?? 0) >= 400) d++;
  if ((state.nameID ?? 0) >= 30) d++;
  if ((state.hitPieces ?? 0) >= 1) d++; // trouble is context too
  return d;
}

/** Weighted pick without replacement, seeded. */
function drawWeighted(pool: string[], rarityOf: (id: string) => string): string | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((s, id) => s + (RARITY_WEIGHT[rarityOf(id)] ?? 6), 0);
  let roll = random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= RARITY_WEIGHT[rarityOf(pool[i]!)] ?? 6;
    if (roll <= 0) return pool.splice(i, 1)[0]!;
  }
  return pool.splice(pool.length - 1, 1)[0]!;
}

/**
 * Build this phase turn's opportunities. May legitimately be empty.
 *
 * Returns option ids in the existing draft vocabulary so nothing downstream has
 * to learn a new shape: a bare card id, an `up:` upgrade option, or a `shed:`
 * obligation somebody will take off your hands.
 */
export function buildOpportunities(state: GameState, max = 3): string[] {
  const owned = new Set(state.deck ?? []);
  const rarityOf = (id: string): string => PLAYS.find(p => p.id === id)?.rarity ?? 'common';

  const pool = PLAYS
    .filter(p => !owned.has(p.id))
    .filter(p => !ZERO_INTRINSIC_IDS.has(p.id))
    .filter(p => themeAllows(state, p))
    .filter(p => contextAllows(state, p))
    .map(p => p.id);

  // How many things the world has to say. Never topped up to `max`.
  const room = Math.max(0, Math.min(max, 1 + Math.floor(contextDensity(state) / 2)));
  const out: string[] = [];

  // Depth before breadth: a card you already run, sharpened, is an opportunity.
  // Only offered once you have run something enough to be good at it.
  const upgradable = upgradableCardIds(state, state.deck ?? []);
  if (upgradable.length > 0 && room > 1 && random() < 0.5) {
    out.push(upgradeOptionId(upgradable[Math.floor(random() * upgradable.length)]!));
  }

  // Somebody offers to take a debt off you. Only exists if you are carrying one
  // and only if you have the standing for anybody to bother.
  const shedable = (state.obls ?? []).filter(id => OBLS[id]);
  if (shedable.length > 0 && (state.allies?.length ?? 0) >= 2 && random() < 0.35) {
    out.push(`${SHED_PREFIX}${shedable[Math.floor(random() * shedable.length)]!}`);
  }

  while (out.length < room) {
    const id = drawWeighted(pool, rarityOf);
    if (!id) break; // nothing theme-legal and live. Offer nothing.
    out.push(id);
  }

  return out.slice(0, max);
}
