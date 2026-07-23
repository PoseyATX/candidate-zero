/**
 * Signature coverage — every persona gets exactly one exclusive SIG.
 * Run: npm run harness:signatures
 */

import { PERSONAS } from '../data/setup.js';
import { SIGNATURE_BY_PERSONA, SIGNATURE_PLAYS } from '../data/signature-plays.js';
import { createCampaign, buildCatalog } from '../engine/loop.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Signature coverage ===\n');

assert(SIGNATURE_PLAYS.length >= PERSONAS.length, 'at least one SIG per persona');
assert(
  new Set(SIGNATURE_PLAYS.map(c => c.id)).size === SIGNATURE_PLAYS.length,
  'unique SIG ids'
);

const missing: string[] = [];
const doubles: string[] = [];
for (const p of PERSONAS) {
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
