/**
 * CANDIDATE ZERO — content manifest (Unity ScriptableObject source)
 * ================================================================
 * A pure, serializable export of all *presentation* content — cards,
 * personas, issues, districts, regions, grounds — with the RULES stripped
 * out. Card odds/run/show/req and persona apply() functions live only in
 * the engine (the api.ts bundle); this manifest is the data a Unity host
 * turns into ScriptableObjects to render and to let designers tune
 * presentation in the editor.
 *
 * Split of responsibilities:
 *   - Rules / simulation  -> the engine bundle (src/engine/api.ts)
 *   - Content / rendering -> this manifest -> Unity ScriptableObjects
 *
 * Card FACE is name + art + cost + family tint; the DESCRIPTION is a data
 * field the host reveals on tap/inspect (not shown inline on the card
 * face). See docs/UNITY-BRIDGE.md.
 *
 * Deterministic: no timestamps, stable ordering — the export is diffable
 * and CI-checkable (src/harness/content.ts).
 */

import { ALL_PLAYS } from './plays.js';
import { SESSION_PLAYS } from './session-plays.js';
import { WAITING_PLAYS } from './waiting-plays.js';
import { SIGNATURE_PLAYS } from './signature-plays.js';
import { PATH_REWARDS } from './paths.js';
import { PERSONAS, ISSUES, DISTRICTS, REGIONS } from './setup.js';
import { createDefaultGrounds } from '../engine/state.js';
import type { CardKind, PlayCard } from '../engine/types.js';

export const CONTENT_MANIFEST_VERSION = '1.0.0';

export interface CardEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  risk: string;
  kind: CardKind;
  trap: boolean;
  field: boolean;
  phases: number[];
  cost: { ap: number; money: number; vol: number; momentum: number; favor: number };
  attrs: string[];
  residency: string;
  control: string;
  entityScope: string[];
  /** Which deck pool this card belongs to (presentation grouping). */
  deck: 'main' | 'session' | 'waiting' | 'signature' | 'path';
}

export interface ContentManifest {
  version: string;
  counts: Record<string, number>;
  cardKinds: { id: CardKind; label: string }[];
  cards: CardEntry[];
  personas: { id: string; name: string; tagline: string; description: string; attrs: Record<string, number> }[];
  issues: { id: string; name: string; tagline: string; description: string }[];
  districts: { id: string; name: string; description: string; align: string; incumbent: boolean; trap: boolean }[];
  regions: { id: string; name: string; description: string; hook: string }[];
  grounds: { id: string; name: string; pool: number; prop: number; aff: string }[];
}

const KIND_LABELS: Record<CardKind, string> = {
  action: 'Action',
  bargain: 'Bargain',
  ally: 'Ally',
  item: 'Item',
  location: 'Location',
  liability: 'Liability',
  blackmail: 'Blackmail'
};

function cardEntry(card: PlayCard, deck: CardEntry['deck']): CardEntry {
  const c = card.cost;
  return {
    id: card.id,
    name: card.n,
    tagline: card.tag,
    description: card.d,
    risk: card.risk,
    kind: card.kind ?? 'action',
    trap: !!card.trap,
    field: !!card.field,
    phases: [...card.ph],
    cost: {
      ap: c.a ?? 0,
      money: c.$ ?? 0,
      vol: c.vp ?? 0,
      momentum: c.m ?? 0,
      favor: c.fav ?? 0
    },
    attrs: card.attrs ? [...card.attrs] : [],
    residency: card.residency ?? 'main',
    control: card.control ?? 'player',
    entityScope: card.entityScope ? [...card.entityScope] : [],
    deck
  };
}

/** Assemble the full presentation-content manifest. Pure + deterministic. */
export function buildContentManifest(): ContentManifest {
  const cards: CardEntry[] = [
    ...ALL_PLAYS.map(c => cardEntry(c, 'main')),
    ...SESSION_PLAYS.map(c => cardEntry(c, 'session')),
    ...WAITING_PLAYS.map(c => cardEntry(c, 'waiting')),
    ...SIGNATURE_PLAYS.map(c => cardEntry(c, 'signature')),
    ...PATH_REWARDS.map(c => cardEntry(c, 'path'))
  ];

  const personas = PERSONAS.map(p => ({
    id: p.id,
    name: p.n,
    tagline: p.tag,
    description: p.d,
    attrs: { ...p.attrs } as Record<string, number>
  }));
  const issues = ISSUES.map(i => ({ id: i.id, name: i.n, tagline: i.tag, description: i.d }));
  const districts = DISTRICTS.map(d => ({
    id: d.id,
    name: d.n,
    description: d.d,
    align: d.align,
    incumbent: d.incumbent,
    trap: !!d.trap
  }));
  const regions = REGIONS.map(r => ({ id: r.id, name: r.n, description: r.d, hook: r.hook }));
  const grounds = createDefaultGrounds().map(g => ({
    id: g.id,
    name: g.n,
    pool: g.pool0,
    prop: g.prop,
    aff: g.aff
  }));

  return {
    version: CONTENT_MANIFEST_VERSION,
    counts: {
      cards: cards.length,
      personas: personas.length,
      issues: issues.length,
      districts: districts.length,
      regions: regions.length,
      grounds: grounds.length
    },
    cardKinds: (Object.keys(KIND_LABELS) as CardKind[]).map(id => ({ id, label: KIND_LABELS[id] })),
    cards,
    personas,
    issues,
    districts,
    regions,
    grounds
  };
}
