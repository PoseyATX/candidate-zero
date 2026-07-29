/**
 * Purchasable campaign assets — ported from archive/prototype-single-file.html
 * ASSETS registry + assetPlays() (lines ~819–831).
 *
 * Shop entries appear as always-available camp actions (0 AP; money or
 * volunteer cost). Buying pushes the id onto state.assets; cards that
 * already check s.assets.includes('A01'/'A09'/…) become live.
 *
 * Not inventing: only the eight archive shop assets. A13 Church Directory
 * is granted by PL30 Prayer Breakfast, not sold.
 */

import type { GameState, PlayCard } from '../engine/types.js';

export interface AssetDef {
  id: string;
  n: string;
  /** Dollar cost (archive `cost`). */
  cost: number;
  /** Volunteer cost (archive `vcost`) — paid as vp. */
  vcost?: number;
  d: string;
  req?: (s: GameState) => boolean;
}

/**
 * Archive ASSETS (prototype-single-file.html:820–827).
 * Order matches archive Object.entries iteration for harness stability.
 */
export const ASSETS: Record<string, AssetDef> = {
  // archive line 820
  A01: {
    id: 'A01',
    n: 'The Walk List',
    cost: 400,
    req: s => s.assets.includes('A02'),
    d:
      'A cut list of the doors that actually open, in the order that saves the daylight. ' +
      'Every Block Walk yields 50% more contacts for the rest of the run and its odds widen too. ' +
      'The single best purchase for a field campaign, and it pays back over every walk you have left — ' +
      'so buy it EARLY or not at all.'
  },
  // archive line 821
  A02: {
    id: 'A02',
    n: 'Voter File Access',
    cost: 400,
    d:
      'The county sells it to anyone who asks; almost nobody asks. ' +
      'A prerequisite rather than a payoff — it unlocks the Walk List and absentee targeting and ' +
      'does nothing on its own. Cheap, and the door to the field upgrades behind it.'
  },
  // archive line 822
  A03: {
    id: 'A03',
    n: 'Mail Program',
    cost: 1500,
    d:
      'A vendor, a permit, and a bulk rate. Expensive, and it buys reach rather than a number: ' +
      'it doubles conversion in the subdivisions and stands behind Contrast Mail, ' +
      'which also needs the Oppo File before it will fire. ' +
      'A late-campaign purchase for a money campaign going negative.'
  },
  // archive line 823
  A04: {
    id: 'A04',
    n: 'Website That Works',
    cost: 300,
    d:
      'Not a brochure — a donate button that works on a phone. Cheapest thing in the shop. ' +
      'Your small-dollar list compounds from here, so it earns most when bought before the ' +
      'fundraising you have not done yet.'
  },
  // archive line 824
  A06: {
    id: 'A06',
    n: 'The Flatbed Truck',
    cost: 800,
    d:
      'Somebody\'s cousin has one and will lend it for gas money. ' +
      'REQUIRED for Rides to the Polls — the steepest turnout card in the game on neglected ground — ' +
      'and it doubles what the FM Roads throw at you. ' +
      'Useless until the turnout stage, decisive once you are there.'
  },
  // archive line 825 — money 0, volunteer cost 2
  A09: {
    id: 'A09',
    n: 'Phone Tree',
    cost: 0,
    vcost: 2,
    d:
      'A tree, a script, and somebody who actually calls the callers. ' +
      'Costs no money at all — two volunteers — and it DOUBLES every Phone Bank for the rest of the ' +
      'run while widening its odds. ' +
      'The best value in the shop for a campaign with bodies and no bank balance.'
  },
  // archive line 826
  A11: {
    id: 'A11',
    n: 'Push Cards',
    cost: 250,
    d:
      'Glossy, cheap, and left in a screen door whether anyone was home or not. ' +
      'Every Block Walk from here adds an extra point of name ID on top of whatever else it does. ' +
      'Small per walk, large across a campaign built on walking.'
  },
  // archive line 827
  A12: {
    id: 'A12',
    n: 'Billboard on the Highway',
    cost: 2000,
    d:
      'Forty feet of your own face over the highway. The most expensive thing on the board. ' +
      'It works while you sleep — passive name ID every week through the general and the session — ' +
      'which means its whole value is how many weeks are LEFT when you buy it. ' +
      'Late, it is a very costly billboard.'
  }
};

/** Asset ids that the shop can sell (excludes BIO_/ISSUE_/REGION_ tags). */
export const SHOP_ASSET_IDS = Object.keys(ASSETS);

/**
 * Build BUY* plays for assets the player does not yet own and whose req
 * (if any) is met. Port of archive assetPlays() (line ~829–831).
 */
export function buildShopPlays(state: GameState): PlayCard[] {
  const out: PlayCard[] = [];
  for (const [id, a] of Object.entries(ASSETS)) {
    if (state.assets.includes(id)) continue;
    if (a.req && !a.req(state)) continue;
    out.push({
      id: 'BUY' + id,
      n: 'Acquire: ' + a.n,
      cost: { a: 0, $: a.cost || undefined, vp: a.vcost || undefined },
      risk: 'SAFE',
      ph: [1, 2, 3],
      tag: 'asset',
      kind: 'item',
      residency: 'main',
      control: 'player',
      d: a.d,
      odds: () => 1,
      run: s => {
        if (!s.assets.includes(id)) s.assets.push(id);
        return a.n + ' acquired. ' + a.d;
      }
    });
  }
  return out;
}

/** Static catalog of all BUY* cards (for dead-refs / harness; show gates live state). */
export function allShopPlayTemplates(): PlayCard[] {
  return Object.entries(ASSETS).map(([id, a]) => ({
    id: 'BUY' + id,
    n: 'Acquire: ' + a.n,
    cost: { a: 0, $: a.cost || undefined, vp: a.vcost || undefined },
    risk: 'SAFE' as const,
    ph: [1, 2, 3],
    tag: 'asset',
    kind: 'item' as const,
    /** Main unlocks — persistent assets the campaign carries. */
    residency: 'main' as const,
    control: 'player' as const,
    d: a.d,
    show: (s: GameState) => !s.assets.includes(id) && (!a.req || a.req(s)),
    odds: () => 1,
    run: (s: GameState) => {
      if (!s.assets.includes(id)) s.assets.push(id);
      return a.n + ' acquired. ' + a.d;
    }
  }));
}
