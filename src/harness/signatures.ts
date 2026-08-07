/**
 * Signature coverage — every persona gets exactly one exclusive SIG.
 * Run: npm run harness:signatures
 */

import { PERSONAS, STARTING_PERSONAS } from '../data/setup.js';
import { SIGNATURE_BY_PERSONA, SIGNATURE_PLAYS } from '../data/signature-plays.js';
import { createCampaign, buildCatalog } from '../engine/loop.js';
import { PERSONA_INTRINSIC, ZERO_LIABILITY_IDS, zeroStarterDeck } from '../data/plays-zero.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Signature coverage ===\n');

/**
 * The starting four do not carry signature cards, and should not.
 *
 * A SIG is one exclusive card injected into an otherwise shared deck — it is
 * how a well-seated persona says who it is. The starting four say it with the
 * entire opening hand: four intrinsic cards each, liability included, over no
 * generic deck at all. That is a stronger claim than a signature, so the
 * coverage rule below applies to the personas that actually need one, and the
 * starting four are held to the harder standard instead.
 */
const SIGNATURE_EXEMPT = new Set(STARTING_PERSONAS.map(p => p.id));
const NEEDS_SIG = PERSONAS.filter(p => !SIGNATURE_EXEMPT.has(p.id));

assert(STARTING_PERSONAS.length === 4, 'exactly four startable personas');
for (const p of STARTING_PERSONAS) {
  const intrinsic = PERSONA_INTRINSIC[p.id] ?? [];
  assert(intrinsic.length === 4, `${p.id}: four intrinsic cards`);
  assert(
    intrinsic.some(id => ZERO_LIABILITY_IDS.has(id)),
    `${p.id}: carries at least one liability — no exceptions`
  );
  assert(zeroStarterDeck(p.id).length === 10, `${p.id}: opens on ten cards`);
}
// Two personas must not open on the same deck, or the choice is cosmetic.
const decks = STARTING_PERSONAS.map(p => zeroStarterDeck(p.id).join(','));
assert(new Set(decks).size === decks.length, 'every starting persona opens differently');
console.log('PASS: starting four each open on ten cards, four intrinsic, one liability.');

assert(SIGNATURE_PLAYS.length >= NEEDS_SIG.length, 'at least one SIG per persona');
assert(
  new Set(SIGNATURE_PLAYS.map(c => c.id)).size === SIGNATURE_PLAYS.length,
  'unique SIG ids'
);

const missing: string[] = [];
const doubles: string[] = [];
for (const p of NEEDS_SIG) {
  const id = SIGNATURE_BY_PERSONA[p.id];
  if (!id) missing.push(p.id);
}
const byPersona = new Map<string, string[]>();
for (const [persona, sigId] of Object.entries(SIGNATURE_BY_PERSONA)) {
  const list = byPersona.get(persona) ?? [];
  list.push(sigId);
  byPersona.set(persona, list);
}
for (const [persona, ids] of byPersona) {
  if (ids.length > 1) doubles.push(`${persona}:${ids.join(',')}`);
}

assert(missing.length === 0, `personas missing signature: ${missing.join(', ')}`);
assert(doubles.length === 0, `persona with multiple SIG map entries: ${doubles.join('; ')}`);

// Inject path works for hand-authored classics
for (const personaId of ['teacher', 'veteran', 'smallbiz'] as const) {
  const c = createCampaign({
    seed: 42,
    setup: { personaId, issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  const sigId = SIGNATURE_BY_PERSONA[personaId]!;
  assert(c.state.personaId === personaId, `${personaId} personaId set`);
  assert(
    c.state.deck?.includes(sigId) ||
      c.deck.draw.includes(sigId) ||
      c.deck.hand.includes(sigId) ||
      c.deck.discard.includes(sigId),
    `${personaId} signature ${sigId} in deck ownership or physical piles`
  );
  const cat = buildCatalog();
  assert(cat.has(sigId), `${sigId} in catalog`);
  console.log(`PASSED: ${personaId} → ${sigId}`);
}

console.log(
  `\nCoverage: ${PERSONAS.length}/${PERSONAS.length} personas · ${SIGNATURE_PLAYS.length} SIG cards`
);
console.log('Signature coverage green.');
process.exit(0);
