/**
 * Thematic identity shifts — issue / district / region only, never persona.
 * Offered as rare forks with cost, not setup-screen re-picks.
 */

import {
  DISTRICTS,
  ISSUES,
  REGIONS,
  getDistrict,
  getIssue,
  getRegion
} from '../data/setup.js';
import { random } from './rng.js';
import type { CycleResidue, GameState, ThematicChoice, ThematicOption } from './types.js';

function pushRes(s: GameState, r: CycleResidue): void {
  if (!s.pendingResidue) s.pendingResidue = [];
  if (!s.pendingResidue.some(x => x.id === r.id)) s.pendingResidue.push(r);
}

/** Chance to surface a thematic fork at interim month start. */
export function maybeQueueThematicEvent(state: GameState): ThematicChoice | null {
  if (state.stage !== 'interim') return null;
  if (state.pendingThematic) return state.pendingThematic;

  const cycle = state.cycleIndex ?? 0;
  if (state.pendingThematic) return state.pendingThematic;

  // Forced forks from interim work
  if (state.eventsFired['force_district_fork']) {
    delete state.eventsFired['force_district_fork'];
    const choice = buildDistrictFork(state);
    if (choice) {
      state.pendingThematic = choice;
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `THEMATIC FORK: ${choice.title} — choose carefully. Persona does not move.`
      });
      return choice;
    }
  }
  if (state.eventsFired['issue_crisis'] && !state.eventsFired['issue_fork_done']) {
    const choice = buildIssueFork(state);
    if (choice) {
      state.eventsFired['issue_fork_done'] = true;
      state.pendingThematic = choice;
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `THEMATIC FORK: ${choice.title} — choose carefully. Persona does not move.`
      });
      return choice;
    }
  }

  // Base low rate; rises after first cycle
  let p = 0.12 + cycle * 0.04;
  if (state.eventsFired['redistrict_rumor']) p += 0.2;
  if (state.eventsFired['issue_crisis']) p += 0.15;
  if (state.hitPieces >= 3) p += 0.08;
  if (random() > Math.min(0.55, p)) return null;

  const bag: Array<() => ThematicChoice | null> = [];
  if (state.eventsFired['redistrict_rumor'] || cycle >= 1) bag.push(() => buildDistrictFork(state));
  bag.push(() => buildIssueFork(state));
  if (cycle >= 1) bag.push(() => buildRegionFork(state));

  if (!bag.length) return null;
  const pick = bag[Math.floor(random() * bag.length)]!;
  const choice = pick();
  if (!choice) return null;
  state.pendingThematic = choice;
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `THEMATIC FORK: ${choice.title} — choose carefully. Persona does not move.`
  });
  return choice;
}

function buildIssueFork(state: GameState): ThematicChoice | null {
  const cur = state.issueId;
  if (!cur) return null;
  // Related issues by loose regional/tag affinity
  const alternatives = ISSUES.filter(i => i.id !== cur);
  if (alternatives.length < 2) return null;
  // Prefer 2 options + keep
  const shuffled = [...alternatives].sort(() => random() - 0.5).slice(0, 2);
  const options: ThematicOption[] = [
    {
      id: 'keep_issue',
      label: `Hold the line on ${state.issue}`,
      costNote: 'Stability. The frame stays yours.',
      effect: { type: 'keep' }
    },
    ...shuffled.map(i => ({
      id: 'issue_' + i.id,
      label: `Pivot to ${i.n}`,
      costNote: 'You look opportunistic. Hit pieces notice.',
      effect: { type: 'set_issue' as const, issueId: i.id }
    }))
  ];
  return {
    id: 'fork_issue_' + (state.week ?? 0),
    kind: 'issue',
    title: 'The issue moved',
    body:
      `National weather and local blood are rewriting the room. ` +
      `You ran on ${state.issue}. You can still hold that knife — or pick up another. ` +
      `This is not a menu preference. It costs reputation either way.`,
    options
  };
}

function buildDistrictFork(state: GameState): ThematicChoice | null {
  const cur = state.districtId;
  const alts = DISTRICTS.filter(d => d.id !== cur);
  if (!alts.length) return null;
  const target = alts[Math.floor(random() * alts.length)]!;
  state.eventsFired['redistrict_rumor'] = true;
  return {
    id: 'fork_district_' + (state.week ?? 0),
    kind: 'district',
    title: 'The maps moved',
    body:
      `Redistricting (or a court order, or a retirement cascade) is reshaping the fight. ` +
      `Your current ground: ${state.district?.name ?? 'unknown'}. ` +
      `A new map is available — ${target.n}. Not free. Not fair.`,
    options: [
      {
        id: 'keep_map',
        label: 'Fight the old lines',
        costNote: 'Loyalty to the precincts that already know you.',
        effect: { type: 'keep' }
      },
      {
        id: 'take_map',
        label: `Accept the new map (${target.n})`,
        costNote: 'Name ID resets partially. Field reshuffles.',
        effect: { type: 'set_district', districtId: target.id }
      },
      {
        id: 'scar_map',
        label: 'Sue, stall, bleed',
        costNote: 'Money and heat. Map stays; scars accumulate.',
        effect: {
          type: 'scar',
          residueId: 'RES_MAP_FIGHT',
          name: 'Map fight hangover',
          text: 'Debt and exposure go into the next primary with you.'
        }
      }
    ]
  };
}

