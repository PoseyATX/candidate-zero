/**
 * Off-season work — themed by locked identity (persona / issue / district / region).
 * These are not primary campaign cards; they mint residue for the next cycle.
 */

import type { GameState, CycleResidue } from '../engine/types.js';
import { random } from '../engine/rng.js';

export interface InterimPlay {
  id: string;
  n: string;
  tag: string;
  d: string;
  costAp: number;
  /** Soft weight when building the week's menu. */
  weight: (s: GameState) => number;
  run: (s: GameState) => { text: string; residue?: CycleResidue };
}

function residue(
  id: string,
  name: string,
  text: string,
  kind: 'boon' | 'hindrance',
  source: CycleResidue['source']
): CycleResidue {
  return { id, name, text, kind, source };
}

function pushRes(s: GameState, r: CycleResidue): void {
  if (!s.pendingResidue) s.pendingResidue = [];
  // one of each id
  if (!s.pendingResidue.some(x => x.id === r.id)) s.pendingResidue.push(r);
}

export const INTERIM_PLAYS: InterimPlay[] = [
  // ——— Universal district work ———
  {
    id: 'INT_CASEWORK',
    n: 'Casework hours',
    tag: 'district memory',
    d: 'The office never closes for people who still have your number.',
    costAp: 1,
    weight: s => (s.inOffice ? 3 : 1.2),
    run: s => {
      s.contacts += 18;
      s.districtStanding = Math.min(100, (s.districtStanding ?? 60) + 4);
      const r = residue(
        'RES_CASEWORK',
        'They remember you answered',
        '+contacts and a soft name-ID cushion next cycle.',
        'boon',
        'district'
      );
      pushRes(s, r);
      return { text: 'Casework stacks. Faces in the district file you under "shows up."', residue: r };
    }
  },
  {
    id: 'INT_TOWNHALL',
    n: 'Town hall in the heat',
    tag: 'issue gravity',
    d: 'Folding chairs. Your issue, or theirs.',
    costAp: 1,
    weight: s => (s.issueId ? 2 : 1),
    run: s => {
      s.nameID += 2;
      s.endorsePts += 1;
      const r = residue(
        'RES_ISSUE_TOUR',
        'Issue tour residue',
        'Your issue still has air — slight message edge next primary.',
        'boon',
        'issue'
      );
      pushRes(s, r);
      return { text: `Town hall on ${s.issue ?? 'the issue'}. The room is half friend, half jury.`, residue: r };
    }
  },
  {
    id: 'INT_FISHFRY',
    n: 'Fish fry float',
    tag: 'region ritual',
    d: 'Whatever the region calls a gathering, you bring a checkbook or a casserole.',
    costAp: 1,
    weight: s => (s.regionId ? 2 : 1),
    run: s => {
      s.money += 120;
      s.volPool += 1;
      const r = residue(
        'RES_REGION_RITUAL',
        'Regional calendar ink',
        'You are still on the church/union/HOA circuit next cycle.',
        'boon',
        'region'
      );
      pushRes(s, r);
      return { text: `Regional ritual in ${s.regionName ?? 'the district'}. Small dollars, real names.`, residue: r };
    }
  },
  {
    id: 'INT_PERSONA_WORK',
    n: 'Do the work your bio promised',
    tag: 'persona covenant',
    d: 'Veteran visits. Teacher rooms. Pulpit. Counter. Whatever you claimed.',
    costAp: 1,
    weight: () => 2.5,
    run: s => {
      const pid = s.personaId ?? '';
      if (pid === 'veteran') {
        s.faces.T += 4;
        s.nameID += 1;
      } else if (pid === 'teacher') {
        s.contacts += 30;
        s.faces.G += 3;
      } else if (pid === 'preacher') {
        s.volPool += 2;
        s.faces.F += 4;
      } else if (pid === 'smallbiz') {
        s.money += 400;
        s.faces.O += 3;
      } else {
        s.contacts += 15;
        s.nameID += 1;
      }
      const r = residue(
        'RES_PERSONA_' + (pid || 'X').toUpperCase(),
        'Bio kept warm',
        'Your origin story still pays rent next filing.',
        'boon',
        'persona'
      );
      pushRes(s, r);
      return { text: `${s.persona ?? 'You'} did the off-season work the bio requires.`, residue: r };
    }
  },
  {
    id: 'INT_REST',
    n: 'Strategic quiet',
    tag: 'recovery',
    d: 'Not every month is a war. Debt and hit pieces still breathe.',
    costAp: 1,
    weight: s => (s.hitPieces > 0 || s.debt > 0 || s.exposure > 0 ? 2.2 : 0.8),
    run: s => {
      s.hitPieces = Math.max(0, s.hitPieces - 1);
      s.exposure = Math.max(0, (s.exposure || 0) - 1);
      s.debt = Math.max(0, s.debt - 80);
      s.momentum = Math.max(0, s.momentum - 1);
      return { text: 'Quiet months. Heat cools a degree. The note is smaller.' };
    }
  },
  {
    id: 'INT_FUND',
    n: 'Quiet money',
    tag: 'war chest',
    d: 'Interim PAC dinners smell the same in every region.',
    costAp: 1,
    weight: s => (s.money < 400 ? 2 : 1),
    run: s => {
      s.money += 350;
      s.shadowPlays += 1;
      if (random() < 0.35) {
        const r = residue(
          'RES_STRINGS',
          'A string attached',
          'War chest helps — and someone will call the note next cycle.',
          'hindrance',
          'cycle'
        );
        pushRes(s, r);
        if (!s.obls.includes('OB_INTERIM_DONOR')) s.obls.push('OB_INTERIM_DONOR');
        return { text: 'Money lands. So does a quiet obligation (OB_INTERIM_DONOR).', residue: r };
      }
      return { text: 'Quiet money. No headline. The account looks less like a prayer.' };
    }
  },
  {
    id: 'INT_OPPO_CLEAN',
    n: 'Sweep your own porch',
    tag: 'oppo hygiene',
    d: 'Know what they have. Burn what you can.',
    costAp: 1,
    weight: s => (s.hitPieces + (s.exposure || 0) > 1 ? 2.5 : 0.5),
    run: s => {
      s.hitPieces = Math.max(0, s.hitPieces - 1);
      s.oppoFile = true;
      const r = residue(
        'RES_OPPO_FILE',
        'Your own folder',
        'Slight disaster-band cushion when heat rises next cycle.',
        'boon',
        'cycle'
      );
      pushRes(s, r);
      return { text: 'You read the file they will use. Preparation is not purity.', residue: r };
    }
  },
  // ——— Hindrance risk / thematic trouble ———
  {
    id: 'INT_NEGLECT',
    n: 'Let the district cool',
    tag: 'absence',
    d: 'Austin, work, exhaustion — the district notices silence.',
    costAp: 0,
    weight: s => (s.inOffice ? 1.5 : 0.6),
    run: s => {
      s.districtStanding = Math.max(0, (s.districtStanding ?? 60) - 8);
      s.contacts = Math.max(0, s.contacts - 12);
      const r = residue(
        'RES_NEGLECT',
        'Empty chair memory',
        'Primary threat starts higher next cycle.',
        'hindrance',
        'district'
      );
      pushRes(s, r);
      return { text: 'You were elsewhere. The district kept a ledger of absences.', residue: r };
    }
  },
  {
    id: 'INT_ISSUE_DRIFT',
    n: 'The issue moved without you',
    tag: 'issue weather',
    d: 'National air ate the local frame. Your knife is duller.',
    costAp: 1,
    weight: () => 1.1,
    run: s => {
      if (random() < 0.4) {
        const r = residue(
          'RES_ISSUE_STALE',
          'Stale issue frame',
          'Message sharpness starts lower next primary.',
          'hindrance',
          'issue'
        );
        pushRes(s, r);
        s.messageSharp = false;
        return { text: `The fight over ${s.issue ?? 'your issue'} left town. You were late.`, residue: r };
      }
      s.messageSharp = true;
      return { text: 'You re-sharpened the frame before it rusted.' };
    }
  },
  {
    id: 'INT_REGION_CRISIS',
    n: 'Show up for the regional crisis',
    tag: 'region weather',
    d: 'Flood, freeze, plant layoff, border bus — geography writes the script.',
    costAp: 1,
    weight: () => 1.4,
    run: s => {
      s.nameID += 3;
      s.faces.G += 3;
      const r = residue(
        'RES_CRISIS_FACE',
        'You brought the flatbed',
        'Name ID and Good Ol\' Boy lean next cycle.',
        'boon',
        'region'
      );
      pushRes(s, r);
      return {
        text: `Crisis in ${s.regionName ?? 'the region'}. You arrived before the cameras.`,
        residue: r
      };
    }
  },
  // ——— Thematic identity shifts (not free re-picks) ———
  {
    id: 'INT_REDISTRICT_RUMOR',
    n: 'Redistricting rumor',
    tag: 'maps move',
    d: 'The lines may move. Rare. Expensive. Not a menu preference.',
    costAp: 1,
    weight: s => ((s.cycleIndex ?? 0) >= 1 ? 1.2 : 0.15),
    run: s => {
      s.eventsFired['redistrict_rumor'] = true;
      const r = residue(
        'RES_MAP_ANXIETY',
        'Map anxiety',
        'Field feels one rival hotter until the maps settle.',
        'hindrance',
        'district'
      );
      pushRes(s, r);
      // Force a real fork next month (or immediately if none pending)
      if (!s.pendingThematic) {
        // Deferred: calendar/maybeQueueThematicEvent will prefer district forks
        s.eventsFired['force_district_fork'] = true;
      }
      return {
        text: 'Redistricting rumor. Anxiety is free; a new map will demand a choice.',
        residue: r
      };
    }
  },
  {
    id: 'INT_ISSUE_CRISIS',
    n: 'Your issue detonates nationally',
    tag: 'issue weather',
    d: 'Cable news eats the frame. Hold the knife or pick another.',
    costAp: 1,
    weight: s => (s.issueId ? 1.1 : 0.3),
    run: s => {
      s.eventsFired['issue_crisis'] = true;
      s.hitPieces += 1;
      return {
        text: `${s.issue} is on every channel. The fork is coming — hold or pivot.`
      };
    }
  }
];

