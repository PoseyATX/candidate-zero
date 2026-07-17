/**
 * Buyable campaign assets — money (and rare vol) sinks with real mechanical bite.
 * Ported/adapted from archive ASSETS shop (billboards, website, staff tools).
 */

import type { GameState } from '../engine/types.js';

export interface AssetDef {
  id: string;
  n: string;
  cost: number;
  /** Optional volunteer cost */
  vcost?: number;
  d: string;
  /** Mechanical summary for UI */
  effect: string;
  req?: (s: GameState) => boolean;
  /** Called once on purchase */
  onBuy?: (s: GameState) => void;
}

/** Purchasable kit — BIO_/ISSUE_/REGION_ tags are not in this catalog. */
export const SHOP_ASSETS: AssetDef[] = [
  {
    id: 'A02',
    n: 'Voter File Access',
    cost: 400,
    d: 'Last cycle’s names, or a cousin’s login. Targeting starts here.',
    effect: 'Enables Walk List purchase; walks slightly sharper.',
    onBuy: s => {
      s.nameID += 1;
    }
  },
  {
    id: 'A01',
    n: 'The Walk List',
    cost: 450,
    d: 'Annotated doors. Not the whole county — the doors that vote.',
    effect: 'Block Walk +12% odds and ×1.5 contacts.',
    req: s => s.assets.includes('A02') || s.contacts >= 40,
  },
  {
    id: 'A09',
    n: 'Phone Tree',
    cost: 350,
    vcost: 1,
    d: 'A printed tree and a grandma who will call until the pizza ends.',
    effect: 'Phone Bank +15% odds; double contact yield.',
  },
  {
    id: 'A04',
    n: 'Website That Works',
    cost: 300,
    d: 'Not a Facebook. A real form. Small dollars start here.',
    effect: 'Fish Fry / small-dollar +20%; name ID +1 passive/week.',
    onBuy: s => {
      if (!s.backers.includes('B05')) s.backers.push('B05');
    }
  },
  {
    id: 'A11',
    n: 'Push Cards',
    cost: 250,
    d: 'Corrugated stock. Your face. The issue in fourteen-point type.',
    effect: 'Every walk +1 Name ID.',
  },
  {
    id: 'A03',
    n: 'Mail Program',
    cost: 1500,
    d: 'House file, ink, postage. Contrast Mail actually lands.',
    effect: 'Contrast Mail cheaper mentally; Subdivisions convert harder.',
    req: s => s.tier >= 1 || s.ballot,
  },
  {
    id: 'A06',
    n: 'The Flatbed Truck',
    cost: 800,
    d: 'Signs, coolers, a generator. Logistics is ideology with a hitch.',
    effect: 'Crisis events +name; FM Roads walks stronger; GOTV edge.',
  },
  {
    id: 'A12',
    n: 'Billboard on the Highway',
    cost: 2000,
    d: 'Your name above the feedlot exit. Passive ID the expensive way.',
    effect: '+2 Name ID on buy; +1 Name ID each week while held.',
    req: s => s.money >= 500 || s.tier >= 1,
    onBuy: s => {
      s.nameID += 2;
    }
  },
  {
    id: 'A07',
    n: 'Part-Time Scheduler',
    cost: 1200,
    d: 'Someone who answers the phone so you can walk.',
    effect: '+1 AP max while held (staff is a force multiplier).',
    req: s => (s.cycleIndex ?? 0) >= 0 && s.contacts >= 25,
    onBuy: s => {
      s.apMax = Math.min(4, s.apMax + 1);
      s.ap = Math.min(s.apMax, s.ap + 1);
    }
  },
  {
    id: 'A08',
    n: 'Yard Sign Cache',
    cost: 400,
    d: 'Unplanted plastic and a staple gun.',
    effect: 'Yard Sign Blitz free of $ cost once owned (stock on hand).',
  }
];

export function assetName(id: string): string {
  return SHOP_ASSETS.find(a => a.id === id)?.n ?? id;
}

export function ownedShopAssets(state: GameState): AssetDef[] {
  return SHOP_ASSETS.filter(a => state.assets.includes(a.id));
}

export function listShopOffers(state: GameState): AssetDef[] {
  return SHOP_ASSETS.filter(a => {
    if (state.assets.includes(a.id)) return false;
    if (a.req && !a.req(state)) return false;
    return true;
  });
}

export function canAffordAsset(state: GameState, a: AssetDef): boolean {
  if ((a.cost ?? 0) > state.money) return false;
  if ((a.vcost ?? 0) > state.volPool) return false;
  return true;
}

export function buyAsset(
  state: GameState,
  id: string
): { ok: boolean; text: string } {
  const a = SHOP_ASSETS.find(x => x.id === id);
  if (!a) return { ok: false, text: 'Unknown asset.' };
  if (state.assets.includes(id)) return { ok: false, text: 'Already owned.' };
  if (a.req && !a.req(state)) return { ok: false, text: 'Requirements not met.' };
  if (!canAffordAsset(state, a)) return { ok: false, text: 'Cannot afford.' };

  state.money -= a.cost;
  if (a.vcost) state.volPool -= a.vcost;
  state.assets.push(id);
  a.onBuy?.(state);

  const text = `ACQUIRED: ${a.n}. ${a.effect}`;
  state.log.push({ week: state.week, kind: 'note', text });
  // Dopamine-friendly flag
  if (!state.trophies) state.trophies = [];
  state.trophies.push({
    id: 'BUY_' + id + '_' + state.week,
    name: a.n,
    text: a.effect,
    kind: 'loot',
    cycle: state.cycleIndex ?? 0
  });
  return { ok: true, text };
}

/** Passive weekly effects from owned shop assets. */
export function tickAssetPassives(state: GameState): string[] {
  const notes: string[] = [];
  if (state.assets.includes('A12')) {
    state.nameID += 1;
    notes.push('Billboard: +1 Name ID');
  }
  if (state.assets.includes('A04') && state.week % 2 === 0) {
    state.nameID += 1;
    notes.push('Website: +1 Name ID');
  }
  if (state.assets.includes('A07')) {
    // keep apMax elevated if staff was bought (re-apply clamp)
    if (state.apMax < 3) state.apMax = 3;
  }
  return notes;
}

/** Display chips for kit — shop assets only, not BIO tags. */
export function kitChips(state: GameState): { id: string; n: string; effect: string }[] {
  return ownedShopAssets(state).map(a => ({ id: a.id, n: a.n, effect: a.effect }));
}
