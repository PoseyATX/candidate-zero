/**
 * Thin regular session — only while inOffice.
 * Capitol verbs: casework from Austin, file, whip lite, gallery risk, dream.
 */

import type { GameState, CycleResidue } from '../engine/types.js';
import { random } from '../engine/rng.js';

export interface SessionPlay {
  id: string;
  n: string;
  tag: string;
  d: string;
  costAp: number;
  weight: (s: GameState) => number;
  run: (s: GameState) => { text: string; residue?: CycleResidue };
}

function pushRes(s: GameState, r: CycleResidue): void {
  if (!s.pendingResidue) s.pendingResidue = [];
  if (!s.pendingResidue.some(x => x.id === r.id)) s.pendingResidue.push(r);
}

export const SESSION_PLAYS: SessionPlay[] = [
  {
    id: 'SES_FILE',
    n: 'File a bill',
    tag: 'procedure',
    d: 'A number on a jacket. Most die. Filing is still a signal home.',
    costAp: 1,
    weight: () => 2,
    run: s => {
      s.capital = (s.capital || 0) + 1;
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.filed = true;
      s.billsFiledSession = (s.billsFiledSession ?? 0) + 1;
      if (random() < 0.25) {
        s.speakerFavor = (s.speakerFavor ?? 0) + 1;
        return { text: 'Filed. The clerk stamps. A staffer from leadership nods once.' };
      }
      return { text: 'Filed. The hopper swallows paper. Home will see the press release.' };
    }
  },
  {
    id: 'SES_CASEWORK',
    n: 'District call from Austin',
    tag: 'homestead',
    d: 'The phone does not know you are under the dome.',
    costAp: 1,
    weight: s => (s.districtStanding < 50 ? 2.5 : 1.5),
    run: s => {
      s.contacts += 15;
      s.districtStanding = Math.min(100, (s.districtStanding ?? 60) + 3);
      return { text: 'Casework from a bad hotel. Someone at home still has your direct line.' };
    }
  },
  {
    id: 'SES_WHIP',
    n: 'Count votes',
    tag: 'whip',
    d: 'A spreadsheet of maybes. Never leave it on the printer.',
    costAp: 1,
    weight: s => ((s.speakerFavor ?? 0) >= 1 ? 2 : 1),
    run: s => {
      if (random() < 0.4) {
        s.speakerFavor = (s.speakerFavor ?? 0) + 1;
        s.favors += 1;
        return { text: 'Your count was right. Leadership files the favor under your name.' };
      }
      s.faces.O += 2;
      return { text: 'The count slips. You learn who lies in the hallway.' };
    }
  },
  {
    id: 'SES_GALLERY',
    n: 'Third House dinner',
    tag: 'risk-adjacent',
    d: 'Thick stock. No agenda printed. The agenda is the point.',
    costAp: 1,
    weight: () => 1.2,
    run: s => {
      s.money += 500;
      s.shadowPlays += 1;
      if (random() < 0.45) {
        s.hitPieces += 1;
        s.exposure = (s.exposure || 0) + 1;
        const r: CycleResidue = {
          id: 'RES_GALLERY',
          name: 'Photographed at dinner',
          text: 'Gallery heat follows you home next cycle.',
          kind: 'hindrance',
          source: 'session'
        };
        pushRes(s, r);
        return { text: 'The dinner is photographed. WHO DINED WITH WHOM. Heat +1.', residue: r };
      }
      s.speakerFavor = Math.max(0, (s.speakerFavor ?? 0) - 0); // noop clarity
      s.faces.L += 3;
      return { text: 'You leave early. The Third House still has your card.' };
    }
  },
  {
    id: 'SES_TESTIFY',
    n: 'Committee testimony',
    tag: 'issue',
    d: 'Three points. One story. Leave the rage for the garage.',
    costAp: 1,
    weight: s => (s.issueId ? 2 : 1),
    run: s => {
      s.nameID += 2;
      s.messageSharp = true;
      if (random() < 0.3) {
        s.endorsePts += 1;
        return { text: `Testimony on ${s.issue}. A chair leans in. Endorsement path opens a crack.` };
      }
      return { text: `Testimony on ${s.issue}. The record keeps what the cameras miss.` };
    }
  },
  {
    id: 'SES_REST',
    n: 'Bad hotel sleep',
    tag: 'exhaustion',
    d: 'Session eats homestead. Dream is a truce, not a strategy.',
    costAp: 1,
    weight: s => ((s.sessionWeek ?? 1) >= 3 ? 2 : 0.8),
    run: s => {
      s.districtStanding = Math.max(0, (s.districtStanding ?? 60) - 2);
      s.hitPieces = Math.max(0, s.hitPieces - (random() < 0.3 ? 1 : 0));
      return { text: 'Sleep. The district thins a degree. Austin does not notice.' };
    }
  }
];

export function pickSessionMenu(state: GameState, n = 4): SessionPlay[] {
  const bag: SessionPlay[] = [];
  for (const p of SESSION_PLAYS) {
    const w = Math.max(0.2, p.weight(state));
    const copies = Math.max(1, Math.round(w * 2));
    for (let i = 0; i < copies; i++) bag.push(p);
  }
  const picked: SessionPlay[] = [];
  const seen = new Set<string>();
  for (const p of [...bag].sort(() => random() - 0.5)) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    picked.push(p);
    if (picked.length >= n) break;
  }
  return picked;
}

export function runSessionPlay(state: GameState, playId: string): { ok: boolean; text: string } {
  const play = SESSION_PLAYS.find(p => p.id === playId);
  if (!play) return { ok: false, text: 'Unknown session work.' };
  if (state.stage !== 'session') return { ok: false, text: 'Chamber is not in session.' };
  if (!state.inOffice) return { ok: false, text: 'You do not hold the seat.' };
  if (state.ap < play.costAp) return { ok: false, text: 'No AP left this week.' };
  state.ap -= play.costAp;
  const result = play.run(state);
  state.log.push({
    week: state.week,
    kind: 'play',
    text: `${play.n}: ${result.text}`,
    cardId: play.id
  });
  return { ok: true, text: result.text };
}