function buildRegionFork(state: GameState): ThematicChoice | null {
  const cur = state.regionId;
  const alts = REGIONS.filter(r => r.id !== cur);
  if (!alts.length) return null;
  // Only adjacent-feeling moves — pick one random other region as "job / family pull"
  const target = alts[Math.floor(random() * alts.length)]!;
  return {
    id: 'fork_region_' + (state.week ?? 0),
    kind: 'region',
    title: 'Geography pulls',
    body:
      `Work, family, or a plant closing is dragging your center of gravity toward ${target.n}. ` +
      `You are still ${state.persona}. The dirt under your shoes might change.`,
    options: [
      {
        id: 'stay_region',
        label: `Stay rooted in ${state.regionName ?? 'home'}`,
        costNote: 'Homestead holds. Ambition waits.',
        effect: { type: 'keep' }
      },
      {
        id: 'move_region',
        label: `Relocate gravity to ${target.n}`,
        costNote: 'Contacts thin. New petition arithmetic.',
        effect: { type: 'set_region', regionId: target.id }
      }
    ]
  };
}

/** Apply a thematic option. Clears pendingThematic. */
export function resolveThematicChoice(state: GameState, optionId: string): { ok: boolean; text: string } {
  const choice = state.pendingThematic;
  if (!choice) return { ok: false, text: 'No thematic fork pending.' };
  const opt = choice.options.find(o => o.id === optionId);
  if (!opt) return { ok: false, text: 'Unknown option.' };

  const effect = opt.effect;
  let text = opt.label;

  if (effect.type === 'keep') {
    text = `You hold. ${choice.kind} unchanged.`;
    if (choice.kind === 'issue') {
      pushRes(state, {
        id: 'RES_ISSUE_HOLD',
        name: 'Held the frame',
        text: 'Message sharpness holds into the next filing.',
        kind: 'boon',
        source: 'issue'
      });
      state.messageSharp = true;
    }
  } else if (effect.type === 'set_issue') {
    const issue = getIssue(effect.issueId);
    if (!issue) return { ok: false, text: 'Invalid issue.' };
    const old = state.issue;
    state.issueId = issue.id;
    state.issue = issue.n;
    state.assets = state.assets.filter(a => !a.startsWith('ISSUE_'));
    state.assets.push('ISSUE_' + issue.tag);
    state.hitPieces = Math.min(8, state.hitPieces + 1);
    state.momentum = Math.max(0, state.momentum - 1);
    pushRes(state, {
      id: 'RES_ISSUE_PIVOT',
      name: 'Issue pivot scar',
      text: 'Opportunism tax — slight chairs penalty next cycle.',
      kind: 'hindrance',
      source: 'issue'
    });
    text = `Issue shift: ${old} → ${issue.n}. The knives come out for turncoats and converts alike.`;
  } else if (effect.type === 'set_district') {
    const d = getDistrict(effect.districtId);
    if (!d) return { ok: false, text: 'Invalid district.' };
    const field = d.field(random);
    state.districtId = d.id;
    state.district = {
      id: d.id,
      name: d.n,
      align: d.align,
      incumbent: d.incumbent,
      field,
      trap: d.trap
    };
    state.rivals = Array.from({ length: field }, (_, i) => ({
      id: 'RIV' + (i + 1),
      n: 'Rival ' + (i + 1)
    }));
    state.nameID = Math.max(1, Math.floor(state.nameID * 0.65));
    state.contacts = Math.max(0, Math.floor(state.contacts * 0.7));
    pushRes(state, {
      id: 'RES_NEW_MAP',
      name: 'New map, thin roots',
      text: 'Name ID and contacts thinned — but the lines are winnable on paper.',
      kind: 'hindrance',
      source: 'district'
    });
    text = `District is now ${d.n}. Half the porches do not know your name yet.`;
  } else if (effect.type === 'set_region') {
    const r = getRegion(effect.regionId);
    if (!r) return { ok: false, text: 'Invalid region.' };
    state.regionId = r.id;
    state.regionName = r.n;
    state.regionHook = r.hook;
    state.sigNeed = Math.max(200, 450 + r.petitionMod);
    state.contacts = Math.max(0, Math.floor(state.contacts * 0.75));
    state.assets = state.assets.filter(a => !a.startsWith('REGION_'));
    state.assets.push('REGION_' + r.id.toUpperCase());
    pushRes(state, {
      id: 'RES_RELOCATE',
      name: 'Relocated center of gravity',
      text: 'New petition math; old church lists go cold.',
      kind: 'hindrance',
      source: 'region'
    });
    text = `Regional gravity shifts to ${r.n}. Sigs need ${state.sigNeed}.`;
  } else if (effect.type === 'scar') {
    state.money = Math.max(0, state.money - 400);
    state.exposure = (state.exposure || 0) + 1;
    state.debt += 150;
    pushRes(state, {
      id: effect.residueId,
      name: effect.name,
      text: effect.text,
      kind: 'hindrance',
      source: 'district'
    });
    text = effect.text;
  }

  state.pendingThematic = null;
  state.log.push({ week: state.week, kind: 'note', text });
  return { ok: true, text };
}

/** Harness helper: pick first option (usually "keep"). */
export function autoResolveThematic(state: GameState): void {
  if (!state.pendingThematic?.options.length) return;
  resolveThematicChoice(state, state.pendingThematic.options[0]!.id);
}
