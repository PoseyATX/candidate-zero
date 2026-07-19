/**
 * Named allies registry — display names from archive/prototype-single-file.html
 * ALLIES (lines ~381–384). Grant paths live on plays / setup / events; this
 * file is the single list of who exists so dead-refs and UI can name them.
 *
 * Grant matrix (Phase 2 port — each cites archive):
 *   AL01 Precinct Chair     — PL08 kitchen-table t0/t1; PL14 court chairs t0;
 *                             personas PA_DIP, PA_INK_DIP (setup.ts)
 *   AL02 County Chairwoman  — PL08 when chairs(s) >= 3 (archive:581–582)
 *   AL03 Club President     — PL11 straw win (archive:599)
 *   AL04 Beat Reporter      — PL10 prCount===2; PL32 coffee editor t0 (595, 723)
 *   AL05 Drive-Time Host    — INTENTIONAL STUB: archive refs warm() but never
 *                             addAlly — see harness:dead-refs INTENTIONAL_STUBS
 *   AL06 Retired Judge      — funeral respect choice (archive:1547)
 *   AL07 Feed-Store Regulars— INTENTIONAL STUB (archive never addAlly)
 *   AL08 Pastor             — PL30 pbCount>=2 && GR04.rapport>=30 (715)
 *   AL09 Canvass Captain    — PL21B / PL39 (670, 747)
 *   AL10 Finance Chair      — INTENTIONAL STUB (weekly $ effect only, 1594)
 *   AL11 Kitchen Cabinet    — persona PA_CRA (setup)
 *   AL12 The Old Bull       — week events (893, 901)
 *   AL13 Lobbyist w/ Cons.  — INTENTIONAL STUB (archive never addAlly)
 *   AL14 Rival's Staffer    — week event plant/meeting (885)
 *   AL15 County Judge       — PL48 tier 0 (779)
 *   AL16 The Slate-Maker    — PL22B tier <=1 (673)
 */

export interface AllyDef {
  id: string;
  n: string;
}

export const ALLIES: Record<string, AllyDef> = {
  AL01: { id: 'AL01', n: 'Precinct Chair' },
  AL02: { id: 'AL02', n: 'County Chairwoman' },
  AL03: { id: 'AL03', n: 'Club President' },
  AL04: { id: 'AL04', n: 'Beat Reporter' },
  AL05: { id: 'AL05', n: 'Drive-Time Host' },
  AL06: { id: 'AL06', n: 'Retired Judge' },
  AL07: { id: 'AL07', n: 'Feed-Store Regulars' },
  AL08: { id: 'AL08', n: 'Pastor of the First Church' },
  AL09: { id: 'AL09', n: 'Canvass Captain' },
  AL10: { id: 'AL10', n: 'Finance Chair' },
  AL11: { id: 'AL11', n: 'Kitchen Cabinet' },
  AL12: { id: 'AL12', n: 'The Old Bull' },
  AL13: { id: 'AL13', n: 'Lobbyist w/ a Conscience' },
  AL14: { id: 'AL14', n: "Rival's Disgruntled Staffer" },
  AL15: { id: 'AL15', n: 'County Judge' },
  AL16: { id: 'AL16', n: 'The Slate-Maker' }
};

export const ALL_ALLY_IDS = Object.keys(ALLIES);

export function allyName(id: string): string {
  return ALLIES[id]?.n ?? id;
}

/**
 * Allies the archive references via warm()/ally() but never grants via
 * addAlly(). Modular Phase 2 keeps the warm() checks (parity) and documents
 * them so harness:dead-refs stays green without inventing grant fiction.
 */
export const INTENTIONAL_STUB_ALLIES: ReadonlyArray<{
  id: string;
  reason: string;
}> = [
  {
    id: 'AL05',
    reason:
      'Drive-Time Host: archive PL09/PL23 warm() bonuses only; no addAlly site (prototype lines 587, 677).'
  },
  {
    id: 'AL07',
    reason:
      'Feed-Store Regulars: named in ALLIES registry only; no addAlly in archive.'
  },
  {
    id: 'AL10',
    reason:
      'Finance Chair: archive weekly +$300 if warm (line 1594) but never granted via addAlly.'
  },
  {
    id: 'AL13',
    reason:
      "Lobbyist w/ a Conscience: named in ALLIES only; no addAlly in archive."
  }
];
