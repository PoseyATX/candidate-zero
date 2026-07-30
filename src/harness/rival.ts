/**
 * The Rival harness — the thing that builds against you.
 * Run: npm run harness:rival
 *
 * The load-bearing assertions are about MEMORY and SYMMETRY. An opponent that
 * resets every run is weather; the whole point of engine/rival.ts is that the
 * same named person accumulates across a career. So: they must persist, they
 * must get stronger when you fail, they must weaken when you win, and beating
 * them must actually end them — while still producing a successor, because
 * Covenant 6 says winning does not buy a clean board.
 */

import { createNewState } from '../engine/state.js';
import { emptyLegacy, applyLegacy } from '../engine/legacy.js';
import { createCampaign, runFullCampaign } from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';
import {
  getRival,
  applyRival,
  settleRival,
  rivalRecord,
  archetypeTitle,
  MAX_RIVAL_STRENGTH,
  OPENING_STRENGTH,
  RETIRE_AFTER_LOSSES,
  STRENGTH_TO_RAP
} from '../engine/rival.js';
import { settleMachine, getMachine, poachedIds } from '../engine/machine.js';
import { opponentTurn } from '../engine/opponent.js';
import { createRng, useRng, setDefaultSeed } from '../engine/rng.js';
import type { CampaignOutcome, GameState, LegacyState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failed++;
}

function stateWith(over: Partial<GameState> = {}): GameState {
  const s = createNewState({ seed: 1 });
  Object.assign(s, over);
  return s;
}

/** Finish a run with the given outcome. */
function cycle(legacy: LegacyState, kind: CampaignOutcome, over: Partial<GameState> = {}) {
  const s = stateWith(over);
  legacy.runs.push({ epithet: 'test', kind });
  return settleRival(legacy, s, kind, legacy.runs.length);
}

// --- They exist, they are a person, and they persist ---
{
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 7 });
  const r = getRival(legacy, s);
  assert(!!r.name && r.name.includes(' '), `the opposition has a name (${r.name})`);
  assert(r.strength === OPENING_STRENGTH, 'they do not start from nothing');
  assert(r.cycles === 0, 'and no record against you yet');
  assert(rivalRecord(r) === 'Has not faced you yet.', 'which the dossier says plainly');
  assert(!!archetypeTitle(r.archetype), `they have a role too (${archetypeTitle(r.archetype)})`);

  // Same legacy, second look — must be the same person, not a new roll.
  const again = getRival(legacy, s);
  assert(again.name === r.name, 'the same person on the next look, not a fresh roll');
}

// --- applyRival puts them on the board and names them to the opponent ---
{
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 11 });
  const before = s.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
  const r = applyRival(s, legacy);
  const after = s.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
  assert(after > before, `they start the run already on the ground (${before} -> ${after})`);
  assert(
    s.rivals.length === 1 && s.rivals[0]!.n === r.name,
    'state.rivals finally carries the real name (it was a placeholder nothing read)'
  );
  assert(
    s.log.some(l => l.text.includes(r.name)),
    'and the player is told who filed against them, by name'
  );

  // The weekly opponent line must use the name, not "the county machine".
  useRng(createRng(3));
  s.ballot = true;
  s.nameID = 20;
  const logsBefore = s.log.length;
  opponentTurn(s);
  const newLines = s.log.slice(logsBefore).map(l => l.text).join(' ');
  assert(
    newLines.includes(r.name),
    `the weekly opposition move comes from a person (${JSON.stringify(newLines.slice(0, 60))})`
  );

  // Bounded: a head start must never hand them a ground before week 1.
  const maxRap = Math.max(...s.groundsArr.map(g => g.rivalRap ?? 0));
  assert(maxRap < 85, `the head start never concedes a ground outright (max ${maxRap})`);
}

