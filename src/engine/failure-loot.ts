/**
 * Tangible gains after electoral failure — cards, flags, kit crumbs.
 * Visible in UI trophies strip + deck injection. Not pity RNG: you still lost.
 */

import { random } from './rng.js';
import type { CampaignOutcome, DeckState, GameState, Trophy } from './types.js';
import { injectIntoDrawPile } from './deck.js';

function pushTrophy(state: GameState, t: Omit<Trophy, 'cycle'> & { cycle?: number }): void {
  if (!state.trophies) state.trophies = [];
  if (state.trophies.some(x => x.id === t.id)) return;
  state.trophies.push({
    ...t,
    cycle: t.cycle ?? state.cycleIndex ?? 0
  });
}

/** Ownership + pending physical inject (flushed in startWeek). */
function mintCard(state: GameState, cardId: string): void {
  if (!state.deck) state.deck = [];
  if (!state.deck.includes(cardId)) state.deck.push(cardId);
  if (!state.cycleLoot) state.cycleLoot = [];
  if (!state.cycleLoot.includes(cardId)) state.cycleLoot.push(cardId);
}

/** Flush cycleLoot card ids into the physical draw pile (call from startWeek). */
export function flushCycleLootToDeck(state: GameState, deck: DeckState): string[] {
  const loot = state.cycleLoot ?? [];
  if (!loot.length) return [];
  injectIntoDrawPile(deck, state, loot);
  const out = [...loot];
  state.cycleLoot = [];
  return out;
}

/**
 * Call when a cycle closes. Failures mint scars + cards; wins mint oath loot.
 */
export function grantCycleLoot(
  state: GameState,
  outcome: CampaignOutcome
): { trophies: Trophy[]; cards: string[]; juice: string } {
  const cards: string[] = [];
  const before = state.trophies?.length ?? 0;

  if (outcome === 'missed_filing') {
    pushTrophy(state, {
      id: 'FLAG_UNFILED',
      name: 'Not on the Ballot',
      text: 'You still have a list. Petition memory stays in the pool.',
      kind: 'scar'
    });
    mintCard(state, 'PL04');
    cards.push('PL04');
    state.contacts += 15;
    state.nameID += 1;
    if (state.contacts >= 30) {
      pushTrophy(state, {
        id: 'FLAG_LIST_SCRAPS',
        name: 'List Scraps',
        text: 'Names on a legal pad. Shop: Voter File is the next step.',
        kind: 'flag'
      });
    }
  }

  if (outcome === 'lost_primary') {
    pushTrophy(state, {
      id: 'FLAG_PRIMARY_LOSS_' + (state.cycleIndex ?? 0),
      name: 'Primary Night Loss',
      text: 'On the ballot, short of the nomination. The list is real.',
      kind: 'scar'
    });
    const pool = ['PL16', 'PL13', 'PL08', 'PL14'];
    const pick = pool[Math.floor(random() * pool.length)]!;
    mintCard(state, pick);
    cards.push(pick);
    state.contacts += 25;
    if (state.volPool < 2) state.volPool += 1;
    pushTrophy(state, {
      id: 'FLAG_BANKED_LIST',
      name: 'Banked Voter List',
      text: '+contacts into the next filing. Perennial energy.',
      kind: 'loot'
    });
  }

  if (outcome === 'lost_general') {
    pushTrophy(state, {
      id: 'FLAG_NOVEMBER_' + (state.cycleIndex ?? 0),
      name: 'November Heartbreak',
      text: 'Primary glory, general wall. GOTV memory enters the deck.',
      kind: 'scar'
    });
    mintCard(state, 'PL19');
    cards.push('PL19');
    state.momentum = Math.max(1, state.momentum);
    pushTrophy(state, {
      id: 'FLAG_DOMAIN',
      name: 'Campaign Domain',
      text: 'The URL still works. Buy the website when you can afford it.',
      kind: 'flag'
    });
  }

  if (outcome === 'won_general') {
    pushTrophy(state, {
      id: 'FLAG_SWORN_' + (state.cycleIndex ?? 0),
      name: 'The Oath',
      text: 'Short words. Long consequences. You hold the seat — for now.',
      kind: 'loot'
    });
    mintCard(state, 'PL10');
    cards.push('PL10');
  }

  const newT = (state.trophies ?? []).slice(before);
  const juice =
    newT.length || cards.length
      ? `LOOT: ${[...newT.map(t => t.name), ...cards.map(c => `+${c}`)].join(' · ')}`
      : 'Cycle closed.';

  state.log.push({ week: state.week, kind: 'juice', text: juice });
  state.lastLootJuice = juice;

  return { trophies: newT, cards, juice };
}