/** Pick up to `n` interim actions weighted for this identity. */
export function pickInterimMenu(state: GameState, n = 4): InterimPlay[] {
  const bag: InterimPlay[] = [];
  for (const p of INTERIM_PLAYS) {
    const w = Math.max(0, p.weight(state));
    const copies = Math.max(1, Math.round(w * 2));
    for (let i = 0; i < copies; i++) bag.push(p);
  }
  // unique sample
  const picked: InterimPlay[] = [];
  const seen = new Set<string>();
  const shuffled = [...bag].sort(() => random() - 0.5);
  for (const p of shuffled) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    picked.push(p);
    if (picked.length >= n) break;
  }
  // Always offer at least rest + persona work if short
  if (!picked.find(p => p.id === 'INT_PERSONA_WORK')) {
    const pw = INTERIM_PLAYS.find(p => p.id === 'INT_PERSONA_WORK');
    if (pw) picked.unshift(pw);
  }
  return picked.slice(0, n);
}

export function runInterimPlay(state: GameState, playId: string): { ok: boolean; text: string } {
  const play = INTERIM_PLAYS.find(p => p.id === playId);
  if (!play) return { ok: false, text: 'Unknown off-season work.' };
  if (state.stage !== 'interim') return { ok: false, text: 'Not in off-season.' };
  if (state.ap < play.costAp) return { ok: false, text: 'No AP left this month.' };
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