// --- Losing to them makes them stronger. This is the hook. ---
{
  const legacy = emptyLegacy();
  const start = getRival(legacy).strength;
  cycle(legacy, 'lost_primary');
  const afterOne = getRival(legacy).strength;
  assert(afterOne > start, `losing to them feeds them (${start} -> ${afterOne})`);
  assert(getRival(legacy).beatYou === 1, 'and the record remembers it');

  // Never even making the ballot is worse than losing the race.
  const l2 = emptyLegacy();
  cycle(l2, 'missed_filing');
  assert(
    getRival(l2).strength > afterOne,
    `not making the ballot feeds them harder than losing does ` +
      `(${getRival(l2).strength} vs ${afterOne})`
  );

  // It saturates rather than running away forever.
  for (let i = 0; i < 20; i++) cycle(legacy, 'lost_primary');
  assert(
    getRival(legacy).strength <= MAX_RIVAL_STRENGTH,
    `strength is bounded (${getRival(legacy).strength})`
  );
}

// --- Beating them costs them, and beating them twice ends them ---
{
  const legacy = emptyLegacy();
  cycle(legacy, 'lost_primary');
  cycle(legacy, 'lost_primary');
  const fed = getRival(legacy);
  const name = fed.name;
  const peak = fed.strength;

  const out1 = cycle(legacy, 'won_general');
  assert(out1.beaten, 'winning is recorded as beating them');
  assert(getRival(legacy).strength < peak, `and it costs them (${peak} -> ${getRival(legacy).strength})`);
  assert(!out1.retired, 'one loss does not make them quit');

  const out2 = cycle(legacy, 'won_general');
  assert(
    RETIRE_AFTER_LOSSES === 2 && out2.retired,
    `beaten ${RETIRE_AFTER_LOSSES} cycles running, they stop filing`
  );
  assert(!!out2.successor, `and somebody else picks up the seat (${out2.successor})`);

  const next = getRival(legacy);
  assert(next.name !== name, 'the successor is a different person');
  assert(next.id !== 'RIV1', `with a new id (${next.id})`);
  assert(next.cycles === 0 && next.beatYou === 0, 'and a clean record against you');
  assert(
    next.strength > 0 && next.strength < peak,
    `who inherits a share of what the last one built, not all of it (${next.strength})`
  );
  assert(
    (next.past ?? []).some(p => p.name === name),
    'the one you beat is remembered, by name — that is the trophy'
  );
}

// --- A winning streak has to be consecutive ---
{
  const legacy = emptyLegacy();
  cycle(legacy, 'won_general');
  cycle(legacy, 'lost_primary'); // breaks it
  const out = cycle(legacy, 'won_general');
  assert(!out.retired, 'a win, a loss, a win does not retire them — the streak must be consecutive');
  assert(getRival(legacy).streak === 1, `streak resets on a loss (${getRival(legacy).streak})`);
}

// --- People they poached make them stronger still ---
{
  const clean = emptyLegacy();
  cycle(clean, 'lost_primary');
  const noPoach = getRival(clean).strength;

  const bitten = emptyLegacy();
  getMachine(bitten).departed.push({ id: 'AL02', run: 1, why: 'the cycle went cold', toRival: true });
  cycle(bitten, 'lost_primary');
  assert(poachedIds(bitten).length === 1, 'a poached member is on the books');
  assert(
    getRival(bitten).strength > noPoach,
    `and they are stronger for having taken your people (${getRival(bitten).strength} vs ${noPoach})`
  );
}

// --- Save/load: the whole point is that they survive the reload ---
{
  const legacy = emptyLegacy();
  cycle(legacy, 'lost_primary');
  const before = getRival(legacy);
  const round = JSON.parse(JSON.stringify(legacy)) as LegacyState;
  const after = getRival(round);
  assert(after.name === before.name, 'the rival survives a JSON round-trip by name');
  assert(after.strength === before.strength, 'with their strength intact');
  assert(after.beatYou === before.beatYou, 'and their record against you intact');
}

