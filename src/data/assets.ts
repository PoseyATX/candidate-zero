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
    d: 'Walks +50%, targeted doors.'
  },
  // archive line 821
  A02: {
    id: 'A02',
    n: 'Voter File Access',
    cost: 400,
    d: 'Enables the Walk List and absentee targeting.'
  },
  // archive line 822
  A03: {
    id: 'A03',
    n: 'Mail Program',
    cost: 1500,
    d: 'Unlocks Contrast Mail (with Oppo File); Subdivisions convert ×2.'
  },
  // archive line 823
  A04: {
    id: 'A04',
    n: 'Website That Works',
    cost: 300,
    d: 'Small-dollar list compounds.'
  },
  // archive line 824
  A06: {
    id: 'A06',
    n: 'The Flatbed Truck',
    cost: 800,
    d: 'Rides to the Polls; FM Roads events double.'
  },
  // archive line 825 — money 0, volunteer cost 2
  A09: {
    id: 'A09',
    n: 'Phone Tree',
    cost: 0,
    vcost: 2,
    d: 'Phone Bank doubles; college kids flake-proofed.'
  },
  // archive line 826
  A11: {
    id: 'A11',
    n: 'Push Cards',
    cost: 250,
    d: 'Every walk adds +1 name ID.'
  },
  // archive line 827
  A12: {
    id: 'A12',
    n: 'Billboard on the Highway',
    cost: 2000,
    d: 'Passive name ID, Phase II–III.'
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
    d: a.d,
    show: (s: GameState) => !s.assets.includes(id) && (!a.req || a.req(s)),
    odds: () => 1,
    run: (s: GameState) => {
      if (!s.assets.includes(id)) s.assets.push(id);
      return a.n + ' acquired. ' + a.d;
    }
  }));
}
