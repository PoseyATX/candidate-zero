/**
 * Minimal smoke test: create state, play a short sequence of pure cards,
 * advance a couple of weeks, and print the resulting ledger.
 * First step toward AC1 (side-by-side verification).
 */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function createNewState() {
  return {
    week: 1, weeksTotal: 24, ap: 2, apMax: 2, fieldAp: 0,
    money: 500, debt: 0, contacts: 0, nameID: 2, volPool: 2, momentum: 0, favors: 0,
    signatures: 0, sigNeed: 450, ballot: false, hitPieces: 0, exposure: 0,
    messageSharp: false, clubOdds: 0, walkCount: 0, shadowPlays: 0, disasterLog: [],
    endorsePts: 0, slate: false, absenteeBank: 0, greeters: 0, pledges: 0,
    faces: { P: 0, O: 0, L: 0, G: 0, T: 0, F: 0 }, shFired: {},
    groundsArr: [{ id: 'GR02', n: 'The FM Roads', pool: 420, pool0: 420, prop: 0.7, aff: 'G,T', rapport: 0, gotv: 0 }],
    allies: [], backers: [], assets: [], obls: [], reps: [], rivals: [],
    tier: 0, persona: null, issue: null, district: null, eventsFired: {},
    stage: 'primary', genOpp: null, genBase: 0, over: false, log: [],
    capital: 0, favor: 50, districtStanding: 60, bill: null, committee: null, sessionFlags: {},
    wave: 0, skippedTownHall: false, townHallThisWeek: false, debatePrepped: false,
    oppoFile: false, favWitness: 0, globalBand: 0
  };
}

function resolve(p, risk, state) {
  p = clamp(p, 0.02, 0.95);
  const critShare = risk === 'VOL' ? 0.3 : risk === 'SAFE' ? 0 : 0.18;
  let band = risk === 'SAFE' ? 0 : (0.04 + state.tier * 0.04) * (risk === 'VOL' ? 2 : 1);
  const roll = Math.random();
  let tier;
  if (critShare > 0 && roll < p * critShare) tier = 0;
  else if (roll < p) tier = 1;
  else if (band > 0 && roll > 1 - band) tier = 3;
  else tier = 2;
  return { tier, roll, p, band };
}

function playBlockWalk(state) {
  const g = state.groundsArr[0];
  const p = clamp(0.62 + state.volPool * 0.02, 0, 0.95);
  const o = resolve(p, 'SAFE', state);
  state.ap -= 1; state.walkCount++;
  if (o.tier === 0) {
    const c = Math.min(g.pool, Math.round(55 + Math.random() * 30));
    g.pool -= c; state.contacts += c; g.rapport = Math.min(100, g.rapport + 6); state.volPool += 1; state.nameID += 2;
    return `BREAKTHROUGH — +${c} contacts, +1 vol, rapport up at ${g.n}`;
  }
  if (o.tier === 1) {
    const c = Math.min(g.pool, Math.round(22 + Math.random() * 16));
    g.pool -= c; state.contacts += c; state.volPool += 1; g.rapport = Math.min(100, g.rapport + 3);
    return `GAIN — +${c} contacts, +1 vol at ${g.n}`;
  }
  const c = Math.min(g.pool, 6); g.pool -= c; state.contacts += c;
  return `SETBACK — +${c} contacts (heat, dogs, closed blinds)`;
}

function playFilingFee(state) {
  if (state.money < 750 || state.ballot) return 'Cannot play Filing Fee';
  state.money -= 750; state.ballot = true;
  return 'SAFE — Receipt in hand. On the ballot the expensive way.';
}

function endWeek(state) {
  state.week++; state.ap = state.apMax; state.momentum = Math.max(0, state.momentum - 1); state.townHallThisWeek = false;
  return `Week ${state.week} begins. AP refreshed.`;
}

const S = createNewState();
console.log('=== CANDIDATE ZERO — Smoke Play Sequence ===');
console.log(`Start: week ${S.week}, money $${S.money}, contacts ${S.contacts}, ballot ${S.ballot}`);
console.log('1.', playBlockWalk(S));
console.log('2.', playBlockWalk(S));
console.log('   AP left:', S.ap);
console.log(endWeek(S));
console.log('3.', playBlockWalk(S));
S.money = 900;
console.log('4.', playFilingFee(S));
console.log(endWeek(S));
console.log('\n=== Final Ledger ===');
console.log({ week: S.week, money: S.money, contacts: S.contacts, nameID: S.nameID, volPool: S.volPool, ballot: S.ballot, walkCount: S.walkCount, rapport: S.groundsArr[0].rapport, poolLeft: S.groundsArr[0].pool });
console.log('\nSmoke sequence complete. Pure cards + state factory + week advance are alive.');