// --- A career with no rival data still loads (saves written before this) ---
{
  const old = { runs: [], traits: [], carry: {} } as LegacyState;
  const s = createNewState({ seed: 21 });
  const r = applyRival(s, old);
  assert(!!r.name, 'a save written before the rival existed still opens, and one files');
}

// --- Strength actually converts to pressure the player can feel ---
{
  const weak = emptyLegacy();
  const strong = emptyLegacy();
  getRival(strong).strength = MAX_RIVAL_STRENGTH;
  const a = createNewState({ seed: 31 });
  const b = createNewState({ seed: 31 });
  applyRival(a, weak);
  applyRival(b, strong);
  const rapA = a.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
  const rapB = b.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
  assert(rapB > rapA, `a rival who has beaten you brings more to the next race (${rapA} -> ${rapB})`);
  assert(
    Math.round(MAX_RIVAL_STRENGTH * STRENGTH_TO_RAP) < 85,
    'even at full strength they do not open with a conceded ground'
  );
}

// --- Machine settles before rival, so a poach counts the cycle it happens ---
{
  const legacy = emptyLegacy();
  // Build AL02 up, then freeze them out until they walk to the rival.
  for (let i = 0; i < 3; i++) {
    const s = stateWith({ allies: [{ id: 'AL02', warm: 3, age: 0 }] });
    legacy.runs.push({ epithet: 'test', kind: 'won_general' });
    settleMachine(legacy, s, 'won_general', legacy.runs.length);
  }
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const s = stateWith({ disasterLog: [1, 2, 3], ballot: false });
    useRng(createRng(700 + i));
    legacy.runs.push({ epithet: 'test', kind: 'missed_filing' });
    settleMachine(legacy, s, 'missed_filing', legacy.runs.length);
    if (poachedIds(legacy).length) found = true;
  }
  assert(found, 'drove a poach for the ordering check');
  if (found) {
    const s = stateWith({ ballot: false });
    const out = settleRival(legacy, s, 'missed_filing', legacy.runs.length);
    assert(
      out.strengthAfter > out.strengthBefore,
      'the rival settles after the machine, so this cycle\'s poach already counts'
    );
  }
}

// --- Strength must actually change outcomes, not just accumulate ---
{
  /**
   * The first version of this system banked rapport and nothing else, and a
   * strength-100 rival cost the player about 1 SE of seat rate — a number that
   * accumulated and was never felt. rivalRap and its odds penalty both
   * saturate, so strength has to change what the opponent DOES.
   *
   * This asserts the outcome gap directly rather than trusting the mechanism.
   * n is small for harness runtime; the bar is deliberately loose (the measured
   * gap at n=300 was ~7pp on labor and ~11pp on money) so it catches the
   * mechanism being disconnected, not ordinary sampling noise.
   */
  const TRIALS = 120;
  const seatRate = (strength: number): number => {
    let won = 0;
    for (let i = 0; i < TRIALS; i++) {
      const seed = 90_000 + i * 17;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      const c = createCampaign({ seed });
      const legacy = emptyLegacy();
      getRival(legacy, c.state).strength = strength;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      applyLegacy(c.state, legacy);
      runFullCampaign(c, STRATEGIES.labor!);
      const o = c.state.outcome ?? 'ongoing';
      if (o === 'won_general' || o === 'session_law' || o === 'session_survived' || o === 'session_primaried') {
        won++;
      }
    }
    return (100 * won) / TRIALS;
  };
  const weak = seatRate(0);
  const strong = seatRate(MAX_RIVAL_STRENGTH);
  assert(
    strong < weak - 2,
    `a full-strength rival measurably costs the player the seat ` +
      `(${weak.toFixed(1)}% -> ${strong.toFixed(1)}% over ${TRIALS} runs each)`
  );
}

if (failed) {
  console.error(`\nRival harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nThe Rival green.');
