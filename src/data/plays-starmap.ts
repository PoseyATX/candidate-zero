/**
 * Starmap pilot movement verbs — overlay on campaign (issue #18 pilot).
 */

import type { PlayCard } from '../engine/types.js';
import { isPilotMovementAvailable, PILOT_ENTITY_ID } from '../engine/entities.js';
import { PILOT_VERB_PLAY_ID } from './starmap/pilot-precinct.js';

/**
 * MV01 — Call in the Precinct Chair network.
 * Unlocks when starmap advancement conditions fire (2× warm AL01 or endorse+AL01).
 */
export const MV01_PrecinctNetwork: PlayCard = {
  id: PILOT_VERB_PLAY_ID,
  n: 'Call in the Precinct Chair network',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2],
  tag: 'orbit movement',
  kind: 'ally',
  attrs: ['DIP'],
  d: 'The chairs you banked open a door: lists, volunteers, a quiet county nod. Starmap pilot — Precinct Chair orbit.',
  show: s => isPilotMovementAvailable(s),
  odds: () => 0.95,
  run: s => {
    s.endorsePts += 2;
    s.contacts += 40;
    s.volPool += 1;
    s.entityHistory = s.entityHistory ?? [];
    if (!s.entityHistory.includes(PILOT_ENTITY_ID)) {
      s.entityHistory.push(PILOT_ENTITY_ID);
    }
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.mv01Consumed = true;
    s.sessionFlags.orbit_precinct_power = true;
    s.pendingMovement = undefined;
    return (
      'The precinct network answers. +2 endorsement weight, +40 contacts, +1 volunteer. ' +
      '(Starmap: ENT_PRECINCT_CHAIR orbit exercised. Residue: orbit_precinct_power.)'
    );
  }
};

export const STARMAP_PLAYS: PlayCard[] = [MV01_PrecinctNetwork];
