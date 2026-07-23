/**
 * Compact campaign observation for agents / harnesses.
 * Spirit of Anvil observe + observeDiff (MIT), specialized for Candidate Zero
 * (ledger/stage/hand — not spatial entities).
 *
 * @see https://github.com/7etsuo/anvil packages/core/src/agent/observeDiff.ts
 */

import type { Campaign } from '../../engine/loop.js';
import { listPlayableHand, snapshot } from '../../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../../engine/state.js';

export interface CampaignObserveSnapshot {
  v: 1;
  stage: string;
  stageLabel: string;
  stageWeek: number;
  calendarWeek: number;
  phase: number;
  over: boolean;
  outcome: string;
  personaId: string | null;
  persona: string | null;
  issue: string | null;
  ledger: {
    ap: number;
    money: number;
    contacts: number;
    nameID: number;
    volPool: number;
    momentum: number;
    signatures: number;
    ballot: boolean;
    debt: number;
  };
  /** Legal plays as compact rows (id + handIndex). */
  hand: Array<{ handIndex: number; cardId: string; name: string }>;
  canEndWeek: boolean;
  pendingDraft: boolean;
  pendingOutside: boolean;
  /** One-line LLM-friendly summary. */
  summary: string;
}

/** Structured world state for agents — keep short. */
export function observeCampaign(campaign: Campaign): CampaignObserveSnapshot {
  const s = campaign.state;
  const snap = snapshot(s);
  const playable = listPlayableHand(campaign);
  const hand = playable.map(p => ({
    handIndex: p.index,
    cardId: p.card.id,
    name: p.card.n
  }));
  const summary = [
    `stage=${s.stage}`,
    `W${snap.week}/${s.weeksTotal}`,
    `ph=${getPhase(s)}`,
    `ap=${snap.ap}`,
    `$${snap.money}`,
    `ballot=${snap.ballot}`,
    `hand=${hand.length}`,
    s.over ? `over=${s.outcome ?? 'yes'}` : 'live'
  ].join(' ');

  return {
    v: 1,
    stage: s.stage,
    stageLabel: stageLabel(s),
    stageWeek: stageWeek(s),
    calendarWeek: snap.week,
    phase: getPhase(s),
    over: !!s.over,
    outcome: s.outcome ?? 'ongoing',
    personaId: s.personaId ?? null,
    persona: s.persona ?? null,
    issue: s.issue ?? null,
    ledger: {
      ap: snap.ap,
      money: snap.money,
      contacts: snap.contacts,
      nameID: snap.nameID,
      volPool: snap.volPool,
      momentum: snap.momentum,
      signatures: snap.signatures,
      ballot: snap.ballot,
      debt: snap.debt
    },
    hand,
    canEndWeek: snap.ap <= 0 && !s.pendingDraft?.options?.length,
    pendingDraft: !!(s.pendingDraft?.options?.length),
    pendingOutside: !!s.pendingOutside,
    summary
  };
}

export interface CampaignObserveDiff {
  fromSummary: string;
  toSummary: string;
  ledgerDeltas: Array<{ key: string; from: number | boolean; to: number | boolean }>;
  handAdded: string[];
  handRemoved: string[];
  stageChanged?: { from: string; to: string };
  summary: string;
}

/** Diff two observations — agents reason on deltas (Anvil observeDiff spirit). */
export function observeCampaignDiff(
  from: CampaignObserveSnapshot,
  to: CampaignObserveSnapshot
): CampaignObserveDiff {
  const ledgerDeltas: CampaignObserveDiff['ledgerDeltas'] = [];
  const keys = Object.keys(from.ledger) as (keyof CampaignObserveSnapshot['ledger'])[];
  for (const k of keys) {
    if (from.ledger[k] !== to.ledger[k]) {
      ledgerDeltas.push({ key: k, from: from.ledger[k], to: to.ledger[k] });
    }
  }
  const fromIds = new Set(from.hand.map(h => h.cardId));
  const toIds = new Set(to.hand.map(h => h.cardId));
  const handAdded = [...toIds].filter(id => !fromIds.has(id));
  const handRemoved = [...fromIds].filter(id => !toIds.has(id));
  const stageChanged =
    from.stage !== to.stage ? { from: from.stage, to: to.stage } : undefined;

  const parts: string[] = [];
  if (stageChanged) parts.push(`stage ${stageChanged.from}→${stageChanged.to}`);
  if (ledgerDeltas.length) {
    parts.push(
      ledgerDeltas.map(d => `${d.key}:${String(d.from)}→${String(d.to)}`).join(' ')
    );
  }
  if (handAdded.length) parts.push(`+hand ${handAdded.join(',')}`);
  if (handRemoved.length) parts.push(`-hand ${handRemoved.join(',')}`);
  if (!parts.length) parts.push('no_material_change');

  return {
    fromSummary: from.summary,
    toSummary: to.summary,
    ledgerDeltas,
    handAdded,
    handRemoved,
    stageChanged,
    summary: parts.join('; ')
  };
}
