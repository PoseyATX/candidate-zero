var CandidateZeroEngine = (function () {
  "use strict";
  var __defs = {};            // name -> { deps, decl }
  var __mods = {};            // name -> exports object
  var __loading = {};
  var System = {
    register: function (name, deps, decl) { __defs[name] = { deps: deps, decl: decl }; }
  };

  function __require(name) {
    if (Object.prototype.hasOwnProperty.call(__mods, name)) return __mods[name];
    var def = __defs[name];
    if (!def) throw new Error("candidate-zero: module not found: " + name);
    // Circular-import guard: publish the (initially empty) namespace first.
    if (__loading[name]) return __mods[name] || (__mods[name] = {});
    __loading[name] = true;

    var exports = __mods[name] || (__mods[name] = {});
    var setters = [];
    var execute = null;

    var ctx = {
      id: name,
      import: function (dep) { return Promise.resolve(__require(__resolve(name, dep))); },
      meta: { url: name }
    };
    var mod = def.decl(function (key, value) {
      if (typeof key === "object") {
        for (var k in key) if (Object.prototype.hasOwnProperty.call(key, k)) exports[k] = key[k];
      } else {
        exports[key] = value;
      }
      return value;
    }, ctx);

    setters = mod.setters || [];
    execute = mod.execute;

    for (var i = 0; i < def.deps.length; i++) {
      var depName = __resolve(name, def.deps[i]);
      var depExports = __require(depName);
      if (setters[i]) setters[i](depExports);
    }
    if (execute) execute();
    __loading[name] = false;
    return exports;
  }

  // tsc emits module ids already relative to the project root, and dependency
  // specifiers as written in source ("./loop.js", "../data/setup.js"). Resolve
  // them against the importing module's directory, dropping the .js the
  // TypeScript ESM style requires.
  function __resolve(from, spec) {
    if (spec.charAt(0) !== ".") return spec;
    var base = from.split("/");
    base.pop();
    var parts = spec.replace(/\.js$/, "").split("/");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "." || p === "") continue;
      if (p === "..") base.pop();
      else base.push(p);
    }
    return base.join("/");
  }

  /**
   * CANDIDATE ZERO — Seeded RNG (mulberry32)
   * Matches the modular prototype's CZ.rng so replays and AC1 parity are possible.
   * Brutal and impartial: no pity, no soft floor. Seed only for reproducibility.
   */
  System.register("engine/rng", [], function (exports_1, context_1) {
      "use strict";
      var defaultRng;
      var __moduleName = context_1 && context_1.id;
      function createRng(seed) {
          let s = ((seed !== null && seed !== void 0 ? seed : (Date.now() ^ (Math.random() * 0x7fffffff))) >>> 0) || 1;
          function setSeed(n) {
              s = (n >>> 0) || 1;
          }
          function getSeed() {
              return s;
          }
          function next() {
              s = (s + 0x6d2b79f5) >>> 0;
              let t = s;
              t = Math.imul(t ^ (t >>> 15), t | 1);
              t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          }
          function float(n) {
              return next() * n;
          }
          function int(lo, hi) {
              return lo + Math.floor(next() * (hi - lo + 1));
          }
          function chance(p) {
              return next() < p;
          }
          function pick(arr) {
              var _a;
              if (!arr || !arr.length)
                  return null;
              return (_a = arr[Math.floor(next() * arr.length)]) !== null && _a !== void 0 ? _a : null;
          }
          function shuffle(arr) {
              const a = arr.slice();
              for (let i = a.length - 1; i > 0; i--) {
                  const j = Math.floor(next() * (i + 1));
                  [a[i], a[j]] = [a[j], a[i]];
              }
              return a;
          }
          return { setSeed, getSeed, next, float, int, chance, pick, shuffle };
      }
      exports_1("createRng", createRng);
      function getRng() {
          return defaultRng;
      }
      exports_1("getRng", getRng);
      function setDefaultSeed(seed) {
          defaultRng.setSeed(seed);
      }
      exports_1("setDefaultSeed", setDefaultSeed);
      function getDefaultSeed() {
          return defaultRng.getSeed();
      }
      exports_1("getDefaultSeed", getDefaultSeed);
      function useRng(rng) {
          defaultRng = rng;
      }
      exports_1("useRng", useRng);
      function random() {
          return defaultRng.next();
      }
      exports_1("random", random);
      return {
          setters: [],
          execute: function () {/**
               * CANDIDATE ZERO — Seeded RNG (mulberry32)
               * Matches the modular prototype's CZ.rng so replays and AC1 parity are possible.
               * Brutal and impartial: no pity, no soft floor. Seed only for reproducibility.
               */
              defaultRng = createRng();
          }
      };
  });
  /**
   * Structured obligations registry — ported from archive/prototype-single-file.html
   * OBLS + addObl + weekly drag (lines ~393–404, weekly tick ~1590s).
   *
   * state.obls is a list of obligation *ids* into this registry (not free-text).
   * Each held id applies its `drag` once per week at the week boundary.
   *
   * Archive also has OB9/OB10; Phase 2 ports OB1–OB8 as the ROADMAP/brief set,
   * plus OB9/OB10 so pledge/flatbed/event paths stay complete.
   */
  System.register("data/obligations", [], function (exports_2, context_2) {
      "use strict";
      var OBLS;
      var __moduleName = context_2 && context_2.id;
      /** Port of archive addObl(s,id) — line 404. */
      function addObl(state, id) {
          if (!OBLS[id]) {
              // Unknown ids still record so free-text leftovers from older saves don't
              // explode — but new code should only push registry keys.
              if (!state.obls.includes(id))
                  state.obls.push(id);
              return;
          }
          if (!state.obls.includes(id))
              state.obls.push(id);
      }
      exports_2("addObl", addObl);
      /**
       * Apply weekly drag for every held obligation. Call at week boundary
       * (onWeekAdvance). Port of archive weekly foreach over S.obls with drag.
       */
      function applyOblDrag(state) {
          for (const id of state.obls) {
              const def = OBLS[id];
              if (def)
                  def.drag(state);
          }
      }
      exports_2("applyOblDrag", applyOblDrag);
      function oblName(id) {
          var _a, _b;
          return (_b = (_a = OBLS[id]) === null || _a === void 0 ? void 0 : _a.n) !== null && _b !== void 0 ? _b : id;
      }
      exports_2("oblName", oblName);
      return {
          setters: [],
          execute: function () {/**
               * Structured obligations registry — ported from archive/prototype-single-file.html
               * OBLS + addObl + weekly drag (lines ~393–404, weekly tick ~1590s).
               *
               * state.obls is a list of obligation *ids* into this registry (not free-text).
               * Each held id applies its `drag` once per week at the week boundary.
               *
               * Archive also has OB9/OB10; Phase 2 ports OB1–OB8 as the ROADMAP/brief set,
               * plus OB9/OB10 so pledge/flatbed/event paths stay complete.
               */
              /**
               * Archive OBLS (prototype-single-file.html:393–401).
               * OB3/OB4/OB6/OB7/OB9/OB10 have empty drag in archive (leash for session/events).
               */
              exports_2("OBLS", OBLS = {
                  // archive line 393
                  OB1: {
                      id: 'OB1',
                      n: 'PAC String',
                      desc: 'L drifts; sting fuel; will call a vote',
                      drag: s => {
                          s.faces.L -= 1;
                          s.exposure += 0.15;
                      }
                  },
                  // archive line 394
                  OB2: {
                      id: 'OB2',
                      n: 'Bank Note',
                      desc: '−$150 interest / week',
                      drag: s => {
                          s.money -= 150;
                          if (s.money < 0) {
                              s.money = 0;
                              s.faces.G -= 1;
                          }
                      }
                  },
                  // archive line 395
                  OB3: {
                      id: 'OB3',
                      n: "Slate-Maker's Price",
                      desc: 'one endorsement is his',
                      drag: () => { }
                  },
                  // archive line 396
                  OB4: {
                      id: 'OB4',
                      n: "The Pastor's Ask",
                      desc: 'a position is locked',
                      drag: () => { }
                  },
                  // archive line 397
                  OB5: {
                      id: 'OB5',
                      n: 'Old Money Expectations',
                      desc: 'movement rapport bleeds',
                      drag: s => {
                          for (const g of s.groundsArr) {
                              if (g.aff[0] === 'T' || g.aff.includes('T')) {
                                  g.rapport = Math.max(0, g.rapport - 1);
                              }
                          }
                      }
                  },
                  // archive line 398
                  OB6: {
                      id: 'OB6',
                      n: "Family Name's Weight",
                      desc: 'family is oppo surface',
                      drag: () => { }
                  },
                  // archive line 399
                  OB7: {
                      id: 'OB7',
                      n: 'The Handshake Deal',
                      desc: 'a favor is owned',
                      drag: () => { }
                  },
                  // archive line 401 (OB8 after OB10 in archive source order; id still OB8)
                  OB8: {
                      id: 'OB8',
                      n: 'Cousin on the Payroll',
                      desc: 'G drifts; audit fuel',
                      drag: s => {
                          s.faces.G -= 1;
                          s.exposure += 0.1;
                      }
                  },
                  // archive line 400
                  OB9: {
                      id: 'OB9',
                      n: 'The Signed Pledge',
                      desc: 'position locked in ink',
                      drag: () => { }
                  },
                  // archive line 402
                  OB10: {
                      id: 'OB10',
                      n: 'Debt of Gratitude',
                      desc: 'repay in kind, someday',
                      drag: () => { }
                  }
              });
          }
      };
  });
  /**
   * CANDIDATE ZERO — Reputation, allies, and Shadow consequences
   *
   * Ported from archive/prototype-single-file.html's addAlly/ally/warm/
   * hasRep/repCheck/shadowCheck. That file is the design source for this
   * engine (see docs/SRD-NOTES.md) and already has a complete, working
   * version of this system — this is a port, not new design.
   *
   * repCheck: Phase 2 ports the full archive matrix (R01–R12) now that
   * ally grants + counters (pieCount, strawWins, slate, AL02/AL12/AL15)
   * exist. R10 still uses modular disasterLog.length (archive's
   * disSurvived counter was never separate here).
   *
   * shadowCheck: ported in full — every field it touches (pieMalus,
   * exposure, b05Malus, allyMalus, favWitness, hitPieces, volPool,
   * rapStall, obls, groundsArr, shFired) already exists in GameState.
   */
  System.register("engine/reputation", ["data/obligations"], function (exports_3, context_3) {
      "use strict";
      var obligations_js_1, hasAllyWarm;
      var __moduleName = context_3 && context_3.id;
      function hasRep(state, id) {
          return state.reps.includes(id);
      }
      exports_3("hasRep", hasRep);
      function findAlly(state, id) {
          return state.allies.find(a => a.id === id);
      }
      exports_3("findAlly", findAlly);
      function warm(state, id) {
          const a = findAlly(state, id);
          return !!(a && a.warm > 0);
      }
      exports_3("warm", warm);
      /**
       * Phase 1 ground-affinity check: is this ally warm AND working the given
       * ground? An ally with no `grounds` list (persona/roster grant, no ground)
       * counts as warm everywhere — backward-compatible. An ally localized to
       * specific grounds (granted by a ground-based field play) only counts at
       * those grounds. `groundId` omitted falls back to the roster-wide `warm`.
       * Spec named this `allyWarmAtGround`; `hasAllyWarm` is an alias.
       */
      function allyWarmAtGround(state, id, groundId) {
          const a = findAlly(state, id);
          if (!a || a.warm <= 0)
              return false;
          if (!groundId)
              return true;
          if (!a.grounds || a.grounds.length === 0)
              return true;
          return a.grounds.includes(groundId);
      }
      exports_3("allyWarmAtGround", allyWarmAtGround);
      function addRep(state, id) {
          if (!state.reps.includes(id))
              state.reps.push(id);
      }
      exports_3("addRep", addRep);
      /**
       * Matches archive semantics: grants once; does not re-warm an existing ally.
       * Phase 1: pass `groundId` to localize the ally to a ground (field plays);
       * omit it for a roster-wide grant (personas). If the ally already exists,
       * a `groundId` still extends its working grounds (a field director hired
       * at a second ground now works both).
       */
      function addAlly(state, id, warmAmt = 2, groundId) {
          var _a;
          const existing = findAlly(state, id);
          if (existing) {
              if (groundId) {
                  existing.grounds = (_a = existing.grounds) !== null && _a !== void 0 ? _a : [];
                  if (!existing.grounds.includes(groundId))
                      existing.grounds.push(groundId);
              }
              return false;
          }
          state.allies.push({ id, warm: warmAmt, age: 0, grounds: groundId ? [groundId] : undefined });
          return true;
      }
      exports_3("addAlly", addAlly);
      /**
       * Reputation thresholds — call after any play that could move the tracked
       * counters (walkCount, shadowPlays, hitPieces, disasterLog) or at week end.
       * Idempotent: addRep no-ops once a rep is already held.
       *
       * Port of archive repCheck() (prototype-single-file.html:512–524).
       */
      function repCheck(state) {
          // archive:513
          if (state.walkCount >= 12)
              addRep(state, 'R01');
          // archive:514
          if (state.week >= 12 && state.shadowPlays === 0 && !hasRep(state, 'R04')) {
              addRep(state, 'R02');
          }
          // archive:515
          if (state.shadowPlays >= 3 && !hasRep(state, 'R02'))
              addRep(state, 'R04');
          // archive:516 — pie circuit successes
          if ((state.pieCount || 0) >= 6)
              addRep(state, 'R05');
          // archive:517 — County Chairwoman or County Judge
          if ((warm(state, 'AL02') || warm(state, 'AL15')) && !hasRep(state, 'R06')) {
              addRep(state, 'R06');
          }
          // archive:518
          if (state.hitPieces >= 3)
              addRep(state, 'R07');
          // archive:519 — slate + establishment cred
          if (state.slate && hasRep(state, 'R06') && !hasRep(state, 'R09')) {
              addRep(state, 'R08');
          }
          // archive:520 — pledges + straw wins (movement + club math)
          if (state.pledges >= 3 && (state.strawWins || 0) >= 2 && !hasRep(state, 'R08')) {
              addRep(state, 'R09');
          }
          // archive:521–522 recent disasters → R11
          const recentDisasters = state.disasterLog.filter(w => state.week - w < 5).length;
          if (recentDisasters >= 3)
              addRep(state, 'R11');
          // archive:523 uses disSurvived; modular approximates with disasterLog length
          // (R10 was already granted this way pre-Phase-2 — keep stable for AC1).
          if (state.disasterLog.length >= 2)
              addRep(state, 'R10');
          // archive:524 — Old Bull fully warm
          const bull = findAlly(state, 'AL12');
          if (bull && bull.warm >= 3)
              addRep(state, 'R12');
      }
      exports_3("repCheck", repCheck);
      /**
       * Shadow consequences on Faces — fires once per threshold crossing
       * (state.shFired dedupes). Faces drifting deep negative has real
       * mechanical bite, not just flavor text.
       */
      function shadowCheck(state) {
          const T = state.faces;
          const fired = state.shFired;
          const fire = (key, msg, fx) => {
              if (fired[key])
                  return;
              fired[key] = true;
              state.log.push({ week: state.week, kind: 'note', text: `SHADOW — ${msg}` });
              if (fx)
                  fx();
          };
          if (T.P <= -10) {
              fire('P1', 'Obstructionist: chairs call you "difficult." Pie Circuit -10%.', () => {
                  state.pieMalus = 0.1;
              });
          }
          if (T.P <= -25) {
              fire('P2', 'Obstructionist crisis: you kill a friendly deal on principle. An ally walks for good.', () => {
                  const a = state.allies.find(x => x.warm > 0);
                  if (a)
                      a.warm = -99;
              });
          }
          if (T.O <= -10) {
              fire('O1', 'Fixer: every favor now has a 25% witness.', () => {
                  state.favWitness = 0.25;
              });
          }
          if (T.O <= -25) {
              fire('O2', 'Fixer crisis: the Beat Reporter starts mapping your favor web.', () => {
                  state.exposure += 2;
              });
          }
          if (T.L <= -10) {
              fire('L1', 'Bagman: donor-list rumors. Small-dollar trickle -25%.', () => {
                  state.b05Malus = 0.75;
              });
          }
          if (T.L <= -25) {
              fire('L2', 'Bagman crisis: the string pulls -- publicly.', () => {
                  state.hitPieces++;
              });
          }
          if (T.G <= -10) {
              fire('G1', 'Boss: "his people" enters local vocabulary. New allies -10%.', () => {
                  state.allyMalus = 0.1;
              });
          }
          if (T.G <= -25) {
              // archive:504 — addObl(S,'OB8') not free-text
              fire('G2', 'Boss crisis: kin scandal catches up with you.', () => {
                  obligations_js_1.addObl(state, 'OB8');
                  const g = state.groundsArr.find(x => x.id === 'GR02');
                  if (g)
                      g.rapport = Math.max(0, g.rapport - 15);
              });
          }
          if (T.T >= 30 && state.endorsePts === 0 && state.week > 10) {
              fire('T1', 'Zealot’s edge: two chairs privately call you "not a serious person."');
          }
          if (T.T <= -25 || (T.T >= 45 && state.week > 14 && state.endorsePts === 0)) {
              fire('T2', 'Zealot crisis: you purge a volunteer heretic. Three quit with him.', () => {
                  state.volPool = Math.max(0, state.volPool - 3);
              });
          }
          if (T.F <= -10) {
              fire('F1', 'Grandstander: reporters cover you, not the message. Issue rapport stalls.', () => {
                  state.rapStall = true;
              });
          }
          if (T.F <= -25) {
              fire('F2', 'Grandstander crisis: the clip that outlives you. Permanent exposure +1.', () => {
                  state.exposure += 1;
              });
          }
      }
      exports_3("shadowCheck", shadowCheck);
      return {
          setters: [
              function (obligations_js_1_1) {
                  obligations_js_1 = obligations_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Reputation, allies, and Shadow consequences
               *
               * Ported from archive/prototype-single-file.html's addAlly/ally/warm/
               * hasRep/repCheck/shadowCheck. That file is the design source for this
               * engine (see docs/SRD-NOTES.md) and already has a complete, working
               * version of this system — this is a port, not new design.
               *
               * repCheck: Phase 2 ports the full archive matrix (R01–R12) now that
               * ally grants + counters (pieCount, strawWins, slate, AL02/AL12/AL15)
               * exist. R10 still uses modular disasterLog.length (archive's
               * disSurvived counter was never separate here).
               *
               * shadowCheck: ported in full — every field it touches (pieMalus,
               * exposure, b05Malus, allyMalus, favWitness, hitPieces, volPool,
               * rapStall, obls, groundsArr, shFired) already exists in GameState.
               */
              exports_3("hasAllyWarm", hasAllyWarm = allyWarmAtGround);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Pure Resolution Engine (SRD §1)
   * Side-effect free aside from RNG stream. Takes explicit state.
   * SAFE cards can never produce DISASTER. Brutal impartial RNG preserved.
   */
  System.register("engine/resolve", ["engine/rng", "engine/reputation"], function (exports_4, context_4) {
      "use strict";
      var rng_js_1, reputation_js_1, STAMPS;
      var __moduleName = context_4 && context_4.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      function resolve(p, risk, state, rollOverride) {
          p = clamp(p, 0.02, 0.95);
          const critShare = risk === 'VOL'
              ? 0.3
              : risk === 'SAFE'
                  ? (reputation_js_1.hasRep(state, 'R01') ? 0.15 : 0)
                  : 0.18;
          let band = risk === 'SAFE'
              ? 0
              : (0.04 + state.tier * 0.04) * (risk === 'VOL' ? 2 : 1);
          band = Math.max(0, band +
              (state.globalBand || 0) -
              (reputation_js_1.warm(state, 'AL11') ? 0.02 : 0) -
              (reputation_js_1.hasRep(state, 'R10') ? 0.01 : 0));
          const roll = rollOverride !== undefined ? rollOverride : rng_js_1.random();
          let tier;
          if (critShare > 0 && roll < p * critShare) {
              tier = 0;
          }
          else if (roll < p) {
              tier = 1;
          }
          else if (band > 0 && roll > 1 - band) {
              tier = 3;
          }
          else {
              tier = 2;
          }
          return { tier, roll, p, band };
      }
      exports_4("resolve", resolve);
      return {
          setters: [
              function (rng_js_1_1) {
                  rng_js_1 = rng_js_1_1;
              },
              function (reputation_js_1_1) {
                  reputation_js_1 = reputation_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Pure Resolution Engine (SRD §1)
               * Side-effect free aside from RNG stream. Takes explicit state.
               * SAFE cards can never produce DISASTER. Brutal impartial RNG preserved.
               */
              exports_4("STAMPS", STAMPS = ['BREAKTHROUGH', 'GAIN', 'SETBACK', 'DISASTER']);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Dopamine / feedback loop (presentation of truth)
   *
   * Pure. Does NOT alter rolls, bands, or yields.
   * Makes outcomes legible and delicious: stamps, beats, near-misses,
   * streaks, milestones, week summaries.
   */
  System.register("engine/feedback", ["engine/resolve"], function (exports_5, context_5) {
      "use strict";
      var resolve_js_1;
      var __moduleName = context_5 && context_5.id;
      function createFeedbackState() {
          return { hotStreak: 0, coldStreak: 0, milestonesSeen: [] };
      }
      exports_5("createFeedbackState", createFeedbackState);
      function ensureFb(state) {
          if (!state.feedback)
              state.feedback = createFeedbackState();
          return state.feedback;
      }
      function totalGotv(state) {
          return state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
      }
      /** Snapshot ledger at week open for delta summaries. */
      function markWeekStart(state) {
          const fb = ensureFb(state);
          fb.weekStart = {
              week: state.week,
              contacts: state.contacts,
              money: state.money,
              signatures: state.signatures,
              nameID: state.nameID,
              volPool: state.volPool,
              gotv: totalGotv(state),
              ballot: state.ballot
          };
      }
      exports_5("markWeekStart", markWeekStart);
      /**
       * Near-miss from geometry of the roll — pure, no re-roll.
       * Boundaries from resolve(): breakthrough < p*crit, gain < p, disaster > 1-band.
       */
      function detectNearMiss(roll, risk, tier) {
          const { roll: r, p, band } = roll;
          // Reconstruct critShare the same way resolve does (approx; SAFE often 0)
          const critShare = risk === 'VOL' ? 0.3 : risk === 'SAFE' ? 0 : 0.18;
          const breakLine = p * critShare;
          const gainLine = p;
          const disasterLine = band > 0 ? 1 - band : 1.01;
          const NEAR = 0.045;
          if (tier === 1 && critShare > 0 && r >= breakLine && r - breakLine < NEAR) {
              return { kind: 'almost_breakthrough', margin: r - breakLine };
          }
          if (tier === 2 && r >= gainLine && r - gainLine < NEAR) {
              return { kind: 'almost_gain', margin: r - gainLine };
          }
          if (tier === 2 && band > 0 && disasterLine - r < NEAR && r <= disasterLine) {
              return { kind: 'skirted_disaster', margin: disasterLine - r };
          }
          if (tier === 3 && band > 0 && r - disasterLine < NEAR) {
              return { kind: 'brushed_disaster', margin: r - disasterLine };
          }
          return null;
      }
      exports_5("detectNearMiss", detectNearMiss);
      function beatForTier(tier, near) {
          if (tier === 0)
              return 'spark';
          if (tier === 1)
              return near === 'almost_breakthrough' ? 'hit' : 'hit';
          if (tier === 3)
              return 'crash';
          // setback
          if (near === 'almost_gain')
              return 'thump';
          if (near === 'skirted_disaster')
              return 'whisper';
          return 'thump';
      }
      function intensityFor(tier, margin, near) {
          const base = tier === 0 ? 1 : tier === 1 ? 0.65 : tier === 3 ? 0.95 : 0.4;
          const nearBoost = near ? 0.15 : 0;
          const tight = Math.max(0, 0.12 - margin) * 2;
          return Math.min(1, base + nearBoost + tight);
      }
      function juiceLine(card, stamp, near, streak, milestone) {
          if (milestone)
              return milestone;
          if (near === 'almost_breakthrough') {
              return `${card.n}: GAIN — a hair from BREAKTHROUGH. The room felt it.`;
          }
          if (near === 'almost_gain') {
              return `${card.n}: SETBACK — you were that close to a win.`;
          }
          if (near === 'skirted_disaster') {
              return `${card.n}: SETBACK — walked the cliff edge; didn't fall.`;
          }
          if (near === 'brushed_disaster') {
              return `${card.n}: DISASTER — one bad inch past the line.`;
          }
          if (streak && streak.kind === 'hot' && streak.count >= 3) {
              return `${stamp} on ${card.n} — hot streak ×${streak.count}. The machine likes you today.`;
          }
          if (streak && streak.kind === 'cold' && streak.count >= 3) {
              return `${stamp} on ${card.n} — cold streak ×${streak.count}. No pity. Keep walking.`;
          }
          if (stamp === 'BREAKTHROUGH')
              return `${card.n}: BREAKTHROUGH. The kind that makes careers.`;
          if (stamp === 'DISASTER')
              return `${card.n}: DISASTER. The kind that makes enemies.`;
          if (stamp === 'GAIN')
              return `${card.n}: GAIN. Bank it.`;
          return `${card.n}: SETBACK. Next play.`;
      }
      function checkMilestones(state, card, tier, before) {
          const fb = ensureFb(state);
          const seen = new Set(fb.milestonesSeen);
          const fire = (id, text) => {
              if (seen.has(id))
                  return undefined;
              fb.milestonesSeen.push(id);
              return text;
          };
          if (!before.ballot && state.ballot) {
              return fire('first_ballot', 'ON THE BALLOT. The filing clerk stamps your name.');
          }
          if (before.sigs < state.sigNeed * 0.5 && state.signatures >= state.sigNeed * 0.5 && !state.ballot) {
              return fire('half_sigs', 'Halfway to the signature threshold. The clipboard is heavier.');
          }
          if (!state.ballot &&
              state.signatures >= state.sigNeed - 40 &&
              state.signatures < state.sigNeed) {
              // near ballot — may re-fire as juice not milestone once
              return fire('near_ballot', `Almost there — ${state.signatures}/${state.sigNeed} signatures. One more good petition week.`);
          }
          if (tier === 0) {
              return fire('first_break', `First BREAKTHROUGH (${card.n}). Remember how this feels.`);
          }
          if (before.stage === 'primary' && state.stage === 'general') {
              return fire('enter_general', 'PRIMARY WON. Six weeks to November. Turnout is the promise.');
          }
          if (state.outcome === 'won_general') {
              return fire('won_general', 'GENERAL WIN. The district is yours. Session waits.');
          }
          return undefined;
      }
      /**
       * Build feedback for a resolved play. Mutates streak counters on state.feedback only.
       * Call AFTER card.run has applied yields so milestones see new ballot/sigs.
       */
      function buildPlayFeedback(state, card, roll, before) {
          var _a;
          const fb = ensureFb(state);
          const stamp = resolve_js_1.STAMPS[roll.tier];
          const near = detectNearMiss(roll, card.risk, roll.tier);
          const margin = (_a = near === null || near === void 0 ? void 0 : near.margin) !== null && _a !== void 0 ? _a : 0;
          // Streaks: hot = success tiers, cold = fail tiers
          if (roll.tier <= 1) {
              fb.hotStreak += 1;
              fb.coldStreak = 0;
          }
          else {
              fb.coldStreak += 1;
              fb.hotStreak = 0;
          }
          let streak;
          if (fb.hotStreak >= 2)
              streak = { kind: 'hot', count: fb.hotStreak };
          if (fb.coldStreak >= 2)
              streak = { kind: 'cold', count: fb.coldStreak };
          const milestone = checkMilestones(state, card, roll.tier, before);
          const beat = beatForTier(roll.tier, near === null || near === void 0 ? void 0 : near.kind);
          const intensity = intensityFor(roll.tier, margin, near === null || near === void 0 ? void 0 : near.kind);
          const juice = juiceLine(card, stamp, near === null || near === void 0 ? void 0 : near.kind, streak, milestone);
          const feedback = {
              stamp,
              beat,
              intensity,
              margin,
              nearMiss: near === null || near === void 0 ? void 0 : near.kind,
              streak,
              milestone,
              juice
          };
          fb.lastPlay = feedback;
          return feedback;
      }
      exports_5("buildPlayFeedback", buildPlayFeedback);
      function buildWeekSummary(state, playLogs) {
          var _a;
          const fb = ensureFb(state);
          const start = fb.weekStart;
          const stamps = { breakthrough: 0, gain: 0, setback: 0, disaster: 0 };
          for (const p of playLogs) {
              if (p.tier === 0)
                  stamps.breakthrough++;
              else if (p.tier === 1)
                  stamps.gain++;
              else if (p.tier === 3)
                  stamps.disaster++;
              else if (p.tier === 2)
                  stamps.setback++;
          }
          const bestStamp = stamps.breakthrough > 0
              ? 'BREAKTHROUGH'
              : stamps.disaster > 0
                  ? 'DISASTER'
                  : stamps.gain > 0
                      ? 'GAIN'
                      : playLogs.length
                          ? 'SETBACK'
                          : undefined;
          const deltas = {
              contacts: start ? state.contacts - start.contacts : 0,
              money: start ? state.money - start.money : 0,
              signatures: start ? state.signatures - start.signatures : 0,
              nameID: start ? state.nameID - start.nameID : 0,
              volPool: start ? state.volPool - start.volPool : 0,
              gotv: start ? totalGotv(state) - start.gotv : 0
          };
          const milestones = [];
          if (start && !start.ballot && state.ballot)
              milestones.push('Ballot secured');
          if (deltas.signatures >= 80)
              milestones.push('Signature haul');
          if (stamps.breakthrough >= 2)
              milestones.push('Double breakthrough week');
          if (stamps.disaster >= 2)
              milestones.push('Rough week');
          if (state.stage === 'general' && deltas.gotv > 0)
              milestones.push('GOTV banked');
          let headline = `Week ${state.week} closed.`;
          if (bestStamp === 'BREAKTHROUGH')
              headline = `Week ${state.week}: you stole a scene.`;
          else if (bestStamp === 'DISASTER')
              headline = `Week ${state.week}: the paper will remember.`;
          else if (stamps.gain > stamps.setback)
              headline = `Week ${state.week}: net forward.`;
          else if (playLogs.length === 0)
              headline = `Week ${state.week}: empty hands.`;
          const parts = [];
          if (deltas.contacts)
              parts.push(`${deltas.contacts >= 0 ? '+' : ''}${deltas.contacts} contacts`);
          if (deltas.money)
              parts.push(`${deltas.money >= 0 ? '+' : ''}$${deltas.money}`);
          if (deltas.signatures)
              parts.push(`${deltas.signatures >= 0 ? '+' : ''}${deltas.signatures} sigs`);
          if (deltas.nameID)
              parts.push(`${deltas.nameID >= 0 ? '+' : ''}${deltas.nameID} name`);
          if (deltas.gotv)
              parts.push(`+${deltas.gotv.toFixed(2)} GOTV`);
          const juice = parts.length > 0
              ? `${headline} ${parts.join(' · ')}.`
              : `${headline} No ledger move — the calendar still turned.`;
          const summary = {
              week: (_a = start === null || start === void 0 ? void 0 : start.week) !== null && _a !== void 0 ? _a : state.week,
              stage: state.stage,
              plays: playLogs.length,
              stamps,
              bestStamp,
              deltas,
              milestones,
              headline,
              juice
          };
          fb.lastWeek = summary;
          return summary;
      }
      exports_5("buildWeekSummary", buildWeekSummary);
      /** Format for CLI / log line. */
      function formatPlayJuice(fb) {
          const bits = [`[${fb.stamp}]`, fb.juice];
          if (fb.streak && fb.streak.count >= 2) {
              bits.push(fb.streak.kind === 'hot' ? `🔥×${fb.streak.count}` : `❄×${fb.streak.count}`);
          }
          return bits.join(' ');
      }
      exports_5("formatPlayJuice", formatPlayJuice);
      return {
          setters: [
              function (resolve_js_1_1) {
                  resolve_js_1 = resolve_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Dopamine / feedback loop (presentation of truth)
               *
               * Pure. Does NOT alter rolls, bands, or yields.
               * Makes outcomes legible and delicious: stamps, beats, near-misses,
               * streaks, milestones, week summaries.
               */
          }
      };
  });
  /**
   * Starmap v0 — Entity / Orbit / Loop types
   * Design law: issues #17 #18. Cartography first; pilot movement overlays campaign.
   */
  System.register("engine/types-entities", [], function (exports_6, context_6) {
      "use strict";
      var __moduleName = context_6 && context_6.id;
      return {
          setters: [],
          execute: function () {/**
               * Starmap v0 — Entity / Orbit / Loop types
               * Design law: issues #17 #18. Cartography first; pilot movement overlays campaign.
               */
          }
      };
  });
  /**
   * CANDIDATE ZERO — Core Engine Types
   * Single source of truth for state shape and card contracts.
   * Changes here must be reflected in the SRD.
   * Designed for clean eventual port to Swift.
   */
  System.register("engine/types", [], function (exports_7, context_7) {
      "use strict";
      var __moduleName = context_7 && context_7.id;
      return {
          setters: [],
          execute: function () {/**
               * CANDIDATE ZERO — Core Engine Types
               * Single source of truth for state shape and card contracts.
               * Changes here must be reflected in the SRD.
               * Designed for clean eventual port to Swift.
               */
          }
      };
  });
  /**
   * CANDIDATE ZERO — Debt as leveraged optionality (Phase 3)
   *
   * Design correction: debt does NOT tax resolve() odds or bands. Real
   * campaigns don't mark down win probability for a bank note mid-race.
   * Consequence is deferred and asymmetric:
   *
   *   SPEND-NOW: PL21 self-loan (and PAC bridge via PL20) unlock cash beyond
   *   current liquid — real optionality (assets, filing fee, field director).
   *
   *   WIN: retire principal cheaply. Pure self-loan leaves no Session gate.
   *   PAC-bridged debt retires cash too but keeps/grants a Session obligation
   *   (reuse obligations.ts + sessionFlags — not a parallel system).
   *
   *   LOSS: debt compounds into the next cycle (legacy.carry), re-applies
   *   OB2 drag, and tightens *affordability* (availableCash), never odds.
   *   Past a crisis threshold: interim path pressure + PAC Check as relief.
   *
   * Hooks reused (do not invent parallels):
   *   - addObl / applyOblDrag / OB2 Bank Note (src/data/obligations.ts)
   *   - OB1 PAC String (same registry) for Session-lender claim
   *   - sessionFlags for Phase 4 committee/vote gates
   *   - LegacyCarry + applyLegacy (src/engine/legacy.ts)
   *   - canAfford (src/engine/play.ts) reads availableCash only
   */
  System.register("engine/debt", ["data/obligations"], function (exports_8, context_8) {
      "use strict";
      var obligations_js_2, DEBT_AFFORD_THRESHOLD, DEBT_CRISIS_THRESHOLD, DEBT_CYCLE_COMPOUND, DEBT_WIN_SELF_FEE_FRAC, DEBT_WIN_SELF_FEE_CAP;
      var __moduleName = context_8 && context_8.id;
      function isDebtCrisis(state) {
          return (state.debt || 0) >= DEBT_CRISIS_THRESHOLD;
      }
      exports_8("isDebtCrisis", isDebtCrisis);
      /**
       * Cash the player may actually spend. Elevated debt reserves a service
       * cushion so big buys (assets, field director, contrast mail) get harder
       * without touching resolve() odds.
       *
       * Below DEBT_AFFORD_THRESHOLD: full money (leverage still pure upside).
       */
      function availableCash(state) {
          const money = state.money || 0;
          const debt = state.debt || 0;
          if (debt <= DEBT_AFFORD_THRESHOLD)
              return money;
          const over = debt - DEBT_AFFORD_THRESHOLD;
          // 8¢ per dollar over the line reserved — bites affordability, not RNG.
          const reserve = Math.min(money, Math.floor(over * 0.08));
          return Math.max(0, money - reserve);
      }
      exports_8("availableCash", availableCash);
      /** True if the card's $ cost is covered by availableCash (not raw money). */
      function canAffordCash(state, dollarCost) {
          if (dollarCost <= 0)
              return true;
          return availableCash(state) >= dollarCost;
      }
      exports_8("canAffordCash", canAffordCash);
      /**
       * Take a self-loan (PL21). Spend-now lever: +cash immediately, principal
       * on the books, OB2 weekly interest. Marks selfLoanTaken.
       * Does not touch odds.
       */
      function applySelfLoan(state, principal = 3000) {
          const owed = Math.floor(principal * 1.4);
          state.money += principal;
          state.debt = (state.debt || 0) + owed;
          state.selfLoanTaken = true;
          state.faces.G -= 8;
          obligations_js_2.addObl(state, 'OB2');
          return (`+$${principal} now; $${owed} owed later, win or lose. ` +
              `(Self-loan — Bank Note OB2 interest weekly. Win retires cheap; loss compounds.)`);
      }
      exports_8("applySelfLoan", applySelfLoan);
      /**
       * PAC Check under debt pressure can *bridge* the bank note: principal stays
       * until win/loss branch, but ownership shifts to the PAC lender. On win,
       * cash retires cheaply and the lender keeps a Session claim (OB1 + flag).
       *
       * Reuses addObl('OB1') — same PAC String registry entry as a normal check.
       * Returns flavor; mutates state. Call from PL20 after base money grant.
       */
      function maybePacBridge(state, pacMoney) {
          const debt = state.debt || 0;
          if (debt <= 0)
              return '';
          // Bridge the lesser of outstanding debt and ~half the PAC check.
          const bridged = Math.min(debt, Math.floor(pacMoney * 0.5) + Math.min(debt, 1500));
          if (bridged <= 0)
              return '';
          state.pacBridgeDebt = (state.pacBridgeDebt || 0) + bridged;
          // Bank note interest eases once the PAC holds the paper — remove OB2 if
          // the whole principal is bridged; otherwise keep dragging the remainder.
          const selfLeft = Math.max(0, debt - (state.pacBridgeDebt || 0));
          // Keep debt total for loss-compound; track pac share separately.
          if (selfLeft <= 0 || (state.pacBridgeDebt || 0) >= debt) {
              state.obls = state.obls.filter(id => id !== 'OB2');
          }
          // PAC always holds a string when they bridge (registry, not free-text).
          obligations_js_2.addObl(state, 'OB1');
          state.sessionFlags = state.sessionFlags || {};
          state.sessionFlags.pac_bridge_pending = true;
          if (isDebtCrisis(state)) {
              // Crisis relief: principal pay-down with the other half of the check.
              const pay = Math.min(state.debt, Math.floor(pacMoney * 0.35));
              state.debt = Math.max(0, state.debt - pay);
              state.pacBridgeDebt = Math.min(state.pacBridgeDebt || 0, state.debt);
              return (` PAC bridge: $${bridged} of the note is their paper now; $${pay} paid down. ` +
                  `(Crisis relief — Session will still hear from them.)`);
          }
          return (` PAC bridge: $${bridged} of your note is now their paper. ` +
              `(Win retires the cash cheap; they keep a Session claim.)`);
      }
      exports_8("maybePacBridge", maybePacBridge);
      /**
       * Win-branch debt retirement — call on won_general (reelection handoff or
       * Session entry stub). Cheap for self-loan; PAC bridge clears cash but
       * leaves Session gate via OB1 + sessionFlags.pac_lender_claim.
       *
       * No resolve() side effects.
       */
      function retireDebtOnWin(state) {
          var _a;
          const debt = state.debt || 0;
          const pacShare = Math.min(debt, state.pacBridgeDebt || 0);
          const selfShare = Math.max(0, debt - pacShare);
          let feePaid = 0;
          if (selfShare > 0) {
              feePaid = Math.min(state.money, Math.min(DEBT_WIN_SELF_FEE_CAP, Math.ceil(selfShare * DEBT_WIN_SELF_FEE_FRAC)));
              state.money -= feePaid;
          }
          state.debt = 0;
          state.pacBridgeDebt = 0;
          state.selfLoanTaken = false;
          // Bank note done either way on a win.
          state.obls = state.obls.filter(id => id !== 'OB2');
          let sessionClaim = false;
          if (pacShare > 0 || ((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.pac_bridge_pending) || state.obls.includes('OB1')) {
              sessionClaim = true;
              state.sessionFlags = state.sessionFlags || {};
              state.sessionFlags.pac_lender_claim = true;
              delete state.sessionFlags.pac_bridge_pending;
              // Keep OB1 as the Session leash (gates committee/vote in Phase 4).
              obligations_js_2.addObl(state, 'OB1');
          }
          const text = debt <= 0
              ? 'No notes on the books.'
              : sessionClaim
                  ? `Notes retired for $${feePaid} (self) + PAC bridge cleared. ` +
                      `The Third House still holds a claim — Session committee work is not free. (OB1 kept.)`
                  : `Self-loan retired for $${feePaid}. Homestead risk is paid; no Session leash.`;
          if (debt > 0) {
              state.log.push({ week: state.week, kind: 'note', text: `DEBT SETTLED — ${text}` });
          }
          return {
              selfRetired: selfShare,
              pacRetired: pacShare,
              feePaid,
              sessionClaim,
              text
          };
      }
      exports_8("retireDebtOnWin", retireDebtOnWin);
      /**
       * Loss-branch: what carries into the Chronicle for the next cycle.
       * Compounds principal; bank note + PAC string ids for re-application.
       */
      function debtCarryFromLoss(state) {
          const raw = state.debt || 0;
          if (raw <= 0)
              return { debt: 0, pacBridgeDebt: 0, debtObls: [] };
          const compounded = Math.ceil(raw * DEBT_CYCLE_COMPOUND);
          const pac = Math.min(compounded, Math.ceil((state.pacBridgeDebt || 0) * DEBT_CYCLE_COMPOUND));
          // Durable obligations that ride with the note (archive reelect filter spirit).
          const debtObls = state.obls.filter(id => id === 'OB1' || id === 'OB2' || id === 'OB3');
          return { debt: compounded, pacBridgeDebt: pac, debtObls };
      }
      exports_8("debtCarryFromLoss", debtCarryFromLoss);
      /**
       * Apply carried debt onto a fresh (or reelection) run. Re-attaches OB2 so
       * weekly drag compounds cycle-to-cycle. Tightens starting cash when crisis.
       */
      function applyCarriedDebt(state, carry) {
          const debt = carry.debt || 0;
          if (debt <= 0)
              return;
          state.debt = debt;
          state.pacBridgeDebt = carry.pacBridgeDebt || 0;
          if (state.pacBridgeDebt > 0) {
              state.sessionFlags = state.sessionFlags || {};
              state.sessionFlags.pac_bridge_pending = true;
          }
          // Re-apply bank note if any self-share remains (or full debt if no bridge).
          const selfShare = debt - (state.pacBridgeDebt || 0);
          if (selfShare > 0 || !state.pacBridgeDebt) {
              obligations_js_2.addObl(state, 'OB2');
          }
          for (const id of carry.debtObls || []) {
              if (obligations_js_2.OBLS[id])
                  obligations_js_2.addObl(state, id);
          }
          // Crisis / elevated debt: starting war chest takes a service haircut
          // (affordability), not an odds tax.
          if (debt >= DEBT_AFFORD_THRESHOLD) {
              const haircut = Math.min(state.money, Math.floor((debt - DEBT_AFFORD_THRESHOLD) * 0.1));
              state.money = Math.max(0, state.money - haircut);
          }
          state.log.push({
              week: state.week,
              kind: 'note',
              text: `THE NOTE FOLLOWED YOU — $${debt} still on the books` +
                  (debt >= DEBT_CRISIS_THRESHOLD
                      ? ' (crisis). Cash is tight; the PAC Check is the structured relief valve.'
                      : '. Interest resumes (OB2).')
          });
      }
      exports_8("applyCarriedDebt", applyCarriedDebt);
      /**
       * Merge loss debt into Chronicle carry (called from recordRun).
       * Win path zeros debt carry (retirement happens separately on reelect).
       */
      function mergeDebtIntoCarry(carry, state, kind) {
          if (kind === 'won_general') {
              // Winner settles before the next ballot; don't poison the Chronicle.
              return { ...carry, debt: 0, pacBridgeDebt: 0, debtObls: [] };
          }
          const d = debtCarryFromLoss(state);
          return {
              ...carry,
              debt: d.debt,
              pacBridgeDebt: d.pacBridgeDebt,
              debtObls: d.debtObls
          };
      }
      exports_8("mergeDebtIntoCarry", mergeDebtIntoCarry);
      /** Convenience: apply legacy carry debt after createCampaign/applyLegacy. */
      function applyLegacyDebt(state, legacy) {
          var _a;
          if (((_a = legacy.carry) === null || _a === void 0 ? void 0 : _a.debt) && legacy.carry.debt > 0) {
              applyCarriedDebt(state, legacy.carry);
          }
      }
      exports_8("applyLegacyDebt", applyLegacyDebt);
      /**
       * Loss interim: at crisis, Perennial is always open (worse economics via
       * carried debt already); other paths stay but Staffer may close if the
       * books look radioactive. Pure path filter helper for buildPaths.
       */
      function debtCrisisPathIds(state) {
          if (!isDebtCrisis(state))
              return null;
          // Force the thematic choice surface: keep running (perennial) or go home
          // and heal. Advocate/staffer still possible if gates pass — but perennial
          // is emphasized; harness checks perennial is always present.
          return null; // paths themselves stay; economics are the bite
      }
      exports_8("debtCrisisPathIds", debtCrisisPathIds);
      /**
       * PL20 visibility: once ballot (tier≥1) or debt crisis. Callers also gate
       * on !pacCheckTaken / !OB1 so it cannot spam free money.
       */
      function pacCheckAvailable(state) {
          var _a, _b;
          if ((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.pacCheckTaken)
              return false;
          if (state.obls.includes('OB1'))
              return false;
          if (isDebtCrisis(state) && (state.debt || 0) > 0)
              return true;
          return ((_b = state.tier) !== null && _b !== void 0 ? _b : 0) >= 1;
      }
      exports_8("pacCheckAvailable", pacCheckAvailable);
      return {
          setters: [
              function (obligations_js_2_1) {
                  obligations_js_2 = obligations_js_2_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Debt as leveraged optionality (Phase 3)
               *
               * Design correction: debt does NOT tax resolve() odds or bands. Real
               * campaigns don't mark down win probability for a bank note mid-race.
               * Consequence is deferred and asymmetric:
               *
               *   SPEND-NOW: PL21 self-loan (and PAC bridge via PL20) unlock cash beyond
               *   current liquid — real optionality (assets, filing fee, field director).
               *
               *   WIN: retire principal cheaply. Pure self-loan leaves no Session gate.
               *   PAC-bridged debt retires cash too but keeps/grants a Session obligation
               *   (reuse obligations.ts + sessionFlags — not a parallel system).
               *
               *   LOSS: debt compounds into the next cycle (legacy.carry), re-applies
               *   OB2 drag, and tightens *affordability* (availableCash), never odds.
               *   Past a crisis threshold: interim path pressure + PAC Check as relief.
               *
               * Hooks reused (do not invent parallels):
               *   - addObl / applyOblDrag / OB2 Bank Note (src/data/obligations.ts)
               *   - OB1 PAC String (same registry) for Session-lender claim
               *   - sessionFlags for Phase 4 committee/vote gates
               *   - LegacyCarry + applyLegacy (src/engine/legacy.ts)
               *   - canAfford (src/engine/play.ts) reads availableCash only
               */
              /** Above this carried debt, next-cycle cash is partially reserved for service. */
              exports_8("DEBT_AFFORD_THRESHOLD", DEBT_AFFORD_THRESHOLD = 2000);
              /**
               * Crisis line: loss-branch interim paths narrow; in-campaign PAC Check
               * becomes the structured relief valve (no new desperate-fund card).
               */
              exports_8("DEBT_CRISIS_THRESHOLD", DEBT_CRISIS_THRESHOLD = 5000);
              /** Between-cycle interest on unretired principal (loss branch only). */
              exports_8("DEBT_CYCLE_COMPOUND", DEBT_CYCLE_COMPOUND = 1.15);
              /** Cheap win-branch retirement fee as a fraction of self-loan principal. */
              exports_8("DEBT_WIN_SELF_FEE_FRAC", DEBT_WIN_SELF_FEE_FRAC = 0.05);
              /** Max token fee when settling self-loan on a win (cents of campaign cash). */
              exports_8("DEBT_WIN_SELF_FEE_CAP", DEBT_WIN_SELF_FEE_CAP = 200);
          }
      };
  });
  /**
   * Wave 4 Plays — force multipliers + honest traps + Phase 2 ally grants
   * Grounded in archive prototype ACTIONS (volun, message, pac, selffund)
   * plus Contrast Mail, ally-grant ports (PL22B/PL30/PL32/PL48/PL29).
   */
  System.register("data/plays-wave4", ["engine/rng", "engine/reputation", "data/obligations", "engine/debt"], function (exports_9, context_9) {
      "use strict";
      var rng_js_2, reputation_js_2, obligations_js_3, debt_js_1, PL16_RecruitVolunteers, PL18_SharpenMessage, PL20_PacCheck, PL21_SelfFundCredit, PL22_ContrastMail, PL21B_PromoteCanvassCaptain, PL39_HireFieldDirector, PL22B_SeeSlateMaker, PL30_PrayerBreakfast, PL32_CoffeeEditor, PL48_CourtCountyJudge, PL29_AttendFuneral, WAVE4_PLAYS;
      var __moduleName = context_9 && context_9.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      function R(n) {
          return rng_js_2.random() * n;
      }
      return {
          setters: [
              function (rng_js_2_1) {
                  rng_js_2 = rng_js_2_1;
              },
              function (reputation_js_2_1) {
                  reputation_js_2 = reputation_js_2_1;
              },
              function (obligations_js_3_1) {
                  obligations_js_3 = obligations_js_3_1;
              },
              function (debt_js_1_1) {
                  debt_js_1 = debt_js_1_1;
              }
          ],
          execute: function () {/**
               * Wave 4 Plays — force multipliers + honest traps + Phase 2 ally grants
               * Grounded in archive prototype ACTIONS (volun, message, pac, selffund)
               * plus Contrast Mail, ally-grant ports (PL22B/PL30/PL32/PL48/PL29).
               */
              exports_9("PL16_RecruitVolunteers", PL16_RecruitVolunteers = {
                  id: 'PL16', n: 'Recruit Volunteers', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'force multiplier',
                  attrs: ['CLO', 'CHA'],
                  d: 'An army marches on casseroles. Every volunteer makes every other card better.',
                  odds: (s) => clamp(0.5 + s.faces.T * 0.004 + s.nameID * 0.003, 0, 0.95),
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          const v = o.tier === 0 ? 4 : 2;
                          s.volPool += v;
                          return `+${v} volunteers. One owns a truck with a flatbed. This matters.`;
                      }
                      if (o.tier === 2) {
                          s.volPool += 1;
                          return '+1 volunteer, your cousin, under protest.';
                      }
                      s.volPool = Math.max(0, s.volPool - 1);
                      return 'A volunteer quits loudly on Facebook. It stings more than it should.';
                  }
              });
              exports_9("PL18_SharpenMessage", PL18_SharpenMessage = {
                  id: 'PL18', n: 'Sharpen the Message', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'one issue, said right',
                  attrs: ['CON'],
                  d: 'You are not running on nine things. You are running on one thing, said so it stays said.',
                  show: (s) => !s.messageSharp,
                  odds: (s) => clamp(0.6 + s.faces.T * 0.003, 0, 0.95),
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          s.messageSharp = true;
                          s.faces.T += 5;
                          return 'Five words now, and they land. Permanent bonus to persuasion work.';
                      }
                      if (o.tier === 2)
                          return 'Drafts, drafts, drafts. Nothing sings yet.';
                      s.faces.T -= 3;
                      return 'You test a clever line and it curdles. The consultant word for this is "pivot."';
                  }
              });
              exports_9("PL20_PacCheck", PL20_PacCheck = {
                  id: 'PL20', n: 'Take the PAC Check', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'the Third House pays well',
                  attrs: ['CRA', 'DIP'],
                  kind: 'bargain',
                  trap: true,
                  d: 'A man in a good suit admires your race. The check is real. So is the string tied to it. Once. Session will collect.',
                  // Once per campaign — never a free-money ATM. Crisis may open early (debt.ts).
                  show: (s) => {
                      var _a;
                      return debt_js_1.pacCheckAvailable(s) &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pacCheckTaken) &&
                          !s.obls.includes('OB1');
                  },
                  odds: () => 0.9,
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pacCheckTaken = true;
                      if (o.tier === 3) {
                          s.hitPieces++;
                          return 'The check bounces into the news instead of your account. "WHO IS FUNDING CANDIDATE?" (The Third House will not offer again.)';
                      }
                      // Tuned down from 2500–4500 — still real money, not a landslide
                      const m = 1400 + Math.floor(R(900));
                      s.money += m;
                      s.faces.L -= 12;
                      obligations_js_3.addObl(s, 'OB1');
                      const bridge = debt_js_1.maybePacBridge(s, m);
                      return (`+$${m}. The Third House has opened an account in your name. ` +
                          `(PAC String OB1 — L and exposure drag every week. Session referral will not be free.)${bridge}`);
                  }
              });
              exports_9("PL21_SelfFundCredit", PL21_SelfFundCredit = {
                  id: 'PL21', n: 'Self-Fund on Credit', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2], tag: 'the bank believes in you',
                  attrs: ['CRA'],
                  kind: 'bargain',
                  trap: true,
                  d: "The bank will lend against the homestead. Campaigns have eaten better men's farms. Spend it now — the bill lands on the win/loss branch, not your odds.",
                  // Phase 3: once-per-run spend-now lever (debt.ts applySelfLoan)
                  show: (s) => !s.selfLoanTaken,
                  odds: () => 0.95,
                  run: (s) => debt_js_1.applySelfLoan(s, 3000)
              });
              exports_9("PL22_ContrastMail", PL22_ContrastMail = {
                  id: 'PL22', n: 'Contrast Mail', cost: { a: 1, $: 800 }, risk: 'VOL', ph: [2, 3], tag: 'the folder spent',
                  attrs: ['CRA', 'INK'],
                  d: 'What the quiet man found, printed on cheap stock and mailed to every primary voter who votes.',
                  // archive:639 also requires A03 Mail Program — keep modular oppoFile primary;
                  // A03 is still a real shop unlock for parity / future tightening.
                  req: (s) => s.oppoFile,
                  odds: (s) => clamp(0.48 + s.faces.O * 0.003 - s.exposure * 0.04, 0, 0.9),
                  run: (s, o) => {
                      s.shadowPlays++;
                      s.faces.O -= 3;
                      if (o.tier === 0) {
                          s.momentum += 3;
                          s.nameID += 6;
                          return 'The piece lands. Rivals scramble. Your name is in every kitchen — and not only for the right reasons.';
                      }
                      if (o.tier === 1) {
                          s.momentum += 1;
                          s.nameID += 3;
                          return 'A solid hit. Half the district shrugs; the half that votes primary does not.';
                      }
                      if (o.tier === 2)
                          return 'It reads mean. The chairs notice. No bounce.';
                      s.hitPieces += 2;
                      s.exposure += 1;
                      s.momentum = Math.max(0, s.momentum - 2);
                      return 'They reverse the attack. Your file is now their mailer. Exposure up.';
                  }
              });
              exports_9("PL21B_PromoteCanvassCaptain", PL21B_PromoteCanvassCaptain = {
                  id: 'PL21B', n: 'Promote a Canvass Captain', cost: { a: 1, vp: 3 }, risk: 'SAFE', ph: [1, 2, 3], field: true, tag: 'the field gets a spine',
                  attrs: ['DIP'],
                  d: 'One volunteer stops showing up as a volunteer and starts showing up as staff.',
                  show: (s) => !reputation_js_2.findAlly(s, 'AL09'),
                  odds: () => 0.95,
                  run: (s, _o, g) => {
                      // Phase 1: the captain is localized to the ground she's promoted at.
                      reputation_js_2.addAlly(s, 'AL09', 3, g === null || g === void 0 ? void 0 : g.id);
                      s.fieldAp = 1;
                      const where = g ? ` at ${g.n}` : '';
                      return `She has a route book, a phone tree, and opinions about your map. The field has a spine now${where}.`;
                  }
              });
              exports_9("PL39_HireFieldDirector", PL39_HireFieldDirector = {
                  id: 'PL39', n: 'Hire a Field Director', cost: { a: 1, $: 2200 }, risk: 'STD', ph: [1, 2], field: true, tag: 'professionalize',
                  attrs: ['DIP'], w: 1,
                  d: "A professional who has run four of these before. Money buys what volunteers can't always deliver on schedule.",
                  req: (s) => !reputation_js_2.warm(s, 'AL09'),
                  odds: () => 0.8,
                  run: (s, o, g) => {
                      if (o.tier <= 1) {
                          // Phase 1: hired onto a specific ground; that's the turf she runs.
                          reputation_js_2.addAlly(s, 'AL09', 3, g === null || g === void 0 ? void 0 : g.id);
                          s.fieldAp = 1;
                          const where = g ? ` at ${g.n}` : '';
                          return `She has run four of these and lost only one. The field has a professional now${where}.`;
                      }
                      return 'The good ones are all hired. You get a resume stack and a headache.';
                  }
              });
              /** archive:671–673 — See the Slate-Maker → AL16 + OB3 */
              exports_9("PL22B_SeeSlateMaker", PL22B_SeeSlateMaker = {
                  id: 'PL22B', n: 'See the Slate-Maker', cost: { a: 1, $: 1500 }, risk: 'STD', ph: [2, 3], tag: 'the printed word',
                  attrs: ['DIP', 'CRA'],
                  d: 'One man prints the card half the primary votes from. His price is never only money.',
                  show: (s) => reputation_js_2.warm(s, 'AL02') && !s.slate,
                  odds: () => 0.75,
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          s.slate = true;
                          reputation_js_2.addAlly(s, 'AL16', 2);
                          obligations_js_3.addObl(s, 'OB3');
                          return "Your name goes on the card. So does his marker. (Slate-Maker's Price recorded — one future endorsement is his to spend.)";
                      }
                      return 'He takes the meeting, keeps the check in your hand. "Come back when the Chairwoman calls me herself."';
                  }
              });
              /** archive:712–715 — Prayer Breakfast → AL08 at threshold */
              exports_9("PL30_PrayerBreakfast", PL30_PrayerBreakfast = {
                  id: 'PL30', n: 'Prayer Breakfast', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], tag: 'the corridor opens',
                  attrs: ['CON', 'DIP'],
                  d: 'Biscuits at six-thirty. The Corridor watches who shows before sunrise.',
                  req: (s) => s.backers.includes('B02'),
                  odds: () => 0.85,
                  run: (s, o) => {
                      var _a, _b;
                      s.faces.T += 2;
                      s.faces.G += 2;
                      const g = s.groundsArr.find(x => x.id === 'GR04');
                      if (g) {
                          if (s.rapStall) {
                              g.rapport = Math.min(100, g.rapport + Math.ceil(4 / 2));
                          }
                          else {
                              g.rapport = Math.min(100, g.rapport + Math.round(4 * ((_a = s.groundRapMult) !== null && _a !== void 0 ? _a : 1)));
                          }
                      }
                      s.pbCount = (s.pbCount || 0) + 1;
                      // archive:715
                      if (s.pbCount >= 2 && ((_b = g === null || g === void 0 ? void 0 : g.rapport) !== null && _b !== void 0 ? _b : 0) >= 30) {
                          reputation_js_2.addAlly(s, 'AL08', 3);
                          if (g)
                              g.gated = false;
                          s.volPool += 2;
                          if (!s.assets.includes('A13'))
                              s.assets.push('A13');
                          return 'The Pastor takes your hand in both of his. The Corridor — and its directory — open. +2 volunteers.';
                      }
                      void o;
                      return 'Biscuits, gravy, standing. The Corridor notes attendance.';
                  }
              });
              /** archive:720–723 — Coffee with the Editor → AL04 on tier 0 if not already */
              exports_9("PL32_CoffeeEditor", PL32_CoffeeEditor = {
                  id: 'PL32', n: 'Coffee with the Editor', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'earned goodwill',
                  attrs: ['DIP'], w: 2,
                  d: 'Not for an endorsement — for a fair shake. The weekly decides who\'s "serious" long before the voters do.',
                  odds: (s) => clamp(0.5 + (reputation_js_2.warm(s, 'AL04') ? 0.15 : 0), 0, 0.9),
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          s.nameID += 3;
                          if (!reputation_js_2.findAlly(s, 'AL04') && o.tier === 0)
                              reputation_js_2.addAlly(s, 'AL04', 2);
                          return 'A cordial hour. You get the benefit of the doubt in print for a while.';
                      }
                      return "He's polite and noncommittal. Reporters usually are.";
                  }
              });
              /** archive:776–779 — Court the County Judge → AL15 on tier 0 */
              exports_9("PL48_CourtCountyJudge", PL48_CourtCountyJudge = {
                  id: 'PL48', n: 'Court the County Judge', cost: { a: 1 }, risk: 'VOL', ph: [2, 3], tag: 'the heaviest name',
                  attrs: ['DIP'], w: 1,
                  d: 'The one endorsement that moves a whole county. He gives it to winners, so look like one.',
                  req: (s) => s.endorsePts >= 3,
                  odds: (s) => clamp(0.35 + s.endorsePts * 0.02 + s.faces.G * 0.003, 0, 0.8),
                  run: (s, o) => {
                      if (o.tier === 0) {
                          reputation_js_2.addAlly(s, 'AL15', 3);
                          s.endorsePts += 2;
                          s.nameID += 4;
                          return 'The County Judge is with you. In this county, that is very nearly the ballgame.';
                      }
                      if (o.tier === 1) {
                          s.endorsePts += 1;
                          return 'A warm word, short of a formal nod. Still worth having.';
                      }
                      if (o.tier === 2)
                          return '"Let\'s talk after the primary." He backs winners, and isn\'t sure yet.';
                      s.faces.O -= 2;
                      return 'You overplayed it. He values his independence and just reasserted it.';
                  }
              });
              /**
               * archive:708–711 / 1547 — Attend the Funeral (CHOICE simplified to SAFE respect path).
               * Archive has a UI choice; modular grants AL06 on success (the respect path).
               * show: funeralWeek === week (set by calendar advanceAllyEvents).
               */
              exports_9("PL29_AttendFuneral", PL29_AttendFuneral = {
                  id: 'PL29', n: 'Attend the Funeral', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], tag: 'the morality lesson',
                  attrs: ['CHA'],
                  d: 'A beloved judge has died. You can be present, or you can be seen. Presence earns the living.',
                  show: (s) => s.funeralWeek === s.week,
                  odds: () => 0.95,
                  run: (s) => {
                      // archive fRespect path:1547 — G+=5, addAlly AL06
                      s.faces.G += 5;
                      reputation_js_2.addAlly(s, 'AL06', 2);
                      s.funeralWeek = -1;
                      return 'You sit in the back, sign the book, leave before the cameras. The living notice. (Retired Judge is with you.)';
                  }
              });
              /**
               * Wave 4 — Main Deck (including scarce bargains PL20/PL21).
               * PL29 funeral is Main + event-triggered show-gate, not Outside
               * (player still chooses to attend). See docs/CARD-RESIDENCY.md.
               */
              exports_9("WAVE4_PLAYS", WAVE4_PLAYS = (() => {
                  const cards = [
                      PL16_RecruitVolunteers,
                      PL18_SharpenMessage,
                      PL20_PacCheck,
                      PL21_SelfFundCredit,
                      PL22_ContrastMail,
                      PL21B_PromoteCanvassCaptain,
                      PL39_HireFieldDirector,
                      PL22B_SeeSlateMaker,
                      PL30_PrayerBreakfast,
                      PL32_CoffeeEditor,
                      PL48_CourtCountyJudge,
                      PL29_AttendFuneral
                  ];
                  for (const c of cards) {
                      if (c.residency === undefined)
                          c.residency = 'main';
                      if (c.control === undefined)
                          c.control = 'player';
                  }
                  return cards;
              })());
          }
      };
  });
  /**
   * Purchasable campaign assets — ported from archive/prototype-single-file.html
   * ASSETS registry + assetPlays() (lines ~819–831).
   *
   * Shop entries appear as always-available camp actions (0 AP; money or
   * volunteer cost). Buying pushes the id onto state.assets; cards that
   * already check s.assets.includes('A01'/'A09'/…) become live.
   *
   * Not inventing: only the eight archive shop assets. A13 Church Directory
   * is granted by PL30 Prayer Breakfast, not sold.
   */
  System.register("data/assets", [], function (exports_10, context_10) {
      "use strict";
      var ASSETS, SHOP_ASSET_IDS;
      var __moduleName = context_10 && context_10.id;
      /**
       * Build BUY* plays for assets the player does not yet own and whose req
       * (if any) is met. Port of archive assetPlays() (line ~829–831).
       */
      function buildShopPlays(state) {
          const out = [];
          for (const [id, a] of Object.entries(ASSETS)) {
              if (state.assets.includes(id))
                  continue;
              if (a.req && !a.req(state))
                  continue;
              out.push({
                  id: 'BUY' + id,
                  n: 'Acquire: ' + a.n,
                  cost: { a: 0, $: a.cost || undefined, vp: a.vcost || undefined },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'asset',
                  kind: 'item',
                  residency: 'main',
                  control: 'player',
                  d: a.d,
                  odds: () => 1,
                  run: s => {
                      if (!s.assets.includes(id))
                          s.assets.push(id);
                      return a.n + ' acquired. ' + a.d;
                  }
              });
          }
          return out;
      }
      exports_10("buildShopPlays", buildShopPlays);
      /** Static catalog of all BUY* cards (for dead-refs / harness; show gates live state). */
      function allShopPlayTemplates() {
          return Object.entries(ASSETS).map(([id, a]) => ({
              id: 'BUY' + id,
              n: 'Acquire: ' + a.n,
              cost: { a: 0, $: a.cost || undefined, vp: a.vcost || undefined },
              risk: 'SAFE',
              ph: [1, 2, 3],
              tag: 'asset',
              kind: 'item',
              /** Main unlocks — persistent assets the campaign carries. */
              residency: 'main',
              control: 'player',
              d: a.d,
              show: (s) => !s.assets.includes(id) && (!a.req || a.req(s)),
              odds: () => 1,
              run: (s) => {
                  if (!s.assets.includes(id))
                      s.assets.push(id);
                  return a.n + ' acquired. ' + a.d;
              }
          }));
      }
      exports_10("allShopPlayTemplates", allShopPlayTemplates);
      return {
          setters: [],
          execute: function () {/**
               * Purchasable campaign assets — ported from archive/prototype-single-file.html
               * ASSETS registry + assetPlays() (lines ~819–831).
               *
               * Shop entries appear as always-available camp actions (0 AP; money or
               * volunteer cost). Buying pushes the id onto state.assets; cards that
               * already check s.assets.includes('A01'/'A09'/…) become live.
               *
               * Not inventing: only the eight archive shop assets. A13 Church Directory
               * is granted by PL30 Prayer Breakfast, not sold.
               */
              /**
               * Archive ASSETS (prototype-single-file.html:820–827).
               * Order matches archive Object.entries iteration for harness stability.
               */
              exports_10("ASSETS", ASSETS = {
                  // archive line 820
                  A01: {
                      id: 'A01',
                      n: 'The Walk List',
                      cost: 400,
                      req: s => s.assets.includes('A02'),
                      d: 'Walks +50%, targeted doors.'
                  },
                  // archive line 821
                  A02: {
                      id: 'A02',
                      n: 'Voter File Access',
                      cost: 400,
                      d: 'Enables the Walk List and absentee targeting.'
                  },
                  // archive line 822
                  A03: {
                      id: 'A03',
                      n: 'Mail Program',
                      cost: 1500,
                      d: 'Unlocks Contrast Mail (with Oppo File); Subdivisions convert ×2.'
                  },
                  // archive line 823
                  A04: {
                      id: 'A04',
                      n: 'Website That Works',
                      cost: 300,
                      d: 'Small-dollar list compounds.'
                  },
                  // archive line 824
                  A06: {
                      id: 'A06',
                      n: 'The Flatbed Truck',
                      cost: 800,
                      d: 'Rides to the Polls; FM Roads events double.'
                  },
                  // archive line 825 — money 0, volunteer cost 2
                  A09: {
                      id: 'A09',
                      n: 'Phone Tree',
                      cost: 0,
                      vcost: 2,
                      d: 'Phone Bank doubles; college kids flake-proofed.'
                  },
                  // archive line 826
                  A11: {
                      id: 'A11',
                      n: 'Push Cards',
                      cost: 250,
                      d: 'Every walk adds +1 name ID.'
                  },
                  // archive line 827
                  A12: {
                      id: 'A12',
                      n: 'Billboard on the Highway',
                      cost: 2000,
                      d: 'Passive name ID, Phase II–III.'
                  }
              });
              /** Asset ids that the shop can sell (excludes BIO_/ISSUE_/REGION_ tags). */
              exports_10("SHOP_ASSET_IDS", SHOP_ASSET_IDS = Object.keys(ASSETS));
          }
      };
  });
  /**
   * Starmap entity catalog — exhaustive list from issue #17.
   * Every political actor role is a row. Playable loops come later; pilot is Precinct Chair.
   */
  System.register("data/starmap/entities", [], function (exports_11, context_11) {
      "use strict";
      var PLAYER, TIER0, TIER1, TIER2, TIER3, TIER4, TIER5, TIER6, TIER7, PROCEDURAL, ALL, ENTITIES, ALL_ENTITY_IDS;
      var __moduleName = context_11 && context_11.id;
      function e(id, name, tier, cluster, flavor, primaryLoopId, opts = {}) {
          var _a;
          return {
              id,
              name,
              tier,
              cluster,
              flavor,
              primaryLoopId,
              subloopIds: (_a = opts.subloopIds) !== null && _a !== void 0 ? _a : [],
              allyId: opts.allyId,
              tags: opts.tags
          };
      }
      function getEntityDef(id) {
          return ENTITIES[id];
      }
      exports_11("getEntityDef", getEntityDef);
      function listEntitiesByTier(tier) {
          return ALL.filter(x => x.tier === tier);
      }
      exports_11("listEntitiesByTier", listEntitiesByTier);
      return {
          setters: [],
          execute: function () {/**
               * Starmap entity catalog — exhaustive list from issue #17.
               * Every political actor role is a row. Playable loops come later; pilot is Precinct Chair.
               */
              /** Player-as-candidate node for orbit targets. */
              PLAYER = e('ENT_HOUSE_CANDIDATE', 'State House candidate (you)', 1, 'grassroots', 'Candidate Zero — no money, no name, no blessing. The climb starts at the courthouse door.', 'LOOP_TMPL_GRASSROOTS', { tags: ['player'] });
              TIER0 = [
                  e('ENT_SOUTH_STEPS_ACTIVIST', 'Homeless activist (South Steps)', 0, 'street', 'Rants on the Capitol steps. Presence without a PAC.', 'LOOP_ENT_SOUTH_STEPS_ACTIVIST'),
                  e('ENT_BLOCK_WALKER', 'Precinct-level block walker', 0, 'street', 'Boots, clipboard, dogs, heat.', 'LOOP_ENT_BLOCK_WALKER'),
                  e('ENT_CONSTITUENT', 'Disgruntled constituent', 0, 'street', 'Casework demand; town-hall ambush potential.', 'LOOP_ENT_CONSTITUENT'),
                  e('ENT_BAR_OWNER', 'Local bar owner / small-business donor', 0, 'street', 'Small check, big room, strings optional.', 'LOOP_ENT_BAR_OWNER'),
                  e('ENT_CHURCH_FLOCK', "Church congregation / pastor's flock", 0, 'street', 'Sunday presence; directory potential.', 'LOOP_ENT_CHURCH_FLOCK'),
                  e('ENT_UNION_RANK', 'Union rank-and-file worker', 0, 'street', 'Plant gate, shift change, solidarity.', 'LOOP_ENT_UNION_RANK'),
                  e('ENT_STUDENT_ACTIVIST', 'College student activist', 0, 'street', 'Campus energy; purity tests included.', 'LOOP_ENT_STUDENT_ACTIVIST'),
                  e('ENT_RETIRED_VET', 'Retired veteran on fixed income', 0, 'street', 'Halls culture; honor; fixed income.', 'LOOP_ENT_RETIRED_VET'),
                  e('ENT_BORDER_RESIDENT', 'Border community resident', 0, 'street', 'Distance, scrutiny, real stakes.', 'LOOP_ENT_BORDER_RESIDENT'),
                  e('ENT_ROUGHNECK', 'Oil field worker / roughneck', 0, 'street', 'Boom, bust, regulation talk.', 'LOOP_ENT_ROUGHNECK'),
                  e('ENT_RANCHER', 'Rancher / farmer facing regulation', 0, 'street', 'Water, land, ag exemption orthodoxy.', 'LOOP_ENT_RANCHER'),
                  e('ENT_SOCIAL_TROLL', 'Social media troll / anonymous influencer', 0, 'street', 'Reach without a name; oppo surface.', 'LOOP_ENT_SOCIAL_TROLL')
              ];
              TIER1 = [
                  e('ENT_INTERN', 'Intern (campaign or legislative)', 1, 'grassroots', 'Coffee, clips, future staffer seed.', 'LOOP_ENT_INTERN'),
                  e('ENT_VOL_COORD', 'Volunteer coordinator', 1, 'grassroots', 'Lists, no-shows, logistics.', 'LOOP_ENT_VOL_COORD'),
                  e('ENT_CANVASS_CAPTAIN', 'Canvass captain', 1, 'grassroots', 'Route book, field AP, map opinions.', 'LOOP_ENT_CANVASS_CAPTAIN', {
                      allyId: 'AL09',
                      tags: ['pilot']
                  }),
                  e('ENT_FIELD_ORGANIZER', 'Field organizer', 1, 'grassroots', 'Turf, turf wars, metrics.', 'LOOP_ENT_FIELD_ORGANIZER'),
                  e('ENT_SMALL_DONOR', 'Small-dollar donor', 1, 'grassroots', 'List compound; fish-fry money.', 'LOOP_ENT_SMALL_DONOR'),
                  e('ENT_PRECINCT_CHAIR', 'Precinct Chair', 1, 'grassroots', 'Key gatekeeper. Kitchen tables. Club numbers.', 'LOOP_ENT_PRECINCT_CHAIR', {
                      allyId: 'AL01',
                      subloopIds: ['LOOP_SUB_PRECINCT_PORCH', 'LOOP_SUB_PRECINCT_CLUB'],
                      tags: ['pilot']
                  }),
                  e('ENT_COUNTY_PARTY_EXEC', 'County Party Executive Committee member', 1, 'grassroots', 'Rules, endorsements, county apparatus.', 'LOOP_ENT_COUNTY_PARTY_EXEC', {
                      allyId: 'AL02',
                      tags: ['pilot']
                  }),
                  e('ENT_CLUB_LEADER', 'Local activist club leader', 1, 'grassroots', 'Roster, straw polls, casseroles.', 'LOOP_ENT_CLUB_LEADER', {
                      allyId: 'AL03',
                      tags: ['pilot']
                  }),
                  e('ENT_PETITION_COLLECTOR', 'Petition signature collector', 1, 'grassroots', 'Sheets, challenges, rain.', 'LOOP_ENT_PETITION_COLLECTOR'),
                  e('ENT_CAMPAIGN_STAFFER', 'Low-level campaign staffer', 1, 'grassroots', 'Clipboard, burnout, loyalty.', 'LOOP_ENT_CAMPAIGN_STAFFER'),
                  e('ENT_LOCAL_BLOGGER', 'Local blog / newsletter writer', 1, 'grassroots', 'Reach without a filter.', 'LOOP_ENT_LOCAL_BLOGGER')
              ];
              TIER2 = [
                  e('ENT_CITY_COUNCIL', 'City Council member / Mayor', 2, 'local', 'Local ordinance power; name heat.', 'LOOP_ENT_CITY_COUNCIL'),
                  e('ENT_COUNTY_JUDGE', 'County Commissioner / County Judge', 2, 'local', 'Heaviest local nod in many counties.', 'LOOP_ENT_COUNTY_JUDGE', {
                      allyId: 'AL15',
                      tags: ['pilot']
                  }),
                  e('ENT_SCHOOL_BOARD', 'School Board / Superintendent', 2, 'local', 'Parents, bonds, culture fights.', 'LOOP_ENT_SCHOOL_BOARD'),
                  e('ENT_LOCAL_BIZ_PAC', 'Local business PAC', 2, 'local', 'Checks, expectations, rate talk.', 'LOOP_ENT_LOCAL_BIZ_PAC'),
                  e('ENT_UNION_LOCAL_PRES', 'Union local president', 2, 'local', 'Endorsement, volunteers, plant gate.', 'LOOP_ENT_UNION_LOCAL_PRES', {
                      tags: ['pilot']
                  }),
                  e('ENT_CHAMBER_EXEC', 'Chamber of Commerce executive', 2, 'local', 'Rubber chicken; reliable voters.', 'LOOP_ENT_CHAMBER_EXEC', {
                      tags: ['pilot']
                  }),
                  e('ENT_LOCAL_EDITOR', 'Local newspaper editor / reporter', 2, 'local', 'Fair shake or page six.', 'LOOP_ENT_LOCAL_EDITOR', {
                      allyId: 'AL04',
                      tags: ['pilot']
                  }),
                  e('ENT_RADIO_HOST', 'Radio talk show host', 2, 'local', 'Drive time; discount; ambush.', 'LOOP_ENT_RADIO_HOST', {
                      allyId: 'AL05',
                      tags: ['pilot']
                  }),
                  e('ENT_FAITH_LEADER', 'Faith leader (pastor / mega-church)', 2, 'local', 'Corridor, directory, moral weight.', 'LOOP_ENT_FAITH_LEADER', {
                      allyId: 'AL08',
                      tags: ['pilot']
                  }),
                  e('ENT_COMMUNITY_ORG', 'Community organizer / nonprofit leader', 2, 'local', 'Coalition, grants, grassroots glue.', 'LOOP_ENT_COMMUNITY_ORG'),
                  e('ENT_PRIMARY_RIVAL', 'Former opponent / primary rival', 2, 'local', 'Same ballot; zero-sum.', 'LOOP_ENT_PRIMARY_RIVAL')
              ];
              TIER3 = [
                  e('ENT_LEGISLATIVE_AIDE', 'Legislative Aide / Staffer', 3, 'lege_staff', 'Carries the bag; knows the schedule.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_COMMITTEE_CLERK', 'Committee Clerk', 3, 'lege_staff', 'Witness lists; hearing reality.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_ELEVATOR_OP', 'Capitol elevator operator / long-time staff', 3, 'lege_staff', 'Sees everyone; says little.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_SERGEANT_ARMS', 'Sergeant-at-Arms / Capitol security', 3, 'lege_staff', 'Doors, order, access.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_PARL_STAFF', "Parliamentarian's office staff", 3, 'lege_staff', 'Procedure without the title.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_BILL_DRAFTER', 'Bill drafter / Legislative Council attorney', 3, 'lege_staff', 'Words that become law.', 'LOOP_TMPL_LEGE_STAFF'),
                  e('ENT_JUNIOR_LOBBYIST', 'Junior lobbyist', 3, 'lege_staff', 'Access on a budget.', 'LOOP_ENT_JUNIOR_LOBBYIST', {
                      allyId: 'AL13',
                      tags: ['pilot']
                  }),
                  e('ENT_PRESS_SECRETARY', 'Press Secretary', 3, 'lege_staff', 'Message discipline or disaster.', 'LOOP_TMPL_LEGE_STAFF')
              ];
              TIER4 = [
                  e('ENT_STATE_REP', 'State Representative (peer / rival)', 4, 'lege', 'Colleague or competitor on the floor.', 'LOOP_TMPL_LEGE'),
                  e('ENT_STATE_SENATOR', 'State Senator', 4, 'lege', 'Other chamber; thirty-one matter.', 'LOOP_TMPL_LEGE'),
                  e('ENT_COMMITTEE_CHAIR', 'Committee Chair', 4, 'lege', 'Hearings open when they open.', 'LOOP_TMPL_LEGE'),
                  e('ENT_RANKING_MEMBER', 'Ranking Member', 4, 'lege', 'Minority power; record-building.', 'LOOP_TMPL_LEGE'),
                  e('ENT_FRESHMAN_MEMBER', 'Freshman legislator', 4, 'lege', 'You, or someone like you, last cycle.', 'LOOP_TMPL_LEGE'),
                  e('ENT_DISTRICT_INCUMBENT', 'Incumbent in district', 4, 'lege', 'War chest, name, twelve years of relationships.', 'LOOP_TMPL_LEGE'),
                  e('ENT_SWING_MEMBER', 'Moderate / swing district member', 4, 'lege', 'Votes that leadership counts twice.', 'LOOP_TMPL_LEGE'),
                  e('ENT_FIREBRAND', 'Firebrand / bomb-thrower', 4, 'lege', 'Clips travel; coalitions suffer.', 'LOOP_TMPL_LEGE')
              ];
              TIER5 = [
                  e('ENT_SPEAKER', 'House Speaker', 5, 'leadership', 'The calendar is theirs. Favor is currency.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_LT_GOV', 'Lt. Governor / Senate President Pro Tempore', 5, 'leadership', 'Other chamber gravity.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_MAJORITY_LEADER', 'Majority Leader', 5, 'leadership', 'Floor management; vote math.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_MINORITY_LEADER', 'Minority Leader', 5, 'leadership', 'Opposition strategy; message.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_WHIP', 'Whip', 5, 'leadership', 'Counts that decide third readings.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_PARLIAMENTARIAN', 'Parliamentarian', 5, 'leadership', 'Procedure is power.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_CALENDAR_MEMBER', 'Ethics / Calendar Committee member', 5, 'leadership', 'What the House even sees.', 'LOOP_TMPL_LEADERSHIP'),
                  e('ENT_DEAN', 'Dean of the Lege (long-serving power)', 5, 'leadership', 'Institutional memory with a vote.', 'LOOP_TMPL_LEADERSHIP', { allyId: 'AL12' }),
                  e('ENT_CAUCUS_CHAIR', 'Party Caucus Chair', 5, 'leadership', 'Message and discipline inside the caucus.', 'LOOP_TMPL_LEADERSHIP')
              ];
              TIER6 = [
                  e('ENT_GOVERNOR', 'Governor', 6, 'statewide', 'Veto pen; bully pulpit; appointments.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_AG', 'Attorney General', 6, 'statewide', 'Lawsuits as politics.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_COMPTROLLER', 'Comptroller', 6, 'statewide', 'Money estimates; fiscal gravity.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_LAND_COMM', 'Land Commissioner', 6, 'statewide', 'Land, veterans, coastal fights.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_AG_COMM', 'Agriculture Commissioner', 6, 'statewide', 'Ag brand; rural politics.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_RAILROAD_COMM', 'Railroad Commission member', 6, 'statewide', 'Oil and gas reality.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_ELDER_STATESMAN', 'Retired Governor / Elder Statesman', 6, 'statewide', 'Name without office; still weight.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_STATE_PARTY_CHAIR', 'State Party Chair', 6, 'statewide', 'Lists, money, primary rules.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_NATL_COMMITTEE', 'National Committeeman / woman', 6, 'statewide', 'National party interface.', 'LOOP_TMPL_STATEWIDE'),
                  e('ENT_FORMER_STATEWIDE', 'Former statewide candidate', 6, 'statewide', 'Scars, list, unfinished business.', 'LOOP_TMPL_STATEWIDE')
              ];
              TIER7 = [
                  e('ENT_US_HOUSE', 'U.S. Representative', 7, 'federal', 'Federal seat adjacent to your district.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_US_SENATE', 'U.S. Senator', 7, 'federal', 'Statewide federal gravity.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_CORP_LOBBYIST', 'Corporate lobbyist (oil/gas, tech, etc.)', 7, 'federal', 'Access, retainers, bill language.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_BUNDLER', 'Big donor / bundler / dark money operative', 7, 'federal', 'Money that arrives with a folder.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_TRIBUNE', 'Texas Tribune / major media reporter', 7, 'federal', 'Statewide story potential.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_ADVOCACY_HEAD', 'Advocacy org head / thought leader', 7, 'federal', 'Movement or establishment brand.', 'LOOP_TMPL_FEDERAL'),
                  e('ENT_JUDGE', 'Judge / prosecutor / regent', 7, 'federal', 'Adjacent power with different clocks.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL06' }),
                  e('ENT_CAPITOL_JANITOR', 'Capitol janitor (wildcard)', 7, 'federal', 'Sees the building after hours.', 'LOOP_TMPL_FEDERAL', { tags: ['wildcard'] }),
                  e('ENT_SCANDAL_EXMEMBER', 'Scandal-plagued ex-member (wildcard)', 7, 'federal', 'Cautionary tale; oppo raw material.', 'LOOP_TMPL_FEDERAL', { tags: ['wildcard'] }),
                  e('ENT_SLATE_MAKER', 'The Slate-Maker', 7, 'federal', 'Prints the card half the primary votes from.', 'LOOP_ENT_SLATE_MAKER', {
                      allyId: 'AL16',
                      tags: ['pilot']
                  }),
                  e('ENT_KITCHEN_CABINET', 'Kitchen Cabinet', 7, 'federal', 'Inner circle; extra draws; debate prep.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL11' }),
                  e('ENT_FINANCE_CHAIR', 'Finance Chair', 7, 'federal', 'Weekly money when warm; call the book once.', 'LOOP_ENT_FINANCE_CHAIR', {
                      allyId: 'AL10',
                      tags: ['pilot']
                  }),
                  e('ENT_FEED_STORE', 'Feed-Store Regulars', 7, 'federal', 'Unofficial senate on the bench.', 'LOOP_ENT_FEED_STORE', {
                      allyId: 'AL07',
                      tags: ['pilot']
                  }),
                  e('ENT_RIVAL_STAFFER', "Rival's disgruntled staffer", 7, 'federal', 'Folder potential; plant risk.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL14' })
              ];
              PROCEDURAL = [
                  e('ENT_OPEN_SEAT', 'Open Seat', 8, 'procedural', 'Incumbent retired or vacated — field floods.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_VACANCY', 'Vacancy', 8, 'procedural', 'Mid-term empty desk; special election clock.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_SPECIAL_ELECTION', 'Special Election', 8, 'procedural', 'Compressed campaign; different math.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_REDISTRICTING', 'Redistricting Map', 8, 'procedural', 'Lines move; careers end or begin.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_PAC', 'PAC (generic)', 8, 'procedural', 'Money with a string.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_VOTER_FILE', 'Voter File', 8, 'procedural', 'Asset and weapon.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_HIT_PIECE', 'Hit Piece', 8, 'procedural', 'Mail that lands or slides off.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_COMMITTEE_HEARING', 'Committee Hearing', 8, 'procedural', 'Record, witnesses, vote-out.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
                  e('ENT_SCANDAL_FIGURE', 'Scandal Figure', 8, 'procedural', 'Name attached to a problem.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] })
              ];
              ALL = [
                  PLAYER,
                  ...TIER0,
                  ...TIER1,
                  ...TIER2,
                  ...TIER3,
                  ...TIER4,
                  ...TIER5,
                  ...TIER6,
                  ...TIER7,
                  ...PROCEDURAL
              ];
              exports_11("ENTITIES", ENTITIES = Object.fromEntries(ALL.map(x => [x.id, x])));
              exports_11("ALL_ENTITY_IDS", ALL_ENTITY_IDS = Object.keys(ENTITIES));
          }
      };
  });
  /**
   * Starmap loop / subloop registry — issues #17 #18.
   */
  System.register("data/starmap/loops", [], function (exports_12, context_12) {
      "use strict";
      var TEMPLATES, WAITING, ELECTED, PILOT_PRECINCT, PILOT_SUB, PILOT_CAPTAIN, PILOT_JUDGE, PILOT_PARTY, PILOT_CLUB, PILOT_EDITOR, PILOT_FAITH, PILOT_SLATE, PILOT_FINANCE, PILOT_RADIO, PILOT_LOBBY, PILOT_UNION, PILOT_CHAMBER, PILOT_FEED, T0_T2_NAMED, LOOPS, ALL_LOOP_IDS;
      var __moduleName = context_12 && context_12.id;
      function stub(id, name, kind, description, extra = {}) {
          var _a, _b, _c, _d;
          return {
              id,
              name,
              kind,
              description,
              advancement: (_a = extra.advancement) !== null && _a !== void 0 ? _a : [
                  {
                      id: `${id}_ADV_TODO`,
                      type: 'advancement',
                      description: 'Stub — fill when loop is piloted',
                      kind: 'manual_todo'
                  }
              ],
              setback: (_b = extra.setback) !== null && _b !== void 0 ? _b : [
                  {
                      id: `${id}_SET_TODO`,
                      type: 'setback',
                      description: 'Stub — fill when loop is piloted',
                      kind: 'manual_todo'
                  }
              ],
              exampleVerbs: (_c = extra.exampleVerbs) !== null && _c !== void 0 ? _c : ['Show up', 'Listen', 'Ask'],
              exampleNouns: (_d = extra.exampleNouns) !== null && _d !== void 0 ? _d : ['Favor', 'Door', 'Rumor'],
              entityId: extra.entityId,
              parentLoopId: extra.parentLoopId
          };
      }
      function entLoop(suffix, name, description, entityId) {
          return stub(`LOOP_ENT_${suffix}`, name, 'entity_primary', description, { entityId });
      }
      function getLoop(id) {
          return LOOPS[id];
      }
      exports_12("getLoop", getLoop);
      return {
          setters: [],
          execute: function () {/**
               * Starmap loop / subloop registry — issues #17 #18.
               */
              TEMPLATES = [
                  stub('LOOP_TMPL_STREET', 'Street-level orbit', 'template', 'Civilians and fringe — presence, grievance, occasional leverage.'),
                  stub('LOOP_TMPL_GRASSROOTS', 'Grassroots campaign orbit', 'template', 'Doors, lists, precinct math, small money, volunteer spine.'),
                  stub('LOOP_TMPL_LOCAL', 'Local power orbit', 'template', 'Courthouse, school board, chamber, local media.'),
                  stub('LOOP_TMPL_LEGE_STAFF', 'Capitol staff orbit', 'template', 'Aides, clerks, drafters — permanent government.'),
                  stub('LOOP_TMPL_LEGE', 'Legislative peer orbit', 'template', 'Members, chairs, freshmen, firebrands.'),
                  stub('LOOP_TMPL_LEADERSHIP', 'Leadership orbit', 'template', 'Speaker, Lt. Gov, whips, calendar — fifth floor.'),
                  stub('LOOP_TMPL_STATEWIDE', 'Statewide executive orbit', 'template', "Governor's row, statewide offices, party."),
                  stub('LOOP_TMPL_FEDERAL', 'Federal / lobby / media orbit', 'template', 'DC-adjacent, dark money, Tribune row, wildcards.'),
                  stub('LOOP_TMPL_PROCEDURAL', 'Procedural force orbit', 'template', 'Vacancies, maps, specials, hearings — system as actor.')
              ];
              WAITING = [
                  stub('LOOP_WAITING_PERENNIAL', 'Perennial candidate', 'waiting', 'Keep the list warm until the next filing.', {
                      exampleVerbs: ['Work the list', 'Attend the funeral', 'Bank a favor'],
                      exampleNouns: ['Rolodex', 'Casserole', 'Yard sign cache']
                  }),
                  stub('LOOP_WAITING_ADVOCATE', 'Issue advocate', 'waiting', 'The candidate lost; the organization did not.', {
                      exampleVerbs: ['Host a forum', 'Draft the brief', 'Recruit chapters']
                  }),
                  stub('LOOP_WAITING_STAFFER', 'Capitol staffer', 'waiting', 'Two years inside learning the levers.', {
                      exampleVerbs: ['Carry the bag', 'Brief the member', 'Work the desk']
                  }),
                  stub('LOOP_WAITING_HOME', 'Go home a while', 'waiting', 'Fence, Friday games, let the mailers fade.', {
                      exampleVerbs: ['Coach', 'Mend fence', 'Stay quiet']
                  }),
                  stub('LOOP_WAITING_EXMEMBER', 'Ex-member', 'waiting', 'Title still warm; doors still open; no vote.', {
                      exampleVerbs: ['Lunch the lobby', 'Advise a freshman', 'Test the waters']
                  })
              ];
              ELECTED = [
                  stub('LOOP_ELECTED_SESSION', 'Legislative session', 'elected', 'Bill pipeline, casework, fifth floor.', {
                      exampleVerbs: ['File', 'Refer', 'Whip', 'Casework']
                  }),
                  stub('LOOP_ELECTED_REELECTION', 'Reelection cycle', 'elected', 'Defend the seat as incumbent.', {
                      exampleVerbs: ['Bank GOTV', 'Call chairs', 'Raise early']
                  }),
                  stub('LOOP_ELECTED_HIGHER_SENATE', 'Senate exploratory', 'higher_office', 'Fork toward the other chamber.'),
                  stub('LOOP_ELECTED_HIGHER_STATEWIDE', 'Statewide exploratory', 'higher_office', "Fork toward Governor's row.")
              ];
              /** Pilot: Precinct Chair — real advancement conditions. */
              PILOT_PRECINCT = {
                  id: 'LOOP_ENT_PRECINCT_CHAIR',
                  name: 'Precinct Chair network',
                  kind: 'entity_primary',
                  entityId: 'ENT_PRECINCT_CHAIR',
                  description: 'Court chairs, bank porch endorsements, warm the precinct graph. Advancement opens MV01.',
                  advancement: [
                      {
                          id: 'ADV_PRECINCT_WARM_2',
                          type: 'advancement',
                          description: 'Two warm Precinct Chair allies (AL01 count ≥ 2).',
                          kind: 'warm_ally_gte',
                          params: { allyId: 'AL01', n: 2 },
                          movementTarget: 'ENT_PRECINCT_CHAIR'
                      },
                      {
                          id: 'ADV_PRECINCT_ENDORSE',
                          type: 'advancement',
                          description: 'endorsePts ≥ 2 and at least one warm AL01.',
                          kind: 'endorse_gte',
                          params: { n: 2, requireAlly: 'AL01' },
                          movementTarget: 'ENT_PRECINCT_CHAIR'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_PRECINCT_HIT',
                          type: 'setback',
                          description: 'Three hit pieces while on the chair circuit.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_chair_circuit']
                      }
                  ],
                  exampleVerbs: ['Kitchen-table meeting', 'Court the chairs', 'Call in the precinct network'],
                  exampleNouns: ['Porch', 'Pie', 'Precinct map', "Club president's number"]
              };
              PILOT_SUB = [
                  stub('LOOP_SUB_PRECINCT_PORCH', 'Porch circuit', 'entity_sub', 'One chair at a time.', {
                      parentLoopId: 'LOOP_ENT_PRECINCT_CHAIR',
                      entityId: 'ENT_PRECINCT_CHAIR',
                      exampleVerbs: ['Bring pie', 'Leave early', 'Ask for the club list']
                  }),
                  stub('LOOP_SUB_PRECINCT_CLUB', 'Club math', 'entity_sub', 'Straw polls and club presidents.', {
                      parentLoopId: 'LOOP_ENT_PRECINCT_CHAIR',
                      entityId: 'ENT_PRECINCT_CHAIR',
                      exampleVerbs: ['Pack the straw', 'Speak the club']
                  })
              ];
              /** Pilot 2: Canvass Captain — real advancement (AL09 / MV02). */
              PILOT_CAPTAIN = {
                  id: 'LOOP_ENT_CANVASS_CAPTAIN',
                  name: 'Canvass Captain field',
                  kind: 'entity_primary',
                  entityId: 'ENT_CANVASS_CAPTAIN',
                  description: 'Promote or hire a field spine (AL09). Advancement opens MV02 — run the turf plan.',
                  advancement: [
                      {
                          id: 'ADV_CAPTAIN_WARM',
                          type: 'advancement',
                          description: 'Warm Canvass Captain / Field Director ally (AL09).',
                          kind: 'has_ally',
                          params: { allyId: 'AL09' },
                          movementTarget: 'ENT_CANVASS_CAPTAIN'
                      },
                      {
                          id: 'ADV_CAPTAIN_VOL_FIELD',
                          type: 'advancement',
                          description: 'volPool ≥ 3 and nameID ≥ 8 (field is real enough to need a plan).',
                          kind: 'name_id_gte',
                          params: { n: 8, requireVol: 3 },
                          movementTarget: 'ENT_CANVASS_CAPTAIN'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_CAPTAIN_FLAKE',
                          type: 'setback',
                          description: 'Field collapses under hit pieces.',
                          kind: 'hit_pieces_gte',
                          params: { n: 4 },
                          residue: ['scar_field_flake']
                      }
                  ],
                  exampleVerbs: ['Promote captain', 'Hire field director', 'Execute the turf plan'],
                  exampleNouns: ['Route book', 'Walk list', 'Field AP', 'Turf map']
              };
              /** Pilot 3: County Judge — real advancement (AL15 / MV03). */
              PILOT_JUDGE = {
                  id: 'LOOP_ENT_COUNTY_JUDGE',
                  name: 'County Judge courthouse',
                  kind: 'entity_primary',
                  entityId: 'ENT_COUNTY_JUDGE',
                  description: 'Heaviest local nod. Court the judge (PL48) or bank enough weight to open the orbit. MV03 spends the nod.',
                  advancement: [
                      {
                          id: 'ADV_JUDGE_ALLY',
                          type: 'advancement',
                          description: 'Warm County Judge ally (AL15).',
                          kind: 'has_ally',
                          params: { allyId: 'AL15' },
                          movementTarget: 'ENT_COUNTY_JUDGE'
                      },
                      {
                          id: 'ADV_JUDGE_WEIGHT',
                          type: 'advancement',
                          description: 'endorsePts ≥ 4 and nameID ≥ 16 (look like a winner before the nod).',
                          kind: 'endorse_gte',
                          params: { n: 4, requireName: 16 },
                          movementTarget: 'ENT_COUNTY_JUDGE'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_JUDGE_INDEPENDENCE',
                          type: 'setback',
                          description: 'Overplay the courthouse; independence reasserted.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_judge_cold']
                      }
                  ],
                  exampleVerbs: ['Court the County Judge', 'Spend the courthouse nod', 'Look like a winner'],
                  exampleNouns: ['Courthouse', 'County nod', 'War chest optics']
              };
              /** Template pilots — County Party / Club / Editor / Faith (MV04–07). */
              PILOT_PARTY = {
                  id: 'LOOP_ENT_COUNTY_PARTY_EXEC',
                  name: 'County Party apparatus',
                  kind: 'entity_primary',
                  entityId: 'ENT_COUNTY_PARTY_EXEC',
                  description: 'Chairwoman network and committee math. Opens MV04.',
                  advancement: [
                      {
                          id: 'ADV_PARTY_ALLY',
                          type: 'advancement',
                          description: 'Warm County Chairwoman ally (AL02).',
                          kind: 'has_ally',
                          params: { allyId: 'AL02' },
                          movementTarget: 'ENT_COUNTY_PARTY_EXEC'
                      },
                      {
                          id: 'ADV_PARTY_CHAIRS',
                          type: 'advancement',
                          description: 'Three warm Precinct Chairs (AL01 count ≥ 3) — party notices the graph.',
                          kind: 'warm_ally_gte',
                          params: { allyId: 'AL01', n: 3 },
                          movementTarget: 'ENT_COUNTY_PARTY_EXEC'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_PARTY_SCANDAL',
                          type: 'setback',
                          description: 'Hit pieces sour the apparatus.',
                          kind: 'hit_pieces_gte',
                          params: { n: 4 },
                          residue: ['scar_party_cold']
                      }
                  ],
                  exampleVerbs: ['Call the Chairwoman', 'Work the committee', 'Spend party apparatus'],
                  exampleNouns: ['County HQ', 'Voter file access', 'Endorsement slate']
              };
              PILOT_CLUB = {
                  id: 'LOOP_ENT_CLUB_LEADER',
                  name: 'Club roster circuit',
                  kind: 'entity_primary',
                  entityId: 'ENT_CLUB_LEADER',
                  description: 'Straw polls, casseroles, club presidents. Opens MV05.',
                  advancement: [
                      {
                          id: 'ADV_CLUB_ALLY',
                          type: 'advancement',
                          description: 'Warm Club President ally (AL03).',
                          kind: 'has_ally',
                          params: { allyId: 'AL03' },
                          movementTarget: 'ENT_CLUB_LEADER'
                      },
                      {
                          id: 'ADV_CLUB_ENDORSE',
                          type: 'advancement',
                          description: 'endorsePts ≥ 3 (club circuit has already nodded).',
                          kind: 'endorse_gte',
                          params: { n: 3 },
                          movementTarget: 'ENT_CLUB_LEADER'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_CLUB_SNUB',
                          type: 'setback',
                          description: 'Too many hit pieces for the casserole table.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_club_snub']
                      }
                  ],
                  exampleVerbs: ['Pack the straw', 'Speak the club', 'Pull the roster'],
                  exampleNouns: ['Club list', 'Straw poll', 'Casserole']
              };
              PILOT_EDITOR = {
                  id: 'LOOP_ENT_LOCAL_EDITOR',
                  name: 'Newsroom fair shake',
                  kind: 'entity_primary',
                  entityId: 'ENT_LOCAL_EDITOR',
                  description: 'Beat reporter / editor goodwill. Opens MV06.',
                  advancement: [
                      {
                          id: 'ADV_EDITOR_ALLY',
                          type: 'advancement',
                          description: 'Warm Beat Reporter ally (AL04).',
                          kind: 'has_ally',
                          params: { allyId: 'AL04' },
                          movementTarget: 'ENT_LOCAL_EDITOR'
                      },
                      {
                          id: 'ADV_EDITOR_NAME',
                          type: 'advancement',
                          description: 'nameID ≥ 14 (the paper already spells your name).',
                          kind: 'name_id_gte',
                          params: { n: 14 },
                          movementTarget: 'ENT_LOCAL_EDITOR'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_EDITOR_HIT',
                          type: 'setback',
                          description: 'Hit pieces become the only story.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_newsroom']
                      }
                  ],
                  exampleVerbs: ['Coffee with the editor', 'Press release grind', 'Call in the fair shake'],
                  exampleNouns: ['Page six', 'Above the fold', 'News peg']
              };
              PILOT_FAITH = {
                  id: 'LOOP_ENT_FAITH_LEADER',
                  name: 'Corridor blessing',
                  kind: 'entity_primary',
                  entityId: 'ENT_FAITH_LEADER',
                  description: 'Pastor / mega-church corridor. Opens MV07.',
                  advancement: [
                      {
                          id: 'ADV_FAITH_ALLY',
                          type: 'advancement',
                          description: 'Warm Pastor ally (AL08).',
                          kind: 'has_ally',
                          params: { allyId: 'AL08' },
                          movementTarget: 'ENT_FAITH_LEADER'
                      },
                      {
                          id: 'ADV_FAITH_BACKER',
                          type: 'advancement',
                          description: 'B02 Sunday Congregation backer and nameID ≥ 10.',
                          kind: 'name_id_gte',
                          params: { n: 10, requireBacker: 'B02' },
                          movementTarget: 'ENT_FAITH_LEADER'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_FAITH_SCANDAL',
                          type: 'setback',
                          description: 'Scandal closes the corridor.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_corridor']
                      }
                  ],
                  exampleVerbs: ['Prayer breakfast', 'Open the corridor', 'Spend the blessing'],
                  exampleNouns: ['Directory', 'Corridor', 'First Church']
              };
              /** Slate-Maker — printed card half the primary votes from (AL16 / MV08). */
              PILOT_SLATE = {
                  id: 'LOOP_ENT_SLATE_MAKER',
                  name: 'Slate card print run',
                  kind: 'entity_primary',
                  entityId: 'ENT_SLATE_MAKER',
                  description: 'One man prints the card half the primary votes from. See him (PL22B) then spend the slate (MV08).',
                  advancement: [
                      {
                          id: 'ADV_SLATE_ALLY',
                          type: 'advancement',
                          description: 'Warm Slate-Maker ally (AL16).',
                          kind: 'has_ally',
                          params: { allyId: 'AL16' },
                          movementTarget: 'ENT_SLATE_MAKER'
                      },
                      {
                          id: 'ADV_SLATE_PRICE',
                          type: 'advancement',
                          description: 'Slate-Maker\'s Price (OB3) already on the books.',
                          kind: 'has_obl',
                          params: { oblId: 'OB3' },
                          movementTarget: 'ENT_SLATE_MAKER'
                      },
                      {
                          id: 'ADV_SLATE_READY',
                          type: 'advancement',
                          description: 'Warm AL02 + endorse ≥ 2 + $≥1200 (Chairwoman path to the print shop).',
                          kind: 'endorse_gte',
                          params: { n: 2, requireAlly: 'AL02', requireCash: 1200 },
                          movementTarget: 'ENT_SLATE_MAKER'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_SLATE_SCANDAL',
                          type: 'setback',
                          description: 'Hit pieces make the printed card a liability.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_slate_reversed']
                      }
                  ],
                  exampleVerbs: ['See the Slate-Maker', 'Print the card', 'Spend the slate'],
                  exampleNouns: ['Printed card', 'Marker', "Chairwoman's call"]
              };
              /** Finance Chair — call the book (AL10 / MV09). */
              PILOT_FINANCE = {
                  id: 'LOOP_ENT_FINANCE_CHAIR',
                  name: 'Finance Chair call sheet',
                  kind: 'entity_primary',
                  entityId: 'ENT_FINANCE_CHAIR',
                  description: 'Someone who can dial money on a schedule. Opens MV09.',
                  advancement: [
                      {
                          id: 'ADV_FINANCE_ALLY',
                          type: 'advancement',
                          description: 'Warm Finance Chair ally (AL10).',
                          kind: 'has_ally',
                          params: { allyId: 'AL10' },
                          movementTarget: 'ENT_FINANCE_CHAIR'
                      },
                      {
                          id: 'ADV_FINANCE_WAR_CHEST',
                          type: 'advancement',
                          description: 'endorse ≥ 1 + $≥1000 (war chest ready for a real finance chair).',
                          kind: 'endorse_gte',
                          params: { n: 1, requireCash: 1000 },
                          movementTarget: 'ENT_FINANCE_CHAIR'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_FINANCE_HIT',
                          type: 'setback',
                          description: 'Hit pieces dry the phones.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_finance_cold']
                      }
                  ],
                  exampleVerbs: ['Hire the Finance Chair', 'Call the book', 'Spend the list'],
                  exampleNouns: ['Call sheet', 'Max-out', 'Bundler lunch']
              };
              /** Radio Host — drive-time (AL05 / MV10). */
              PILOT_RADIO = {
                  id: 'LOOP_ENT_RADIO_HOST',
                  name: 'Drive-time slot',
                  kind: 'entity_primary',
                  entityId: 'ENT_RADIO_HOST',
                  description: 'Open mic between farm reports and the noon news. Opens MV10.',
                  advancement: [
                      {
                          id: 'ADV_RADIO_ALLY',
                          type: 'advancement',
                          description: 'Warm Drive-Time Host ally (AL05).',
                          kind: 'has_ally',
                          params: { allyId: 'AL05' },
                          movementTarget: 'ENT_RADIO_HOST'
                      },
                      {
                          id: 'ADV_RADIO_NAME',
                          type: 'advancement',
                          description: 'nameID ≥ 12 (already loud enough to book).',
                          kind: 'name_id_gte',
                          params: { n: 12 },
                          movementTarget: 'ENT_RADIO_HOST'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_RADIO_HIT',
                          type: 'setback',
                          description: 'Too many hit pieces for live radio.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_radio_cold']
                      }
                  ],
                  exampleVerbs: ['Book drive time', 'Take the call', 'Spend the slot'],
                  exampleNouns: ['Open mic', 'Call screener', 'Farm report']
              };
              /** Junior Lobbyist — conscience + access (AL13 / MV11). */
              PILOT_LOBBY = {
                  id: 'LOOP_ENT_JUNIOR_LOBBYIST',
                  name: 'Lobbyist access map',
                  kind: 'entity_primary',
                  entityId: 'ENT_JUNIOR_LOBBYIST',
                  description: 'Access on a budget — and a conscience that still works. Opens MV11.',
                  advancement: [
                      {
                          id: 'ADV_LOBBY_ALLY',
                          type: 'advancement',
                          description: "Warm Lobbyist w/ a Conscience (AL13).",
                          kind: 'has_ally',
                          params: { allyId: 'AL13' },
                          movementTarget: 'ENT_JUNIOR_LOBBYIST'
                      },
                      {
                          id: 'ADV_LOBBY_PAC_STRING',
                          type: 'advancement',
                          description: 'PAC String (OB1) already on the books — they know your number.',
                          kind: 'has_obl',
                          params: { oblId: 'OB1' },
                          movementTarget: 'ENT_JUNIOR_LOBBYIST'
                      },
                      {
                          id: 'ADV_LOBBY_CASH_NAME',
                          type: 'advancement',
                          description: 'endorse ≥ 2 + $≥800 (you look like a bill that might move).',
                          kind: 'endorse_gte',
                          params: { n: 2, requireCash: 800 },
                          movementTarget: 'ENT_JUNIOR_LOBBYIST'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_LOBBY_HIT',
                          type: 'setback',
                          description: 'Hit pieces make quiet access radioactive.',
                          kind: 'hit_pieces_gte',
                          params: { n: 4 },
                          residue: ['scar_lobby_cold']
                      }
                  ],
                  exampleVerbs: ['Take the coffee', 'Read the map', 'Spend the intro'],
                  exampleNouns: ['Access map', 'Retainer', 'Conscience']
              };
              /** Union local president — plant gate (MV12). */
              PILOT_UNION = {
                  id: 'LOOP_ENT_UNION_LOCAL_PRES',
                  name: 'Plant-gate endorsement',
                  kind: 'entity_primary',
                  entityId: 'ENT_UNION_LOCAL_PRES',
                  description: 'Local president, shift change, hands that vote. Opens MV12.',
                  advancement: [
                      {
                          id: 'ADV_UNION_FIELD',
                          type: 'advancement',
                          description: 'nameID ≥ 8 + volPool ≥ 4 (you look like a field campaign the hall can back).',
                          kind: 'name_id_gte',
                          params: { n: 8, requireVol: 4 },
                          movementTarget: 'ENT_UNION_LOCAL_PRES'
                      },
                      {
                          id: 'ADV_UNION_ENDORSE',
                          type: 'advancement',
                          description: 'endorsePts ≥ 3 (someone already nodded; the hall can second it).',
                          kind: 'endorse_gte',
                          params: { n: 3 },
                          movementTarget: 'ENT_UNION_LOCAL_PRES'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_UNION_HIT',
                          type: 'setback',
                          description: 'Hit pieces sour the hall.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_union_cold']
                      }
                  ],
                  exampleVerbs: ['Work the gate', 'Take the local', 'Spend the hall'],
                  exampleNouns: ['Plant gate', 'Shift change', 'Union hall']
              };
              /** Chamber executive — rubber chicken (MV13). */
              PILOT_CHAMBER = {
                  id: 'LOOP_ENT_CHAMBER_EXEC',
                  name: 'Chamber rubber-chicken circuit',
                  kind: 'entity_primary',
                  entityId: 'ENT_CHAMBER_EXEC',
                  description: 'Reliable voters and polite checks. Opens MV13.',
                  advancement: [
                      {
                          id: 'ADV_CHAMBER_WAR_CHEST',
                          type: 'advancement',
                          description: 'endorse ≥ 2 + $≥1000 (you look fundable at the chicken dinner).',
                          kind: 'endorse_gte',
                          params: { n: 2, requireCash: 1000 },
                          movementTarget: 'ENT_CHAMBER_EXEC'
                      },
                      {
                          id: 'ADV_CHAMBER_NAME',
                          type: 'advancement',
                          description: 'nameID ≥ 14 (main street already knows the name).',
                          kind: 'name_id_gte',
                          params: { n: 14 },
                          movementTarget: 'ENT_CHAMBER_EXEC'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_CHAMBER_HIT',
                          type: 'setback',
                          description: 'Hit pieces cancel the chicken dinner.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_chamber_cold']
                      }
                  ],
                  exampleVerbs: ['Work the chamber', 'Eat the chicken', 'Spend main street'],
                  exampleNouns: ['Rubber chicken', 'Chamber board', 'Main street']
              };
              /** Feed-Store Regulars — unofficial senate (AL07 / MV14). */
              PILOT_FEED = {
                  id: 'LOOP_ENT_FEED_STORE',
                  name: 'Feed-store bench',
                  kind: 'entity_primary',
                  entityId: 'ENT_FEED_STORE',
                  description: 'Unofficial senate on the bench out front. Opens MV14.',
                  advancement: [
                      {
                          id: 'ADV_FEED_ALLY',
                          type: 'advancement',
                          description: 'Warm Feed-Store Regulars ally (AL07).',
                          kind: 'has_ally',
                          params: { allyId: 'AL07' },
                          movementTarget: 'ENT_FEED_STORE'
                      },
                      {
                          id: 'ADV_FEED_CONTACTS',
                          type: 'advancement',
                          description: 'nameID ≥ 10 + volPool ≥ 2 (you have shown up enough for the bench to notice).',
                          kind: 'name_id_gte',
                          params: { n: 10, requireVol: 2 },
                          movementTarget: 'ENT_FEED_STORE'
                      }
                  ],
                  setback: [
                      {
                          id: 'SET_FEED_HIT',
                          type: 'setback',
                          description: 'Hit pieces and the bench goes quiet.',
                          kind: 'hit_pieces_gte',
                          params: { n: 3 },
                          residue: ['scar_feed_cold']
                      }
                  ],
                  exampleVerbs: ['Sit the bench', 'Buy a bag of feed', 'Spend the regulars'],
                  exampleNouns: ['Feed store', 'Bench', 'County rumor']
              };
              T0_T2_NAMED = [
                  PILOT_PRECINCT,
                  ...PILOT_SUB,
                  PILOT_CAPTAIN,
                  PILOT_JUDGE,
                  PILOT_PARTY,
                  PILOT_CLUB,
                  PILOT_EDITOR,
                  PILOT_FAITH,
                  PILOT_SLATE,
                  PILOT_FINANCE,
                  PILOT_RADIO,
                  PILOT_LOBBY,
                  PILOT_UNION,
                  PILOT_CHAMBER,
                  PILOT_FEED,
                  entLoop('SOUTH_STEPS_ACTIVIST', 'South Steps rant', 'Presence, grievance, viral clip risk.', 'ENT_SOUTH_STEPS_ACTIVIST'),
                  entLoop('BLOCK_WALKER', 'Block walker', 'Doors, heat, dogs, clipboards.', 'ENT_BLOCK_WALKER'),
                  entLoop('CONSTITUENT', 'Disgruntled constituent', 'Casework demand, town hall ambush.', 'ENT_CONSTITUENT'),
                  entLoop('BAR_OWNER', 'Bar owner donor', 'Small check, big room.', 'ENT_BAR_OWNER'),
                  entLoop('CHURCH_FLOCK', 'Congregation flock', 'Sunday presence, directory.', 'ENT_CHURCH_FLOCK'),
                  entLoop('UNION_RANK', 'Union rank-and-file', 'Plant gate, shift change.', 'ENT_UNION_RANK'),
                  entLoop('STUDENT_ACTIVIST', 'Student activist', 'Campus, petitions, purity tests.', 'ENT_STUDENT_ACTIVIST'),
                  entLoop('RETIRED_VET', 'Retired veteran', 'Halls, fixed income, honor.', 'ENT_RETIRED_VET'),
                  entLoop('BORDER_RESIDENT', 'Border community', 'Distance, scrutiny, real stakes.', 'ENT_BORDER_RESIDENT'),
                  entLoop('ROUGHNECK', 'Oil field roughneck', 'Boom, bust, regulation.', 'ENT_ROUGHNECK'),
                  entLoop('RANCHER', 'Rancher / farmer', 'Water, land, ag exemption.', 'ENT_RANCHER'),
                  entLoop('SOCIAL_TROLL', 'Anonymous influencer', 'Reach without name.', 'ENT_SOCIAL_TROLL'),
                  entLoop('INTERN', 'Intern', 'Coffee, clips, future staffer seed.', 'ENT_INTERN'),
                  entLoop('VOL_COORD', 'Volunteer coordinator', 'Lists, no-shows, logistics.', 'ENT_VOL_COORD'),
                  // CANVASS_CAPTAIN + COUNTY_JUDGE: real pilot loops above (not stubs)
                  entLoop('FIELD_ORGANIZER', 'Field organizer', 'Turf, metrics.', 'ENT_FIELD_ORGANIZER'),
                  entLoop('SMALL_DONOR', 'Small-dollar donor', 'List compound, fish-fry money.', 'ENT_SMALL_DONOR'),
                  // COUNTY_PARTY / CLUB / LOCAL_EDITOR / FAITH: real pilot loops above
                  entLoop('PETITION_COLLECTOR', 'Petition collector', 'Sheets, challenges, rain.', 'ENT_PETITION_COLLECTOR'),
                  entLoop('CAMPAIGN_STAFFER', 'Campaign staffer', 'Clipboard, burnout, loyalty.', 'ENT_CAMPAIGN_STAFFER'),
                  entLoop('LOCAL_BLOGGER', 'Local blog / newsletter', 'Reach without filter.', 'ENT_LOCAL_BLOGGER'),
                  entLoop('CITY_COUNCIL', 'City council / mayor', 'Local ordinance, name heat.', 'ENT_CITY_COUNCIL'),
                  entLoop('SCHOOL_BOARD', 'School board / superintendent', 'Parents, bonds, culture.', 'ENT_SCHOOL_BOARD'),
                  entLoop('LOCAL_BIZ_PAC', 'Local business PAC', 'Checks and expectations.', 'ENT_LOCAL_BIZ_PAC'),
                  // UNION_LOCAL_PRES / CHAMBER_EXEC / FEED_STORE: real pilot loops above (MV12–14)
                  // RADIO_HOST: real pilot loop above (MV10)
                  entLoop('COMMUNITY_ORG', 'Community organizer', 'Nonprofit, coalition.', 'ENT_COMMUNITY_ORG'),
                  entLoop('PRIMARY_RIVAL', 'Primary rival', 'Same ballot, zero-sum.', 'ENT_PRIMARY_RIVAL')
                  // FINANCE_CHAIR / JUNIOR_LOBBYIST: real pilot loops above (MV09 / MV11)
              ];
              exports_12("LOOPS", LOOPS = Object.fromEntries([...TEMPLATES, ...WAITING, ...ELECTED, ...T0_T2_NAMED].map(l => [l.id, l])));
              exports_12("ALL_LOOP_IDS", ALL_LOOP_IDS = Object.keys(LOOPS));
          }
      };
  });
  /**
   * Starmap orbits — interconnection graph (#17/#18).
   * Every entity has degree ≥ 1. T0–2 dense; cross-tier connectors explicit.
   */
  System.register("data/starmap/orbits", ["data/starmap/entities"], function (exports_13, context_13) {
      "use strict";
      var entities_js_1, CORE, CROSS, PROC, MANUAL, ORBITS, ALL_ORBIT_IDS;
      var __moduleName = context_13 && context_13.id;
      function o(id, from, to, strength, flavorText, extra = {}) {
          return { id, from, to, strength, flavorText, ...extra };
      }
      /**
       * Ensure every entity has ≥1 edge: attach weak ambient edge to player or
       * cluster hub if still orphan after manual edges.
       */
      function ensureNoOrphans(edges) {
          var _a, _b, _c;
          const degree = new Map();
          for (const id of entities_js_1.ALL_ENTITY_IDS)
              degree.set(id, 0);
          for (const edge of edges) {
              degree.set(edge.from, ((_a = degree.get(edge.from)) !== null && _a !== void 0 ? _a : 0) + 1);
              degree.set(edge.to, ((_b = degree.get(edge.to)) !== null && _b !== void 0 ? _b : 0) + 1);
          }
          const hubs = {
              street: 'ENT_HOUSE_CANDIDATE',
              grassroots: 'ENT_HOUSE_CANDIDATE',
              local: 'ENT_HOUSE_CANDIDATE',
              lege_staff: 'ENT_STATE_REP',
              lege: 'ENT_SPEAKER',
              leadership: 'ENT_SPEAKER',
              statewide: 'ENT_GOVERNOR',
              federal: 'ENT_HOUSE_CANDIDATE',
              procedural: 'ENT_HOUSE_CANDIDATE'
          };
          const extra = [];
          // lazy import avoided — use entity list from ALL_ENTITY_IDS only
          for (const id of entities_js_1.ALL_ENTITY_IDS) {
              if (((_c = degree.get(id)) !== null && _c !== void 0 ? _c : 0) > 0)
                  continue;
              if (id === 'ENT_HOUSE_CANDIDATE')
                  continue;
              const hub = 'ENT_HOUSE_CANDIDATE';
              extra.push(o(`ORB_AMBIENT_${id}`, id, hub, 'weak', 'Ambient starmap edge — fill with real orbit later.'));
          }
          return [...edges, ...extra];
      }
      function orbitsFrom(id) {
          return ORBITS.filter(x => x.from === id);
      }
      exports_13("orbitsFrom", orbitsFrom);
      function orbitsTo(id) {
          return ORBITS.filter(x => x.to === id);
      }
      exports_13("orbitsTo", orbitsTo);
      return {
          setters: [
              function (entities_js_1_1) {
                  entities_js_1 = entities_js_1_1;
              }
          ],
          execute: function () {/**
               * Starmap orbits — interconnection graph (#17/#18).
               * Every entity has degree ≥ 1. T0–2 dense; cross-tier connectors explicit.
               */
              /** Dense grassroots / local cluster. */
              CORE = [
                  // Precinct chair pilot hub
                  o('ORB_PRECINCT_PLAYER', 'ENT_PRECINCT_CHAIR', 'ENT_HOUSE_CANDIDATE', 'strong', 'Chairs bank candidates — or they do not.'),
                  o('ORB_PLAYER_PRECINCT', 'ENT_HOUSE_CANDIDATE', 'ENT_PRECINCT_CHAIR', 'strong', 'You need their porch more than they need your stump.'),
                  o('ORB_PRECINCT_COUNTY', 'ENT_PRECINCT_CHAIR', 'ENT_COUNTY_PARTY_EXEC', 'strong', 'County apparatus runs through precincts.'),
                  o('ORB_COUNTY_PRECINCT', 'ENT_COUNTY_PARTY_EXEC', 'ENT_PRECINCT_CHAIR', 'strong', 'Exec committee counts chairs.'),
                  o('ORB_PRECINCT_CLUB', 'ENT_PRECINCT_CHAIR', 'ENT_CLUB_LEADER', 'medium', 'Club presidents and chairs trade lists.'),
                  o('ORB_PRECINCT_CAPTAIN', 'ENT_PRECINCT_CHAIR', 'ENT_CANVASS_CAPTAIN', 'medium', 'Field needs the map the chair already has.'),
                  o('ORB_CAPTAIN_PLAYER', 'ENT_CANVASS_CAPTAIN', 'ENT_HOUSE_CANDIDATE', 'strong', 'Field spine of the campaign.'),
                  o('ORB_PLAYER_CAPTAIN', 'ENT_HOUSE_CANDIDATE', 'ENT_CANVASS_CAPTAIN', 'strong', 'Promote her or hire her.'),
                  o('ORB_CLUB_PLAYER', 'ENT_CLUB_LEADER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Straw math and roster access.'),
                  o('ORB_PLAYER_CLUB', 'ENT_HOUSE_CANDIDATE', 'ENT_CLUB_LEADER', 'medium', 'Speak the club; pack the straw.'),
                  o('ORB_FIELD_PLAYER', 'ENT_FIELD_ORGANIZER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Metrics and turf.'),
                  o('ORB_VOL_CAPTAIN', 'ENT_VOL_COORD', 'ENT_CANVASS_CAPTAIN', 'medium', 'Volunteers become captains.'),
                  o('ORB_INTERN_STAFF', 'ENT_INTERN', 'ENT_CAMPAIGN_STAFFER', 'weak', 'Interns who stay become staff.'),
                  o('ORB_DONOR_PLAYER', 'ENT_SMALL_DONOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Small dollars compound.'),
                  o('ORB_PETITION_PLAYER', 'ENT_PETITION_COLLECTOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Labor ballot path.'),
                  o('ORB_BLOGGER_EDITOR', 'ENT_LOCAL_BLOGGER', 'ENT_LOCAL_EDITOR', 'weak', 'Amateur press feeds the weekly.'),
                  // Street ↔ grassroots
                  o('ORB_WALKER_PLAYER', 'ENT_BLOCK_WALKER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Doors are the spine.'),
                  o('ORB_PLAYER_WALKER', 'ENT_HOUSE_CANDIDATE', 'ENT_BLOCK_WALKER', 'medium', 'You are one of them until you are not.'),
                  o('ORB_CONST_PLAYER', 'ENT_CONSTITUENT', 'ENT_HOUSE_CANDIDATE', 'medium', 'Casework demand; town-hall heat.'),
                  o('ORB_UNION_RANK_PRES', 'ENT_UNION_RANK', 'ENT_UNION_LOCAL_PRES', 'strong', 'Rank-and-file to local leadership.'),
                  o('ORB_UNION_PLAYER', 'ENT_UNION_LOCAL_PRES', 'ENT_HOUSE_CANDIDATE', 'medium', 'Endorsement and volunteers.'),
                  o('ORB_FLOCK_FAITH', 'ENT_CHURCH_FLOCK', 'ENT_FAITH_LEADER', 'strong', 'Flock follows the pulpit.'),
                  o('ORB_FAITH_PLAYER', 'ENT_FAITH_LEADER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Corridor and moral weight.'),
                  o('ORB_BAR_BIZ', 'ENT_BAR_OWNER', 'ENT_LOCAL_BIZ_PAC', 'medium', 'Small business money pools up.'),
                  o('ORB_BIZ_PLAYER', 'ENT_LOCAL_BIZ_PAC', 'ENT_HOUSE_CANDIDATE', 'medium', 'Checks with expectations.'),
                  o('ORB_CHAMBER_BIZ', 'ENT_CHAMBER_EXEC', 'ENT_LOCAL_BIZ_PAC', 'medium', 'Chamber and PAC overlap.'),
                  o('ORB_CHAMBER_PLAYER', 'ENT_CHAMBER_EXEC', 'ENT_HOUSE_CANDIDATE', 'weak', 'Rubber-chicken circuit.'),
                  o('ORB_EDITOR_PLAYER', 'ENT_LOCAL_EDITOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Fair shake or page six.'),
                  o('ORB_RADIO_PLAYER', 'ENT_RADIO_HOST', 'ENT_HOUSE_CANDIDATE', 'medium', 'Drive time is scale.'),
                  o('ORB_SCHOOL_CONST', 'ENT_SCHOOL_BOARD', 'ENT_CONSTITUENT', 'medium', 'Parents are voters.'),
                  o('ORB_CITY_PLAYER', 'ENT_CITY_COUNCIL', 'ENT_HOUSE_CANDIDATE', 'medium', 'Local title, statewide ambition.'),
                  o('ORB_JUDGE_PLAYER', 'ENT_COUNTY_JUDGE', 'ENT_HOUSE_CANDIDATE', 'strong', 'Heaviest local nod.'),
                  o('ORB_RIVAL_PLAYER', 'ENT_PRIMARY_RIVAL', 'ENT_HOUSE_CANDIDATE', 'strong', 'Zero-sum primary.'),
                  o('ORB_PLAYER_RIVAL', 'ENT_HOUSE_CANDIDATE', 'ENT_PRIMARY_RIVAL', 'strong', 'You are their problem.'),
                  o('ORB_ORG_PLAYER', 'ENT_COMMUNITY_ORG', 'ENT_HOUSE_CANDIDATE', 'medium', 'Coalition glue.'),
                  o('ORB_STUDENT_ORG', 'ENT_STUDENT_ACTIVIST', 'ENT_COMMUNITY_ORG', 'weak', 'Campus feeds nonprofits.'),
                  o('ORB_VET_PLAYER', 'ENT_RETIRED_VET', 'ENT_HOUSE_CANDIDATE', 'weak', 'Halls and honor culture.'),
                  o('ORB_RANCHER_PLAYER', 'ENT_RANCHER', 'ENT_HOUSE_CANDIDATE', 'weak', 'Ag politics is local.'),
                  o('ORB_ROUGH_PLAYER', 'ENT_ROUGHNECK', 'ENT_HOUSE_CANDIDATE', 'weak', 'Energy jobs as message.'),
                  o('ORB_BORDER_PLAYER', 'ENT_BORDER_RESIDENT', 'ENT_HOUSE_CANDIDATE', 'weak', 'Distance politics.'),
                  o('ORB_STEPS_PLAYER', 'ENT_SOUTH_STEPS_ACTIVIST', 'ENT_HOUSE_CANDIDATE', 'weak', 'Capitol steps as stage.'),
                  o('ORB_TROLL_MEDIA', 'ENT_SOCIAL_TROLL', 'ENT_LOCAL_EDITOR', 'weak', 'Viral becomes print.'),
                  o('ORB_STAFF_PLAYER', 'ENT_CAMPAIGN_STAFFER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Labor of the campaign.'),
                  o('ORB_COUNTY_JUDGE_LINK', 'ENT_COUNTY_PARTY_EXEC', 'ENT_COUNTY_JUDGE', 'medium', 'Party and courthouse.'),
                  o('ORB_JUDGE_DEAN', 'ENT_COUNTY_JUDGE', 'ENT_DEAN', 'weak', 'Local power respects institutional memory.')
              ];
              /** Cross-tier connectors (upward gravity). */
              CROSS = [
                  o('ORB_PLAYER_AIDE', 'ENT_HOUSE_CANDIDATE', 'ENT_LEGISLATIVE_AIDE', 'medium', 'Win and hire — or lose and become one.'),
                  o('ORB_AIDE_MEMBER', 'ENT_LEGISLATIVE_AIDE', 'ENT_STATE_REP', 'strong', 'Staff orbit the member.'),
                  o('ORB_AIDE_FRESH', 'ENT_LEGISLATIVE_AIDE', 'ENT_FRESHMAN_MEMBER', 'strong', 'Freshmen need staff more.'),
                  o('ORB_CLERK_CHAIR', 'ENT_COMMITTEE_CLERK', 'ENT_COMMITTEE_CHAIR', 'strong', 'Clerk makes the hearing real.'),
                  o('ORB_DRAFT_CHAIR', 'ENT_BILL_DRAFTER', 'ENT_COMMITTEE_CHAIR', 'medium', 'Language is power.'),
                  o('ORB_LOBBY_MEMBER', 'ENT_JUNIOR_LOBBYIST', 'ENT_STATE_REP', 'medium', 'Access on a budget.'),
                  o('ORB_PRESS_MEMBER', 'ENT_PRESS_SECRETARY', 'ENT_STATE_REP', 'medium', 'Message or mess.'),
                  o('ORB_MEMBER_SPEAKER', 'ENT_STATE_REP', 'ENT_SPEAKER', 'medium', 'Calendar and favor.'),
                  o('ORB_FRESH_SPEAKER', 'ENT_FRESHMAN_MEMBER', 'ENT_SPEAKER', 'weak', 'Freshmen ask; Speaker decides.'),
                  o('ORB_MEMBER_WHIP', 'ENT_STATE_REP', 'ENT_WHIP', 'medium', 'Vote math.'),
                  o('ORB_SENATE_LT', 'ENT_STATE_SENATOR', 'ENT_LT_GOV', 'strong', 'Senate gravity.'),
                  o('ORB_CHAIR_CAL', 'ENT_COMMITTEE_CHAIR', 'ENT_CALENDAR_MEMBER', 'medium', 'Voted out still needs a slot.'),
                  o('ORB_SPEAKER_GOV', 'ENT_SPEAKER', 'ENT_GOVERNOR', 'medium', 'Fifth floor to first floor.'),
                  o('ORB_LT_GOV', 'ENT_LT_GOV', 'ENT_GOVERNOR', 'medium', 'Statewide cohabitation.'),
                  o('ORB_PARTY_STATE', 'ENT_STATE_PARTY_CHAIR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Primary rules and lists.'),
                  o('ORB_BUNDLER_PLAYER', 'ENT_BUNDLER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Money with a folder.'),
                  o('ORB_CORP_SPEAKER', 'ENT_CORP_LOBBYIST', 'ENT_SPEAKER', 'medium', 'Access at the top.'),
                  o('ORB_TRIBUNE_PLAYER', 'ENT_TRIBUNE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Statewide story risk/reward.'),
                  o('ORB_US_HOUSE_PLAYER', 'ENT_US_HOUSE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Federal adjacency.'),
                  o('ORB_SLATE_PLAYER', 'ENT_SLATE_MAKER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Printed card politics.'),
                  o('ORB_CABINET_PLAYER', 'ENT_KITCHEN_CABINET', 'ENT_HOUSE_CANDIDATE', 'strong', 'Inner circle.'),
                  o('ORB_DEAN_MEMBER', 'ENT_DEAN', 'ENT_STATE_REP', 'medium', 'Institutional memory.'),
                  o('ORB_ELEVATOR_ALL', 'ENT_ELEVATOR_OP', 'ENT_SPEAKER', 'weak', 'Sees everyone going up.'),
                  o('ORB_SGT_FLOOR', 'ENT_SERGEANT_ARMS', 'ENT_STATE_REP', 'weak', 'Access and order.'),
                  o('ORB_PARL_SPEAKER', 'ENT_PARLIAMENTARIAN', 'ENT_SPEAKER', 'strong', 'Procedure is leadership.'),
                  o('ORB_PARL_STAFF', 'ENT_PARL_STAFF', 'ENT_PARLIAMENTARIAN', 'strong', 'Office behind the title.'),
                  o('ORB_MAJ_SPEAKER', 'ENT_MAJORITY_LEADER', 'ENT_SPEAKER', 'strong', 'Floor management chain.'),
                  o('ORB_MIN_CAUCUS', 'ENT_MINORITY_LEADER', 'ENT_CAUCUS_CHAIR', 'medium', 'Opposition message.'),
                  o('ORB_WHIP_MAJ', 'ENT_WHIP', 'ENT_MAJORITY_LEADER', 'strong', 'Counts for leadership.'),
                  o('ORB_INCUMBENT_PLAYER', 'ENT_DISTRICT_INCUMBENT', 'ENT_HOUSE_CANDIDATE', 'strong', 'You are the challenger or the seat.'),
                  o('ORB_SWING_WHIP', 'ENT_SWING_MEMBER', 'ENT_WHIP', 'medium', 'Votes leadership needs.'),
                  o('ORB_FIRE_MEDIA', 'ENT_FIREBRAND', 'ENT_TRIBUNE', 'medium', 'Clips travel.'),
                  o('ORB_RANK_CHAIR', 'ENT_RANKING_MEMBER', 'ENT_COMMITTEE_CHAIR', 'medium', 'Minority vs majority on committee.'),
                  o('ORB_AG_GOV', 'ENT_AG', 'ENT_GOVERNOR', 'medium', 'Statewide executive row.'),
                  o('ORB_COMPT_GOV', 'ENT_COMPTROLLER', 'ENT_GOVERNOR', 'medium', 'Fiscal gravity.'),
                  o('ORB_LAND_GOV', 'ENT_LAND_COMM', 'ENT_GOVERNOR', 'weak', 'Statewide brand.'),
                  o('ORB_AGCOMM_RANCHER', 'ENT_AG_COMM', 'ENT_RANCHER', 'medium', 'Ag politics.'),
                  o('ORB_RRC_ROUGH', 'ENT_RAILROAD_COMM', 'ENT_ROUGHNECK', 'medium', 'Energy reality.'),
                  o('ORB_ELDER_DEAN', 'ENT_ELDER_STATESMAN', 'ENT_DEAN', 'medium', 'Memory without a vote / with a vote.'),
                  o('ORB_NATL_PARTY', 'ENT_NATL_COMMITTEE', 'ENT_STATE_PARTY_CHAIR', 'medium', 'National-state party link.'),
                  o('ORB_FORMER_PLAYER', 'ENT_FORMER_STATEWIDE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Unfinished business mentors or haunts.'),
                  o('ORB_US_SENATE_GOV', 'ENT_US_SENATE', 'ENT_GOVERNOR', 'medium', 'Statewide federal vs state.'),
                  o('ORB_ADVOCACY_PLAYER', 'ENT_ADVOCACY_HEAD', 'ENT_HOUSE_CANDIDATE', 'weak', 'Movement brand.'),
                  o('ORB_JUDGE_PLAYER', 'ENT_JUDGE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Different clock, adjacent power.'),
                  o('ORB_JANITOR_ELEVATOR', 'ENT_CAPITOL_JANITOR', 'ENT_ELEVATOR_OP', 'weak', 'After-hours building.'),
                  o('ORB_SCANDAL_RIVAL', 'ENT_SCANDAL_EXMEMBER', 'ENT_PRIMARY_RIVAL', 'weak', 'Cautionary oppo material.'),
                  o('ORB_FINANCE_PLAYER', 'ENT_FINANCE_CHAIR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Weekly money when warm.'),
                  o('ORB_FEED_PLAYER', 'ENT_FEED_STORE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Unofficial county senate.'),
                  o('ORB_RIVAL_STAFF', 'ENT_RIVAL_STAFFER', 'ENT_PRIMARY_RIVAL', 'strong', 'Disgruntled from their camp.'),
                  o('ORB_RIVAL_STAFF_PLAYER', 'ENT_RIVAL_STAFFER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Folder or plant.')
              ];
              /** Procedural forces. */
              PROC = [
                  o('ORB_OPEN_INCUMBENT', 'ENT_OPEN_SEAT', 'ENT_DISTRICT_INCUMBENT', 'strong', 'Open seat means the incumbent is gone.'),
                  o('ORB_OPEN_PLAYER', 'ENT_OPEN_SEAT', 'ENT_HOUSE_CANDIDATE', 'strong', 'Field floods; your odds change.'),
                  o('ORB_VACANCY_SPECIAL', 'ENT_VACANCY', 'ENT_SPECIAL_ELECTION', 'strong', 'Empty desk starts the special clock.'),
                  o('ORB_SPECIAL_PLAYER', 'ENT_SPECIAL_ELECTION', 'ENT_HOUSE_CANDIDATE', 'strong', 'Compressed campaign.'),
                  o('ORB_MAP_PLAYER', 'ENT_REDISTRICTING', 'ENT_HOUSE_CANDIDATE', 'strong', 'Lines move under your feet.'),
                  o('ORB_MAP_MEMBER', 'ENT_REDISTRICTING', 'ENT_STATE_REP', 'strong', 'Members live and die by maps.'),
                  o('ORB_PAC_PLAYER', 'ENT_PAC', 'ENT_HOUSE_CANDIDATE', 'medium', 'Money with a string (OB1 path).'),
                  o('ORB_PAC_BUNDLER', 'ENT_PAC', 'ENT_BUNDLER', 'medium', 'Dark money adjacency.'),
                  o('ORB_VOTER_FILE_PLAYER', 'ENT_VOTER_FILE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Asset A02/A01 path.'),
                  o('ORB_HIT_PLAYER', 'ENT_HIT_PIECE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Mail that lands.'),
                  o('ORB_HIT_RIVAL', 'ENT_HIT_PIECE', 'ENT_PRIMARY_RIVAL', 'medium', 'Or lands on them.'),
                  o('ORB_HEARING_CHAIR', 'ENT_COMMITTEE_HEARING', 'ENT_COMMITTEE_CHAIR', 'strong', 'Hearing is the chair\'s tool.'),
                  o('ORB_HEARING_PLAYER', 'ENT_COMMITTEE_HEARING', 'ENT_HOUSE_CANDIDATE', 'medium', 'Session testimony path.'),
                  o('ORB_SCANDAL_PLAYER', 'ENT_SCANDAL_FIGURE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Name attached to a problem.')
              ];
              MANUAL = [...CORE, ...CROSS, ...PROC];
              exports_13("ORBITS", ORBITS = ensureNoOrphans(MANUAL));
              exports_13("ALL_ORBIT_IDS", ALL_ORBIT_IDS = ORBITS.map(x => x.id));
          }
      };
  });
  /**
   * Named allies registry — display names from archive/prototype-single-file.html
   * ALLIES (lines ~381–384). Grant paths live on plays / setup / events; this
   * file is the single list of who exists so dead-refs and UI can name them.
   *
   * Grant matrix (Phase 2 port — each cites archive):
   *   AL01 Precinct Chair     — PL08 kitchen-table t0/t1; PL14 court chairs t0;
   *                             personas PA_DIP, PA_INK_DIP (setup.ts)
   *   AL02 County Chairwoman  — PL08 when chairs(s) >= 3 (archive:581–582)
   *   AL03 Club President     — PL11 straw win (archive:599)
   *   AL04 Beat Reporter      — PL10 prCount===2; PL32 coffee editor t0 (595, 723)
   *   AL05 Drive-Time Host    — INTENTIONAL STUB: archive refs warm() but never
   *                             addAlly — see harness:dead-refs INTENTIONAL_STUBS
   *   AL06 Retired Judge      — funeral respect choice (archive:1547)
   *   AL07 Feed-Store Regulars— INTENTIONAL STUB (archive never addAlly)
   *   AL08 Pastor             — PL30 pbCount>=2 && GR04.rapport>=30 (715)
   *   AL09 Canvass Captain    — PL21B / PL39 (670, 747)
   *   AL10 Finance Chair      — INTENTIONAL STUB (weekly $ effect only, 1594)
   *   AL11 Kitchen Cabinet    — persona PA_CRA (setup)
   *   AL12 The Old Bull       — week events (893, 901)
   *   AL13 Lobbyist w/ Cons.  — INTENTIONAL STUB (archive never addAlly)
   *   AL14 Rival's Staffer    — week event plant/meeting (885)
   *   AL15 County Judge       — PL48 tier 0 (779)
   *   AL16 The Slate-Maker    — PL22B tier <=1 (673)
   */
  System.register("data/allies", [], function (exports_14, context_14) {
      "use strict";
      var ALLIES, ALL_ALLY_IDS, INTENTIONAL_STUB_ALLIES;
      var __moduleName = context_14 && context_14.id;
      function allyName(id) {
          var _a, _b;
          return (_b = (_a = ALLIES[id]) === null || _a === void 0 ? void 0 : _a.n) !== null && _b !== void 0 ? _b : id;
      }
      exports_14("allyName", allyName);
      return {
          setters: [],
          execute: function () {/**
               * Named allies registry — display names from archive/prototype-single-file.html
               * ALLIES (lines ~381–384). Grant paths live on plays / setup / events; this
               * file is the single list of who exists so dead-refs and UI can name them.
               *
               * Grant matrix (Phase 2 port — each cites archive):
               *   AL01 Precinct Chair     — PL08 kitchen-table t0/t1; PL14 court chairs t0;
               *                             personas PA_DIP, PA_INK_DIP (setup.ts)
               *   AL02 County Chairwoman  — PL08 when chairs(s) >= 3 (archive:581–582)
               *   AL03 Club President     — PL11 straw win (archive:599)
               *   AL04 Beat Reporter      — PL10 prCount===2; PL32 coffee editor t0 (595, 723)
               *   AL05 Drive-Time Host    — INTENTIONAL STUB: archive refs warm() but never
               *                             addAlly — see harness:dead-refs INTENTIONAL_STUBS
               *   AL06 Retired Judge      — funeral respect choice (archive:1547)
               *   AL07 Feed-Store Regulars— INTENTIONAL STUB (archive never addAlly)
               *   AL08 Pastor             — PL30 pbCount>=2 && GR04.rapport>=30 (715)
               *   AL09 Canvass Captain    — PL21B / PL39 (670, 747)
               *   AL10 Finance Chair      — INTENTIONAL STUB (weekly $ effect only, 1594)
               *   AL11 Kitchen Cabinet    — persona PA_CRA (setup)
               *   AL12 The Old Bull       — week events (893, 901)
               *   AL13 Lobbyist w/ Cons.  — INTENTIONAL STUB (archive never addAlly)
               *   AL14 Rival's Staffer    — week event plant/meeting (885)
               *   AL15 County Judge       — PL48 tier 0 (779)
               *   AL16 The Slate-Maker    — PL22B tier <=1 (673)
               */
              exports_14("ALLIES", ALLIES = {
                  AL01: { id: 'AL01', n: 'Precinct Chair' },
                  AL02: { id: 'AL02', n: 'County Chairwoman' },
                  AL03: { id: 'AL03', n: 'Club President' },
                  AL04: { id: 'AL04', n: 'Beat Reporter' },
                  AL05: { id: 'AL05', n: 'Drive-Time Host' },
                  AL06: { id: 'AL06', n: 'Retired Judge' },
                  AL07: { id: 'AL07', n: 'Feed-Store Regulars' },
                  AL08: { id: 'AL08', n: 'Pastor of the First Church' },
                  AL09: { id: 'AL09', n: 'Canvass Captain' },
                  AL10: { id: 'AL10', n: 'Finance Chair' },
                  AL11: { id: 'AL11', n: 'Kitchen Cabinet' },
                  AL12: { id: 'AL12', n: 'The Old Bull' },
                  AL13: { id: 'AL13', n: 'Lobbyist w/ a Conscience' },
                  AL14: { id: 'AL14', n: "Rival's Disgruntled Staffer" },
                  AL15: { id: 'AL15', n: 'County Judge' },
                  AL16: { id: 'AL16', n: 'The Slate-Maker' }
              });
              exports_14("ALL_ALLY_IDS", ALL_ALLY_IDS = Object.keys(ALLIES));
              /**
               * Allies the archive references via warm()/ally() but never grants via
               * addAlly(). Modular Phase 2 keeps the warm() checks (parity) and documents
               * them so harness:dead-refs stays green without inventing grant fiction.
               */
              exports_14("INTENTIONAL_STUB_ALLIES", INTENTIONAL_STUB_ALLIES = [
                  {
                      id: 'AL05',
                      reason: 'Drive-Time Host: archive PL09/PL23 warm() bonuses only; no addAlly site (prototype lines 587, 677).'
                  },
                  {
                      id: 'AL07',
                      reason: 'Feed-Store Regulars: named in ALLIES registry only; no addAlly in archive.'
                  },
                  {
                      id: 'AL10',
                      reason: 'Finance Chair: archive weekly +$300 if warm (line 1594) but never granted via addAlly.'
                  },
                  {
                      id: 'AL13',
                      reason: "Lobbyist w/ a Conscience: named in ALLIES only; no addAlly in archive."
                  }
              ]);
          }
      };
  });
  /**
   * Bridges between starmap ENT_* and live ally IDs (AL*).
   * warm() / addAlly stay on AL*; starmap is cartography + pilot overlay.
   */
  System.register("data/starmap/bridges", ["data/allies", "data/starmap/entities"], function (exports_15, context_15) {
      "use strict";
      var allies_js_1, entities_js_2, ALLY_TO_ENTITY, ENTITY_TO_ALLY;
      var __moduleName = context_15 && context_15.id;
      function entityIdForAlly(allyId) {
          return ALLY_TO_ENTITY[allyId];
      }
      exports_15("entityIdForAlly", entityIdForAlly);
      function allyIdForEntity(entityId) {
          return ENTITY_TO_ALLY[entityId];
      }
      exports_15("allyIdForEntity", allyIdForEntity);
      /** Validate bridges against ALLIES registry (for harness). */
      function listBrokenAllyBridges() {
          const broken = [];
          for (const [allyId, entId] of Object.entries(ALLY_TO_ENTITY)) {
              if (!allies_js_1.ALLIES[allyId])
                  broken.push(`${entId} → missing ally ${allyId}`);
          }
          return broken;
      }
      exports_15("listBrokenAllyBridges", listBrokenAllyBridges);
      return {
          setters: [
              function (allies_js_1_1) {
                  allies_js_1 = allies_js_1_1;
              },
              function (entities_js_2_1) {
                  entities_js_2 = entities_js_2_1;
              }
          ],
          execute: function () {/**
               * Bridges between starmap ENT_* and live ally IDs (AL*).
               * warm() / addAlly stay on AL*; starmap is cartography + pilot overlay.
               */
              /** allyId → entityId */
              exports_15("ALLY_TO_ENTITY", ALLY_TO_ENTITY = {});
              /** entityId → allyId */
              exports_15("ENTITY_TO_ALLY", ENTITY_TO_ALLY = {});
              for (const ent of Object.values(entities_js_2.ENTITIES)) {
                  if (!ent.allyId)
                      continue;
                  ALLY_TO_ENTITY[ent.allyId] = ent.id;
                  ENTITY_TO_ALLY[ent.id] = ent.allyId;
              }
          }
      };
  });
  /**
   * Playable starmap pilots — template registry (not 93 unique decks).
   * Each row: entity + loop advancement → Special verb (MV##) once per campaign.
   */
  System.register("data/starmap/pilots", [], function (exports_16, context_16) {
      "use strict";
      var PILOT_PRECINCT, PILOT_CAPTAIN, PILOT_JUDGE, PILOT_PARTY, PILOT_CLUB, PILOT_EDITOR, PILOT_FAITH, PILOT_SLATE, PILOT_FINANCE, PILOT_RADIO, PILOT_LOBBY, PILOT_UNION, PILOT_CHAMBER, PILOT_FEED, PLAYABLE_PILOTS, PILOT_ENTITY_ID, PILOT_LOOP_ID, PILOT_VERB_PLAY_ID, PILOT_MOVEMENT_ID;
      var __moduleName = context_16 && context_16.id;
      function pilotByVerb(verbPlayId) {
          return PLAYABLE_PILOTS.find(p => p.verbPlayId === verbPlayId);
      }
      exports_16("pilotByVerb", pilotByVerb);
      function pilotByEntity(entityId) {
          return PLAYABLE_PILOTS.find(p => p.entityId === entityId);
      }
      exports_16("pilotByEntity", pilotByEntity);
      return {
          setters: [],
          execute: function () {/**
               * Playable starmap pilots — template registry (not 93 unique decks).
               * Each row: entity + loop advancement → Special verb (MV##) once per campaign.
               */
              /** Precinct Chair — original pilot (AL01 / MV01). */
              exports_16("PILOT_PRECINCT", PILOT_PRECINCT = {
                  entityId: 'ENT_PRECINCT_CHAIR',
                  loopId: 'LOOP_ENT_PRECINCT_CHAIR',
                  verbPlayId: 'MV01',
                  movementId: 'MOVE_PRECINCT_NETWORK',
                  consumeFlag: 'mv01Consumed',
                  announceFlag: 'mv01Announced',
                  residueFlag: 'orbit_precinct_power',
                  logLabel: 'Precinct Chair network'
              });
              /** Canvass Captain — field spine (AL09 / MV02). */
              exports_16("PILOT_CAPTAIN", PILOT_CAPTAIN = {
                  entityId: 'ENT_CANVASS_CAPTAIN',
                  loopId: 'LOOP_ENT_CANVASS_CAPTAIN',
                  verbPlayId: 'MV02',
                  movementId: 'MOVE_FIELD_PLAN',
                  consumeFlag: 'mv02Consumed',
                  announceFlag: 'mv02Announced',
                  residueFlag: 'orbit_field_spine',
                  logLabel: 'Canvass Captain field plan'
              });
              /** County Judge — heaviest local nod (AL15 / MV03). */
              exports_16("PILOT_JUDGE", PILOT_JUDGE = {
                  entityId: 'ENT_COUNTY_JUDGE',
                  loopId: 'LOOP_ENT_COUNTY_JUDGE',
                  verbPlayId: 'MV03',
                  movementId: 'MOVE_COURTHOUSE_NOD',
                  consumeFlag: 'mv03Consumed',
                  announceFlag: 'mv03Announced',
                  residueFlag: 'orbit_courthouse_nod',
                  logLabel: 'County Judge courthouse nod'
              });
              /** County Party Exec — apparatus (AL02 / MV04). */
              exports_16("PILOT_PARTY", PILOT_PARTY = {
                  entityId: 'ENT_COUNTY_PARTY_EXEC',
                  loopId: 'LOOP_ENT_COUNTY_PARTY_EXEC',
                  verbPlayId: 'MV04',
                  movementId: 'MOVE_PARTY_APPARATUS',
                  consumeFlag: 'mv04Consumed',
                  announceFlag: 'mv04Announced',
                  residueFlag: 'orbit_party_apparatus',
                  logLabel: 'County Party apparatus'
              });
              /** Club Leader — roster / straw circuit (AL03 / MV05). */
              exports_16("PILOT_CLUB", PILOT_CLUB = {
                  entityId: 'ENT_CLUB_LEADER',
                  loopId: 'LOOP_ENT_CLUB_LEADER',
                  verbPlayId: 'MV05',
                  movementId: 'MOVE_CLUB_ROSTER',
                  consumeFlag: 'mv05Consumed',
                  announceFlag: 'mv05Announced',
                  residueFlag: 'orbit_club_roster',
                  logLabel: 'Club roster circuit'
              });
              /** Local Editor — earned media (AL04 / MV06). */
              exports_16("PILOT_EDITOR", PILOT_EDITOR = {
                  entityId: 'ENT_LOCAL_EDITOR',
                  loopId: 'LOOP_ENT_LOCAL_EDITOR',
                  verbPlayId: 'MV06',
                  movementId: 'MOVE_NEWSROOM_NOD',
                  consumeFlag: 'mv06Consumed',
                  announceFlag: 'mv06Announced',
                  residueFlag: 'orbit_newsroom_nod',
                  logLabel: 'Newsroom fair shake'
              });
              /** Faith Leader — corridor / directory (AL08 / MV07). */
              exports_16("PILOT_FAITH", PILOT_FAITH = {
                  entityId: 'ENT_FAITH_LEADER',
                  loopId: 'LOOP_ENT_FAITH_LEADER',
                  verbPlayId: 'MV07',
                  movementId: 'MOVE_CORRIDOR_BLESSING',
                  consumeFlag: 'mv07Consumed',
                  announceFlag: 'mv07Announced',
                  residueFlag: 'orbit_corridor_blessing',
                  logLabel: 'Corridor blessing'
              });
              /** Slate-Maker — printed-card politics (AL16 / MV08). */
              exports_16("PILOT_SLATE", PILOT_SLATE = {
                  entityId: 'ENT_SLATE_MAKER',
                  loopId: 'LOOP_ENT_SLATE_MAKER',
                  verbPlayId: 'MV08',
                  movementId: 'MOVE_SLATE_CARD',
                  consumeFlag: 'mv08Consumed',
                  announceFlag: 'mv08Announced',
                  residueFlag: 'orbit_slate_card',
                  logLabel: 'Slate card print run'
              });
              /** Finance Chair — call sheet / war chest (AL10 / MV09). */
              exports_16("PILOT_FINANCE", PILOT_FINANCE = {
                  entityId: 'ENT_FINANCE_CHAIR',
                  loopId: 'LOOP_ENT_FINANCE_CHAIR',
                  verbPlayId: 'MV09',
                  movementId: 'MOVE_FINANCE_BOOK',
                  consumeFlag: 'mv09Consumed',
                  announceFlag: 'mv09Announced',
                  residueFlag: 'orbit_finance_book',
                  logLabel: 'Finance Chair call sheet'
              });
              /** Radio Host — drive-time (AL05 / MV10). */
              exports_16("PILOT_RADIO", PILOT_RADIO = {
                  entityId: 'ENT_RADIO_HOST',
                  loopId: 'LOOP_ENT_RADIO_HOST',
                  verbPlayId: 'MV10',
                  movementId: 'MOVE_DRIVE_TIME',
                  consumeFlag: 'mv10Consumed',
                  announceFlag: 'mv10Announced',
                  residueFlag: 'orbit_drive_time',
                  logLabel: 'Drive-time radio slot'
              });
              /** Junior Lobbyist — access map (AL13 / MV11). */
              exports_16("PILOT_LOBBY", PILOT_LOBBY = {
                  entityId: 'ENT_JUNIOR_LOBBYIST',
                  loopId: 'LOOP_ENT_JUNIOR_LOBBYIST',
                  verbPlayId: 'MV11',
                  movementId: 'MOVE_LOBBY_MAP',
                  consumeFlag: 'mv11Consumed',
                  announceFlag: 'mv11Announced',
                  residueFlag: 'orbit_lobby_map',
                  logLabel: 'Lobbyist access map'
              });
              /** Union local president — plant gate (MV12). */
              exports_16("PILOT_UNION", PILOT_UNION = {
                  entityId: 'ENT_UNION_LOCAL_PRES',
                  loopId: 'LOOP_ENT_UNION_LOCAL_PRES',
                  verbPlayId: 'MV12',
                  movementId: 'MOVE_PLANT_GATE',
                  consumeFlag: 'mv12Consumed',
                  announceFlag: 'mv12Announced',
                  residueFlag: 'orbit_plant_gate',
                  logLabel: 'Union plant-gate endorsement'
              });
              /** Chamber executive — rubber chicken (MV13). */
              exports_16("PILOT_CHAMBER", PILOT_CHAMBER = {
                  entityId: 'ENT_CHAMBER_EXEC',
                  loopId: 'LOOP_ENT_CHAMBER_EXEC',
                  verbPlayId: 'MV13',
                  movementId: 'MOVE_RUBBER_CHICKEN',
                  consumeFlag: 'mv13Consumed',
                  announceFlag: 'mv13Announced',
                  residueFlag: 'orbit_rubber_chicken',
                  logLabel: 'Chamber rubber-chicken circuit'
              });
              /** Feed-Store Regulars — bench politics (AL07 / MV14). */
              exports_16("PILOT_FEED", PILOT_FEED = {
                  entityId: 'ENT_FEED_STORE',
                  loopId: 'LOOP_ENT_FEED_STORE',
                  verbPlayId: 'MV14',
                  movementId: 'MOVE_FEED_BENCH',
                  consumeFlag: 'mv14Consumed',
                  announceFlag: 'mv14Announced',
                  residueFlag: 'orbit_feed_bench',
                  logLabel: 'Feed-store bench'
              });
              /**
               * All playable entity-template loops.
               * Templates + deltas only — never one unique deck per ENT_*.
               */
              exports_16("PLAYABLE_PILOTS", PLAYABLE_PILOTS = [
                  PILOT_PRECINCT,
                  PILOT_CAPTAIN,
                  PILOT_JUDGE,
                  PILOT_PARTY,
                  PILOT_CLUB,
                  PILOT_EDITOR,
                  PILOT_FAITH,
                  PILOT_SLATE,
                  PILOT_FINANCE,
                  PILOT_RADIO,
                  PILOT_LOBBY,
                  PILOT_UNION,
                  PILOT_CHAMBER,
                  PILOT_FEED
              ]);
              // Back-compat aliases used by older imports
              exports_16("PILOT_ENTITY_ID", PILOT_ENTITY_ID = PILOT_PRECINCT.entityId);
              exports_16("PILOT_LOOP_ID", PILOT_LOOP_ID = PILOT_PRECINCT.loopId);
              exports_16("PILOT_VERB_PLAY_ID", PILOT_VERB_PLAY_ID = PILOT_PRECINCT.verbPlayId);
              exports_16("PILOT_MOVEMENT_ID", PILOT_MOVEMENT_ID = PILOT_PRECINCT.movementId);
          }
      };
  });
  /**
   * Starmap query + condition evaluation + multi-pilot movement sync.
   * Issues #17 #18. Playable pilots: Precinct Chair, Canvass Captain, County Judge.
   */
  System.register("engine/entities", ["data/starmap/entities", "data/starmap/loops", "data/starmap/orbits", "data/starmap/bridges", "data/starmap/pilots", "engine/reputation"], function (exports_17, context_17) {
      "use strict";
      var entities_js_3, loops_js_1, orbits_js_1, bridges_js_1, pilots_js_1, reputation_js_3;
      var __moduleName = context_17 && context_17.id;
      function getEntity(id) {
          return entities_js_3.getEntityDef(id);
      }
      exports_17("getEntity", getEntity);
      function stageToTiming(state) {
          if (state.over)
              return 'waiting';
          if (state.stage === 'session')
              return 'session';
          if (state.stage === 'general')
              return 'general';
          if (state.stage === 'primary' && !state.ballot)
              return 'pre-filing';
          if (state.stage === 'primary')
              return 'primary';
          return 'primary';
      }
      function getAvailableOrbits(state, entityId) {
          const timing = stageToTiming(state);
          return orbits_js_1.orbitsFrom(entityId).filter(orb => {
              if (!orb.timingWindows || orb.timingWindows.length === 0)
                  return true;
              return orb.timingWindows.includes(timing);
          });
      }
      exports_17("getAvailableOrbits", getAvailableOrbits);
      function evaluateCondition(state, spec) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
          const p = (_a = spec.params) !== null && _a !== void 0 ? _a : {};
          switch (spec.kind) {
              case 'always_false':
              case 'manual_todo':
                  return false;
              case 'stage_is':
                  return state.stage === String((_b = p.stage) !== null && _b !== void 0 ? _b : '');
              case 'has_ally':
                  return reputation_js_3.warm(state, String((_c = p.allyId) !== null && _c !== void 0 ? _c : ''));
              case 'has_rep':
                  return state.reps.includes(String((_d = p.repId) !== null && _d !== void 0 ? _d : ''));
              case 'has_obl':
                  return state.obls.includes(String((_e = p.oblId) !== null && _e !== void 0 ? _e : ''));
              case 'name_id_gte': {
                  if (state.nameID < Number((_f = p.n) !== null && _f !== void 0 ? _f : 0))
                      return false;
                  // Optional compounds for template paths
                  if (p.requireVol !== undefined && ((_g = state.volPool) !== null && _g !== void 0 ? _g : 0) < Number(p.requireVol)) {
                      return false;
                  }
                  if (p.requireBacker !== undefined) {
                      const b = String(p.requireBacker);
                      if (!((_h = state.backers) === null || _h === void 0 ? void 0 : _h.includes(b)))
                          return false;
                  }
                  return true;
              }
              case 'endorse_gte': {
                  const need = Number((_j = p.n) !== null && _j !== void 0 ? _j : 0);
                  if (state.endorsePts < need)
                      return false;
                  const reqAlly = p.requireAlly;
                  if (reqAlly !== undefined && reqAlly !== '') {
                      if (!reputation_js_3.warm(state, String(reqAlly)))
                          return false;
                  }
                  // Optional name floor (judge weight path)
                  if (p.requireName !== undefined && state.nameID < Number(p.requireName)) {
                      return false;
                  }
                  // Optional cash floor (slate-ready path)
                  if (p.requireCash !== undefined && state.money < Number(p.requireCash)) {
                      return false;
                  }
                  return true;
              }
              case 'district_standing_gte':
                  return state.districtStanding >= Number((_k = p.n) !== null && _k !== void 0 ? _k : 0);
              case 'warm_ally_gte': {
                  const allyId = String((_l = p.allyId) !== null && _l !== void 0 ? _l : '');
                  const n = Number((_m = p.n) !== null && _m !== void 0 ? _m : 1);
                  const count = state.allies.filter(a => a.id === allyId && a.warm > 0).length;
                  return count >= n;
              }
              case 'hit_pieces_gte':
                  return state.hitPieces >= Number((_o = p.n) !== null && _o !== void 0 ? _o : 0);
              default:
                  return false;
          }
      }
      exports_17("evaluateCondition", evaluateCondition);
      function pilotConsumed(state, pilot) {
          var _a;
          return !!((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a[pilot.consumeFlag]);
      }
      /**
       * All open movement opportunities across playable pilots.
       * Overlay on campaign — does not leave primary/general.
       */
      function checkMovementOptions(state) {
          if (state.stage === 'session' || state.stage === 'waiting')
              return [];
          const out = [];
          for (const pilot of pilots_js_1.PLAYABLE_PILOTS) {
              if (pilotConsumed(state, pilot))
                  continue;
              const loop = loops_js_1.getLoop(pilot.loopId);
              if (!loop)
                  continue;
              for (const adv of loop.advancement) {
                  if (!evaluateCondition(state, adv))
                      continue;
                  out.push({
                      id: pilot.movementId,
                      entityId: pilot.entityId,
                      conditionId: adv.id,
                      description: adv.description,
                      movementTarget: adv.movementTarget,
                      verbPlayId: pilot.verbPlayId
                  });
                  break; // one opportunity per pilot
              }
          }
          return out;
      }
      exports_17("checkMovementOptions", checkMovementOptions);
      /**
       * After plays / week advance: open pending movements; log ORBIT OPEN once each.
       * pendingMovement holds the first open orbit (UI hint); all verbs still show via camp.
       */
      function syncMovementFlags(state) {
          var _a, _b;
          const opts = checkMovementOptions(state);
          if (!opts.length) {
              // Keep last pending if still valid for its verb
              if ((_a = state.pendingMovement) === null || _a === void 0 ? void 0 : _a.verbPlayId) {
                  const still = opts.some(o => o.verbPlayId === state.pendingMovement.verbPlayId);
                  if (!still && !isMovementVerbAvailable(state, state.pendingMovement.verbPlayId)) {
                      // re-check without clearing if consumed handled by show()
                  }
              }
              return;
          }
          state.sessionFlags = state.sessionFlags || {};
          for (const opt of opts) {
              const pilot = pilots_js_1.pilotByVerb((_b = opt.verbPlayId) !== null && _b !== void 0 ? _b : '');
              if (!pilot)
                  continue;
              if (!state.sessionFlags[pilot.announceFlag]) {
                  state.sessionFlags[pilot.announceFlag] = true;
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: `ORBIT OPEN — ${pilot.logLabel}. (${opt.description}) Movement verb available.`
                  });
              }
          }
          // Prefer higher MV numbers (heavier orbits) for pending hint
          const rank = (id) => {
              const m = /^MV(\d+)$/.exec(id);
              return m ? Number(m[1]) : 0;
          };
          const best = [...opts].sort((a, b) => { var _a, _b; return rank((_a = b.verbPlayId) !== null && _a !== void 0 ? _a : '') - rank((_b = a.verbPlayId) !== null && _b !== void 0 ? _b : ''); })[0];
          state.pendingMovement = best;
      }
      exports_17("syncMovementFlags", syncMovementFlags);
      function isMovementVerbAvailable(state, verbPlayId) {
          var _a;
          const pilot = pilots_js_1.pilotByVerb(verbPlayId);
          if (!pilot)
              return false;
          if (pilotConsumed(state, pilot))
              return false;
          if (((_a = state.pendingMovement) === null || _a === void 0 ? void 0 : _a.verbPlayId) === verbPlayId)
              return true;
          return checkMovementOptions(state).some(o => o.verbPlayId === verbPlayId);
      }
      exports_17("isMovementVerbAvailable", isMovementVerbAvailable);
      /** @deprecated use isMovementVerbAvailable(state, 'MV01') */
      function isPilotMovementAvailable(state) {
          return isMovementVerbAvailable(state, pilots_js_1.PILOT_VERB_PLAY_ID);
      }
      exports_17("isPilotMovementAvailable", isPilotMovementAvailable);
      /** All starmap Special verbs currently legal as camp offers. */
      function listAvailableMovementVerbIds(state) {
          return checkMovementOptions(state)
              .map(o => o.verbPlayId)
              .filter((id) => !!id);
      }
      exports_17("listAvailableMovementVerbIds", listAvailableMovementVerbIds);
      function starmapCounts() {
          var _a;
          const byTier = {};
          for (const e of Object.values(entities_js_3.ENTITIES)) {
              byTier[e.tier] = ((_a = byTier[e.tier]) !== null && _a !== void 0 ? _a : 0) + 1;
          }
          return {
              entities: Object.keys(entities_js_3.ENTITIES).length,
              byTier,
              orbits: orbits_js_1.ORBITS.length,
              loops: Object.keys(loops_js_1.LOOPS).length,
              playablePilots: pilots_js_1.PLAYABLE_PILOTS.length
          };
      }
      exports_17("starmapCounts", starmapCounts);
      return {
          setters: [
              function (entities_js_3_1) {
                  entities_js_3 = entities_js_3_1;
              },
              function (loops_js_1_1) {
                  loops_js_1 = loops_js_1_1;
              },
              function (orbits_js_1_1) {
                  orbits_js_1 = orbits_js_1_1;
              },
              function (bridges_js_1_1) {
                  bridges_js_1 = bridges_js_1_1;
              },
              function (pilots_js_1_1) {
                  pilots_js_1 = pilots_js_1_1;
              },
              function (reputation_js_3_1) {
                  reputation_js_3 = reputation_js_3_1;
              }
          ],
          execute: function () {/**
               * Starmap query + condition evaluation + multi-pilot movement sync.
               * Issues #17 #18. Playable pilots: Precinct Chair, Canvass Captain, County Judge.
               */
              exports_17("ENTITIES", entities_js_3.ENTITIES);
              exports_17("getEntityDef", entities_js_3.getEntityDef);
              exports_17("listEntitiesByTier", entities_js_3.listEntitiesByTier);
              exports_17("LOOPS", loops_js_1.LOOPS);
              exports_17("getLoop", loops_js_1.getLoop);
              exports_17("ORBITS", orbits_js_1.ORBITS);
              exports_17("orbitsFrom", orbits_js_1.orbitsFrom);
              exports_17("orbitsTo", orbits_js_1.orbitsTo);
              exports_17("entityIdForAlly", bridges_js_1.entityIdForAlly);
              exports_17("allyIdForEntity", bridges_js_1.allyIdForEntity);
              exports_17("PLAYABLE_PILOTS", pilots_js_1.PLAYABLE_PILOTS);
              exports_17("PILOT_ENTITY_ID", pilots_js_1.PILOT_ENTITY_ID);
              exports_17("PILOT_VERB_PLAY_ID", pilots_js_1.PILOT_VERB_PLAY_ID);
              exports_17("pilotByVerb", pilots_js_1.pilotByVerb);
          }
      };
  });
  /**
   * Starmap movement verbs — Special residency entity kits (templates).
   * MV01–08 prior packs · MV09–11 Finance / Radio / Lobbyist.
   */
  System.register("data/plays-starmap", ["engine/entities", "data/starmap/pilots"], function (exports_18, context_18) {
      "use strict";
      var entities_js_4, pilots_js_2, MV01_PrecinctNetwork, MV02_FieldPlan, MV03_CourthouseNod, MV04_PartyApparatus, MV05_ClubRoster, MV06_NewsroomNod, MV07_CorridorBlessing, MV08_SlateCard, MV09_FinanceBook, MV10_DriveTime, MV11_LobbyMap, MV12_PlantGate, MV13_RubberChicken, MV14_FeedBench, STARMAP_PLAYS;
      var __moduleName = context_18 && context_18.id;
      function markEntity(s, entityId) {
          var _a;
          s.entityHistory = (_a = s.entityHistory) !== null && _a !== void 0 ? _a : [];
          if (!s.entityHistory.includes(entityId))
              s.entityHistory.push(entityId);
      }
      function consumePilot(s, consumeFlag, residueFlag) {
          s.sessionFlags = s.sessionFlags || {};
          s.sessionFlags[consumeFlag] = true;
          s.sessionFlags[residueFlag] = true;
          s.pendingMovement = undefined;
      }
      return {
          setters: [
              function (entities_js_4_1) {
                  entities_js_4 = entities_js_4_1;
              },
              function (pilots_js_2_1) {
                  pilots_js_2 = pilots_js_2_1;
              }
          ],
          execute: function () {/**
               * Starmap movement verbs — Special residency entity kits (templates).
               * MV01–08 prior packs · MV09–11 Finance / Radio / Lobbyist.
               */
              /**
               * MV01 — Call in the Precinct Chair network.
               * Unlocks: 2× warm AL01 or endorse+AL01.
               */
              exports_18("MV01_PrecinctNetwork", MV01_PrecinctNetwork = {
                  id: pilots_js_2.PILOT_PRECINCT.verbPlayId,
                  n: 'Call in the Precinct Chair network',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_PRECINCT.entityId],
                  attrs: ['DIP'],
                  d: 'The chairs you banked open a door: lists, volunteers, a quiet county nod. Special kit — Precinct Chair orbit.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_PRECINCT.verbPlayId),
                  odds: () => 0.95,
                  run: s => {
                      s.endorsePts += 2;
                      s.contacts += 40;
                      s.volPool += 1;
                      markEntity(s, pilots_js_2.PILOT_PRECINCT.entityId);
                      consumePilot(s, pilots_js_2.PILOT_PRECINCT.consumeFlag, pilots_js_2.PILOT_PRECINCT.residueFlag);
                      return ('The precinct network answers. +2 endorsement weight, +40 contacts, +1 volunteer. ' +
                          '(Starmap: ENT_PRECINCT_CHAIR orbit exercised. Residue: orbit_precinct_power.)');
                  }
              });
              /**
               * MV02 — Execute the Canvass Captain field plan.
               * Unlocks: warm AL09, or name+vol field pressure path.
               */
              exports_18("MV02_FieldPlan", MV02_FieldPlan = {
                  id: pilots_js_2.PILOT_CAPTAIN.verbPlayId,
                  n: 'Execute the field plan',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  field: true,
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_CAPTAIN.entityId],
                  attrs: ['CLO', 'DIP'],
                  d: 'The captain\'s route book becomes the week\'s law. Special kit — Canvass Captain orbit. Field AP and turf GOTV.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_CAPTAIN.verbPlayId),
                  odds: () => 0.92,
                  run: (s, _o, g) => {
                      var _a, _b;
                      s.fieldAp = (s.fieldAp || 0) + 1;
                      s.volPool += 2;
                      s.contacts += 25;
                      // Seed GOTV on captain's turf or chosen ground
                      const turfIds = (_b = (_a = s.allies.find(a => { var _a; return a.id === 'AL09' && ((_a = a.grounds) === null || _a === void 0 ? void 0 : _a.length); })) === null || _a === void 0 ? void 0 : _a.grounds) !== null && _b !== void 0 ? _b : (g ? [g.id] : []);
                      let gotvNote = '';
                      if (turfIds.length) {
                          for (const id of turfIds) {
                              const ground = s.groundsArr.find(x => x.id === id);
                              if (ground) {
                                  ground.gotv = (ground.gotv || 0) + 0.15;
                                  gotvNote = ` +15% GOTV at ${ground.n}.`;
                              }
                          }
                      }
                      else if (g) {
                          g.gotv = (g.gotv || 0) + 0.12;
                          gotvNote = ` +12% GOTV at ${g.n}.`;
                      }
                      markEntity(s, pilots_js_2.PILOT_CAPTAIN.entityId);
                      consumePilot(s, pilots_js_2.PILOT_CAPTAIN.consumeFlag, pilots_js_2.PILOT_CAPTAIN.residueFlag);
                      return (`The field plan runs. +1 field AP this week, +2 volunteers, +25 contacts.${gotvNote} ` +
                          '(Starmap: ENT_CANVASS_CAPTAIN orbit exercised. Residue: orbit_field_spine.)');
                  }
              });
              /**
               * MV03 — Spend the County Judge courthouse nod.
               * Unlocks: warm AL15, or endorse+name weight path.
               */
              exports_18("MV03_CourthouseNod", MV03_CourthouseNod = {
                  id: pilots_js_2.PILOT_JUDGE.verbPlayId,
                  n: 'Spend the courthouse nod',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_JUDGE.entityId],
                  attrs: ['DIP', 'CLO'],
                  d: 'The heaviest local name spends itself once. Special kit — County Judge orbit. Endorsement gravity and name heat.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_JUDGE.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.endorsePts += 3;
                      s.nameID += 8;
                      s.momentum += 2;
                      s.contacts += 30;
                      // Soft general edge via name — residue flag for future win-math hooks
                      markEntity(s, pilots_js_2.PILOT_JUDGE.entityId);
                      consumePilot(s, pilots_js_2.PILOT_JUDGE.consumeFlag, pilots_js_2.PILOT_JUDGE.residueFlag);
                      return ('The County Judge is on the record for you. +3 endorsement, +8 name ID, +2 momentum, +30 contacts. ' +
                          '(Starmap: ENT_COUNTY_JUDGE orbit exercised. Residue: orbit_courthouse_nod.)');
                  }
              });
              /**
               * MV04 — Activate the County Party apparatus (AL02).
               */
              exports_18("MV04_PartyApparatus", MV04_PartyApparatus = {
                  id: pilots_js_2.PILOT_PARTY.verbPlayId,
                  n: 'Activate the party apparatus',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_PARTY.entityId],
                  attrs: ['DIP', 'CLO'],
                  d: 'The Chairwoman opens the file and the volunteer list. Special kit — County Party orbit.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_PARTY.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.endorsePts += 2;
                      s.volPool += 2;
                      s.contacts += 50;
                      s.money += 400;
                      markEntity(s, pilots_js_2.PILOT_PARTY.entityId);
                      consumePilot(s, pilots_js_2.PILOT_PARTY.consumeFlag, pilots_js_2.PILOT_PARTY.residueFlag);
                      return ('County HQ moves. +2 endorsement, +2 volunteers, +50 contacts, +$400. ' +
                          '(Starmap: ENT_COUNTY_PARTY_EXEC. Residue: orbit_party_apparatus.)');
                  }
              });
              /**
               * MV05 — Pull the club roster (AL03).
               */
              exports_18("MV05_ClubRoster", MV05_ClubRoster = {
                  id: pilots_js_2.PILOT_CLUB.verbPlayId,
                  n: 'Pull the club roster',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_CLUB.entityId],
                  attrs: ['DIP', 'CHA'],
                  d: 'Every name that votes straw. Special kit — Club Leader orbit.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_CLUB.verbPlayId),
                  odds: () => 0.92,
                  run: s => {
                      s.endorsePts += 1;
                      s.contacts += 60;
                      s.volPool += 1;
                      s.momentum += 1;
                      markEntity(s, pilots_js_2.PILOT_CLUB.entityId);
                      consumePilot(s, pilots_js_2.PILOT_CLUB.consumeFlag, pilots_js_2.PILOT_CLUB.residueFlag);
                      return ('The roster lands on your kitchen table. +1 endorsement, +60 contacts, +1 volunteer, +1 momentum. ' +
                          '(Starmap: ENT_CLUB_LEADER. Residue: orbit_club_roster.)');
                  }
              });
              /**
               * MV06 — Call in the newsroom fair shake (AL04).
               */
              exports_18("MV06_NewsroomNod", MV06_NewsroomNod = {
                  id: pilots_js_2.PILOT_EDITOR.verbPlayId,
                  n: 'Call in the fair shake',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_EDITOR.entityId],
                  attrs: ['CHA', 'CRA'],
                  d: 'Not an endorsement — the benefit of the doubt in print. Special kit — Local Editor orbit.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_EDITOR.verbPlayId),
                  odds: () => 0.88,
                  run: s => {
                      s.nameID += 10;
                      s.momentum += 2;
                      s.faces.F = Math.min(100, (s.faces.F || 0) + 6);
                      markEntity(s, pilots_js_2.PILOT_EDITOR.entityId);
                      consumePilot(s, pilots_js_2.PILOT_EDITOR.consumeFlag, pilots_js_2.PILOT_EDITOR.residueFlag);
                      return ('The weekly gives you the clean write-up. +10 name ID, +2 momentum, Faces F up. ' +
                          '(Starmap: ENT_LOCAL_EDITOR. Residue: orbit_newsroom_nod.)');
                  }
              });
              /**
               * MV07 — Corridor blessing (AL08).
               */
              exports_18("MV07_CorridorBlessing", MV07_CorridorBlessing = {
                  id: pilots_js_2.PILOT_FAITH.verbPlayId,
                  n: 'Open the corridor',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_FAITH.entityId],
                  attrs: ['CON', 'DIP'],
                  d: 'The Pastor\'s hand on both of yours. Directory and volunteers. Special kit — Faith Leader orbit.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_FAITH.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.volPool += 3;
                      s.faces.T = Math.min(100, (s.faces.T || 0) + 5);
                      s.faces.G = Math.min(100, (s.faces.G || 0) + 5);
                      s.contacts += 35;
                      // Corridor ground
                      const g = s.groundsArr.find(x => x.id === 'GR04');
                      if (g) {
                          g.rapport = Math.min(100, g.rapport + 8);
                          g.gated = false;
                      }
                      if (!s.assets.includes('A13'))
                          s.assets.push('A13');
                      markEntity(s, pilots_js_2.PILOT_FAITH.entityId);
                      consumePilot(s, pilots_js_2.PILOT_FAITH.consumeFlag, pilots_js_2.PILOT_FAITH.residueFlag);
                      return ('The Corridor opens. +3 volunteers, +35 contacts, Church Corridor rapport, directory (A13). ' +
                          '(Starmap: ENT_FAITH_LEADER. Residue: orbit_corridor_blessing.)');
                  }
              });
              /**
               * MV08 — Run the slate hard (AL16 / printed card).
               * Unlocks after See the Slate-Maker (AL16/OB3) or Chairwoman+cash+endorse path.
               */
              exports_18("MV08_SlateCard", MV08_SlateCard = {
                  id: pilots_js_2.PILOT_SLATE.verbPlayId,
                  n: 'Run the slate hard',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_SLATE.entityId],
                  attrs: ['CRA', 'DIP'],
                  d: 'Half the primary votes from a printed card. Special kit — Slate-Maker orbit. His marker was already on it.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_SLATE.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.slate = true;
                      s.endorsePts += 3;
                      s.nameID += 12;
                      s.momentum += 2;
                      s.contacts += 40;
                      // Primary heat — the card is the room
                      s.faces.F = Math.min(100, (s.faces.F || 0) + 4);
                      markEntity(s, pilots_js_2.PILOT_SLATE.entityId);
                      consumePilot(s, pilots_js_2.PILOT_SLATE.consumeFlag, pilots_js_2.PILOT_SLATE.residueFlag);
                      return ('The card hits every kitchen table that votes. +3 endorsement, +12 name ID, +2 momentum, +40 contacts. ' +
                          '(Starmap: ENT_SLATE_MAKER. Residue: orbit_slate_card. His marker still rides.)');
                  }
              });
              /**
               * MV09 — Call the finance book (AL10).
               */
              exports_18("MV09_FinanceBook", MV09_FinanceBook = {
                  id: pilots_js_2.PILOT_FINANCE.verbPlayId,
                  n: 'Call the finance book',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_FINANCE.entityId],
                  attrs: ['CRA', 'CLO'],
                  d: 'The Finance Chair opens the call sheet. Special kit — money spine, not a free weekly drip forever.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_FINANCE.verbPlayId),
                  odds: () => 0.92,
                  run: s => {
                      s.money += 900;
                      s.contacts += 20;
                      s.endorsePts += 1;
                      markEntity(s, pilots_js_2.PILOT_FINANCE.entityId);
                      consumePilot(s, pilots_js_2.PILOT_FINANCE.consumeFlag, pilots_js_2.PILOT_FINANCE.residueFlag);
                      return ('The book answers. +$900, +20 contacts, +1 endorsement. ' +
                          '(Starmap: ENT_FINANCE_CHAIR. Residue: orbit_finance_book.)');
                  }
              });
              /**
               * MV10 — Take the drive-time slot (AL05).
               */
              exports_18("MV10_DriveTime", MV10_DriveTime = {
                  id: pilots_js_2.PILOT_RADIO.verbPlayId,
                  n: 'Take the drive-time slot',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_RADIO.entityId],
                  attrs: ['CHA', 'CRA'],
                  d: 'Open mic between farm reports and the noon news. Special kit — Radio Host orbit. Name heat, not an endorsement.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_RADIO.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.nameID += 9;
                      s.momentum += 2;
                      s.faces.F = Math.min(100, (s.faces.F || 0) + 5);
                      s.contacts += 25;
                      markEntity(s, pilots_js_2.PILOT_RADIO.entityId);
                      consumePilot(s, pilots_js_2.PILOT_RADIO.consumeFlag, pilots_js_2.PILOT_RADIO.residueFlag);
                      return ('Drive time says your name clean. +9 name ID, +2 momentum, +25 contacts, Faces F up. ' +
                          '(Starmap: ENT_RADIO_HOST. Residue: orbit_drive_time.)');
                  }
              });
              /**
               * MV11 — Spend the lobbyist access map (AL13).
               */
              exports_18("MV11_LobbyMap", MV11_LobbyMap = {
                  id: pilots_js_2.PILOT_LOBBY.verbPlayId,
                  n: 'Spend the access map',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_LOBBY.entityId],
                  attrs: ['DIP', 'CRA'],
                  d: 'A junior lobbyist with a conscience walks you the side door. Special kit — access, not a vote.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_LOBBY.verbPlayId),
                  odds: () => 0.88,
                  run: s => {
                      s.contacts += 45;
                      s.endorsePts += 1;
                      s.momentum += 1;
                      s.capital = (s.capital || 0) + 1;
                      // Soft session seed if ever seated later; harmless on campaign
                      s.favor = Math.min(100, (s.favor || 0) + 2);
                      markEntity(s, pilots_js_2.PILOT_LOBBY.entityId);
                      consumePilot(s, pilots_js_2.PILOT_LOBBY.consumeFlag, pilots_js_2.PILOT_LOBBY.residueFlag);
                      return ('The map has three names that still take coffee. +45 contacts, +1 endorsement, +1 momentum, +1 capital, favor up. ' +
                          '(Starmap: ENT_JUNIOR_LOBBYIST. Residue: orbit_lobby_map.)');
                  }
              });
              /**
               * MV12 — Spend the plant-gate endorsement (union local).
               */
              exports_18("MV12_PlantGate", MV12_PlantGate = {
                  id: pilots_js_2.PILOT_UNION.verbPlayId,
                  n: 'Spend the plant-gate nod',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  field: true,
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_UNION.entityId],
                  attrs: ['CLO', 'DIP'],
                  d: 'The local president puts a hand on your shoulder at shift change. Special kit — Union orbit. Volunteers and doors.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_UNION.verbPlayId),
                  odds: () => 0.9,
                  run: (s, _o, g) => {
                      s.volPool += 3;
                      s.endorsePts += 2;
                      s.contacts += 35;
                      s.faces.G = Math.min(100, (s.faces.G || 0) + 4);
                      if (g) {
                          g.rapport = Math.min(100, (g.rapport || 0) + 6);
                          g.gotv = (g.gotv || 0) + 0.08;
                      }
                      markEntity(s, pilots_js_2.PILOT_UNION.entityId);
                      consumePilot(s, pilots_js_2.PILOT_UNION.consumeFlag, pilots_js_2.PILOT_UNION.residueFlag);
                      return ('The gate nods. +3 volunteers, +2 endorsement, +35 contacts, Faces G up' +
                          (g ? `, rapport/GOTV at ${g.n}` : '') +
                          '. (Starmap: ENT_UNION_LOCAL_PRES. Residue: orbit_plant_gate.)');
                  }
              });
              /**
               * MV13 — Work the chamber chicken circuit.
               */
              exports_18("MV13_RubberChicken", MV13_RubberChicken = {
                  id: pilots_js_2.PILOT_CHAMBER.verbPlayId,
                  n: 'Work the chicken circuit',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_CHAMBER.entityId],
                  attrs: ['DIP', 'CHA'],
                  d: 'Rubber chicken, name tags, reliable voters. Special kit — Chamber orbit. Money and polite weight.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_CHAMBER.verbPlayId),
                  odds: () => 0.9,
                  run: s => {
                      s.money += 500;
                      s.endorsePts += 2;
                      s.nameID += 5;
                      s.contacts += 30;
                      markEntity(s, pilots_js_2.PILOT_CHAMBER.entityId);
                      consumePilot(s, pilots_js_2.PILOT_CHAMBER.consumeFlag, pilots_js_2.PILOT_CHAMBER.residueFlag);
                      return ('Main street files you under serious. +$500, +2 endorsement, +5 name ID, +30 contacts. ' +
                          '(Starmap: ENT_CHAMBER_EXEC. Residue: orbit_rubber_chicken.)');
                  }
              });
              /**
               * MV14 — Sit the feed-store bench (AL07).
               */
              exports_18("MV14_FeedBench", MV14_FeedBench = {
                  id: pilots_js_2.PILOT_FEED.verbPlayId,
                  n: 'Sit the feed-store bench',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2],
                  tag: 'orbit movement',
                  kind: 'ally',
                  residency: 'special',
                  control: 'player',
                  entityScope: [pilots_js_2.PILOT_FEED.entityId],
                  attrs: ['CHA', 'CON'],
                  d: 'Unofficial senate on the bench out front. Special kit — Feed-Store orbit. Rumor is infrastructure.',
                  show: s => entities_js_4.isMovementVerbAvailable(s, pilots_js_2.PILOT_FEED.verbPlayId),
                  odds: () => 0.92,
                  run: s => {
                      s.contacts += 55;
                      s.momentum += 1;
                      s.nameID += 4;
                      s.volPool += 1;
                      // Rural grounds soft open if present
                      for (const id of ['GR02', 'GR05', 'GR06']) {
                          const ground = s.groundsArr.find(x => x.id === id);
                          if (ground)
                              ground.rapport = Math.min(100, (ground.rapport || 0) + 4);
                      }
                      markEntity(s, pilots_js_2.PILOT_FEED.entityId);
                      consumePilot(s, pilots_js_2.PILOT_FEED.consumeFlag, pilots_js_2.PILOT_FEED.residueFlag);
                      return ('The bench remembers your face. +55 contacts, +4 name ID, +1 volunteer, +1 momentum, rural rapport. ' +
                          '(Starmap: ENT_FEED_STORE. Residue: orbit_feed_bench.)');
                  }
              });
              exports_18("STARMAP_PLAYS", STARMAP_PLAYS = [
                  MV01_PrecinctNetwork,
                  MV02_FieldPlan,
                  MV03_CourthouseNod,
                  MV04_PartyApparatus,
                  MV05_ClubRoster,
                  MV06_NewsroomNod,
                  MV07_CorridorBlessing,
                  MV08_SlateCard,
                  MV09_FinanceBook,
                  MV10_DriveTime,
                  MV11_LobbyMap,
                  MV12_PlantGate,
                  MV13_RubberChicken,
                  MV14_FeedBench
              ]);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Play cards, Wave 5 (library expansion)
   * =======================================================
   * A richer basic deck plus acquirable uncommon/rare cards. Rarity weights the
   * phase-draft pool (deck.ts buildPhaseDraft): common cards land often, rare
   * cards are a real find. All are residency 'main', control 'player', and obey
   * the normal odds/tier resolution — same covenants as every other play.
   *
   * Attrs: CLO visibility/turnout · CON discipline/message · CRA maneuver/oppo ·
   *        INK procedure/rules · DIP coalitions/gatekeepers · CHA retail/charm.
   */
  System.register("data/plays-wave5", ["engine/rng"], function (exports_19, context_19) {
      "use strict";
      var rng_js_3, WAVE5_PLAYS;
      var __moduleName = context_19 && context_19.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      /** Nudge the strongest opponent ground down — a clean contrast hit. */
      function hitRival(s, amt) {
          const g = [...s.groundsArr].sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
          if (g)
              g.rivalRap = Math.max(0, (g.rivalRap || 0) - amt);
          s.hitPieces = (s.hitPieces || 0) + 1;
      }
      /** Bank GOTV across the top grounds (general turnout). */
      function bankGotv(s, per, n) {
          s.groundsArr.slice(0, n).forEach(g => (g.gotv = (g.gotv || 0) + per));
      }
      return {
          setters: [
              function (rng_js_3_1) {
                  rng_js_3 = rng_js_3_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Play cards, Wave 5 (library expansion)
               * =======================================================
               * A richer basic deck plus acquirable uncommon/rare cards. Rarity weights the
               * phase-draft pool (deck.ts buildPhaseDraft): common cards land often, rare
               * cards are a real find. All are residency 'main', control 'player', and obey
               * the normal odds/tier resolution — same covenants as every other play.
               *
               * Attrs: CLO visibility/turnout · CON discipline/message · CRA maneuver/oppo ·
               *        INK procedure/rules · DIP coalitions/gatekeepers · CHA retail/charm.
               */
              exports_19("WAVE5_PLAYS", WAVE5_PLAYS = [
                  // ---------------- COMMON — basic-deck breadth ----------------
                  {
                      id: 'PL80', n: 'Grocery-Store Handshakes', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
                      tag: 'the parking lot', attrs: ['CHA'], rarity: 'common', residency: 'main', control: 'player',
                      d: 'An hour at the exit doors. Cheap, endless, and it actually works.',
                      odds: () => 0.8,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 14 + Math.floor(rng_js_3.random() * 8);
                              s.contacts += c;
                              s.nameID += 1;
                              return `Carts and small talk. +${c} contacts, +1 name ID.`;
                          }
                          s.contacts += 6;
                          return 'A slow hour, but honest. +6 contacts.';
                      }
                  },
                  {
                      id: 'PL81', n: 'Church Bulletin Ad', cost: { a: 1, $: 80 }, risk: 'SAFE', ph: [1, 2, 3],
                      tag: 'the back page', attrs: ['DIP'], rarity: 'common', residency: 'main', control: 'player',
                      d: 'A quarter page next to the potluck schedule. The congregation notices who shows up in print.',
                      odds: () => 0.82,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.nameID += 3;
                              s.endorsePts += 1;
                              return 'Quiet approval from the pews. +3 name ID, +1 endorsement point.';
                          }
                          s.nameID += 1;
                          return 'A small notice, seen by a few. +1 name ID.';
                      }
                  },
                  {
                      id: 'PL82', n: 'Little-League Sponsorship', cost: { a: 1, $: 120 }, risk: 'SAFE', ph: [1, 2],
                      tag: 'name on the jersey', attrs: ['CLO'], rarity: 'common', residency: 'main', control: 'player',
                      d: 'Your name on forty small backs, every Saturday, all season. Turnout starts young — through the parents.',
                      odds: () => 0.8,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.nameID += 4;
                              s.volPool += 1;
                              return 'The bleachers learn your name. +4 name ID and a team-mom volunteer.';
                          }
                          s.nameID += 2;
                          return 'A banner in the outfield. +2 name ID.';
                      }
                  },
                  {
                      id: 'PL83', n: 'Letter to the Editor', cost: { a: 1 }, risk: 'STD', ph: [1, 2],
                      tag: 'the op-ed page', attrs: ['INK'], rarity: 'common', residency: 'main', control: 'player',
                      d: 'Three hundred words, tightly argued. The people who vote in primaries read the paper.',
                      odds: (s) => clamp(0.6 + (s.messageSharp ? 0.1 : 0), 0, 0.9),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.nameID += 5;
                              s.messageSharp = true;
                              return 'A letter that gets clipped and mailed around. +5 name ID, message sharp.';
                          }
                          if (o.tier === 1) {
                              s.nameID += 2;
                              return 'Printed, and read by the faithful. +2 name ID.';
                          }
                          if (o.tier === 2) {
                              return 'Buried below the fold. Little effect.';
                          }
                          s.nameID = Math.max(0, s.nameID - 1);
                          return 'A typo makes you look careless. It circulates.';
                      }
                  },
                  {
                      id: 'PL84', n: 'Coffee-Shop Sit-Down', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
                      tag: 'the corner booth', attrs: ['CHA'], rarity: 'common', residency: 'main', control: 'player',
                      d: 'One table, four regulars, refills on the house. Retail politics at its most literal.',
                      odds: () => 0.82,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 10 + Math.floor(rng_js_3.random() * 6);
                              s.contacts += c;
                              s.momentum += 1;
                              return `Real conversation, real converts. +${c} contacts, momentum.`;
                          }
                          s.contacts += 5;
                          return 'A quiet morning. +5 contacts.';
                      }
                  },
                  // ---------------- UNCOMMON — acquired, stronger/niche ----------------
                  {
                      id: 'PL85', n: 'Union Hall Endorsement', cost: { a: 1, fav: 1 }, risk: 'STD', ph: [2, 3],
                      tag: 'the locals sign on', attrs: ['DIP'], rarity: 'uncommon', residency: 'main', control: 'player',
                      d: 'The business agent likes you enough to put it in writing. Stewards walk turf you never could.',
                      odds: (s) => clamp(0.6 + s.volPool * 0.02, 0, 0.9),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 3;
                              s.volPool += 2;
                              return 'The locals endorse. +3 endorsement points and two stewards on the doors.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A soft nod, no letterhead. +1 endorsement point.';
                          }
                          return 'The rank and file split. The endorsement stalls.';
                      }
                  },
                  {
                      id: 'PL86', n: 'Targeted Digital Buy', cost: { a: 1, $: 700 }, risk: 'STD', ph: [2, 3],
                      tag: 'the feed', attrs: ['CRA'], rarity: 'uncommon', residency: 'main', control: 'player',
                      d: 'Lookalike audiences, dayparted, A/B tested. The consultant swears by the dashboard.',
                      odds: (s) => clamp(0.6 + (s.assets.length ? 0.06 : 0), 0, 0.92),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.nameID += 6;
                              s.contacts += 20;
                              return 'The creative pops. +6 name ID, +20 contacts.';
                          }
                          if (o.tier === 1) {
                              s.nameID += 3;
                              s.contacts += 8;
                              return 'Solid reach. +3 name ID, +8 contacts.';
                          }
                          if (o.tier === 2) {
                              s.nameID += 1;
                              return 'Impressions without engagement. +1 name ID.';
                          }
                          return 'The buy funds the wrong district. Money down the well.';
                      }
                  },
                  {
                      id: 'PL87', n: 'Charter the Senior Vans', cost: { a: 1, vp: 2 }, risk: 'STD', ph: [3],
                      tag: 'the surest voters', attrs: ['CLO'], rarity: 'uncommon', residency: 'main', control: 'player',
                      d: 'The seniors vote at ninety percent and love a ride. Turnout you can schedule.',
                      odds: () => 0.72,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              bankGotv(s, 0.1, 3);
                              s.contacts += 12;
                              return 'The vans run all day. +12 contacts and turnout banked across three grounds.';
                          }
                          bankGotv(s, 0.04, 1);
                          return 'A half-full van, still worth it. A little turnout banked.';
                      }
                  },
                  {
                      id: 'PL88', n: 'Opposition Tracker', cost: { a: 1, $: 400 }, risk: 'VOL', ph: [2, 3],
                      tag: 'the guy with the camera', attrs: ['CRA'], rarity: 'uncommon', residency: 'main', control: 'player',
                      d: 'A kid with a camcorder at every rival event, waiting for the gaffe. Sometimes it comes.',
                      odds: (s) => clamp(0.5 + s.faces.O * 0.003, 0, 0.9),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              hitRival(s, 10);
                              s.nameID += 2;
                              return 'The tracker catches a real one. The rival ground buckles, +2 name ID.';
                          }
                          if (o.tier === 1) {
                              hitRival(s, 4);
                              return 'A minor slip, usefully clipped. The opposition softens.';
                          }
                          if (o.tier === 2) {
                              return 'Hours of nothing. The kid needs paying anyway.';
                          }
                          s.hitPieces += 1;
                          return 'Your tracker gets caught trespassing. The story is you.';
                      }
                  },
                  {
                      id: 'PL89', n: 'Megachurch Sunday', cost: { a: 1 }, risk: 'VOL', ph: [1, 2, 3],
                      tag: 'the big room', attrs: ['CHA'], rarity: 'uncommon', residency: 'main', control: 'player',
                      d: 'Three thousand seats and a pastor who might, or might not, wave you up front.',
                      odds: (s) => clamp(0.5 + s.endorsePts * 0.01, 0, 0.9),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              const c = 40 + Math.floor(rng_js_3.random() * 20);
                              s.contacts += c;
                              s.momentum += 2;
                              return `The pastor calls you up. +${c} contacts, +2 momentum.`;
                          }
                          if (o.tier === 1) {
                              s.contacts += 18;
                              return 'A friendly mention from the stage. +18 contacts.';
                          }
                          if (o.tier === 2) {
                              s.contacts += 6;
                              return 'You shake hands in the lobby. +6 contacts.';
                          }
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'The pastor stays neutral, pointedly. Momentum leaks.';
                      }
                  },
                  // ---------------- RARE — acquired, powerful ----------------
                  {
                      id: 'PL90', n: 'Statewide Figure Endorses', cost: { a: 1, fav: 1 }, risk: 'VOL', ph: [2, 3],
                      tag: 'the big name', attrs: ['DIP'], rarity: 'rare', residency: 'main', control: 'player',
                      d: 'A name people know from television deigns to say yours. The bump is real; so is the debt.',
                      odds: (s) => clamp(0.52 + s.endorsePts * 0.015, 0, 0.9),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.endorsePts += 5;
                              s.nameID += 6;
                              s.momentum += 2;
                              return 'The big name goes all in. +5 endorsement points, +6 name ID, +2 momentum.';
                          }
                          if (o.tier === 1) {
                              s.endorsePts += 3;
                              s.nameID += 3;
                              return 'A solid, quotable endorsement. +3 endorsement points, +3 name ID.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A tepid word in a crowded release. +1 endorsement point.';
                          }
                          s.faces.O += 3;
                          return 'The big name has baggage that becomes your baggage. It backfires.';
                      }
                  },
                  {
                      id: 'PL91', n: 'The Viral Moment', cost: { a: 1 }, risk: 'VOL', ph: [2, 3],
                      tag: 'lightning in a bottle', attrs: ['CHA'], rarity: 'rare', residency: 'main', control: 'player',
                      d: 'You say the exact right thing at the exact right second and the internet decides to care.',
                      odds: (s) => clamp(0.45 + (s.messageSharp ? 0.12 : 0) + s.momentum * 0.01, 0, 0.9),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.nameID += 12;
                              s.momentum += 4;
                              s.contacts += 25;
                              return 'It explodes. +12 name ID, +4 momentum, +25 contacts. For a week you are the race.';
                          }
                          if (o.tier === 1) {
                              s.nameID += 5;
                              s.momentum += 2;
                              return 'A good day online. +5 name ID, +2 momentum.';
                          }
                          if (o.tier === 2) {
                              s.nameID += 1;
                              return 'A ripple, quickly forgotten. +1 name ID.';
                          }
                          s.momentum = Math.max(0, s.momentum - 2);
                          s.faces.O += 2;
                          return 'It goes viral for the wrong reason. The clip outlives the news cycle.';
                      }
                  },
                  {
                      id: 'PL92', n: 'Machine Turnout Blitz', cost: { a: 2, vp: 3 }, risk: 'VOL', ph: [3],
                      tag: 'the whole apparatus', attrs: ['CLO'], rarity: 'rare', residency: 'main', control: 'player',
                      d: 'Every captain, every van, every list, one weekend. When the machine moves as one, the count moves with it.',
                      odds: (s) => clamp(0.55 + s.endorsePts * 0.01 + s.volPool * 0.02, 0, 0.92),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              bankGotv(s, 0.14, 6);
                              s.contacts += 30;
                              return 'The apparatus turns as one. Heavy turnout banked everywhere, +30 contacts.';
                          }
                          if (o.tier === 1) {
                              bankGotv(s, 0.08, 3);
                              s.contacts += 14;
                              return 'A strong weekend. Turnout up across three grounds, +14 contacts.';
                          }
                          if (o.tier === 2) {
                              bankGotv(s, 0.03, 2);
                              return 'Some captains no-show. Modest turnout banked.';
                          }
                          s.volPool = Math.max(0, s.volPool - 1);
                          return 'Wires crossed; two crews work the same block. A wasted weekend.';
                      }
                  }
              ]);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Play Card Data (pure, explicit-state)
   * All cards tagged with root attributes for cardAttrMod synergy.
   * CHA = retail/charm/doors
   * CLO = visibility/turnout/muscle
   * CON = discipline/message
   * CRA = maneuver/oppo/fixer
   * INK = procedure/rules
   * DIP = coalitions/gatekeepers
   */
  System.register("data/plays", ["engine/rng", "engine/reputation", "data/plays-wave4", "data/assets", "data/plays-starmap", "data/plays-wave5"], function (exports_20, context_20) {
      "use strict";
      var rng_js_4, reputation_js_4, plays_wave4_js_1, assets_js_1, plays_starmap_js_1, plays_wave5_js_1, PL01_BlockWalk, PL02_PhoneBank, PL03_YardSignBlitz, PL04_PetitionDrive, PL05_PayFilingFee, PL06_TownHall, PL07_CandidateForum, PL08_KitchenTable, PL09_EarnedMedia, PL10_PressRelease, PL13_FishFry, PL14_CourtTheChairs, PL11_StrawPoll, PL12_ClubSpeech, PL15_OppoResearch, PL17_DebatePrep, PL19_GOTVWeekend, PL23_RidesToPolls, CORE_PLAYS, SHOP_PLAYS, ALL_PLAYS, PLAYS, PLAY_COUNT;
      var __moduleName = context_20 && context_20.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      function rapGain(g, amt, state) {
          var _a;
          if (state.rapStall)
              amt = Math.ceil(amt / 2);
          // Phase 1 diminishing returns: repeat-ground plays this week bank less
          // new rapport (multiplier set by executePlay from getGroundPenalty).
          amt = Math.round(amt * ((_a = state.groundRapMult) !== null && _a !== void 0 ? _a : 1));
          g.rapport = clamp(g.rapport + amt, 0, 100);
      }
      /** Tag Main-deck player verbs (mutates; see docs/CARD-RESIDENCY.md). */
      function tagMainPlayer(cards) {
          for (const c of cards) {
              if (c.residency === undefined)
                  c.residency = 'main';
              if (c.control === undefined)
                  c.control = 'player';
          }
          return cards;
      }
      return {
          setters: [
              function (rng_js_4_1) {
                  rng_js_4 = rng_js_4_1;
              },
              function (reputation_js_4_1) {
                  reputation_js_4 = reputation_js_4_1;
              },
              function (plays_wave4_js_1_1) {
                  plays_wave4_js_1 = plays_wave4_js_1_1;
              },
              function (assets_js_1_1) {
                  assets_js_1 = assets_js_1_1;
              },
              function (plays_starmap_js_1_1) {
                  plays_starmap_js_1 = plays_starmap_js_1_1;
              },
              function (plays_wave5_js_1_1) {
                  plays_wave5_js_1 = plays_wave5_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Play Card Data (pure, explicit-state)
               * All cards tagged with root attributes for cardAttrMod synergy.
               * CHA = retail/charm/doors
               * CLO = visibility/turnout/muscle
               * CON = discipline/message
               * CRA = maneuver/oppo/fixer
               * INK = procedure/rules
               * DIP = coalitions/gatekeepers
               */
              // ===== WAVE 1: Early core + ballot access =====
              exports_20("PL01_BlockWalk", PL01_BlockWalk = {
                  id: 'PL01', n: 'Block Walk', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], field: true, tag: 'the spine',
                  attrs: ['CHA'],
                  d: 'Boots and a clipboard. The one play that never turns on you. When in doubt. In the general, doors become turnout.',
                  odds: (s) => clamp(0.62 + s.volPool * 0.02 + (s.assets.includes('A01') ? 0.12 : 0) + (s.messageSharp ? 0.05 : 0), 0, 0.95),
                  run: (s, o, g) => {
                      if (!g)
                          return 'No ground selected.';
                      s.walkCount++;
                      // Phase 1: the Field Director (AL09) boosts the turf they actually work.
                      const mult = (s.assets.includes('A01') ? 1.5 : 1) * (reputation_js_4.allyWarmAtGround(s, 'AL09', g.id) ? 1.2 : 1);
                      // archive:547–548 — A11 Push Cards add +1 name ID on successful walks
                      const push = s.assets.includes('A11') ? 1 : 0;
                      const gen = s.stage === 'general';
                      if (o.tier === 0) {
                          const c = Math.min(g.pool, Math.round((55 + rng_js_4.random() * 30) * mult));
                          g.pool -= c;
                          s.contacts += c;
                          rapGain(g, gen ? 2 : 6, s);
                          s.volPool += 1;
                          s.nameID += 2 + push;
                          if (gen) {
                              g.gotv += 0.18;
                              return `General doors: +${c} contacts and +18% GOTV banked at ${g.n}. Turnout, not introductions.`;
                          }
                          return `A church picnic adopts you whole. +${c} contacts, a volunteer, and rapport at ${g.n}.`;
                      }
                      if (o.tier === 1) {
                          const c = Math.min(g.pool, Math.round((22 + rng_js_4.random() * 16) * mult));
                          g.pool -= c;
                          s.contacts += c;
                          s.volPool += 1;
                          rapGain(g, gen ? 1 : 3, s);
                          // Hygiene: labor spine needs name heat on ordinary GAINS, not only breakthroughs
                          s.nameID += 1 + push;
                          if (gen) {
                              g.gotv += 0.1;
                              return `Turnout walk at ${g.n}: +${c} contacts, +10% GOTV. The list is a vote plan now.`;
                          }
                          return `Doors open. +${c} contacts, +1 volunteer at ${g.n}`;
                      }
                      const c = Math.min(g.pool, 6);
                      g.pool -= c;
                      s.contacts += c;
                      if (gen) {
                          g.gotv += 0.03;
                          return `Heat and closed blinds — still +${c} contacts and a thin +3% GOTV at ${g.n}.`;
                      }
                      return 'Heat, dogs, closed blinds. +' + c + ' contacts and one ruined pair of boots.';
                  }
              });
              exports_20("PL02_PhoneBank", PL02_PhoneBank = {
                  id: 'PL02', n: 'Phone Bank', cost: { a: 1, vp: 1 }, risk: 'SAFE', ph: [1, 2, 3], field: true, tag: 'rain-proof',
                  attrs: ['CHA'],
                  d: 'Half the yield, none of the weather. Grandma\'s kitchen table is HQ. In the general, the phone is a GOTV tool.',
                  odds: (s) => clamp(0.6 + (s.assets.includes('A09') ? 0.15 : 0), 0, 0.95),
                  run: (s, o, g) => {
                      if (!g)
                          return 'No ground.';
                      const mult = s.assets.includes('A09') ? 2 : 1;
                      const gen = s.stage === 'general';
                      const c = Math.min(g.pool, Math.round((o.tier <= 1 ? 14 : 5) * mult));
                      g.pool -= c;
                      s.contacts += c;
                      rapGain(g, o.tier <= 1 ? (gen ? 1 : 2) : (gen ? 0 : 1), s);
                      if (gen) {
                          const k = o.tier === 0 ? 0.12 : o.tier === 1 ? 0.07 : 0.02;
                          g.gotv += k;
                          return `Phone GOTV at ${g.n}: +${c} contacts, +${Math.round(k * 100)}% conversion banked.`;
                      }
                      return `+${c} contacts by wire at ${g.n}.`;
                  }
              });
              exports_20("PL03_YardSignBlitz", PL03_YardSignBlitz = {
                  id: 'PL03', n: 'Yard Sign Blitz', cost: { a: 1, $: 150 }, risk: 'SAFE', ph: [1, 2], field: true, tag: 'visibility',
                  attrs: ['CLO'],
                  d: 'A district that sees your name starts believing it belongs there.',
                  odds: () => 0.8,
                  run: (s, _o, g) => { if (!g)
                      return 'No ground.'; s.nameID += 2; rapGain(g, 1, s); return `Signs up along ${g.n}. The name is out in the weather now.`; }
              });
              exports_20("PL04_PetitionDrive", PL04_PetitionDrive = {
                  id: 'PL04', n: 'Petition Drive', cost: { a: 1 }, risk: 'STD', ph: [1], tag: 'the zero-dollar door',
                  attrs: ['CLO'],
                  d: 'Signatures instead of a fee. Labor is the currency you were born holding.',
                  show: (s) => !s.ballot,
                  // 2026-07-19 hygiene: pure petition had drifted to ~98% ballot@vol0.
                  // Odds + yields restore ~5–10% miss at vol0 without starving labor primary force.
                  odds: (s) => clamp(0.57 + s.volPool * 0.033 + (reputation_js_4.warm(s, 'AL09') ? 0.08 : 0), 0, 0.95),
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          // Yields: breakthrough ~85–120, gain ~50–75 (mid between free-ballot and starve).
                          const g = o.tier === 0 ? 85 + Math.floor(rng_js_4.random() * 36) : 50 + Math.floor(rng_js_4.random() * 26);
                          s.signatures += g;
                          if (s.signatures >= s.sigNeed && !s.ballot) {
                              s.ballot = true;
                              return `+${g} signatures — threshold cleared. On the ballot, free but not cheap.`;
                          }
                          return `+${g} valid signatures (${s.signatures}/${s.sigNeed}).`;
                      }
                      if (o.tier === 2) {
                          s.signatures += 15;
                          return 'Rainy Saturday. +15, half smudged.';
                      }
                      const l = 50 + Math.floor(rng_js_4.random() * 45);
                      s.signatures = Math.max(0, s.signatures - l);
                      return `The county chair challenges your sheets — ${l} struck.`;
                  }
              });
              exports_20("PL05_PayFilingFee", PL05_PayFilingFee = {
                  id: 'PL05', n: 'Pay the Filing Fee', cost: { $: 1250 }, risk: 'SAFE', ph: [1], tag: 'the money door',
                  attrs: ['CLO'],
                  d: '$1,250 and it\'s done. Shame-free, story-free.', show: (s) => !s.ballot, odds: () => 0.99,
                  run: (s) => { s.ballot = true; return 'Receipt in hand. You are on the ballot the expensive way.'; }
              });
              exports_20("PL06_TownHall", PL06_TownHall = {
                  id: 'PL06', n: 'Town Hall', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'showing up',
                  attrs: ['CHA'],
                  d: 'Folding chairs, burnt coffee, real questions. The kids notice if you skip these.',
                  odds: (s) => clamp(0.55 + (s.messageSharp ? 0.08 : 0), 0, 0.9),
                  run: (s, o) => { s.townHallThisWeek = true; if (o.tier <= 1) {
                      s.contacts += 15;
                      s.momentum += 1;
                      s.volPool += 1;
                      return 'A fair hearing, two new believers, and one of them signs up to walk.';
                  } if (o.tier === 2)
                      return 'Six attendees, one of them lost.'; s.momentum = Math.max(0, s.momentum - 1); return 'A heckler wins the room. It happens.'; }
              });
              // ===== WAVE 2 =====
              exports_20("PL07_CandidateForum", PL07_CandidateForum = {
                  id: 'PL07', n: 'Candidate Forum', cost: { a: 1 }, risk: 'VOL', ph: [2, 3], tag: 'bright lights',
                  attrs: ['CON', 'CHA'],
                  d: 'Sixty seconds and every rival watching for the stumble.',
                  odds: (s) => clamp(0.42 + (s.messageSharp ? 0.12 : 0) + (s.debatePrepped ? 0.1 : 0) + s.faces.F * 0.002 + (s.reps.includes('R06') ? 0.06 : 0), 0, 0.9),
                  run: (s, o) => {
                      const prep = s.debatePrepped;
                      s.debatePrepped = false;
                      if (o.tier === 0) {
                          s.nameID += 10;
                          s.momentum += 3;
                          s.faces.F += 5;
                          return 'You land a line the parking lot repeats. The clip travels.';
                      }
                      if (o.tier === 1) {
                          s.nameID += 4;
                          s.momentum += 1;
                          return 'Solid. Nobody remembers you badly — at this altitude, a win.';
                      }
                      if (o.tier === 2)
                          return prep ? 'Prep held the floor: dull but unhurt.' : 'You survive; the moderator butchers your name twice.';
                      s.hitPieces++;
                      s.momentum = Math.max(0, s.momentum - 2);
                      s.faces.F -= 3;
                      return 'You misstate the ag exemption on tape. Name ID up — the wrong way.';
                  }
              });
              /**
               * Kitchen-Table Meeting — archive PL08 (lines 581–582).
               *
               * Ally grant: AL01 on tier 0/1; AL02 when chairs(s) >= 3.
               * Archive chairs() = warm AL01 count + chairCount — NOT ground-scoped.
               * Phase 1 considered gating on allyWarmAtGround(AL01, ground); archive
               * allies are roster-wide, so PL08 stays roster-wide (no ground gate).
               * allyWarmAtGround remains the field-ops tool (AL09 on PL01/PL19/PL21B/PL39).
               */
              exports_20("PL08_KitchenTable", PL08_KitchenTable = {
                  // Kit gravity: primary club politics — not a November lever (ph 1–2 only).
                  id: 'PL08', n: 'Kitchen-Table Meeting', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'pie is not optional',
                  attrs: ['DIP'],
                  d: "A chair's kitchen, her rules. Bring pie; leave with a precinct or nothing. (Primary circuit — out of the general.)",
                  odds: (s) => {
                      const chairs = s.allies.filter(a => a.id === 'AL01' && a.warm > 0).length + (s.chairCount || 0);
                      return clamp(0.4 + chairs * 0.03 + s.faces.O * 0.003 + s.faces.G * 0.003 -
                          (s.allyMalus || 0) - (s.estabPenalty ? 0.08 : 0), 0, 0.9);
                  },
                  run: (s, o) => {
                      // archive chairs helper (line 389)
                      const chairsOf = () => s.allies.filter(a => a.id === 'AL01' && a.warm > 0).length + (s.chairCount || 0);
                      s.pieCount = (s.pieCount || 0) + 1;
                      if (o.tier === 0) {
                          // archive:581
                          reputation_js_4.addAlly(s, 'AL01', 3);
                          s.chairCount = (s.chairCount || 0) + 1;
                          s.endorsePts += 1;
                          if (chairsOf() >= 3)
                              reputation_js_4.addAlly(s, 'AL02', 2);
                          return 'She comes over — and brings her club president\'s number.';
                      }
                      if (o.tier === 1) {
                          // archive:582
                          reputation_js_4.addAlly(s, 'AL01', 2);
                          s.endorsePts += 1;
                          if (chairsOf() >= 3)
                              reputation_js_4.addAlly(s, 'AL02', 2);
                          return 'A handshake on the porch. One chair, quietly banked.';
                      }
                      if (o.tier === 2)
                          return 'Polite pie, no promises. "Come back after the forum."';
                      s.faces.O -= 3;
                      return 'You push. Word of the pushing beats you back to your truck.';
                  }
              });
              exports_20("PL09_EarnedMedia", PL09_EarnedMedia = {
                  id: 'PL09', n: 'Earned Media Pitch', cost: { a: 1, m: 1 }, risk: 'VOL', ph: [1, 2, 3], tag: 'the gallery',
                  attrs: ['CHA'],
                  d: 'A county weekly, a drive-time host, a stringer if you\'re lucky.',
                  odds: (s) => clamp(0.3 + s.momentum * 0.02 + s.faces.F * 0.004 + (s.mediaBonus || 0) + (reputation_js_4.warm(s, 'AL05') ? 0.1 : 0) + (s.regionHook === 'metro' ? 0.1 : 0), 0, 0.9),
                  run: (s, o) => {
                      let t = o.tier;
                      if (reputation_js_4.warm(s, 'AL04') && t === 1)
                          t = 0;
                      if (t === 0) {
                          s.nameID += 12;
                          s.momentum += 2;
                          s.faces.F += 4;
                          return 'Above the fold. Feed-store gospel by Friday.';
                      }
                      if (t === 1) {
                          s.nameID += 5;
                          return 'Page six. Page six is still the paper.';
                      }
                      if (t === 2)
                          return 'The editor is "holding it for a news peg." There is never a news peg.';
                      s.hitPieces++;
                      s.nameID += 3;
                      return 'The reporter finds the 2014 tax lien instead.';
                  }
              });
              exports_20("PL10_PressRelease", PL10_PressRelease = {
                  id: 'PL10', n: 'Press Release', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], tag: 'the on-ramp',
                  attrs: ['CRA'],
                  d: 'Nobody prints it. Everybody files it. The reporter learns your name spelling.', odds: () => 0.85,
                  // archive:595 — prCount===2 grants AL04 Beat Reporter
                  run: (s) => {
                      s.momentum += 1;
                      s.nameID += 1;
                      s.prCount = (s.prCount || 0) + 1;
                      if (s.prCount === 2) {
                          reputation_js_4.addAlly(s, 'AL04', 2);
                          return 'The beat reporter calls back to check a quote. That\'s a relationship now.';
                      }
                      return 'Filed, noted, spelled right.';
                  }
              });
              exports_20("PL13_FishFry", PL13_FishFry = {
                  id: 'PL13', n: 'Fish Fry', cost: { a: 1, $: 150 }, risk: 'SAFE', ph: [1, 2, 3], field: true, tag: 'clean money',
                  attrs: ['CHA'],
                  d: 'Five-dollar plates, donation jar, casseroles. Net positive, always.',
                  odds: (s) => clamp(0.75 + s.nameID * 0.004, 0, 0.95),
                  run: (s, o, g) => {
                      if (!g)
                          return 'No ground selected.';
                      const mult = (g.id === 'GR07' ? 3 : 1) * (s.backers.includes('B05') ? 1.4 : 1) * (s.regionHook === 'permian' ? 1.25 : 1) * (s.moneyClash ? 0.8 : 1);
                      if (o.tier === 0) {
                          const m = Math.round((650 + rng_js_4.random() * 350) * mult);
                          s.money += m;
                          rapGain(g, 4, s);
                          s.volPool += 2;
                          if (!s.backers.includes('B05'))
                              s.backers.push('B05');
                          return `+$${m} and the small-dollar list starts here at ${g.n}. +2 volunteers.`;
                      }
                      if (o.tier === 1) {
                          const m = Math.round((380 + rng_js_4.random() * 200) * mult);
                          s.money += m;
                          rapGain(g, 2, s);
                          s.volPool += 1;
                          return `+$${m}, faces and names. +1 volunteer.`;
                      }
                      const m = Math.round(200 * mult);
                      s.money += m;
                      return `Even a rainy fish fry clears its cost. +$${m}.`;
                  }
              });
              exports_20("PL14_CourtTheChairs", PL14_CourtTheChairs = {
                  id: 'PL14', n: 'Court the Chairs (Pie Circuit)', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'gatekeepers',
                  attrs: ['DIP'],
                  d: 'The kitchen-table circuit at scale. Phase III chairs are already spoken for.',
                  odds: (s) => clamp(0.34 + s.contacts * 0.001 + s.faces.G * 0.004 - (s.pieMalus || 0) - (s.reps.includes('R07') ? 0.2 : 0) + (s.reps.includes('R05') ? 0.15 : 0), 0, 0.9),
                  run: (s, o) => {
                      s.pieCount = (s.pieCount || 0) + 1;
                      // archive:619 — tier 0 grants AL01
                      if (o.tier === 0) {
                          s.endorsePts += 2;
                          s.faces.O += 4;
                          reputation_js_4.addAlly(s, 'AL01', 2);
                          return 'Two chairs in one week; one brings her whole club.';
                      }
                      if (o.tier === 1) {
                          s.endorsePts += 1;
                          s.faces.O += 2;
                          return 'One endorsement, quietly banked.';
                      }
                      if (o.tier === 2)
                          return 'Pie eaten, promises deferred.';
                      s.faces.O -= 4;
                      return 'Pushy travels fast on the chair circuit.';
                  }
              });
              // ===== WAVE 3 =====
              exports_20("PL11_StrawPoll", PL11_StrawPoll = {
                  id: 'PL11', n: 'Straw Poll Push', cost: { a: 1, vp: 1 }, risk: 'STD', ph: [1, 2], tag: 'club math',
                  attrs: ['CLO', 'DIP'],
                  d: 'Pack the room, count the hands. Clubs remember who wins their straw.',
                  req: (s) => s.backers.includes('B06') || reputation_js_4.warm(s, 'AL03'),
                  odds: (s) => clamp(0.45 + (s.clubOdds || 0) + (reputation_js_4.warm(s, 'AL03') ? 0.12 : 0) + (s.strawBonus || 0) + s.volPool * 0.015, 0, 0.9),
                  run: (s, o) => {
                      // archive:599 — win grants AL03 Club President + strawWins
                      if (o.tier <= 1) {
                          s.strawWins = (s.strawWins || 0) + 1;
                          s.endorsePts += o.tier === 0 ? 2 : 1;
                          s.momentum += 1;
                          reputation_js_4.addAlly(s, 'AL03', 2);
                          return 'You win the straw. The club president wants coffee — and new doors open.';
                      }
                      if (o.tier === 2)
                          return 'Second place. Nobody remembers second at a straw poll.';
                      s.momentum = Math.max(0, s.momentum - 1);
                      return 'A rival packed it harder. Their mailer will mention it.';
                  }
              });
              exports_20("PL12_ClubSpeech", PL12_ClubSpeech = {
                  id: 'PL12', n: 'Club Speech', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'the circuit',
                  attrs: ['CON', 'DIP'],
                  d: 'Rubber chicken, real gatekeepers. Read the room or the room reads you.',
                  odds: (s) => clamp(0.5 + s.faces.T * 0.003 + (s.messageSharp ? 0.06 : 0), 0, 0.9),
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          if (!s.backers.includes('B06'))
                              s.backers.push('B06');
                          s.endorsePts += o.tier === 0 ? 1 : 0;
                          s.contacts += 10;
                          s.volPool += 1;
                          return 'The roster opens to you. Names, numbers, casseroles — and a retiree. +1 volunteer.';
                      }
                      if (o.tier === 2)
                          return 'Polite applause, cold coffee.';
                      s.faces.T -= 2;
                      return 'You purity-test the room. The room notices.';
                  }
              });
              exports_20("PL15_OppoResearch", PL15_OppoResearch = {
                  id: 'PL15', n: 'Oppo Research', cost: { a: 1, $: 500 }, risk: 'STD', ph: [2], tag: 'the file',
                  attrs: ['CRA'],
                  d: 'A quiet man with a courthouse habit. What he finds becomes yours to spend — or to hold.',
                  odds: () => 0.65,
                  run: (s, o) => {
                      s.shadowPlays++;
                      s.faces.O -= 2;
                      if (o.tier <= 1) {
                          s.oppoFile = true;
                          return 'A folder now exists. It hums in the desk drawer. (Oppo File acquired — enables Contrast Mail and Whisper Campaign.)';
                      }
                      if (o.tier === 2)
                          return 'Clean as creek water, or he\'s bad at his job.';
                      s.exposure += 1;
                      return 'Your quiet man was seen at the courthouse. Seen matters.';
                  }
              });
              exports_20("PL17_DebatePrep", PL17_DebatePrep = {
                  id: 'PL17', n: 'Debate Prep', cost: { a: 1 }, risk: 'SAFE', ph: [2], tag: 'homework',
                  attrs: ['INK', 'CON'],
                  d: 'The Kitchen Cabinet plays your rival better than your rival does.',
                  odds: () => 0.9,
                  run: (s) => { s.debatePrepped = true; return reputation_js_4.warm(s, 'AL11') ? 'The Cabinet grills you past midnight. The next forum\'s bands narrow.' : 'Index cards and a bathroom mirror. It still counts.'; }
              });
              exports_20("PL19_GOTVWeekend", PL19_GOTVWeekend = {
                  id: 'PL19', n: 'GOTV Weekend', cost: { a: 1, vp: 1 }, risk: 'STD', ph: [3], field: true, tag: 'the point of it all',
                  attrs: ['CLO'],
                  d: 'Rapport is a promise. Turnout is the promise kept. One volunteer and a weekend. The general spine.',
                  odds: (s, g) => clamp(0.58 + s.volPool * 0.025 + (reputation_js_4.allyWarmAtGround(s, 'AL09', g === null || g === void 0 ? void 0 : g.id) ? 0.1 : 0) + s.faces.T * 0.002, 0, 0.95),
                  run: (s, o, g) => {
                      if (!g)
                          return 'No ground selected.';
                      // GOTV banks conversion; also a little name heat for the general
                      if (o.tier <= 1) {
                          const k = o.tier === 0 ? 0.55 : 0.35;
                          g.gotv += k;
                          s.nameID += o.tier === 0 ? 2 : 1;
                          return `Turnout operation locks in at ${g.n} (+${Math.round(k * 100)}% conversion).`;
                      }
                      if (o.tier === 2) {
                          g.gotv += 0.12;
                          return 'Half the walk list, half the weekend. Something banked.';
                      }
                      g.gotv += 0.06;
                      s.volPool = Math.max(0, s.volPool - 1);
                      return 'A van breaks down; a volunteer quits loudly. A little banked anyway.';
                  }
              });
              /**
               * Archive PL20 "Rides to the Polls" — modular id PL23 (PL20 is PAC Check here).
               * Flatbed / A06 unlock. Pure general GOTV field lever.
               */
              exports_20("PL23_RidesToPolls", PL23_RidesToPolls = {
                  id: 'PL23',
                  n: 'Rides to the Polls',
                  cost: { a: 1, vp: 1 },
                  risk: 'SAFE',
                  ph: [3],
                  field: true,
                  tag: 'the flatbed doctrine',
                  attrs: ['CLO'],
                  d: 'The truck runs routes. Steepest conversion where turnout is lowest. Needs the Flatbed (shop A06).',
                  req: s => s.assets.includes('A06'),
                  odds: () => 0.8,
                  run: (s, o, g) => {
                      var _a;
                      if (!g)
                          return 'No ground.';
                      // Low-prop grounds (hard turnout) convert hardest — archive logic
                      const base = ((_a = g.prop) !== null && _a !== void 0 ? _a : 0.5) < 0.4 ? 0.4 : 0.15;
                      const k = o.tier === 0 ? base : o.tier === 1 ? base * 0.75 : base * 0.4;
                      g.gotv += k;
                      return `The flatbed runs routes through ${g.n}. (+${Math.round(k * 100)}% conversion — steepest where turnout is lowest.)`;
                  }
              });
              /** Wave 1–3 core plays (attr-tagged). Main Deck — always-carry campaign spine. */
              exports_20("CORE_PLAYS", CORE_PLAYS = tagMainPlayer([
                  PL01_BlockWalk, PL02_PhoneBank, PL03_YardSignBlitz, PL04_PetitionDrive, PL05_PayFilingFee, PL06_TownHall,
                  PL07_CandidateForum, PL08_KitchenTable, PL09_EarnedMedia, PL10_PressRelease, PL13_FishFry, PL14_CourtTheChairs,
                  PL11_StrawPoll, PL12_ClubSpeech, PL15_OppoResearch, PL17_DebatePrep, PL19_GOTVWeekend, PL23_RidesToPolls
              ]));
              /** Shop BUY* templates (catalog entries; live availability via show()). Main unlocks. */
              exports_20("SHOP_PLAYS", SHOP_PLAYS = tagMainPlayer(assets_js_1.allShopPlayTemplates()));
              /**
               * Play catalog for SRD audit / draw pool (excludes BUY* shop items —
               * those are camp actions, not deck plays; see SHOP_PLAYS + buildCatalog).
               * Starmap pilot verbs (MV01) included — tightly show-gated; Special residency.
               */
              exports_20("ALL_PLAYS", ALL_PLAYS = [...CORE_PLAYS, ...plays_wave4_js_1.WAVE4_PLAYS, ...plays_starmap_js_1.STARMAP_PLAYS, ...plays_wave5_js_1.WAVE5_PLAYS]);
              /** Alias used by weekly-draw pool filters. */
              exports_20("PLAYS", PLAYS = ALL_PLAYS);
              exports_20("PLAY_COUNT", PLAY_COUNT = ALL_PLAYS.length);
          }
      };
  });
  /**
   * Outside event deck — world pressure the player does not play.
   * Residency: outside · control: world. See docs/CARD-RESIDENCY.md.
   */
  System.register("data/outside-events", [], function (exports_21, context_21) {
      "use strict";
      var EV_SCREWWORM, EV_REDISTRICT_RUMOR, EV_ETHICS_COMPLAINT, EV_DROUGHT, EV_ENERGY_BOOM, EV_RIVAL_DUMP, EV_FLOOD_WEEK, EV_SCHOOL_BOARD_WAR, EV_SPECIAL_SESSION, EV_PRIMARY_CHALLENGER_AD, EV_GRID_FREEZE, EV_PROPERTY_TAX, EV_LIBRARY_FIGHT, EV_BORDER_BUSES, EV_COUNTY_FAIR, EV_RURAL_HOSPITAL, EV_HEAT_DOME, EV_PLANT_LAYOFF, EV_WHISPER_SMEAR, EV_CLUB_RALLIES, EV_EARLY_VOTE_SURGE, OUTSIDE_EVENTS, OUTSIDE_EVENT_IDS;
      var __moduleName = context_21 && context_21.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      return {
          setters: [],
          execute: function () {/**
               * Outside event deck — world pressure the player does not play.
               * Residency: outside · control: world. See docs/CARD-RESIDENCY.md.
               */
              /** New World Screw Worm — ecological crisis (user's example Outside card). */
              exports_21("EV_SCREWWORM", EV_SCREWWORM = {
                  id: 'EV_SCREWWORM',
                  n: 'New World Screw Worm',
                  d: 'Livestock panic. Ranchers want answers. You do not play this card — it plays you.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 3,
                  show: s => s.regionHook === 'permian' ||
                      s.regionHook === 'panhandle' ||
                      s.regionHook === 'east' ||
                      s.regionHook === 'hill' ||
                      !s.regionHook,
                  apply: s => {
                      s.momentum = Math.max(0, s.momentum - 1);
                      // Rural grounds feel it
                      for (const g of s.groundsArr) {
                          if (g.id === 'GR02' || g.id === 'GR06' || g.id === 'GR07') {
                              g.rapport = clamp(g.rapport - 3, 0, 100);
                          }
                      }
                      if (s.stage === 'session') {
                          s.districtStanding = clamp(s.districtStanding - 3, 0, 100);
                          return ('OUTSIDE — NEW WORLD SCREW WORM. The Ag committee lights up; ranchers call the district office first. ' +
                              'Standing −3, rural rapport softens. You did not play this. You answer it.');
                      }
                      s.contacts = Math.max(0, s.contacts - 15);
                      return ('OUTSIDE — NEW WORLD SCREW WORM. Livestock panic on the FM roads. Contacts scatter (−15); ' +
                          'rural rapport dips. You cannot play the worm. You can only show up.');
                  }
              });
              exports_21("EV_REDISTRICT_RUMOR", EV_REDISTRICT_RUMOR = {
                  id: 'EV_REDISTRICT',
                  n: 'Mid-Decade Map Rumor',
                  d: 'Lines on a napkin in Austin. Your district might not exist as drawn.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 2,
                  apply: s => {
                      s.momentum = Math.max(0, s.momentum - 2);
                      s.hitPieces += 1;
                      s.faces.P = clamp((s.faces.P || 0) - 3, -50, 100);
                      return ('OUTSIDE — MAP RUMOR. A mid-decade redraw story hits the blogs. Momentum −2, a hit piece, ' +
                          'Parliamentarian face softens. The map is not yours to play.');
                  }
              });
              exports_21("EV_ETHICS_COMPLAINT", EV_ETHICS_COMPLAINT = {
                  id: 'EV_ETHICS',
                  n: 'Ethics Complaint Filed',
                  d: 'Someone with a PAC and a grudge files on you. Process is the punishment.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'blackmail',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 2,
                  show: s => (s.exposure || 0) >= 1 || s.hitPieces >= 1 || (s.shadowPlays || 0) >= 1,
                  apply: s => {
                      s.exposure = (s.exposure || 0) + 2;
                      s.hitPieces += 1;
                      s.favor = clamp((s.favor || 50) - 5, 0, 100);
                      return ('OUTSIDE — ETHICS COMPLAINT. Process is the punishment. Exposure +2, hit piece, favor −5. ' +
                          'You do not play this card. You hire a lawyer or you bleed.');
                  }
              });
              exports_21("EV_DROUGHT", EV_DROUGHT = {
                  id: 'EV_DROUGHT',
                  n: 'Exceptional Drought',
                  d: 'The aquifers drop. Water talk eats every town hall.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 2,
                  show: s => s.regionHook === 'hill' || s.regionHook === 'permian' || s.regionHook === 'panhandle' || s.issue === 'water',
                  apply: s => {
                      s.faces.T = clamp((s.faces.T || 0) + 3, -50, 100);
                      s.money = Math.max(0, s.money - 200);
                      for (const g of s.groundsArr) {
                          if (g.id === 'GR02' || g.id === 'GR07')
                              g.rapport = clamp(g.rapport + 2, 0, 100);
                      }
                      return ('OUTSIDE — DROUGHT. Exceptional on the maps. Money −$200 (hauling, generators), Truth face +3; ' +
                          'FM roads and lake country listen harder. Weather is not a hand card.');
                  }
              });
              exports_21("EV_ENERGY_BOOM", EV_ENERGY_BOOM = {
                  id: 'EV_ENERGY_BOOM',
                  n: 'Permian Checkbooks Open',
                  d: 'Oil money wants friends. Strings optional until they are not.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'bargain',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 2,
                  show: s => s.regionHook === 'permian' || s.regionHook === 'gulf' || s.regionHook === 'west',
                  apply: s => {
                      s.money += 800;
                      s.faces.L = clamp((s.faces.L || 0) - 6, -50, 100);
                      s.exposure = (s.exposure || 0) + 1;
                      return ('OUTSIDE — ENERGY BOOM. A check arrives without a speech. +$800, Loyalty face −6, exposure +1. ' +
                          'You did not play the boom. You can refuse the next ask — if you are ready.');
                  }
              });
              exports_21("EV_RIVAL_DUMP", EV_RIVAL_DUMP = {
                  id: 'EV_RIVAL_DUMP',
                  n: 'Rival Oppo Dump',
                  d: 'Their folder becomes Friday\'s mailer. Not your play — their weather.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'blackmail',
                  stages: ['primary', 'general'],
                  once: false,
                  w: 4,
                  show: s => s.stage === 'primary' || s.stage === 'general',
                  apply: s => {
                      s.hitPieces += 1;
                      s.momentum = Math.max(0, s.momentum - 1);
                      s.nameID = Math.max(0, s.nameID - 1);
                      return ('OUTSIDE — RIVAL DUMP. A mailer hits the precincts with your worst photograph. ' +
                          'Hit piece +1, momentum −1, name ID −1. React with Main cards — you do not "play" the dump.');
                  }
              });
              exports_21("EV_FLOOD_WEEK", EV_FLOOD_WEEK = {
                  id: 'EV_FLOOD',
                  n: 'Gulf Flood Week',
                  d: 'Water in the yards. Doors close. Politics waits on sandbags.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 2,
                  show: s => s.regionHook === 'gulf' || s.regionHook === 'east' || s.regionHook === 'valley',
                  apply: s => {
                      s.ap = Math.max(0, s.ap - 1);
                      s.volPool = Math.max(0, s.volPool - 1);
                      s.faces.G = clamp((s.faces.G || 0) + 2, -50, 100);
                      return ('OUTSIDE — FLOOD WEEK. Routes wash out. AP −1 this week, volunteer −1, Grit face +2. ' +
                          'The storm is not in your hand.');
                  }
              });
              exports_21("EV_SCHOOL_BOARD_WAR", EV_SCHOOL_BOARD_WAR = {
                  id: 'EV_SCHOOL_WAR',
                  n: 'School Board Blood Sport',
                  d: 'A curriculum fight goes county-wide. Every candidate gets asked.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 3,
                  show: _s => true,
                  apply: s => {
                      s.momentum += 1;
                      s.exposure = (s.exposure || 0) + 1;
                      s.faces.T = clamp((s.faces.T || 0) + 2, -50, 100);
                      return ('OUTSIDE — SCHOOL BOARD WAR. The county picks a side and wants yours. Momentum +1, exposure +1, Truth +2. ' +
                          'Culture weather — not a verb you chose.');
                  }
              });
              exports_21("EV_SPECIAL_SESSION", EV_SPECIAL_SESSION = {
                  id: 'EV_SPECIAL_SESSION',
                  n: 'Special Session Called',
                  d: 'The Governor wants another bite. The calendar never sleeps.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['session'],
                  once: true,
                  w: 3,
                  apply: s => {
                      s.favor = clamp(s.favor - 3, 0, 100);
                      if (s.bill && s.bill.pipelineStage >= 1 && s.bill.pipelineStage < 8) {
                          s.bill.heat += 1;
                      }
                      s.districtStanding = clamp(s.districtStanding - 1, 0, 100);
                      return ('OUTSIDE — SPECIAL SESSION. Leadership resets the clock for their priorities. Favor −3, bill heat +1, ' +
                          'standing −1. You do not call special sessions as a freshman. You survive them.');
                  }
              });
              exports_21("EV_PRIMARY_CHALLENGER_AD", EV_PRIMARY_CHALLENGER_AD = {
                  id: 'EV_CHALLENGER_AD',
                  n: 'Primary Challenger Airs',
                  d: 'A younger, angrier ad buy. The seat was never a gift.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['session'],
                  once: false,
                  w: 3,
                  show: s => { var _a; return Number(((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.challengerHeat) || 0) >= 1 || s.districtStanding < 55; },
                  apply: s => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.challengerHeat = Number(s.sessionFlags.challengerHeat || 0) + 1;
                      s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
                      s.hitPieces += 1;
                      return ('OUTSIDE — CHALLENGER AD. "We can do better." Standing −2, hit piece, challenger heat +1. ' +
                          'Casework is your answer. This card was never yours to play.');
                  }
              });
              // --- Pack #2: quote-forward topical weather (Stupid Ideas #20 GREAT) ---
              // Flavor is original paraphrase / public cadence — not verbatim soundbites.
              /** Grid freeze memory — "the lights went out and nobody owned it." */
              exports_21("EV_GRID_FREEZE", EV_GRID_FREEZE = {
                  id: 'EV_GRID_FREEZE',
                  n: 'Grid Freeze Hangover',
                  d: 'Pipes still burst in the stories people tell. The ERCOT slide deck is a campaign issue whether you like it.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 3,
                  show: s => s.regionHook === 'metro' ||
                      s.regionHook === 'hill' ||
                      s.regionHook === 'east' ||
                      s.regionHook === 'gulf' ||
                      !s.regionHook,
                  apply: s => {
                      s.faces.T = clamp((s.faces.T || 0) + 4, -50, 100);
                      s.momentum = Math.max(0, s.momentum - 1);
                      s.exposure = (s.exposure || 0) + 1;
                      if (s.stage === 'session') {
                          s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
                          return ('OUTSIDE — GRID FREEZE. "Keep your family safe" is what every mailer says now. ' +
                              'Truth face +4, standing −2, exposure +1. You did not call the blackout. You answer the porch questions.');
                      }
                      s.contacts = Math.max(0, s.contacts - 10);
                      return ('OUTSIDE — GRID FREEZE. Somebody on a porch says, "We boiled snow." Momentum −1, contacts −10, Truth +4. ' +
                          'Infrastructure weather — not a Main card.');
                  }
              });
              /** Property tax sermon season. */
              exports_21("EV_PROPERTY_TAX", EV_PROPERTY_TAX = {
                  id: 'EV_PROPERTY_TAX',
                  n: 'Property Tax Revival',
                  d: 'Every candidate will "fix the appraisal district." The math is harder than the slogan.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 3,
                  show: _s => true,
                  apply: s => {
                      s.momentum += 1;
                      s.nameID = Math.max(0, s.nameID - 1);
                      s.faces.O = clamp((s.faces.O || 0) + 2, -50, 100);
                      for (const g of s.groundsArr) {
                          if (g.id === 'GR03')
                              g.rapport = clamp(g.rapport + 3, 0, 100);
                      }
                      return ('OUTSIDE — PROPERTY TAX. "Cut the rates" is the only hymn at the subdivision HOA. ' +
                          'Momentum +1, name −1 (you are one of a dozen promising the same), Order face +2, New Subdivisions listen. ' +
                          'You do not play the tax code. You inherit the sermon.');
                  }
              });
              /** Book / library culture fight. */
              exports_21("EV_LIBRARY_FIGHT", EV_LIBRARY_FIGHT = {
                  id: 'EV_LIBRARY_FIGHT',
                  n: 'Library Shelf Fight',
                  d: 'A list of titles becomes a county identity test. Cameras love a microphone in the stacks.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 3,
                  show: _s => true,
                  apply: s => {
                      s.exposure = (s.exposure || 0) + 1;
                      s.hitPieces += 1;
                      s.faces.T = clamp((s.faces.T || 0) + 3, -50, 100);
                      s.momentum += 1;
                      return ('OUTSIDE — LIBRARY FIGHT. "Think of the children" and "think of the First Amendment" share a parking lot. ' +
                          'Hit piece +1, exposure +1, Truth +3, momentum +1. Culture weather — answer carefully or not at all.');
                  }
              });
              /** Border bus / busing politics as weather (not a player verb). */
              exports_21("EV_BORDER_BUSES", EV_BORDER_BUSES = {
                  id: 'EV_BORDER_BUSES',
                  n: 'Buses on the Cable News',
                  d: 'Four hundred miles away and on every screen in the district. Heat guaranteed; light optional.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 3,
                  show: s => s.regionHook === 'valley' ||
                      s.regionHook === 'metro' ||
                      s.regionHook === 'gulf' ||
                      s.regionHook === 'west' ||
                      !s.regionHook,
                  apply: s => {
                      s.hitPieces += 1;
                      s.momentum = Math.max(0, s.momentum - 1);
                      s.faces.P = clamp((s.faces.P || 0) - 2, -50, 100);
                      if (s.stage === 'session') {
                          s.favor = clamp(s.favor - 2, 0, 100);
                          return ('OUTSIDE — BORDER BUSES. Leadership wants a statement by noon. Favor −2, hit piece, Parliamentarian face dips. ' +
                              '"Secure the border" is not a bill you filed. It is the weather on the fifth floor.');
                      }
                      s.endorsePts = Math.max(0, s.endorsePts - 1);
                      return ('OUTSIDE — BORDER BUSES. A cable chyron becomes a kitchen-table test. Hit piece +1, momentum −1, endorse −1. ' +
                          'You do not drive the buses. You get asked about them at the fish fry.');
                  }
              });
              /** County fair / carnival week — lighter texture. */
              exports_21("EV_COUNTY_FAIR", EV_COUNTY_FAIR = {
                  id: 'EV_COUNTY_FAIR',
                  n: 'County Fair Week',
                  d: 'Corn dogs, livestock, and every candidate in a booth. Presence is free; absence is noted.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'ally',
                  stages: ['primary', 'general'],
                  once: true,
                  w: 2,
                  show: s => s.stage === 'primary' || s.stage === 'general',
                  apply: s => {
                      s.contacts += 20;
                      s.nameID += 2;
                      s.faces.G = clamp((s.faces.G || 0) + 2, -50, 100);
                      for (const g of s.groundsArr) {
                          if (g.id === 'GR01' || g.id === 'GR06')
                              g.rapport = clamp(g.rapport + 2, 0, 100);
                      }
                      return ('OUTSIDE — COUNTY FAIR. "See you at the fair" is the only polite threat in the county. ' +
                          '+20 contacts, +2 name, Grit +2, square and halls warm. You did not schedule the fair. You show up or you do not.');
                  }
              });
              /** Hospital / rural care closure scare. */
              exports_21("EV_RURAL_HOSPITAL", EV_RURAL_HOSPITAL = {
                  id: 'EV_RURAL_HOSPITAL',
                  n: 'Rural Hospital Scare',
                  d: 'A closure rumor, a travel distance, a Facebook post with a thousand shares.',
                  residency: 'outside',
                  control: 'world',
                  kind: 'liability',
                  stages: ['primary', 'general', 'session'],
                  once: true,
                  w: 2,
                  show: s => s.regionHook === 'east' ||
                      s.regionHook === 'panhandle' ||
                      s.regionHook === 'west' ||
                      s.regionHook === 'hill' ||
                      s.regionHook === 'permian',
                  apply: s => {
                      s.faces.G = clamp((s.faces.G || 0) + 3, -50, 100);
                      s.momentum = Math.max(0, s.momentum - 1);
                      for (const g of s.groundsArr) {
                          if (g.id === 'GR02' || g.id === 'GR07')
                              g.rapport = clamp(g.rapport - 2, 0, 100);
                      }
                      if (s.stage === 'session') {
                          s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
                          return ('OUTSIDE — RURAL HOSPITAL. "How far to the next ER?" Standing −2, Grit +3. ' +
                              'Casework will be full of rides and referrals. Not your card — your office phone.');
                      }
                      s.contacts = Math.max(0, s.contacts - 12);
                      return ('OUTSIDE — RURAL HOSPITAL. Somebody says, "We already drive an hour." Contacts −12, momentum −1, Grit +3; ' +
                          'FM roads and lake country go cool. Health weather is not a hand verb.');
                  }
              });
              /** Full Outside catalog. */
              /** Heat dome — a real Texas summer that keeps people (and canvassers) inside. */
              exports_21("EV_HEAT_DOME", EV_HEAT_DOME = {
                  id: 'EV_HEAT_DOME', n: 'Heat Dome', kind: 'liability',
                  d: 'A hundred and nine for ten days straight. Nobody answers the door; nobody wants a flyer.',
                  residency: 'outside', control: 'world', stages: ['primary', 'general'], w: 3,
                  apply: s => {
                      s.momentum = Math.max(0, s.momentum - 1);
                      for (const g of s.groundsArr)
                          g.rapport = clamp(g.rapport - 2, 0, 100);
                      return 'OUTSIDE — HEAT DOME. The doors stay shut and the volunteers wilt. Rapport softens across the map; spend momentum before it evaporates.';
                  }
              });
              /** Plant layoff — sudden economic anxiety reshapes the race's mood. */
              exports_21("EV_PLANT_LAYOFF", EV_PLANT_LAYOFF = {
                  id: 'EV_PLANT_LAYOFF', n: 'The Plant Lays Off', kind: 'liability',
                  d: 'Four hundred jobs, gone by Friday. The district wants to know whose side you are on.',
                  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
                  apply: s => {
                      s.faces.O += 2;
                      if (s.messageSharp) {
                          s.momentum += 1;
                          return 'OUTSIDE — THE PLANT LAYS OFF. Anxiety grips the county — but your message is sharp enough to meet it. Momentum holds.';
                      }
                      s.momentum = Math.max(0, s.momentum - 1);
                      return 'OUTSIDE — THE PLANT LAYS OFF. The mood curdles and you have no ready answer. Momentum slips; the pressure is on.';
                  }
              });
              /** Whisper campaign against you — a smear you did not start. */
              exports_21("EV_WHISPER_SMEAR", EV_WHISPER_SMEAR = {
                  id: 'EV_WHISPER_SMEAR', n: 'A Whisper Starts', kind: 'blackmail',
                  d: 'Something ugly and unattributed makes the rounds at the coffee shops. You never said it. It does not matter.',
                  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
                  show: s => s.faces.O >= 2 || s.hitPieces > 0,
                  apply: s => {
                      s.nameID += 2;
                      s.faces.O += 2;
                      s.momentum = Math.max(0, s.momentum - 1);
                      return 'OUTSIDE — A WHISPER STARTS. Name ID up, the wrong way. Someone is working you over in the dark — and the county half-believes it.';
                  }
              });
              /** Spontaneous club endorsement — the rare kind wind. */
              exports_21("EV_CLUB_RALLIES", EV_CLUB_RALLIES = {
                  id: 'EV_CLUB_RALLIES', n: 'A Club Rallies to You', kind: 'ally',
                  d: 'Word of your kitchen-table work reaches the right room, and the room decides it likes you.',
                  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
                  show: s => s.endorsePts >= 2 || s.contacts >= 200,
                  apply: s => {
                      s.endorsePts += 2;
                      s.momentum += 1;
                      return 'OUTSIDE — A CLUB RALLIES TO YOU. Unbidden, a club puts its people behind you. +2 endorsement points and a gust of momentum.';
                  }
              });
              /** Early-vote surge — turnout weather in the general's home stretch. */
              exports_21("EV_EARLY_VOTE_SURGE", EV_EARLY_VOTE_SURGE = {
                  id: 'EV_EARLY_VOTE_SURGE', n: 'Early Vote Surges', kind: 'location',
                  d: 'The lines wrap the courthouse on day one. Whoever banked turnout is about to find out if it was enough.',
                  residency: 'outside', control: 'world', stages: ['general'], once: true, w: 3,
                  apply: s => {
                      const banked = s.groundsArr.reduce((t, g) => t + (g.gotv || 0), 0);
                      if (banked > 0.4) {
                          s.momentum += 2;
                          return 'OUTSIDE — EARLY VOTE SURGES. Your banked turnout meets the moment. The lines are full of your people. +2 momentum.';
                      }
                      s.momentum = Math.max(0, s.momentum - 1);
                      return 'OUTSIDE — EARLY VOTE SURGES. The lines are long and mostly strangers. You did not bank enough turnout for this. Momentum slips.';
                  }
              });
              exports_21("OUTSIDE_EVENTS", OUTSIDE_EVENTS = [
                  EV_HEAT_DOME,
                  EV_PLANT_LAYOFF,
                  EV_WHISPER_SMEAR,
                  EV_CLUB_RALLIES,
                  EV_EARLY_VOTE_SURGE,
                  EV_SCREWWORM,
                  EV_REDISTRICT_RUMOR,
                  EV_ETHICS_COMPLAINT,
                  EV_DROUGHT,
                  EV_ENERGY_BOOM,
                  EV_RIVAL_DUMP,
                  EV_FLOOD_WEEK,
                  EV_SCHOOL_BOARD_WAR,
                  EV_SPECIAL_SESSION,
                  EV_PRIMARY_CHALLENGER_AD,
                  EV_GRID_FREEZE,
                  EV_PROPERTY_TAX,
                  EV_LIBRARY_FIGHT,
                  EV_BORDER_BUSES,
                  EV_COUNTY_FAIR,
                  EV_RURAL_HOSPITAL
              ]);
              exports_21("OUTSIDE_EVENT_IDS", OUTSIDE_EVENT_IDS = OUTSIDE_EVENTS.map(e => e.id));
          }
      };
  });
  /**
   * Outside event deck — world draws, never player hand.
   * docs/CARD-RESIDENCY.md: residency outside ⇒ control world.
   */
  System.register("engine/outside", ["engine/rng", "data/outside-events"], function (exports_22, context_22) {
      "use strict";
      var rng_js_5, outside_events_js_1;
      var __moduleName = context_22 && context_22.id;
      function stageOk(e, state) {
          if (state.stage === 'primary' || state.stage === 'general' || state.stage === 'session') {
              return e.stages.includes(state.stage);
          }
          return false;
      }
      /** Eligible Outside events for this state (not yet fired if once). */
      function listEligibleOutside(state) {
          const fired = state.eventsFired || {};
          return outside_events_js_1.OUTSIDE_EVENTS.filter(e => {
              if (e.residency !== 'outside' || e.control !== 'world')
                  return false;
              if (!stageOk(e, state))
                  return false;
              if (e.once && fired[e.id])
                  return false;
              if (e.show && !e.show(state))
                  return false;
              return true;
          });
      }
      exports_22("listEligibleOutside", listEligibleOutside);
      /**
       * Weighted draw from eligible Outside events.
       * Returns null if none eligible or no draw this tick.
       */
      function drawOutsideEvent(state) {
          var _a;
          const pool = listEligibleOutside(state);
          if (!pool.length)
              return null;
          const total = pool.reduce((s, e) => s + Math.max(1, e.w || 1), 0);
          let r = rng_js_5.random() * total;
          for (const e of pool) {
              r -= Math.max(1, e.w || 1);
              if (r <= 0)
                  return e;
          }
          return (_a = pool[pool.length - 1]) !== null && _a !== void 0 ? _a : null;
      }
      exports_22("drawOutsideEvent", drawOutsideEvent);
      /**
       * Apply an Outside event: log, mark fired, mutate state via apply().
       * Never adds to hand / deck.
       */
      function resolveOutsideEvent(state, event) {
          state.eventsFired = state.eventsFired || {};
          if (event.once)
              state.eventsFired[event.id] = true;
          // Track encounter count for multi-fire events
          const key = `seen_${event.id}`;
          state.eventsFired[key] = true;
          const text = event.apply(state);
          state.log.push({
              week: state.week,
              kind: 'note',
              text
          });
          // Presentation hook — host shows weather chrome, then clears. Never hand.
          state.pendingOutside = { id: event.id, n: event.n, text };
          return text;
      }
      exports_22("resolveOutsideEvent", resolveOutsideEvent);
      /** Host dismisses Outside weather surface. */
      function clearPendingOutside(state) {
          state.pendingOutside = null;
      }
      exports_22("clearPendingOutside", clearPendingOutside);
      /**
       * Week-boundary Outside draw.
       * ~18% campaign weeks, ~15% session weeks (session already has teeth ticks).
       * Hygiene 2026-07-19: first cut was too stormy when stacked with rival teeth.
       * At most one Outside card per advance.
       */
      function tickOutsideDeck(state) {
          if (state.over)
              return null;
          const p = state.stage === 'session' ? 0.15 : 0.18;
          if (rng_js_5.random() >= p)
              return null;
          const ev = drawOutsideEvent(state);
          if (!ev)
              return null;
          return resolveOutsideEvent(state, ev);
      }
      exports_22("tickOutsideDeck", tickOutsideDeck);
      /** Catalog integrity helpers for harness. */
      function outsideCatalogStats() {
          const ids = outside_events_js_1.OUTSIDE_EVENTS.map(e => e.id);
          return {
              count: outside_events_js_1.OUTSIDE_EVENTS.length,
              allOutside: outside_events_js_1.OUTSIDE_EVENTS.every(e => e.residency === 'outside'),
              allWorld: outside_events_js_1.OUTSIDE_EVENTS.every(e => e.control === 'world'),
              ids
          };
      }
      exports_22("outsideCatalogStats", outsideCatalogStats);
      return {
          setters: [
              function (rng_js_5_1) {
                  rng_js_5 = rng_js_5_1;
              },
              function (outside_events_js_1_1) {
                  outside_events_js_1 = outside_events_js_1_1;
              }
          ],
          execute: function () {/**
               * Outside event deck — world draws, never player hand.
               * docs/CARD-RESIDENCY.md: residency outside ⇒ control world.
               */
          }
      };
  });
  /**
   * CANDIDATE ZERO — The Chronicle (cross-run meta-progression)
   *
   * Ported from archive/prototype-single-file.html's LEGACY/TRAITS/paths/
   * epithet/terminal system. A run ending is not a reset: the archive never
   * had a hard "game over" screen — it has a terminal beat (what happened,
   * what you grew despite losing), then an interim choice (how you spent the
   * two years until the next filing deadline) that grants one permanent
   * trait, then the next run starts already carrying real progress forward.
   *
   * `hasRep`/`warm` checks below only ever see reps this engine can actually
   * grant (see reputation.ts's documented gaps) — traits gated on R08/R09
   * marks in the archive simply won't fire here yet, same scoping as
   * everywhere else this session.
   */
  System.register("engine/legacy", ["engine/reputation", "engine/calendar", "engine/debt"], function (exports_23, context_23) {
      "use strict";
      var reputation_js_5, calendar_js_1, debt_js_2, STORAGE_KEY, TRAITS, PATH_TO_WAITING_LOOP;
      var __moduleName = context_23 && context_23.id;
      function emptyLegacy() {
          return { runs: [], traits: [], carry: {} };
      }
      exports_23("emptyLegacy", emptyLegacy);
      function storageAvailable() {
          try {
              if (typeof localStorage === 'undefined')
                  return false;
              localStorage.setItem('cz_t', '1');
              localStorage.removeItem('cz_t');
              return true;
          }
          catch {
              return false;
          }
      }
      function loadLegacy() {
          var _a;
          if (!storageAvailable())
              return emptyLegacy();
          try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (!raw)
                  return emptyLegacy();
              const parsed = JSON.parse(raw);
              return {
                  runs: Array.isArray(parsed.runs) ? parsed.runs : [],
                  traits: Array.isArray(parsed.traits) ? parsed.traits : [],
                  carry: (_a = parsed.carry) !== null && _a !== void 0 ? _a : {},
                  name: parsed.name
              };
          }
          catch {
              return emptyLegacy();
          }
      }
      exports_23("loadLegacy", loadLegacy);
      function saveLegacy(legacy) {
          if (!storageAvailable())
              return;
          try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
          }
          catch {
              // storage unavailable mid-session: the Chronicle lives for this sitting only
          }
      }
      exports_23("saveLegacy", saveLegacy);
      function buildPaths(state, share) {
          var _a, _b;
          const respectable = share > 28 && state.hitPieces < 3;
          const crisis = debt_js_2.isDebtCrisis(state);
          const wasSession = state.outcome === 'session_law' ||
              state.outcome === 'session_survived' ||
              state.outcome === 'session_primaried' ||
              state.stage === 'session';
          const paths = [
              {
                  id: 'perennial',
                  n: crisis ? 'The Perennial Candidate (and the Note)' : 'The Perennial Candidate',
                  d: crisis
                      ? `Keep running with $${state.debt} still on the books. Worse economics next cycle — interest compounds. Or take the PAC Check as relief next time.`
                      : 'Keep the list warm. Keep showing up. The county learns your face by the third try.',
                  traits: ['T_LIST', 'T_KNOWN'],
                  gate: true,
                  interim: crisis
                      ? 'Two years of fish fries, funerals, and a bank note that does not sleep.'
                      : 'Two years of fish fries and funerals, list warm.'
              },
              {
                  id: 'advocate',
                  n: 'The Advocate',
                  d: `The candidate lost; the issue didn’t. Build the organization "${(_a = state.issue) !== null && _a !== void 0 ? _a : 'the cause'}" deserved.`,
                  traits: ['T_CRED', 'T_NORTH'],
                  // Phase 3: crisis debt closes the soft paths — run again or go home.
                  gate: !crisis,
                  interim: `Two years building the ${(_b = state.issue) !== null && _b !== void 0 ? _b : 'issue'} organization.`
              },
              {
                  id: 'staffer',
                  n: 'The Staffer',
                  d: 'Someone in Austin noticed you. Two years inside the building, learning where the levers are.',
                  traits: ['T_NERD', 'T_WHIP'],
                  gate: !crisis && (respectable || state.endorsePts > 2),
                  interim: 'Two years carrying a badge in the Capitol, learning the levers.'
              },
              {
                  id: 'home',
                  n: 'Go Home a While',
                  d: crisis
                      ? 'Stop the bleeding. Fix the fence. The note still compounds, but you are not on the trail.'
                      : 'Fix the fence. Coach the team. Let the county forget the mailers before it remembers your name.',
                  traits: ['T_REST', 'T_PERSP'],
                  gate: true,
                  interim: crisis
                      ? 'Two years of fences, Friday games, and interest.'
                      : 'Two years of fences and Friday games.'
              },
              {
                  id: 'exmember',
                  n: 'The Ex-Member',
                  d: 'Two years as a former legislator — half lobbyist-in-waiting, half elder statesman, all rolodex.',
                  traits: ['T_AUTHOR', 'T_LEVERS'],
                  gate: wasSession,
                  interim: 'Two years as a former member — doors still open, title still warm.'
              },
              {
                  id: 'senate',
                  n: 'Senate Exploratory',
                  d: 'Quiet calls about the other chamber. Bigger map, longer odds, same two years.',
                  traits: ['T_LEVERS', 'T_WHIP'],
                  gate: wasSession && (state.outcome === 'session_law' || (state.capital || 0) >= 6),
                  interim: 'Two years testing Senate waters — lunches, briefs, no announcement.'
              },
              {
                  id: 'statewide',
                  n: 'Statewide Exploratory',
                  d: "Governor's row is a different weather system. Test it without filing.",
                  traits: ['T_KNOWN', 'T_LEVERS'],
                  gate: wasSession && state.outcome === 'session_law' && (state.nameID || 0) >= 25,
                  interim: 'Two years on the statewide circuit — airports, rotary, no yard signs yet.'
              }
          ];
          return paths.filter(p => p.gate);
      }
      exports_23("buildPaths", buildPaths);
      /** Trait effects on a fresh run — call after applySetup, before the campaign starts. */
      function applyLegacy(state, legacy) {
          var _a, _b;
          const has = (t) => legacy.traits.includes(t);
          if (has('T_LIST') && legacy.carry.contacts) {
              state.contacts += Math.round(legacy.carry.contacts * 0.3);
          }
          if (has('T_KNOWN'))
              state.nameID += 6;
          if (has('T_CRED')) {
              for (const g of state.groundsArr) {
                  if (g.aff.includes('T'))
                      g.rapport = Math.max(g.rapport, 12);
              }
          }
          if (has('T_NORTH'))
              state.messageSharp = true;
          if (has('T_NERD')) {
              state.faces.P += 12;
              state.parlSave = true;
          }
          if (has('T_WHIP')) {
              state.faces.O += 12;
              state.favors += 1;
          }
          if (has('T_REST'))
              state.volPool += 2;
          if (has('T_PERSP'))
              state.globalBand = ((_a = state.globalBand) !== null && _a !== void 0 ? _a : 0) - 0.01;
          if (has('T_AUTHOR'))
              state.nameID += 4;
          if (has('T_LEVERS')) {
              state.faces.P += 8;
              state.faces.O += 8;
          }
          // Phase 3: loss-branch debt compounds into the next cycle (affordability,
          // not odds). Reuses applyCarriedDebt → addObl OB2 (debt.ts / obligations.ts).
          debt_js_2.applyLegacyDebt(state, legacy);
          // Starmap waiting loop + banked waiting-season yields from last cycle.
          if (legacy.carry.waitingLoopId) {
              state.sessionFlags = state.sessionFlags || {};
              state.sessionFlags[`waiting_${legacy.carry.waitingLoopId}`] = true;
              state.entityHistory = (_b = state.entityHistory) !== null && _b !== void 0 ? _b : [];
              const tag = `WAIT:${legacy.carry.waitingLoopId}`;
              if (!state.entityHistory.includes(tag))
                  state.entityHistory.push(tag);
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: `WAITING ORBIT — last cycle's path still colors this climb (${legacy.carry.waitingLoopId.replace(/LOOP_WAITING_|LOOP_ELECTED_/g, '').toLowerCase()}). No true game over; only redirection.`
              });
          }
          if (legacy.carry.waitingContacts) {
              state.contacts += legacy.carry.waitingContacts;
          }
          if (legacy.carry.waitingNameID)
              state.nameID += legacy.carry.waitingNameID;
          if (legacy.carry.waitingMoney)
              state.money += legacy.carry.waitingMoney;
          if (legacy.carry.waitingVols)
              state.volPool += legacy.carry.waitingVols;
          if (legacy.carry.waitingFavors)
              state.favors += legacy.carry.waitingFavors;
          if (legacy.carry.higherOfficeFork) {
              state.sessionFlags = state.sessionFlags || {};
              state.sessionFlags.higherOfficeFork =
                  legacy.carry.higherOfficeFork === 'senate' ? 1 : 2;
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: `HIGHER OFFICE RESIDUE — last cycle tested ${legacy.carry.higherOfficeFork} waters. The map is larger than one district.`
              });
          }
          // One-shot waiting banks (don't double-dip every trait reload)
          if (legacy.carry.waitingContacts ||
              legacy.carry.waitingNameID ||
              legacy.carry.waitingMoney ||
              legacy.carry.waitingVols ||
              legacy.carry.waitingFavors) {
              legacy.carry = {
                  ...legacy.carry,
                  waitingContacts: 0,
                  waitingNameID: 0,
                  waitingMoney: 0,
                  waitingVols: 0,
                  waitingFavors: 0
              };
          }
      }
      exports_23("applyLegacy", applyLegacy);
      /**
       * Approximate "how close you were" for the epithet's loss narrative. Modular
       * resolution is probability-threshold based rather than a simulated vote
       * share, so this reuses the same win-probability formulas the calendar
       * already computes at each election, recomputed post-hoc off the state as
       * it stood when the run ended (pure formula, no RNG — safe to call after
       * the outcome is already set).
       */
      function computeShare(state, kind) {
          if (kind === 'lost_primary')
              return calendar_js_1.primaryWinProbability(state) * 100;
          if (kind === 'lost_general')
              return calendar_js_1.generalWinProbability(state) * 100;
          // Session reelection outlook is baked into the outcome text; surface standing.
          if (kind === 'session_law' || kind === 'session_survived') {
              return Math.min(95, 50 + state.districtStanding * 0.4);
          }
          if (kind === 'session_primaried') {
              return Math.max(5, state.districtStanding * 0.35);
          }
          return 0;
      }
      exports_23("computeShare", computeShare);
      /** One-line narrative summary of how a run ended, for the Chronicle. */
      function buildEpithet(state, kind, share) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j;
          const who = state.persona ? lowerThe(state.persona) : 'The candidate';
          const alignLabel = {
              safe: 'a safe seat',
              competitive: 'a competitive district',
              wrong: 'a wrong-party district'
          };
          const d = (_c = alignLabel[(_b = (_a = state.district) === null || _a === void 0 ? void 0 : _a.align) !== null && _b !== void 0 ? _b : '']) !== null && _c !== void 0 ? _c : 'the district';
          let core;
          if (kind === 'won_general') {
              core = state.incumbentRun
                  ? `defended the seat as the incumbent on ${(_d = state.issue) !== null && _d !== void 0 ? _d : 'the issue'}`
                  : `won the seat outright on ${(_e = state.issue) !== null && _e !== void 0 ? _e : 'the issue'}`;
          }
          else if (kind === 'session_law') {
              core = `passed a bill into law on ${(_f = state.issue) !== null && _f !== void 0 ? _f : 'the issue'} and held the seat`;
          }
          else if (kind === 'session_survived') {
              core = `survived a first session on ${(_g = state.issue) !== null && _g !== void 0 ? _g : 'the issue'} and held the seat`;
          }
          else if (kind === 'session_primaried') {
              core = `won the seat, fought a session, and was primaried out`;
          }
          else if (kind === 'missed_filing') {
              core = `never made the ballot — ${state.signatures} signatures and an empty coffee can`;
          }
          else if (kind === 'lost_general') {
              core = `won the primary on ${(_h = state.issue) !== null && _h !== void 0 ? _h : 'the issue'}, then hit the general’s wall at ${share.toFixed(1)}%`;
          }
          else {
              core = `ran on ${(_j = state.issue) !== null && _j !== void 0 ? _j : 'the issue'} and fell at ${share.toFixed(1)}%`;
          }
          const marks = [];
          if (reputation_js_5.hasRep(state, 'R11'))
              marks.push('the county called them snakebit');
          if (reputation_js_5.hasRep(state, 'R09'))
              marks.push('the movement’s choice to the end');
          if (reputation_js_5.hasRep(state, 'R08'))
              marks.push('the establishment’s pick');
          if (state.shFired.F2 || state.shFired.T2)
              marks.push('undone partly by their own shadow');
          if (state.obls.length >= 3)
              marks.push(`carrying ${state.obls.length} obligations like stones`);
          if ((state.debt || 0) > 0) {
              marks.push(kind === 'won_general'
                  ? `a note on the books ($${state.debt}) heading into Session`
                  : `$${state.debt} still owed — the bank does not care who lost`);
          }
          if (reputation_js_5.hasRep(state, 'R01'))
              marks.push('nobody outworked them');
          return `${who} ${core} in ${d}${marks.length ? ' — ' + marks.join('; ') : ''}.`;
      }
      exports_23("buildEpithet", buildEpithet);
      function lowerThe(n) {
          return n.startsWith('The ') ? 'the ' + n.slice(4) : n;
      }
      /** What this run leaves behind even on a loss — the "not empty-handed" beat. */
      function buildGrowthLine(state) {
          const grew = [];
          if (state.walkCount > 0)
              grew.push(`walked ${state.walkCount} blocks`);
          if (state.nameID > 0)
              grew.push(`built ${state.nameID} name recognition`);
          if (state.reps.length)
              grew.push(`earned ${state.reps.length} reputation${state.reps.length === 1 ? '' : 's'}`);
          if (!grew.length)
              return null;
          return `But you did not come away empty. This run, you ${grew.join(' · ')}. The county remembers.`;
      }
      exports_23("buildGrowthLine", buildGrowthLine);
      /** Push this run into the Chronicle and bank its carry-forward stats. */
      function recordRun(legacy, state, kind, share) {
          legacy.runs.push({ epithet: buildEpithet(state, kind, share), kind });
          const base = { contacts: state.contacts, nameID: state.nameID };
          // Phase 3: loss compounds debt into carry; win zeros debt carry
          // (cash retirement happens in retireDebtOnWin on reelect / Session).
          legacy.carry = debt_js_2.mergeDebtIntoCarry(base, state, kind);
      }
      exports_23("recordRun", recordRun);
      /** Record interim flavor + bind waiting loop on carry for the next run. */
      function setInterimPath(legacy, pathId, interim) {
          const last = legacy.runs[legacy.runs.length - 1];
          if (last)
              last.interim = interim;
          const loopId = PATH_TO_WAITING_LOOP[pathId];
          if (loopId) {
              legacy.carry = { ...legacy.carry, waitingLoopId: loopId };
          }
      }
      exports_23("setInterimPath", setInterimPath);
      function setInterim(legacy, interim) {
          const last = legacy.runs[legacy.runs.length - 1];
          if (last)
              last.interim = interim;
      }
      exports_23("setInterim", setInterim);
      function addTrait(legacy, trait) {
          if (!legacy.traits.includes(trait))
              legacy.traits.push(trait);
          if (legacy.traits.length > 3)
              legacy.traits = legacy.traits.slice(-3);
      }
      exports_23("addTrait", addTrait);
      function romanRun(index) {
          var _a;
          const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
          return (_a = numerals[index]) !== null && _a !== void 0 ? _a : String(index + 1);
      }
      exports_23("romanRun", romanRun);
      return {
          setters: [
              function (reputation_js_5_1) {
                  reputation_js_5 = reputation_js_5_1;
              },
              function (calendar_js_1_1) {
                  calendar_js_1 = calendar_js_1_1;
              },
              function (debt_js_2_1) {
                  debt_js_2 = debt_js_2_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — The Chronicle (cross-run meta-progression)
               *
               * Ported from archive/prototype-single-file.html's LEGACY/TRAITS/paths/
               * epithet/terminal system. A run ending is not a reset: the archive never
               * had a hard "game over" screen — it has a terminal beat (what happened,
               * what you grew despite losing), then an interim choice (how you spent the
               * two years until the next filing deadline) that grants one permanent
               * trait, then the next run starts already carrying real progress forward.
               *
               * `hasRep`/`warm` checks below only ever see reps this engine can actually
               * grant (see reputation.ts's documented gaps) — traits gated on R08/R09
               * marks in the archive simply won't fire here yet, same scoping as
               * everywhere else this session.
               */
              STORAGE_KEY = 'cz_legacy_v1';
              exports_23("TRAITS", TRAITS = {
                  T_AUTHOR: { n: 'Bill Author', d: 'You have written law. +4 name ID now; +2 capital in any future Session.' },
                  T_LEVERS: { n: 'Knows the Levers', d: 'The building is a machine and you have seen the gears. +8 Parliamentarian, +8 Operator.' },
                  T_LIST: { n: 'The Banked List', d: 'Start with 30% of your last run’s contacts.' },
                  T_KNOWN: { n: 'Known Quantity', d: 'Start with +6 name ID. They remember the yard signs.' },
                  T_CRED: { n: 'Movement Cred', d: 'True-Believer grounds start at 12 rapport.' },
                  T_NORTH: { n: 'True North', d: 'The message starts sharp. You never lost the thread.' },
                  T_NERD: { n: 'Procedure Nerd', d: '+12 Parliamentarian. Once per campaign, a procedural DISASTER reads down to a SETBACK.' },
                  T_WHIP: { n: 'The Whip Count', d: '+12 Operator; start with a favor in your pocket.' },
                  T_REST: { n: 'Rested', d: 'Start with +2 volunteers and a clean slate of grudges.' },
                  T_PERSP: { n: 'Perspective', d: 'Disaster band permanently narrower. Losing taught you where the holes are.' }
              });
              /**
               * Chronicle interim path id → starmap waiting loop.
               * "No true game over" — loss redirects into a named orbit for the next climb.
               */
              exports_23("PATH_TO_WAITING_LOOP", PATH_TO_WAITING_LOOP = {
                  perennial: 'LOOP_WAITING_PERENNIAL',
                  advocate: 'LOOP_WAITING_ADVOCATE',
                  staffer: 'LOOP_WAITING_STAFFER',
                  home: 'LOOP_WAITING_HOME',
                  exmember: 'LOOP_WAITING_EXMEMBER',
                  senate: 'LOOP_ELECTED_HIGHER_SENATE',
                  statewide: 'LOOP_ELECTED_HIGHER_STATEWIDE'
              });
          }
      };
  });
  /**
   * Waiting season — compressed interim play between cycles.
   * No true game over: loss/session end redirects into a playable orbit.
   */
  System.register("engine/waiting", ["engine/legacy"], function (exports_24, context_24) {
      "use strict";
      var legacy_js_1, WAITING_WEEKS;
      var __moduleName = context_24 && context_24.id;
      function enterWaiting(state, pathId) {
          var _a, _b, _c;
          const loopId = (_a = legacy_js_1.PATH_TO_WAITING_LOOP[pathId]) !== null && _a !== void 0 ? _a : 'LOOP_WAITING_PERENNIAL';
          state.stage = 'waiting';
          state.over = false;
          // Keep outcome as the campaign result that led here
          state.week = 1;
          state.weeksTotal = WAITING_WEEKS;
          state.apMax = 1;
          state.ap = 1;
          state.fieldAp = 0;
          state.waitingPathId = pathId;
          state.waitingLoopId = loopId;
          state.waitingWeeksLeft = WAITING_WEEKS;
          state.sessionFlags = state.sessionFlags || {};
          state.sessionFlags.waitingSeason = true;
          state.entityHistory = (_b = state.entityHistory) !== null && _b !== void 0 ? _b : [];
          const tag = `WAIT:${loopId}`;
          if (!state.entityHistory.includes(tag))
              state.entityHistory.push(tag);
          const labels = {
              perennial: 'the trail that never cools',
              advocate: 'the organization that outlived the candidacy',
              staffer: 'the badge and the bag',
              home: 'the fence and Friday lights',
              exmember: 'the title without the vote',
              senate: 'Senate exploratory quiet work',
              statewide: 'statewide exploratory quiet work'
          };
          const label = (_c = labels[pathId]) !== null && _c !== void 0 ? _c : pathId;
          const text = `WAITING SEASON — ${WAITING_WEEKS} compressed weeks as ${label}. ` +
              `One action a week. What you bank rides into the next filing. ` +
              `(Starmap: ${loopId})`;
          state.log.push({ week: 1, kind: 'week', text });
          return { text };
      }
      exports_24("enterWaiting", enterWaiting);
      /**
       * Higher-office exploratory (thin fork after strong Session).
       * Treated as a waiting path with extra carry flag.
       */
      function enterHigherOfficeWaiting(state, fork) {
          state.sessionFlags = state.sessionFlags || {};
          state.sessionFlags.higherOfficeFork = fork === 'senate' ? 1 : 2;
          enterWaiting(state, fork);
          const t = `HIGHER OFFICE — ${fork === 'senate' ? 'Senate' : 'Statewide'} exploratory. ` +
              `Quiet work between cycles. ${WAITING_WEEKS} weeks to test the waters.`;
          state.log.push({ week: 1, kind: 'note', text: t });
          return { text: t };
      }
      exports_24("enterHigherOfficeWaiting", enterHigherOfficeWaiting);
      function isWaitingStage(state) {
          return state.stage === 'waiting';
      }
      exports_24("isWaitingStage", isWaitingStage);
      /** Bank waiting yields into legacy carry, then close the season. */
      function finishWaiting(state, legacy) {
          var _a, _b, _c, _d, _e, _f, _g;
          if (state.stage !== 'waiting') {
              return { kind: 'none', text: '' };
          }
          // Snapshot gains relative to... we bank absolute "extra" held in sessionFlags
          const bankContacts = Number(((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.waitBankContacts) || 0);
          const bankName = Number(((_b = state.sessionFlags) === null || _b === void 0 ? void 0 : _b.waitBankName) || 0);
          const bankMoney = Number(((_c = state.sessionFlags) === null || _c === void 0 ? void 0 : _c.waitBankMoney) || 0);
          const bankVols = Number(((_d = state.sessionFlags) === null || _d === void 0 ? void 0 : _d.waitBankVols) || 0);
          const bankFavors = Number(((_e = state.sessionFlags) === null || _e === void 0 ? void 0 : _e.waitBankFavors) || 0);
          legacy.carry = {
              ...legacy.carry,
              waitingLoopId: state.waitingLoopId,
              waitingContacts: (legacy.carry.waitingContacts || 0) + bankContacts,
              waitingNameID: (legacy.carry.waitingNameID || 0) + bankName,
              waitingMoney: (legacy.carry.waitingMoney || 0) + bankMoney,
              waitingVols: (legacy.carry.waitingVols || 0) + bankVols,
              waitingFavors: (legacy.carry.waitingFavors || 0) + bankFavors
          };
          if (state.waitingPathId === 'senate' || ((_f = state.sessionFlags) === null || _f === void 0 ? void 0 : _f.higherOfficeFork) === 1) {
              legacy.carry.higherOfficeFork = 'senate';
          }
          else if (state.waitingPathId === 'statewide' || ((_g = state.sessionFlags) === null || _g === void 0 ? void 0 : _g.higherOfficeFork) === 2) {
              legacy.carry.higherOfficeFork = 'statewide';
          }
          const text = `WAITING ENDS — banked for next filing: ` +
              `+${bankContacts} contacts, +${bankName} name, +$${bankMoney}, +${bankVols} vols, +${bankFavors} favors. ` +
              `The climb continues.`;
          state.over = true;
          state.log.push({ week: state.week, kind: 'note', text });
          return { kind: 'none', text };
      }
      exports_24("finishWaiting", finishWaiting);
      function onWaitingWeekAdvance(state) {
          // Soft decay of momentum; debt still exists but no campaign rival ground
          state.momentum = Math.max(0, state.momentum - 1);
      }
      exports_24("onWaitingWeekAdvance", onWaitingWeekAdvance);
      /** Add to waiting bank counters (called from WA* plays). */
      function bankWaiting(state, amt) {
          state.sessionFlags = state.sessionFlags || {};
          if (amt.contacts) {
              state.contacts += amt.contacts;
              state.sessionFlags.waitBankContacts =
                  Number(state.sessionFlags.waitBankContacts || 0) + amt.contacts;
          }
          if (amt.nameID) {
              state.nameID += amt.nameID;
              state.sessionFlags.waitBankName =
                  Number(state.sessionFlags.waitBankName || 0) + amt.nameID;
          }
          if (amt.money) {
              state.money += amt.money;
              state.sessionFlags.waitBankMoney =
                  Number(state.sessionFlags.waitBankMoney || 0) + amt.money;
          }
          if (amt.vol) {
              state.volPool += amt.vol;
              state.sessionFlags.waitBankVols =
                  Number(state.sessionFlags.waitBankVols || 0) + amt.vol;
          }
          if (amt.favors) {
              state.favors += amt.favors;
              state.sessionFlags.waitBankFavors =
                  Number(state.sessionFlags.waitBankFavors || 0) + amt.favors;
          }
      }
      exports_24("bankWaiting", bankWaiting);
      return {
          setters: [
              function (legacy_js_1_1) {
                  legacy_js_1 = legacy_js_1_1;
              }
          ],
          execute: function () {/**
               * Waiting season — compressed interim play between cycles.
               * No true game over: loss/session end redirects into a playable orbit.
               */
              /** Compressed "two years" as game weeks. */
              exports_24("WAITING_WEEKS", WAITING_WEEKS = 4);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Campaign calendar (Primary → General)
   * Primary: 8 weeks, filing deadline at end of week 8.
   * General: 6 weeks after winning the primary.
   * Pure transitions; RNG via shared stream.
   */
  System.register("engine/calendar", ["engine/rng", "engine/reputation", "data/obligations", "engine/session", "engine/outside", "engine/waiting"], function (exports_25, context_25) {
      "use strict";
      var rng_js_6, reputation_js_6, obligations_js_4, session_js_1, outside_js_1, waiting_js_1, PRIMARY_WEEKS, GENERAL_WEEKS, FILING_DEADLINE_WEEK, CAMPAIGN_WEEKS_TOTAL;
      var __moduleName = context_25 && context_25.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      /**
       * Phase legality for cards:
       * - Primary, not on ballot → 1 (petition / fee window)
       * - Primary, on ballot → 2 (late primary / relationship / oppo)
       * - General → 3 (GOTV / contrast / general swing)
       */
      function getPhase(state) {
          if (state.stage === 'waiting')
              return 1; // waiting verbs legal on ph 1–3
          if (state.stage === 'general')
              return 3;
          if (state.stage === 'session')
              return 3;
          if (!state.ballot)
              return 1;
          return 2;
      }
      exports_25("getPhase", getPhase);
      function stageLabel(state) {
          if (state.stage === 'waiting')
              return 'Waiting';
          if (state.stage === 'general')
              return 'General';
          if (state.stage === 'session')
              return 'Session';
          return 'Primary';
      }
      exports_25("stageLabel", stageLabel);
      /**
       * Phase 1 ground diminishing returns. Working the same ground repeatedly in
       * one week gets easier (familiarity: a small odds bump) but yields less new
       * rapport each time (you've met the people who were going to come around) —
       * so spreading across grounds is the way to broad rapport, while grinding
       * one ground is a reliable-but-shallow line. Pure: reads playCount, returns
       * modifiers; the caller applies them.
       *
       * @param playCount how many times THIS ground was already worked this week,
       *   BEFORE the current play (0 = first visit this week).
       */
      function getGroundPenalty(_state, _ground, playCount) {
          if (playCount <= 0)
              return { oddsBonus: 0, rapMult: 1 };
          // 2nd+ visit this week: familiarity nudge up on odds, half rapport gain.
          return { oddsBonus: 0.05, rapMult: 0.5 };
      }
      exports_25("getGroundPenalty", getGroundPenalty);
      /**
       * Opposition organizers bank presence weekly (5–40 on a random ground).
       * Has teeth: rivalOddsPenalty on field plays + win-math pressure.
       */
      function advanceRivalGrounds(state) {
          var _a;
          const grounds = state.groundsArr;
          if (!grounds.length)
              return;
          const g = grounds[Math.floor(rng_js_6.random() * grounds.length)];
          const amt = 5 + Math.floor(rng_js_6.random() * 36); // 5–40
          g.rivalRap = ((_a = g.rivalRap) !== null && _a !== void 0 ? _a : 0) + amt;
          state.log.push({
              week: state.week,
              kind: 'note',
              text: `Opposition organizers worked ${g.n} — +${amt} (they hold ${g.rivalRap} there now). Contested turf is harder.`
          });
      }
      exports_25("advanceRivalGrounds", advanceRivalGrounds);
      /** Mean opposition presence across grounds (0 if none). */
      function meanRivalRapport(state) {
          const gs = state.groundsArr;
          if (!gs.length)
              return 0;
          return gs.reduce((s, g) => s + (g.rivalRap || 0), 0) / gs.length;
      }
      exports_25("meanRivalRapport", meanRivalRapport);
      /**
       * Field-play odds tax from opposition on this ground.
       * ~50 rivalRap → −0.09; capped at −0.18 so it hurts without soft-locking.
       * (2026-07-19 hygiene: slightly softer than first teeth cut — labor primary
       * was overtuned when stacked with Outside weather.)
       */
      function rivalOddsPenalty(ground) {
          if (!ground)
              return 0;
          const r = ground.rivalRap || 0;
          return Math.min(0.18, r * 0.0018);
      }
      exports_25("rivalOddsPenalty", rivalOddsPenalty);
      /**
       * Port of archive weekly passive ticks (prototype ~1593–1594): billboard
       * name ID in phase 2+, Finance Chair stipend if AL10 warm.
       * AL10 is an intentional stub (never granted in archive) — effect is ready
       * if a future path warms them.
       */
      function applyWeeklyAssetAllyTicks(state) {
          // archive:1593 — A12 passive name ID phase II–III
          if (state.assets.includes('A12') && state.tier >= 1) {
              state.nameID += state.billboardHalved ? 1 : 2;
          }
          // archive:1594
          if (reputation_js_6.warm(state, 'AL10'))
              state.money += 300;
      }
      /**
       * Lightweight week-boundary events that grant allies the archive only
       * hands out via vignettes (AL06 funeral unlock, AL12 Old Bull, AL14 staffer).
       * Uses the seeded RNG stream; fires at most one ally-event per advance so
       * campaigns aren't flooded. Gated by eventsFired so each is once per run.
       */
      function advanceAllyEvents(state) {
          const fired = state.eventsFired;
          const roll = rng_js_6.random();
          // archive:883 — funeral available this week (unlocks PL29 / respect path → AL06)
          if (!fired['EV_FUNERAL'] && roll < 0.12) {
              fired['EV_FUNERAL'] = true;
              state.funeralWeek = state.week;
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'A beloved retired judge has died. The funeral is Saturday. (Attend the Funeral is available this week.)'
              });
              return;
          }
          // archive:893 / 901 — Old Bull holds court → AL12
          if (!fired['EV_OLD_BULL'] && !reputation_js_6.warm(state, 'AL12') && roll >= 0.12 && roll < 0.22) {
              fired['EV_OLD_BULL'] = true;
              reputation_js_6.addAlly(state, 'AL12', 2);
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'The Old Bull holds court at the diner, and there is one seat left. You take it. He talks for an hour about 1987 and it is all useful.'
              });
              return;
          }
          // archive:885 — rival staffer (simplified: no plant choice UI; 80% real → AL14)
          if (!fired['EV_STAFFER'] && !reputation_js_6.warm(state, 'AL14') && roll >= 0.22 && roll < 0.30) {
              fired['EV_STAFFER'] = true;
              state.shadowPlays++;
              if (rng_js_6.random() < 0.2) {
                  state.exposure += 2;
                  state.hitPieces++;
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: 'THE STING — a "disgruntled staffer" was a plant. "CANDIDATE CAUGHT SOLICITING DIRT."'
                  });
              }
              else {
                  state.oppoFile = true;
                  reputation_js_6.addAlly(state, 'AL14', 2);
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: "A rival's disgruntled staffer talks for two hours. A folder now exists. (Oppo File + ally.)"
                  });
              }
          }
      }
      /** Week-boundary housekeeping: grounds, obligations drag, passive ticks, events. */
      function onWeekAdvance(state) {
          state.groundPlays = {};
          advanceRivalGrounds(state);
          // Phase 2: structured obligations weekly drag (archive OBLS.drag)
          obligations_js_4.applyOblDrag(state);
          applyWeeklyAssetAllyTicks(state);
          advanceAllyEvents(state);
          // Outside event deck — world weather, never hand (CARD-RESIDENCY)
          outside_js_1.tickOutsideDeck(state);
      }
      /** Week within the current stage (1-based). */
      function stageWeek(state) {
          if (state.stage === 'general') {
              return Math.max(1, state.week - PRIMARY_WEEKS);
          }
          // Session and primary both use week as stage-local (session resets to 1).
          return state.week;
      }
      exports_25("stageWeek", stageWeek);
      /**
       * Primary win probability — skilled force (name, contacts, chairs, vols)
       * vs damage (hit pieces, exposure). Brutal but not random-walk.
       */
      function primaryWinProbability(state) {
          var _a, _b;
          const field = typeof ((_a = state.district) === null || _a === void 0 ? void 0 : _a.field) === 'number' ? state.district.field : 2;
          const fieldPressure = 0.035 * field;
          // An entrenched incumbent (war chest, name recognition, twelve years of
          // relationships) is harder to unseat than raw rival count implies.
          const incumbentPressure = ((_b = state.district) === null || _b === void 0 ? void 0 : _b.incumbent) ? 0.12 : 0;
          // Ground-level opposition (rivalRap teeth) — ceding turf costs the primary.
          // Soft enough that labor door-grind can still teach the loop (hygiene 2026-07-19).
          const rivalPressure = meanRivalRapport(state) * 0.0009;
          // Balloted skilled runs should reach general often enough to teach the loop;
          // unbuilt name/chairs still lose most primaries (souls-like, not free).
          // Hygiene 2026-07-19: restore labor-readable primary after rival+Outside stack.
          // Contacts/vol (labor spine) weight up so petition path can still teach the loop.
          const p = 0.4 +
              state.nameID * 0.015 +
              state.contacts * 0.0007 +
              state.endorsePts * 0.045 +
              state.volPool * 0.028 +
              state.momentum * 0.02 -
              state.hitPieces * 0.055 -
              (state.exposure || 0) * 0.04 -
              fieldPressure -
              incumbentPressure -
              rivalPressure;
          return clamp(p, 0.1, 0.9);
      }
      exports_25("primaryWinProbability", primaryWinProbability);
      /**
       * Baseline general-election opponent strength from district partisan lean.
       * `field` (primary rival count) governs the primary only — align governs
       * November. A TRAP district (e.g. wrong-party) can have an empty, easy
       * primary and still be nearly unwinnable in the general.
       */
      function genBaseForDistrict(district) {
          const align = district === null || district === void 0 ? void 0 : district.align;
          // Phase 5 (2026-07-19): wrong-party was too soft after GOTV kit gravity —
          // trap districts must stay souls-like in November (easy primary, hard general).
          const base = align === 'safe' ? 0.28 : align === 'wrong' ? 0.84 : 0.45;
          const trapTax = (district === null || district === void 0 ? void 0 : district.trap) ? 0.1 : 0;
          return base + trapTax;
      }
      /**
       * General win probability vs genOpp / genBase.
       * GOTV is the lever — without it, skilled primary still can lose November.
       * 2026-07-19 kit gravity: heavier GOTV weight, lighter raw contacts
       * (primary contact pad is not a November substitute).
       * Phase 5: wrong/trap districts take an extra November tax so GOTV does
       * not erase partisan reality.
       */
      function generalWinProbability(state) {
          var _a, _b;
          const rapport = state.groundsArr.reduce((s, g) => s + (g.rapport || 0), 0) /
              Math.max(1, state.groundsArr.length);
          const gotv = state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
          const opp = state.genBase || 0.45;
          const wrongTax = ((_a = state.district) === null || _a === void 0 ? void 0 : _a.align) === 'wrong' || ((_b = state.district) === null || _b === void 0 ? void 0 : _b.trap) ? 0.1 : 0;
          // Opposition turf organization depresses November slightly (GOTV still king).
          const rivalPressure = meanRivalRapport(state) * 0.0011;
          const p = 0.16 +
              state.nameID * 0.01 +
              state.contacts * 0.00022 +
              state.volPool * 0.02 +
              rapport * 0.0018 +
              gotv * 0.18 + // GOTV is the general lever (kit gravity)
              state.momentum * 0.018 -
              state.hitPieces * 0.05 -
              opp * 0.28 -
              wrongTax -
              rivalPressure;
          return clamp(p, 0.06, 0.92);
      }
      exports_25("generalWinProbability", generalWinProbability);
      /**
       * Primary ground work pays off in November: bank a sliver of GOTV from
       * rapport when entering the general. High-rapport turf becomes turnout
       * arithmetic — not a free win, a head start on the only lever that matters.
       */
      function seedGeneralGotvFromRapport(state) {
          let seeded = 0;
          let grounds = 0;
          for (const g of state.groundsArr) {
              const r = g.rapport || 0;
              let add = 0;
              if (r >= 50)
                  add = 0.12;
              else if (r >= 30)
                  add = 0.07;
              else if (r >= 15)
                  add = 0.03;
              if (add > 0) {
                  g.gotv = (g.gotv || 0) + add;
                  seeded += add;
                  grounds += 1;
              }
          }
          return { seeded, grounds };
      }
      exports_25("seedGeneralGotvFromRapport", seedGeneralGotvFromRapport);
      function setOutcome(state, outcome, text) {
          state.over = true;
          state.outcome = outcome;
          state.log.push({ week: state.week, kind: 'note', text });
          return { kind: outcome, text };
      }
      /**
       * Resolve end of primary week 8 (filing deadline + primary election).
       * Mutates state. Call when completing PRIMARY_WEEKS while still in primary.
       */
      function resolvePrimaryConclusion(state) {
          if (state.stage !== 'primary') {
              return { kind: 'none', text: '' };
          }
          if (!state.ballot) {
              return setOutcome(state, 'missed_filing', `Filing deadline (week ${FILING_DEADLINE_WEEK}): not on the ballot. The primary goes on without you.`);
          }
          const winP = primaryWinProbability(state);
          const roll = rng_js_6.random();
          if (roll < winP) {
              state.primaryWon = true;
              state.stage = 'general';
              state.week = PRIMARY_WEEKS + 1;
              state.ap = state.apMax;
              state.fieldAp = reputation_js_6.warm(state, 'AL09') ? 1 : 0;
              state.momentum = Math.max(0, state.momentum - 1);
              onWeekAdvance(state);
              state.townHallThisWeek = false;
              state.outcome = 'ongoing';
              // Opponent strength from district partisan lean (align/trap) + residual primary heat
              state.genBase = clamp(genBaseForDistrict(state.district) + state.hitPieces * 0.03, 0.2, 0.9);
              state.genOpp = {
                  n: 'General election opponent',
                  strength: state.genBase
              };
              // Kit gravity: primary rapport becomes a GOTV head start.
              const seed = seedGeneralGotvFromRapport(state);
              const seedNote = seed.grounds > 0
                  ? ` Grounds that know you seed +${seed.seeded.toFixed(2)} GOTV across ${seed.grounds} turf(s).`
                  : ' No rapport banked deep enough to seed GOTV — turnout starts from zero.';
              const text = `PRIMARY WIN (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
                  `You advance to the General — ${GENERAL_WEEKS} weeks. Opponent strength ${state.genBase.toFixed(2)}.` +
                  seedNote;
              state.log.push({ week: state.week, kind: 'note', text });
              if (seed.grounds > 0) {
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: `TURNOUT SEED — primary rapport converts to GOTV head start (+${seed.seeded.toFixed(2)} total). November is arithmetic.`
                  });
              }
              state.log.push({
                  week: state.week,
                  kind: 'week',
                  text: `General week ${stageWeek(state)} begins (phase ${getPhase(state)}). AP refreshed. Field work banks GOTV now.`
              });
              return { kind: 'enter_general', text, winP, roll };
          }
          return setOutcome(state, 'lost_primary', `PRIMARY LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
              `On the ballot, short of the nomination. Run over.`);
      }
      exports_25("resolvePrimaryConclusion", resolvePrimaryConclusion);
      /**
       * Resolve end of general (week CAMPAIGN_WEEKS_TOTAL).
       * Phase 4: a win enters Session immediately (does not terminal the run).
       */
      function resolveGeneralConclusion(state) {
          if (state.stage !== 'general') {
              return { kind: 'none', text: '' };
          }
          const winP = generalWinProbability(state);
          const roll = rng_js_6.random();
          if (roll < winP) {
              return session_js_1.enterSessionFromGeneral(state, winP, roll);
          }
          return setOutcome(state, 'lost_general', `GENERAL LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
              `Primary glory, November heartbreak.`);
      }
      exports_25("resolveGeneralConclusion", resolveGeneralConclusion);
      /**
       * After completing a week of play, advance calendar or resolve elections.
       * Returns transition info for harnesses / UI.
       */
      function advanceCampaignWeek(state) {
          if (state.over) {
              return { kind: 'none', text: '' };
          }
          // Completing final primary week → filing + primary election
          if (state.stage === 'primary' && state.week === PRIMARY_WEEKS) {
              return resolvePrimaryConclusion(state);
          }
          // Completing final general week → general election (win → Session)
          if (state.stage === 'general' && state.week === CAMPAIGN_WEEKS_TOTAL) {
              return resolveGeneralConclusion(state);
          }
          // Completing final session week → sine die
          if (state.stage === 'session' && state.week === session_js_1.SESSION_WEEKS) {
              return session_js_1.resolveSineDie(state);
          }
          // Completing final waiting week → season ends (UI banks legacy)
          if (state.stage === 'waiting' && state.week === waiting_js_1.WAITING_WEEKS) {
              return {
                  kind: 'waiting_complete',
                  text: 'Waiting season complete. What you banked rides into the next filing.'
              };
          }
          state.week += 1;
          state.ap = state.apMax;
          state.fieldAp =
              state.stage === 'session' || state.stage === 'waiting'
                  ? 0
                  : reputation_js_6.warm(state, 'AL09')
                      ? 1
                      : 0;
          state.momentum = Math.max(0, state.momentum - 1);
          state.townHallThisWeek = false;
          if (state.stage === 'session') {
              session_js_1.onSessionWeekAdvance(state);
              // Rival ground growth is campaign-era; skip in session
              state.groundPlays = {};
              obligations_js_4.applyOblDrag(state);
          }
          else if (state.stage === 'waiting') {
              waiting_js_1.onWaitingWeekAdvance(state);
              state.groundPlays = {};
          }
          else {
              onWeekAdvance(state);
          }
          state.log.push({
              week: state.week,
              kind: 'week',
              text: state.stage === 'session'
                  ? `SESSION WEEK ${state.week} — ${session_js_1.SESSION_WEEKS - state.week} to sine die. AP refreshed.`
                  : state.stage === 'waiting'
                      ? `WAITING WEEK ${state.week}/${waiting_js_1.WAITING_WEEKS} — interim orbit. AP refreshed.`
                      : `${stageLabel(state)} week ${stageWeek(state)} (calendar W${state.week}) begins (phase ${getPhase(state)}). AP refreshed.`
          });
          return { kind: 'none', text: '' };
      }
      exports_25("advanceCampaignWeek", advanceCampaignWeek);
      return {
          setters: [
              function (rng_js_6_1) {
                  rng_js_6 = rng_js_6_1;
              },
              function (reputation_js_6_1) {
                  reputation_js_6 = reputation_js_6_1;
              },
              function (obligations_js_4_1) {
                  obligations_js_4 = obligations_js_4_1;
              },
              function (session_js_1_1) {
                  session_js_1 = session_js_1_1;
              },
              function (outside_js_1_1) {
                  outside_js_1 = outside_js_1_1;
              },
              function (waiting_js_1_1) {
                  waiting_js_1 = waiting_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Campaign calendar (Primary → General)
               * Primary: 8 weeks, filing deadline at end of week 8.
               * General: 6 weeks after winning the primary.
               * Pure transitions; RNG via shared stream.
               */
              exports_25("SESSION_WEEKS", session_js_1.SESSION_WEEKS);
              /** Primary campaign length (includes filing window). */
              exports_25("PRIMARY_WEEKS", PRIMARY_WEEKS = 8);
              /** General election length after primary win. */
              exports_25("GENERAL_WEEKS", GENERAL_WEEKS = 6);
              /** Must be on the ballot by the end of this primary week. */
              exports_25("FILING_DEADLINE_WEEK", FILING_DEADLINE_WEEK = PRIMARY_WEEKS);
              /** Continuous calendar: primary 1–8, general 9–14. */
              exports_25("CAMPAIGN_WEEKS_TOTAL", CAMPAIGN_WEEKS_TOTAL = PRIMARY_WEEKS + GENERAL_WEEKS);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Legislative Session (Phase 4)
   *
   * Ported from archive/prototype-single-file.html startSession / SESSION_PLAYS /
   * sessionEnd (lines ~917–1075, weekly ticks ~1576–1585).
   *
   * After a general win the player is sworn in: committee assignment (Speaker's
   * choice), unfiled signature bill on `state.issue`, 14 compressed weeks to
   * sine die. Bill advances through a pipeline (file → referral → chair →
   * testimony → calendar → floor → senate → law). PAC lender claim (Phase 3
   * debt) gates referral. Resolve() odds bands are untouched — only card odds
   * formulas use capital/favor/heat.
   */
  System.register("engine/session", ["engine/rng", "engine/reputation", "engine/debt", "engine/outside"], function (exports_26, context_26) {
      "use strict";
      var rng_js_7, reputation_js_7, debt_js_3, outside_js_2, SESSION_WEEKS, SESSION_FILING_DEADLINE, BILL_STAGE_LABELS, COMMITTEES;
      var __moduleName = context_26 && context_26.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      function statusFromPipeline(stage) {
          if (stage < 0)
              return 'dead';
          if (stage === 0)
              return 'draft';
          if (stage === 1)
              return 'filed';
          if (stage === 2 || stage === 3)
              return 'in_committee';
          if (stage === 4)
              return 'reported';
          if (stage >= 5 && stage <= 7)
              return 'on_calendar';
          if (stage >= 8)
              return 'passed';
          return 'dead';
      }
      exports_26("statusFromPipeline", statusFromPipeline);
      function syncBillStatus(bill) {
          bill.status = statusFromPipeline(bill.pipelineStage);
      }
      exports_26("syncBillStatus", syncBillStatus);
      function billStageLabel(bill) {
          var _a;
          if (!bill)
              return 'No bill';
          if (bill.pipelineStage < 0)
              return 'Dead / never filed';
          return (_a = BILL_STAGE_LABELS[Math.min(8, Math.max(0, bill.pipelineStage))]) !== null && _a !== void 0 ? _a : 'Unknown';
      }
      exports_26("billStageLabel", billStageLabel);
      /** Archive billOdds(base) — capital, favor, heat. Never touches resolve bands. */
      function billOdds(state, base) {
          var _a, _b, _c;
          const heat = (_b = (_a = state.bill) === null || _a === void 0 ? void 0 : _a.heat) !== null && _b !== void 0 ? _b : 0;
          const freeze = Number(((_c = state.sessionFlags) === null || _c === void 0 ? void 0 : _c.speakerFreeze) || 0);
          return clamp(base +
              state.capital * 0.028 +
              (state.favor - 50) * 0.005 -
              heat * 0.05 -
              freeze * 0.04, 0.05, 0.9);
      }
      exports_26("billOdds", billOdds);
      function createDraftBill(state) {
          var _a, _b;
          const issue = (_a = state.issue) !== null && _a !== void 0 ? _a : 'the issue';
          return {
              id: 'HB_SIG',
              title: `Signature bill — ${issue}`,
              issueId: state.issue,
              sponsor: (_b = state.persona) !== null && _b !== void 0 ? _b : 'The Member',
              committeeId: null,
              status: 'draft',
              tally: { aye: 0, nay: 0, present: 0, need: 76 },
              pipelineStage: 0,
              heat: 0
          };
      }
      exports_26("createDraftBill", createDraftBill);
      /**
       * Advance bill pipeline stage (archive stage++). Clamps 0–8; negative = dead.
       */
      function setBillStage(state, stage) {
          if (!state.bill)
              return;
          const prev = state.bill.pipelineStage;
          state.bill.pipelineStage = stage;
          if (stage >= 2 && state.committee) {
              state.bill.committeeId = state.committee.id;
          }
          if (stage !== prev && stage >= 0) {
              state.bill.weeksAtStage = 0;
          }
          syncBillStatus(state.bill);
      }
      exports_26("setBillStage", setBillStage);
      /**
       * Port of archive startSession() (lines 927–936), after general win.
       * Retires campaign debt (Phase 3 win branch) then opens the chamber.
       */
      function enterSession(state) {
          var _a, _b;
          const retirement = debt_js_3.retireDebtOnWin(state);
          state.stage = 'session';
          state.over = false;
          state.outcome = 'ongoing';
          state.week = 1;
          state.weeksTotal = SESSION_WEEKS;
          state.tier = 0;
          state.ap = state.apMax;
          state.fieldAp = 0;
          state.momentum = 0;
          state.groundPlays = {};
          // Preserve PAC claim across the reset of incidental flags
          const pacClaim = !!(((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.pac_lender_claim) || state.obls.includes('OB1'));
          state.sessionFlags = {};
          if (pacClaim) {
              state.sessionFlags.pac_lender_claim = true;
              if (!state.obls.includes('OB1'))
                  state.obls.push('OB1');
          }
          // archive:928–929
          state.capital = 3 + (reputation_js_7.hasRep(state, 'R06') ? 2 : 0);
          state.favor = 50 + (reputation_js_7.hasRep(state, 'R08') ? 10 : 0) + (reputation_js_7.hasRep(state, 'R09') ? -10 : 0);
          state.districtStanding = 60 + Math.min(10, Math.round((state.nameID || 0) * 0.2));
          const pick = COMMITTEES[Math.floor(rng_js_7.random() * COMMITTEES.length)];
          const committee = {
              id: pick.id,
              n: pick.n,
              member: true,
              chair: false,
              standing: 40
          };
          state.committee = committee;
          pick.apply(state);
          state.bill = createDraftBill(state);
          state.bill.committeeId = null;
          if (reputation_js_7.hasRep(state, 'R12')) {
              state.sessionFlags.writ = true;
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: "The Old Bull's Blessing: you carry one Writ — a free procedural power, once, when it matters."
              });
          }
          if (pacClaim) {
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'The PAC String rides with you. Somewhere in this building, a vote will be asked for. (Referral is not free.)'
              });
          }
          if (retirement.sessionClaim || retirement.selfRetired > 0) {
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: `DEBT ON ENTRY — ${retirement.text}`
              });
          }
          const text = `THE SESSION — sworn in. Committee: ${committee.n} — ${pick.d} ` +
              `(The Speaker's choice, not yours.) Signature bill on ${(_b = state.issue) !== null && _b !== void 0 ? _b : 'your issue'} is unfiled. ` +
              `Filing deadline: week ${SESSION_FILING_DEADLINE}. Sine die: week ${SESSION_WEEKS}.`;
          state.log.push({ week: state.week, kind: 'week', text });
          return { text };
      }
      exports_26("enterSession", enterSession);
      /**
       * Called from resolveGeneralConclusion on a win — enters session instead of
       * ending the run at the general.
       */
      function enterSessionFromGeneral(state, winP, roll) {
          const genText = `GENERAL WIN (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
              `The district is yours.`;
          state.log.push({ week: state.week, kind: 'note', text: genText });
          const { text } = enterSession(state);
          return {
              kind: 'enter_session',
              text: genText + ' ' + text,
              winP,
              roll
          };
      }
      exports_26("enterSessionFromGeneral", enterSessionFromGeneral);
      /**
       * PAC claim bite on referral (Phase 3 hook). Returns flavor + whether claim
       * was discharged. Call from SS02 Seek Referral before/after roll.
       *
       * - If claim held: auto-pay district standing for discharge (string pulls),
       *   or player already played SS_PAC_CLAIM. If still held at referral success,
       *   heat +1 and claim remains until paid.
       */
      function applyPacClaimOnReferral(state) {
          var _a, _b;
          if (!((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.pac_lender_claim) && !state.obls.includes('OB1')) {
              return '';
          }
          if ((_b = state.sessionFlags) === null || _b === void 0 ? void 0 : _b.pac_claim_paid)
              return '';
          // Default: the association extracts their aye as the price of motion
          // (archive OB1 event: vote their way, district −6, discharge OB1).
          state.districtStanding = clamp(state.districtStanding - 6, 0, 100);
          state.obls = state.obls.filter(x => x !== 'OB1');
          state.sessionFlags = state.sessionFlags || {};
          state.sessionFlags.pac_lender_claim = false;
          state.sessionFlags.pac_claim_paid = true;
          return (' THE STRING PULLS — the association behind your PAC money extracts an aye on a quiet vote. ' +
              'District standing −6. (OB1 discharged; referral may proceed.)');
      }
      exports_26("applyPacClaimOnReferral", applyPacClaimOnReferral);
      /** Explicit refuse path (SS_PAC_REFUSE) — keep claim, take heat. */
      function refusePacClaim(state) {
          state.sessionFlags = state.sessionFlags || {};
          state.exposure += 2;
          state.hitPieces += 1;
          if (state.bill)
              state.bill.heat += 2;
          state.sessionFlags.pac_claim_refused = true;
          // Claim still held — referral odds suffer via heat
          return ('Refused. Their newsletter names you an ingrate; their next check names your challenger. ' +
              '(Exposure +2, hit piece, bill heat +2. OB1 still rides.)');
      }
      exports_26("refusePacClaim", refusePacClaim);
      /**
       * Port of archive sessionEnd (1057–1074) — governor desk, reelection roll.
       * Session teeth: challenger heat and leadership freeze bite the reelect roll.
       */
      function resolveSineDie(state) {
          var _a, _b, _c, _d, _e;
          if (state.stage !== 'session') {
              return { kind: 'none', text: '' };
          }
          // Governor desk if through senate (stage 7)
          if (state.bill && state.bill.pipelineStage === 7) {
              const freeze = Number(((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.speakerFreeze) || 0);
              const vetoP = 0.22 + (state.favor < 40 ? 0.12 : 0) + (freeze > 0 ? 0.08 : 0) + (state.bill.heat || 0) * 0.02;
              if (rng_js_7.random() < clamp(vetoP, 0.1, 0.55)) {
                  state.bill.pipelineStage = -1;
                  syncBillStatus(state.bill);
                  state.bill.status = 'failed';
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: 'THE GOVERNOR\'S DESK — VETOED. A statement citing "unintended consequences."'
                  });
              }
              else {
                  setBillStage(state, 8);
                  state.log.push({
                      week: state.week,
                      kind: 'note',
                      text: "THE GOVERNOR'S DESK — SIGNED. A pen you will frame. Law, with your name inside it."
                  });
              }
          }
          const stage = (_c = (_b = state.bill) === null || _b === void 0 ? void 0 : _b.pipelineStage) !== null && _c !== void 0 ? _c : -1;
          const passed = stage >= 8;
          const nearMiss = stage >= 6 && stage < 8;
          let text = 'SINE DIE. The gavel falls. ';
          if (passed) {
              text +=
                  'Your bill is law. A freshman author with a signed bill — the building will remember your name next session.';
          }
          else if (nearMiss) {
              text +=
                  'Your bill died between the chambers — agonizingly close. Half the building considers that a rookie triumph anyway.';
          }
          else if (stage >= 4) {
              text +=
                  'Your bill died in the calendar crush with hundreds of better-connected corpses. No shame in the pile, no law either.';
          }
          else if (stage < 0) {
              text += 'Your signature bill never truly left the ground — or died on a veto.';
          }
          else {
              text += 'Your bill never truly left the ground. The first session teaches; it rarely gives.';
          }
          const challenger = Number(((_d = state.sessionFlags) === null || _d === void 0 ? void 0 : _d.challengerHeat) || 0);
          const freeze = Number(((_e = state.sessionFlags) === null || _e === void 0 ? void 0 : _e.speakerFreeze) || 0);
          const standing = state.districtStanding +
              (passed ? 15 : nearMiss ? 8 : 0) +
              Math.min(10, state.capital) -
              challenger * 3 -
              freeze * 1.5;
          // Floor so a non-collapse session can still hold the seat; chaos remains.
          const reelect = clamp(22 + standing * 0.55 + (rng_js_7.random() - 0.5) * 22, 5, 95);
          text += ` Interim verdict — district ${Math.round(state.districtStanding)}, capital ${state.capital}, favor ${Math.round(state.favor)}`;
          if (challenger > 0)
              text += `, challenger heat ${challenger}`;
          if (freeze > 0)
              text += `, fifth-floor freeze ${freeze}`;
          text += `. Reelection outlook ${reelect.toFixed(0)}%… `;
          let outcome;
          if (reelect > 50) {
              text += passed
                  ? 'and holds. The seat is yours again — with a law under your name.'
                  : 'and holds. The seat is yours again.';
              outcome = passed ? 'session_law' : 'session_survived';
          }
          else {
              text +=
                  'and breaks. A primary challenger — younger, angrier, funded — takes the seat you bled for.';
              outcome = 'session_primaried';
          }
          state.over = true;
          state.outcome = outcome;
          state.log.push({ week: state.week, kind: 'note', text });
          return { kind: outcome, text, winP: reelect / 100 };
      }
      exports_26("resolveSineDie", resolveSineDie);
      /**
       * Stall heat: bill sitting at the same stage burns political oxygen.
       */
      function applyBillStallHeat(state) {
          var _a;
          if (!state.bill || state.bill.pipelineStage < 1 || state.bill.pipelineStage >= 8) {
              return '';
          }
          const weeks = ((_a = state.bill.weeksAtStage) !== null && _a !== void 0 ? _a : 0) + 1;
          state.bill.weeksAtStage = weeks;
          if (weeks < 2)
              return '';
          state.bill.heat += 1;
          return `STALL HEAT — bill sits at stage ${state.bill.pipelineStage} for ${weeks} weeks. Heat +1 (now ${state.bill.heat}). Move it or bleed.`;
      }
      exports_26("applyBillStallHeat", applyBillStallHeat);
      /**
       * Call when pipeline stage advances — resets stall clock.
       */
      function noteBillStageAdvance(state) {
          if (state.bill)
              state.bill.weeksAtStage = 0;
      }
      exports_26("noteBillStageAdvance", noteBillStageAdvance);
      /**
       * Weekly chamber pressure (Session teeth). One bite, not a second game.
       * Returns log lines applied.
       */
      function tickSessionPressure(state) {
          var _a, _b;
          const lines = [];
          state.sessionFlags = state.sessionFlags || {};
          // --- District: casework or bleed (teeth) ---
          const didCasework = !!state.sessionFlags.caseworkThisWeek;
          const drain = didCasework ? 1 : 2;
          state.districtStanding = clamp(state.districtStanding - drain, 0, 100);
          if (!didCasework) {
              lines.push('HOME FIRES — no casework this week. District standing −2. The seat is kept at home, not only in Austin.');
          }
          state.sessionFlags.caseworkThisWeek = false;
          // --- Stall heat ---
          const stall = applyBillStallHeat(state);
          if (stall)
              lines.push(stall);
          // --- Challenger heat when standing soft ---
          if (state.districtStanding < 52) {
              const ch = Number(state.sessionFlags.challengerHeat || 0) + 1;
              state.sessionFlags.challengerHeat = ch;
              lines.push(`CHALLENGER WATCH — standing ${Math.round(state.districtStanding)}. A younger name is fundraising (heat ${ch}). Casework is not optional.`);
          }
          // --- Leadership freeze when favor low and bill is real ---
          const stage = (_b = (_a = state.bill) === null || _a === void 0 ? void 0 : _a.pipelineStage) !== null && _b !== void 0 ? _b : 0;
          if (state.favor < 38 && stage >= 4) {
              const fz = Number(state.sessionFlags.speakerFreeze || 0) + 1;
              state.sessionFlags.speakerFreeze = fz;
              if (state.bill)
                  state.bill.heat += 1;
              lines.push(`FIFTH FLOOR FREEZE — favor ${Math.round(state.favor)}. Calendar motions tighten; bill heat +1. Run an errand or trade before the crush.`);
          }
          else if (state.favor >= 45 && Number(state.sessionFlags.speakerFreeze || 0) > 0) {
              // Thaw one point if you recovered favor
              state.sessionFlags.speakerFreeze = Math.max(0, Number(state.sessionFlags.speakerFreeze) - 1);
          }
          // --- Random chamber event (~45% of weeks after W1) ---
          if (state.week > 1 && rng_js_7.random() < 0.45) {
              const roll = rng_js_7.random();
              if (roll < 0.2) {
                  state.favor = clamp(state.favor - 3, 0, 100);
                  if (state.bill && state.bill.pipelineStage >= 1)
                      state.bill.heat += 1;
                  lines.push('LOBBY STACK — association dinners and "helpful" amendments. Favor −3' +
                      (state.bill && state.bill.pipelineStage >= 1 ? '; bill heat +1.' : '.'));
              }
              else if (roll < 0.38) {
                  state.districtStanding = clamp(state.districtStanding - 2, 0, 100);
                  lines.push('DISTRICT EMERGENCY — a plant layoff / flood / viral clip back home. Standing −2. Casework is the only apology that works.');
              }
              else if (roll < 0.55) {
                  state.sessionFlags.errandDemand = true;
                  lines.push("SPEAKER'S MARK — leadership has a small unpleasant errand. Take The Speaker's Errand this week for favor, or the freeze deepens later.");
              }
              else if (roll < 0.68 && state.sessionFlags.pac_lender_claim && !state.sessionFlags.pac_claim_paid) {
                  state.districtStanding = clamp(state.districtStanding - 2, 0, 100);
                  state.exposure = (state.exposure || 0) + 1;
                  lines.push('PAC REMINDER — the association still holds your string. Standing −2, exposure +1 until referral pays or you refuse publicly.');
              }
              else if (roll < 0.82) {
                  state.hitPieces += 1;
                  state.favor = clamp(state.favor - 2, 0, 100);
                  lines.push('CAPITOL PRESS — a hit piece on freshman ambition. Hit piece +1, favor −2. Quiet competence is a strategy; so is casework.');
              }
              else {
                  state.capital += 1;
                  lines.push('GALLERY NOD — an old bull tips two fingers after a rules point. Capital +1. The building is not only teeth.');
              }
          }
          return lines;
      }
      exports_26("tickSessionPressure", tickSessionPressure);
      /**
       * Session week advance housekeeping + Session teeth pressure + Outside deck.
       */
      function onSessionWeekAdvance(state) {
          state.sessionFlags = state.sessionFlags || {};
          state.sessionFlags.pipelineUsed = false;
          // Pressure ticks (district drain, stall, challenger, events)
          const lines = tickSessionPressure(state);
          for (const text of lines) {
              state.log.push({ week: state.week, kind: 'note', text });
          }
          // Outside weather during session (special session, challenger ads, …)
          outside_js_2.tickOutsideDeck(state);
          // Filing deadline: unfiled signature bill dies (archive 1581)
          if (state.week === SESSION_FILING_DEADLINE &&
              state.bill &&
              state.bill.pipelineStage === 0) {
              state.bill.pipelineStage = -1;
              state.bill.status = 'dead';
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'FILING DEADLINE PASSES — your signature bill was never filed. The session will now be about survival and next time.'
              });
          }
      }
      exports_26("onSessionWeekAdvance", onSessionWeekAdvance);
      /** Leadership freeze blocks calendar/floor pipeline until favor recovers or errand. */
      function sessionPipelineBlocked(state, cardId) {
          var _a;
          if (state.stage !== 'session')
              return false;
          const freeze = Number(((_a = state.sessionFlags) === null || _a === void 0 ? void 0 : _a.speakerFreeze) || 0);
          if (freeze < 1)
              return false;
          // Calendar + floor need fifth-floor oxygen
          if (cardId === 'SS05' || cardId === 'SS06') {
              return state.favor < 40;
          }
          return false;
      }
      exports_26("sessionPipelineBlocked", sessionPipelineBlocked);
      function isSessionPipelinePlay(cardId) {
          return (cardId === 'SS02' ||
              cardId === 'SS03' ||
              cardId === 'SS04' ||
              cardId === 'SS05' ||
              cardId === 'SS06' ||
              cardId === 'SS07');
      }
      exports_26("isSessionPipelinePlay", isSessionPipelinePlay);
      return {
          setters: [
              function (rng_js_7_1) {
                  rng_js_7 = rng_js_7_1;
              },
              function (reputation_js_7_1) {
                  reputation_js_7 = reputation_js_7_1;
              },
              function (debt_js_3_1) {
                  debt_js_3 = debt_js_3_1;
              },
              function (outside_js_2_1) {
                  outside_js_2 = outside_js_2_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Legislative Session (Phase 4)
               *
               * Ported from archive/prototype-single-file.html startSession / SESSION_PLAYS /
               * sessionEnd (lines ~917–1075, weekly ticks ~1576–1585).
               *
               * After a general win the player is sworn in: committee assignment (Speaker's
               * choice), unfiled signature bill on `state.issue`, 14 compressed weeks to
               * sine die. Bill advances through a pipeline (file → referral → chair →
               * testimony → calendar → floor → senate → law). PAC lender claim (Phase 3
               * debt) gates referral. Resolve() odds bands are untouched — only card odds
               * formulas use capital/favor/heat.
               */
              /** Compressed session length (archive flavor: 140 days → ~14 game weeks). */
              exports_26("SESSION_WEEKS", SESSION_WEEKS = 14);
              /** Signature bill must be filed by end of this session week (archive: 6). */
              exports_26("SESSION_FILING_DEADLINE", SESSION_FILING_DEADLINE = 6);
              /** Archive BILLSTAGES labels (prototype line 926). */
              exports_26("BILL_STAGE_LABELS", BILL_STAGE_LABELS = [
                  'Unfiled',
                  'Filed',
                  'Referred',
                  'Heard in Committee',
                  'Voted Out',
                  'On the Calendar',
                  'Passed the House',
                  'Through the Senate',
                  'SIGNED INTO LAW'
              ]);
              COMMITTEES = [
                  // archive:919–924
                  {
                      id: 'CA',
                      n: 'County Affairs',
                      d: 'Unglamorous, close to home. Casework lands harder.',
                      apply: s => {
                          s.sessionFlags = s.sessionFlags || {};
                          s.sessionFlags.caseworkBonus = true;
                      }
                  },
                  {
                      id: 'AG',
                      n: 'Agriculture & Livestock',
                      d: 'The FM roads approve. District starts warmer; +1 capital.',
                      apply: s => {
                          s.districtStanding += 4;
                          s.capital += 1;
                      }
                  },
                  {
                      id: 'CR',
                      n: 'Corrections',
                      d: 'Grim, dutiful, respected. +2 capital from work nobody wants.',
                      apply: s => {
                          s.capital += 2;
                      }
                  },
                  {
                      id: 'UA',
                      n: 'Urban Affairs',
                      d: 'Wrong rooms for your district, right rooms for the cameras. +3 name ID.',
                      apply: s => {
                          s.nameID += 3;
                      }
                  },
                  {
                      id: 'EL',
                      n: 'Elections',
                      d: 'Procedure-dense and radioactive. +4 Parliamentarian, +3 favor.',
                      apply: s => {
                          s.faces.P += 4;
                          s.favor += 3;
                      }
                  }
              ];
          }
      };
  });
  /**
   * Session pipeline + survival plays — port of archive SESSION_PLAYS
   * (prototype-single-file.html ~940–1003 core path + casework/errand/whip).
   *
   * All show-gated on stage==='session'. Pipeline plays (SS02–SS07) are one
   * per week (sessionFlags.pipelineUsed), matching archive pace.
   */
  System.register("data/session-plays", ["engine/session"], function (exports_27, context_27) {
      "use strict";
      var session_js_2, SS01_FileBill, SS02_SeekReferral, SS_PAC_Refuse, SS03_CourtChair, SS04_Testimony, SS05_CalendarSlot, SS06_FloorFight, SS07_WorkSenate, SS08_Casework, SS09_SpeakerErrand, SS10_WhipTrade, SS12_StudyRules, SS13_PlayWrit, SESSION_ENTITY_SCOPE, SS27_RibbonCircuit, SS28_CharityGala, SS29_FaceThreat, SESSION_PLAYS;
      var __moduleName = context_27 && context_27.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      return {
          setters: [
              function (session_js_2_1) {
                  session_js_2 = session_js_2_1;
              }
          ],
          execute: function () {/**
               * Session pipeline + survival plays — port of archive SESSION_PLAYS
               * (prototype-single-file.html ~940–1003 core path + casework/errand/whip).
               *
               * All show-gated on stage==='session'. Pipeline plays (SS02–SS07) are one
               * per week (sessionFlags.pipelineUsed), matching archive pace.
               */
              /** archive SS01 */
              exports_27("SS01_FileBill", SS01_FileBill = {
                  id: 'SS01',
                  n: 'File the Bill',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'H.B. ____',
                  attrs: ['INK'],
                  d: 'Your name, your issue, a number. It exists now, which is more than most ideas get.',
                  show: s => s.stage === 'session' && !!s.bill && s.bill.pipelineStage === 0,
                  odds: () => 0.95,
                  run: s => {
                      var _a;
                      session_js_2.setBillStage(s, 1);
                      if (s.bill)
                          s.bill.filedWeek = s.week;
                      return `H.B. filed on ${(_a = s.issue) !== null && _a !== void 0 ? _a : 'your issue'}. The clerk stamps it without looking up. Referral is the Speaker's to give.`;
                  }
              });
              /** archive SS02 — PAC claim bites here (Phase 3 hook) */
              exports_27("SS02_SeekReferral", SS02_SeekReferral = {
                  id: 'SS02',
                  n: 'Seek Referral',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: "the Speaker's desk",
                  attrs: ['DIP'],
                  d: "Bills go where the Speaker sends them. (Opens wk 2.) If the PAC holds a claim, they collect before the desk moves.",
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 1 &&
                          s.week >= 2 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed);
                  },
                  odds: s => session_js_2.billOdds(s, 0.45),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      let pac = '';
                      if (s.sessionFlags.pac_lender_claim || s.obls.includes('OB1')) {
                          if (!s.sessionFlags.pac_claim_refused) {
                              pac = session_js_2.applyPacClaimOnReferral(s);
                          }
                      }
                      if (o.tier <= 1) {
                          session_js_2.setBillStage(s, 2);
                          if (s.committee && s.bill)
                              s.bill.committeeId = s.committee.id;
                          return ((o.tier === 0
                              ? 'Referred to a friendly committee. Someone up there is smiling on you.'
                              : 'Referred. Not the graveyard. That is a start.') + pac);
                      }
                      if (o.tier === 2) {
                          return 'Sitting on the desk. The Speaker\'s office says "soon." Soon is a place bills die.' + pac;
                      }
                      if (s.bill)
                          s.bill.heat += 1;
                      return 'Referred to a hostile committee. Someone up there is not smiling.' + pac;
                  }
              });
              /** Explicit PAC refuse — optional before referral if claim held */
              exports_27("SS_PAC_Refuse", SS_PAC_Refuse = {
                  id: 'SS_PAC',
                  n: 'Refuse the PAC Call',
                  cost: { a: 0 },
                  risk: 'VOL',
                  ph: [1, 2, 3],
                  tag: 'the string pulls',
                  kind: 'bargain',
                  attrs: ['CON'],
                  d: 'They want an aye on a quiet association bill. Refuse and keep your district — pay in heat and ink.',
                  show: s => {
                      var _a, _b, _c;
                      return s.stage === 'session' &&
                          !!(((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pac_lender_claim) || s.obls.includes('OB1')) &&
                          !((_b = s.sessionFlags) === null || _b === void 0 ? void 0 : _b.pac_claim_paid) &&
                          !((_c = s.sessionFlags) === null || _c === void 0 ? void 0 : _c.pac_claim_refused);
                  },
                  odds: () => 0.99,
                  run: s => session_js_2.refusePacClaim(s)
              });
              /** archive SS03 */
              exports_27("SS03_CourtChair", SS03_CourtChair = {
                  id: 'SS03',
                  n: 'Court the Chair',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'the gatekeeper',
                  attrs: ['DIP'],
                  d: 'The chair decides what gets heard. (Hearings open wk 4.) Kitchen-table rules, marble floors.',
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 2 &&
                          s.week >= 4 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed);
                  },
                  odds: s => session_js_2.billOdds(s, 0.45) + (s.faces.O > 10 ? 0.08 : 0),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      if (o.tier <= 1) {
                          session_js_2.setBillStage(s, 3);
                          if (s.committee)
                              s.committee.standing = Math.min(100, s.committee.standing + 8);
                          if (o.tier === 0)
                              s.capital += 1;
                          return 'A hearing date. The chair pencils you in — pencils being the operative word.';
                      }
                      if (o.tier === 2)
                          return '"We\'ll see what the calendar allows." The calendar allows what the chair allows.';
                      s.faces.O -= 2;
                      return 'You push the chair. The chair does not care for pushing.';
                  }
              });
              /** archive SS04 */
              exports_27("SS04_Testimony", SS04_Testimony = {
                  id: 'SS04',
                  n: 'Committee Testimony',
                  cost: { a: 1 },
                  risk: 'VOL',
                  ph: [1, 2, 3],
                  tag: 'on the record',
                  attrs: ['CON', 'CHA'],
                  d: 'Witnesses, a timer, members reading their phones. (Votes-out open wk 6.)',
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 3 &&
                          s.week >= 6 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed);
                  },
                  odds: s => session_js_2.billOdds(s, 0.45) + (s.messageSharp ? 0.08 : 0),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      if (o.tier === 0) {
                          session_js_2.setBillStage(s, 4);
                          s.capital += 1;
                          s.nameID += 3;
                          if (s.bill)
                              s.bill.tally = { aye: 9, nay: 0, present: 0, need: 5 };
                          return 'Your witness makes a member look up from his phone. Voted out with a rare unanimous nod.';
                      }
                      if (o.tier === 1) {
                          session_js_2.setBillStage(s, 4);
                          if (s.bill)
                              s.bill.tally = { aye: 5, nay: 4, present: 0, need: 5 };
                          return 'Voted out on party lines. Forward is forward.';
                      }
                      if (o.tier === 2)
                          return 'Left pending. "Pending" is committee for "quietly bleeding."';
                      if (s.bill)
                          s.bill.heat += 2;
                      return 'A hostile witness lands. The bill is pending and hemorrhaging.';
                  }
              });
              /** archive SS05 */
              exports_27("SS05_CalendarSlot", SS05_CalendarSlot = {
                  id: 'SS05',
                  n: 'Beg a Calendar Slot',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'the narrowest door',
                  attrs: ['CRA', 'DIP'],
                  d: 'Calendars decides what the House even sees. (Opens wk 9.) Favor is the only currency here.',
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 4 &&
                          s.week >= 9 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed) &&
                          !session_js_2.sessionPipelineBlocked(s, 'SS05');
                  },
                  odds: s => session_js_2.billOdds(s, 0.3) + (s.favor > 65 ? 0.15 : 0),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      if (o.tier <= 1) {
                          session_js_2.setBillStage(s, 5);
                          return 'A slot. Late in the day, late in the session — but a slot.';
                      }
                      if (o.tier === 2) {
                          if (s.bill)
                              s.bill.heat += 1;
                          return 'Below the line again. The clock eats another week, and the line gets longer.';
                      }
                      s.favor -= 5;
                      return 'You lean on Calendars and Calendars leans back. Favor slips.';
                  }
              });
              /** archive SS06 */
              exports_27("SS06_FloorFight", SS06_FloorFight = {
                  id: 'SS06',
                  n: 'Floor Fight',
                  cost: { a: 1 },
                  risk: 'VOL',
                  ph: [1, 2, 3],
                  tag: 'the whole House watching',
                  attrs: ['CRA', 'CLO'],
                  d: 'Amendments fly, points of order lurk, the back mic is loaded. (Floor opens wk 11.)',
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 5 &&
                          s.week >= 11 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed) &&
                          !session_js_2.sessionPipelineBlocked(s, 'SS06');
                  },
                  odds: s => session_js_2.billOdds(s, 0.5) + s.capital * 0.02,
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      if (o.tier === 0) {
                          session_js_2.setBillStage(s, 6);
                          s.capital += 2;
                          s.nameID += 5;
                          if (s.bill)
                              s.bill.tally = { aye: 92, nay: 48, present: 0, need: 76 };
                          return 'Passed to third reading clean. The Old Bulls nod from the back row. That nod is currency.';
                      }
                      if (o.tier === 1) {
                          session_js_2.setBillStage(s, 6);
                          if (s.bill) {
                              s.bill.heat += 1;
                              s.bill.tally = { aye: 78, nay: 62, present: 0, need: 76 };
                          }
                          return 'Passed — wearing two hostile amendments like buckshot. Alive, though.';
                      }
                      if (o.tier === 2) {
                          if (s.bill)
                              s.bill.heat += 1;
                          return 'Postponed on a motion. The clock grins.';
                      }
                      if (s.bill)
                          s.bill.heat += 2;
                      s.capital = Math.max(0, s.capital - 1);
                      return 'POINT OF ORDER — sustained. Back to committee on a technicality. The author of the point does not look at you.';
                  }
              });
              /** archive SS07 */
              exports_27("SS07_WorkSenate", SS07_WorkSenate = {
                  id: 'SS07',
                  n: 'Work the Senate',
                  cost: { a: 1 },
                  risk: 'VOL',
                  ph: [1, 2, 3],
                  tag: 'the other chamber',
                  attrs: ['INK', 'DIP'],
                  d: 'Thirty-one senators, the Lt. Governor, and the Tag in wait. (Opens wk 13.)',
                  show: s => {
                      var _a;
                      return s.stage === 'session' &&
                          !!s.bill &&
                          s.bill.pipelineStage === 6 &&
                          s.week >= 13 &&
                          !((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.pipelineUsed);
                  },
                  odds: s => session_js_2.billOdds(s, 0.4),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.pipelineUsed = true;
                      if (o.tier <= 1) {
                          session_js_2.setBillStage(s, 7);
                          return 'A senator adopts it. Through the upper chamber, scarred but breathing.';
                      }
                      if (o.tier === 2) {
                          if (s.bill)
                              s.bill.heat += 1;
                          return 'TAGGED. Forty-eight hours lost, and the session has no forty-eight hours to spare.';
                      }
                      if (s.bill)
                          s.bill.heat += 2;
                      return 'It dies in Senate committee at 11:58 on a procedural motion. Revive it — if the clock allows.';
                  }
              });
              /** archive SS08 */
              exports_27("SS08_Casework", SS08_Casework = {
                  id: 'SS08',
                  n: 'District Casework',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'the home fires',
                  attrs: ['CHA'],
                  d: "A veteran's benefits, a stop-sign petition, a widow's property line. The seat is kept here, not in Austin.",
                  show: s => s.stage === 'session',
                  odds: () => 0.85,
                  run: (s, o) => {
                      var _a;
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.caseworkThisWeek = true;
                      const bonus = ((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.caseworkBonus) ? 1 : 0;
                      // Session teeth: casework is the only full answer to weekly home-fire drain
                      const g = (s.districtStanding > 75 ? (o.tier === 0 ? 4 : 3) : o.tier === 0 ? 7 : 5) + bonus;
                      s.districtStanding = clamp(s.districtStanding + g, 0, 100);
                      // Soften challenger if you show up at home
                      const ch = Number(s.sessionFlags.challengerHeat || 0);
                      if (ch > 0 && o.tier <= 1) {
                          s.sessionFlags.challengerHeat = Math.max(0, ch - 1);
                      }
                      return ('Calls returned, problems chased. The district remembers who answers.' +
                          (s.districtStanding > 75 ? ' (High standing: gains diminish.)' : '') +
                          (ch > 0 && o.tier <= 1 ? ' Challenger heat eases one notch.' : ''));
                  }
              });
              /** archive SS09 */
              exports_27("SS09_SpeakerErrand", SS09_SpeakerErrand = {
                  id: 'SS09',
                  n: "The Speaker's Errand",
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'favor for favor',
                  attrs: ['DIP'],
                  d: 'Carry a small unpleasant thing for leadership. It costs your name a little; it buys your bill a lot.',
                  show: s => s.stage === 'session',
                  odds: () => 0.75,
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      if (o.tier <= 1) {
                          s.favor += 8;
                          s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
                          // Session teeth: errands thaw freeze / clear demand
                          const fz = Number(s.sessionFlags.speakerFreeze || 0);
                          if (fz > 0)
                              s.sessionFlags.speakerFreeze = Math.max(0, fz - 1);
                          s.sessionFlags.errandDemand = false;
                          return ('Done quietly. The fifth floor notes it. The district would not love the details.' +
                              (fz > 0 ? ' (Leadership freeze eases.)' : ''));
                      }
                      return 'The errand goes sideways and you own a little of it. Nothing gained.';
                  }
              });
              /** archive SS10 */
              exports_27("SS10_WhipTrade", SS10_WhipTrade = {
                  id: 'SS10',
                  n: 'Whip a Vote Trade',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'the favor economy',
                  attrs: ['CRA'],
                  d: 'Your aye for his, payable when called. The whole building runs on this ledger.',
                  show: s => s.stage === 'session',
                  odds: s => 0.65 + s.faces.O * 0.004,
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          s.capital += o.tier === 0 ? 2 : 1;
                          return 'Traded. Your little bank of ayes grows.';
                      }
                      if (o.tier === 2)
                          return "No takers this week. Everyone's ledger is full.";
                      s.faces.O -= 2;
                      return 'A trade leaks and reads as cynical. It was, but still.';
                  }
              });
              /** archive SS12 */
              exports_27("SS12_StudyRules", SS12_StudyRules = {
                  id: 'SS12',
                  n: 'Study the Rules',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'the manual',
                  attrs: ['INK'],
                  d: "Most members never read them. The ones who do own the ones who don't.",
                  show: s => s.stage === 'session',
                  odds: () => 0.9,
                  run: s => {
                      s.faces.P += 4;
                      s.capital += 1;
                      return 'An evening with the rulebook. Somewhere in there is the parliamentary trick that will one day save your bill.';
                  }
              });
              /** archive SS13 — Old Bull writ */
              exports_27("SS13_PlayWrit", SS13_PlayWrit = {
                  id: 'SS13',
                  n: 'Play the Writ',
                  cost: { a: 0 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: "the Old Bull's gift",
                  attrs: ['INK'],
                  d: 'One procedural miracle, pre-paid. Spend it where the session bends.',
                  show: s => { var _a; return s.stage === 'session' && !!((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.writ); },
                  odds: () => 1,
                  run: s => {
                      s.sessionFlags = s.sessionFlags || {};
                      s.sessionFlags.writ = false;
                      if (s.bill && s.bill.pipelineStage >= 1 && s.bill.pipelineStage < 8) {
                          session_js_2.setBillStage(s, Math.min(8, s.bill.pipelineStage + 1));
                          s.bill.heat = Math.max(0, s.bill.heat - 1);
                          return "The Writ spends itself: a motion nobody saw coming, and your bill jumps a stage. The Old Bull, watching from the gallery, tips two fingers.";
                      }
                      s.capital += 3;
                      return 'No bill to move — the Writ converts to raw capital. Three ayes\' worth.';
                  }
              });
              /**
               * Session loop package — Special residency (not Main Deck).
               * Scoped to freshman / state-rep family; departs kit on sine die (future wire).
               * See docs/CARD-RESIDENCY.md.
               */
              SESSION_ENTITY_SCOPE = ['ENT_FRESHMAN_MEMBER', 'ENT_STATE_REP'];
              // --- Wave: more session survival plays (non-pipeline). Match the SS idiom:
              //     show gated to stage==='session'; standing / challenger / favors. ---
              exports_27("SS27_RibbonCircuit", SS27_RibbonCircuit = {
                  id: 'SS27', n: 'Ribbon-Cutting Circuit', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
                  tag: 'the home fires', attrs: ['CHA'],
                  d: 'A new bridge, a clinic wing, a fire truck. You hold the giant scissors and the district sees you deliver.',
                  show: s => s.stage === 'session',
                  odds: () => 0.85,
                  run: (s, o) => {
                      const g = o.tier === 0 ? 6 : 4;
                      s.districtStanding = clamp(s.districtStanding + g, 0, 100);
                      s.nameID += 2;
                      return `Scissors, cameras, a check with your name near it. Standing +${g}, +2 name ID.`;
                  }
              });
              exports_27("SS28_CharityGala", SS28_CharityGala = {
                  id: 'SS28', n: 'Interim Charity Gala', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
                  tag: 'favor for favor', attrs: ['DIP'],
                  d: 'A good cause, a ballroom, and every lobbyist in town buying a table. Goodwill and debts, exchanged over rubber chicken.',
                  show: s => s.stage === 'session',
                  odds: () => 0.7,
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      if (o.tier <= 1) {
                          s.favors += 1;
                          s.districtStanding = clamp(s.districtStanding + 3, 0, 100);
                          return 'The room is generous. +1 favor and the district notices the marquee.';
                      }
                      if (o.tier === 2) {
                          s.districtStanding = clamp(s.districtStanding + 1, 0, 100);
                          return 'A thin crowd, a polite night. Standing +1.';
                      }
                      return 'A donor photo goes sideways in the paper. The gala costs you more than it gave.';
                  }
              });
              exports_27("SS29_FaceThreat", SS29_FaceThreat = {
                  id: 'SS29', n: 'Face Down the Primary Threat', cost: { a: 1 }, risk: 'VOL', ph: [1, 2, 3],
                  tag: 'the burned bridge', attrs: ['CON'],
                  d: 'A challenger is testing the waters back home. You can ignore it — or plant your flag and stare them down.',
                  show: s => { var _a; return s.stage === 'session' && Number(((_a = s.sessionFlags) === null || _a === void 0 ? void 0 : _a.challengerHeat) || 0) > 0; },
                  odds: (s) => clamp(0.55 + s.districtStanding * 0.003, 0, 0.9),
                  run: (s, o) => {
                      s.sessionFlags = s.sessionFlags || {};
                      const ch = Number(s.sessionFlags.challengerHeat || 0);
                      if (o.tier === 0) {
                          s.sessionFlags.challengerHeat = Math.max(0, ch - 2);
                          s.momentum += 1;
                          return 'You call the bluff in public. The challenger backs off — heat down two, momentum up.';
                      }
                      if (o.tier === 1) {
                          s.sessionFlags.challengerHeat = Math.max(0, ch - 1);
                          return 'A firm word in the right ears. Challenger heat eases one notch.';
                      }
                      if (o.tier === 2) {
                          return 'A standoff. Nothing settled, nothing lost.';
                      }
                      s.sessionFlags.challengerHeat = ch + 1;
                      return 'You punch down and legitimize them. The threat grows.';
                  }
              });
              exports_27("SESSION_PLAYS", SESSION_PLAYS = (() => {
                  const cards = [
                      SS27_RibbonCircuit,
                      SS28_CharityGala,
                      SS29_FaceThreat,
                      SS01_FileBill,
                      SS02_SeekReferral,
                      SS_PAC_Refuse,
                      SS03_CourtChair,
                      SS04_Testimony,
                      SS05_CalendarSlot,
                      SS06_FloorFight,
                      SS07_WorkSenate,
                      SS08_Casework,
                      SS09_SpeakerErrand,
                      SS10_WhipTrade,
                      SS12_StudyRules,
                      SS13_PlayWrit
                  ];
                  for (const c of cards) {
                      c.residency = 'special';
                      c.control = 'player';
                      c.entityScope = [...SESSION_ENTITY_SCOPE];
                  }
                  return cards;
              })());
          }
      };
  });
  /**
   * CANDIDATE ZERO — Deck / Hand / Draw (pure, roguelite growth)
   * Enforces 1 new card drawn from the expanding pool every week.
   * Phase turns provide evolution opportunities (add/sharpen/cut).
   */
  System.register("engine/deck", ["data/plays", "engine/rng", "engine/reputation"], function (exports_28, context_28) {
      "use strict";
      var plays_js_1, rng_js_8, reputation_js_8, STARTER_DECK_IDS, DEFAULT_HAND_SIZE, RARITY_WEIGHT, rarityOf;
      var __moduleName = context_28 && context_28.id;
      function createDeckState(cardIds = STARTER_DECK_IDS) {
          return {
              draw: shuffle([...cardIds]),
              hand: [],
              discard: []
          };
      }
      exports_28("createDeckState", createDeckState);
      /** Fisher–Yates using the shared seeded RNG stream. */
      function shuffle(arr) {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
              const j = Math.floor(rng_js_8.random() * (i + 1));
              [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
      }
      exports_28("shuffle", shuffle);
      function refillDraw(deck) {
          if (deck.draw.length > 0)
              return;
          if (deck.discard.length === 0)
              return;
          deck.draw = shuffle(deck.discard);
          deck.discard = [];
      }
      function drawCards(deck, n) {
          const drawn = [];
          for (let i = 0; i < n; i++) {
              refillDraw(deck);
              if (deck.draw.length === 0)
                  break;
              const id = deck.draw.shift();
              deck.hand.push(id);
              drawn.push(id);
          }
          return drawn;
      }
      exports_28("drawCards", drawCards);
      function discardHand(deck) {
          deck.discard.push(...deck.hand);
          deck.hand = [];
      }
      exports_28("discardHand", discardHand);
      function takeFromHand(deck, handIndex) {
          if (handIndex < 0 || handIndex >= deck.hand.length)
              return null;
          const [id] = deck.hand.splice(handIndex, 1);
          return id !== null && id !== void 0 ? id : null;
      }
      exports_28("takeFromHand", takeFromHand);
      function discardCard(deck, cardId) {
          deck.discard.push(cardId);
      }
      exports_28("discardCard", discardCard);
      // === WEEKLY DRAW ENFORCEMENT (core roguelite growth rule) ===
      function getAvailableNewCards(state) {
          const owned = new Set(state.deck || []);
          const fixedEarly = new Set(['PL01', 'PL04', 'PL05']);
          return plays_js_1.PLAYS
              .filter((p) => !owned.has(p.id) &&
              !fixedEarly.has(p.id) &&
              (!p.show || p.show(state)) &&
              (!p.req || p.req(state)))
              .map((p) => p.id);
      }
      /**
       * Mandatory weekly draw: always add 1 new card from the growing pool.
       * Called at the start of every week (or end of previous).
       * Bonus draws come from perks/legacy (AL11, handBonus, etc).
       */
      function enforceWeeklyDraw(state) {
          const drawn = [];
          if (!state.deck)
              state.deck = [];
          const pool = getAvailableNewCards(state);
          if (pool.length > 0) {
              const idx = Math.floor(rng_js_8.random() * pool.length);
              const newId = pool[idx];
              state.deck.push(newId);
              drawn.push(newId);
          }
          // Bonus draws (from allies/perks/legacy)
          const bonus = (state.handBonus || 0) + (warmAllyBonus(state) ? 1 : 0);
          for (let i = 0; i < bonus; i++) {
              const extraPool = getAvailableNewCards(state);
              if (extraPool.length === 0)
                  break;
              const extraIdx = Math.floor(rng_js_8.random() * extraPool.length);
              const extraId = extraPool[extraIdx];
              state.deck.push(extraId);
              drawn.push(extraId);
          }
          return drawn;
      }
      exports_28("enforceWeeklyDraw", enforceWeeklyDraw);
      function warmAllyBonus(state) {
          // AL11 (Kitchen Cabinet) gives an extra draw
          return reputation_js_8.warm(state, 'AL11');
      }
      function buildPhaseDraft(state, count = 3) {
          var _a;
          const options = [];
          const working = getAvailableNewCards(state);
          while (options.length < count && working.length > 0) {
              // Weighted pick: sum weights, roll, walk. Keeps rares rare in the draft.
              const total = working.reduce((s, id) => { var _a; return s + ((_a = RARITY_WEIGHT[rarityOf(id)]) !== null && _a !== void 0 ? _a : 6); }, 0);
              let roll = rng_js_8.random() * total;
              let idx = 0;
              for (; idx < working.length; idx++) {
                  roll -= (_a = RARITY_WEIGHT[rarityOf(working[idx])]) !== null && _a !== void 0 ? _a : 6;
                  if (roll <= 0)
                      break;
              }
              const [id] = working.splice(Math.min(idx, working.length - 1), 1);
              if (id)
                  options.push(id);
          }
          return { phase: 0, options };
      }
      exports_28("buildPhaseDraft", buildPhaseDraft);
      /**
       * Put card ids into the physical draw pile (and mark owned).
       * Weekly growth + drafts must call this or cards never become playable.
       */
      function injectIntoDrawPile(deck, state, cardIds) {
          if (!state.deck)
              state.deck = [];
          for (const id of cardIds) {
              if (!state.deck.includes(id))
                  state.deck.push(id);
              deck.draw.push(id);
          }
      }
      exports_28("injectIntoDrawPile", injectIntoDrawPile);
      /** Commit a draft pick into owned + physical draw pile (when deck provided). */
      function resolvePhaseDraft(state, pickIndex, deck) {
          const draft = state.pendingDraft;
          if (!draft || !draft.options.length) {
              return { ok: false, reason: 'No pending draft' };
          }
          const cardId = draft.options[pickIndex];
          if (!cardId)
              return { ok: false, reason: 'Invalid draft index' };
          if (!state.deck)
              state.deck = [];
          if (deck) {
              injectIntoDrawPile(deck, state, [cardId]);
          }
          else if (!state.deck.includes(cardId)) {
              state.deck.push(cardId);
          }
          state.log.push({
              week: state.week,
              kind: 'note',
              text: `Phase ${draft.phase} draft: added ${cardId} to the deck. (Options were ${draft.options.join(', ')})`
          });
          state.pendingDraft = undefined;
          return { ok: true, cardId };
      }
      exports_28("resolvePhaseDraft", resolvePhaseDraft);
      /** Seeded auto-pick (first option) for harnesses / strategies. */
      function autoResolvePhaseDraft(state, deck) {
          var _a, _b;
          if (!((_a = state.pendingDraft) === null || _a === void 0 ? void 0 : _a.options.length))
              return null;
          const r = resolvePhaseDraft(state, 0, deck);
          return (_b = r.cardId) !== null && _b !== void 0 ? _b : null;
      }
      exports_28("autoResolvePhaseDraft", autoResolvePhaseDraft);
      /**
       * Legacy hook: extra weekly draw + open a draft offer.
       * Prefer loop.maybeOfferPhaseDraft for phase-change detection.
       */
      function phaseTurnDeckEvolution(state, newPhase) {
          const extra = enforceWeeklyDraw(state);
          if (extra.length > 0) {
              state.log.push({
                  week: state.week,
                  kind: 'draw',
                  text: `Phase ${newPhase} evolution: extra card(s) — ${extra.join(', ')}`
              });
          }
          const draft = buildPhaseDraft(state, 3);
          draft.phase = newPhase;
          if (draft.options.length) {
              state.pendingDraft = draft;
          }
      }
      exports_28("phaseTurnDeckEvolution", phaseTurnDeckEvolution);
      return {
          setters: [
              function (plays_js_1_1) {
                  plays_js_1 = plays_js_1_1;
              },
              function (rng_js_8_1) {
                  rng_js_8 = rng_js_8_1;
              },
              function (reputation_js_8_1) {
                  reputation_js_8 = reputation_js_8_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Deck / Hand / Draw (pure, roguelite growth)
               * Enforces 1 new card drawn from the expanding pool every week.
               * Phase turns provide evolution opportunities (add/sharpen/cut).
               */
              // Starter deck (early accessibility + dual ballot paths)
              exports_28("STARTER_DECK_IDS", STARTER_DECK_IDS = [
                  'PL01', 'PL01', 'PL01',
                  'PL02',
                  'PL03',
                  'PL04', 'PL04', 'PL04', 'PL04', 'PL04',
                  'PL05', 'PL05',
                  'PL06',
                  'PL10',
                  'PL13', 'PL13', 'PL13',
                  'PL08'
                  // NOTE: the starter deck is tuned for ballot-access density (petition /
                  // filing-fee draw timing). Adding cards here dilutes that and can make the
                  // money path miss the ballot — see harness:full "money should usually clear
                  // ballot". New commons reach the deck via drafts / weekly growth instead;
                  // expanding the *opening* deck needs a deliberate ballot-access rebalance.
              ]);
              exports_28("DEFAULT_HAND_SIZE", DEFAULT_HAND_SIZE = 5);
              // === PHASE EVOLUTION (draft offer) ===
              /**
               * Build a 3-card draft from the unowned pool for a phase turn.
               * Does not mutate ownership until resolvePhaseDraft.
               */
              /** Draft draw-weight by rarity — uncommon/rare are genuinely harder to land. */
              RARITY_WEIGHT = { common: 6, uncommon: 2, rare: 1 };
              rarityOf = (id) => { var _a, _b; return (_b = (_a = plays_js_1.PLAYS.find(p => p.id === id)) === null || _a === void 0 ? void 0 : _a.rarity) !== null && _b !== void 0 ? _b : 'common'; };
          }
      };
  });
  /**
   * CANDIDATE ZERO — Minimal pure state factory and helpers
   * Foundation for the playable loop and balance harness.
   */
  System.register("engine/state", ["engine/rng", "engine/calendar"], function (exports_29, context_29) {
      "use strict";
      var rng_js_9, calendar_js_2;
      var __moduleName = context_29 && context_29.id;
      function createInitialFaces() {
          return { P: 0, O: 0, L: 0, G: 0, T: 0, F: 0 };
      }
      exports_29("createInitialFaces", createInitialFaces);
      /** Baseline 10 on every root attribute (cardAttrMod neutral). */
      function createDefaultAttrs() {
          return { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
      }
      exports_29("createDefaultAttrs", createDefaultAttrs);
      function createDefaultGrounds() {
          // rivalRap starts at 0; advanceRivalGrounds (calendar onWeekAdvance) banks
          // 5–40 cosmetic opposition each week for the ground picker / logs.
          return [
              { id: 'GR01', n: 'Courthouse Square', pool: 120, pool0: 120, prop: 0.9, aff: 'O,G', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR02', n: 'The FM Roads', pool: 420, pool0: 420, prop: 0.7, aff: 'G,T', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR03', n: 'The New Subdivisions', pool: 460, pool0: 460, prop: 0.28, aff: 'F,P', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR04', n: 'Church Corridor', pool: 260, pool0: 260, prop: 0.72, aff: 'T,G', rapport: 0, gotv: 0, gated: true, rivalRap: 0 },
              { id: 'GR05', n: 'The Plant Gate', pool: 240, pool0: 240, prop: 0.5, aff: 'T,O', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR06', n: 'VFW & Legion Halls', pool: 110, pool0: 110, prop: 0.92, aff: 'G,T', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR07', n: 'Lake Country', pool: 230, pool0: 230, prop: 0.55, aff: 'L,G', rapport: 0, gotv: 0, rivalRap: 0 },
              { id: 'GR08', n: 'Southside Blocks', pool: 430, pool0: 430, prop: 0.3, aff: 'T,F', rapport: 0, gotv: 0, rivalRap: 0 }
          ];
      }
      exports_29("createDefaultGrounds", createDefaultGrounds);
      /** Create a fresh primary-campaign state suitable for testing and harness work. */
      function createNewState(overrides = {}) {
          if (overrides.seed !== undefined) {
              rng_js_9.setDefaultSeed(overrides.seed);
          }
          const base = {
              week: 1, weeksTotal: calendar_js_2.CAMPAIGN_WEEKS_TOTAL, ap: 2, apMax: 2, fieldAp: 0,
              money: 0, debt: 0, contacts: 0, nameID: 2, volPool: 0, momentum: 0, favors: 0,
              signatures: 0, sigNeed: 450, ballot: false, hitPieces: 0, exposure: 0,
              messageSharp: false, clubOdds: 0, walkCount: 0, shadowPlays: 0, disasterLog: [],
              endorsePts: 0, slate: false, absenteeBank: 0, greeters: 0, pledges: 0,
              faces: createInitialFaces(), shFired: {}, groundsArr: createDefaultGrounds(),
              allies: [], backers: [], assets: [], obls: [], reps: [], rivals: [],
              tier: 0, persona: null, personaId: null, issue: null, district: null, eventsFired: {},
              playedCardIds: {}, pathProgress: {}, pathsUnlocked: {},
              stage: 'primary', genOpp: null, genBase: 0, over: false, outcome: 'ongoing',
              primaryWon: false, log: [],
              capital: 0, favor: 50, districtStanding: 60, bill: null, committee: null, sessionFlags: {},
              wave: (rng_js_9.random() - 0.5) * 16, skippedTownHall: false, townHallThisWeek: false,
              debatePrepped: false, oppoFile: false, favWitness: 0, globalBand: 0,
              attrs: createDefaultAttrs(),
              deck: []
          };
          return { ...base, ...overrides, attrs: { ...createDefaultAttrs(), ...overrides.attrs } };
      }
      exports_29("createNewState", createNewState);
      /**
       * Advance one week on the campaign calendar (may resolve elections).
       * Prefer loop.endWeekInPlace which also discards the hand.
       */
      function advanceWeek(state) {
          calendar_js_2.advanceCampaignWeek(state);
          return state;
      }
      exports_29("advanceWeek", advanceWeek);
      return {
          setters: [
              function (rng_js_9_1) {
                  rng_js_9 = rng_js_9_1;
              },
              function (calendar_js_2_1) {
                  calendar_js_2 = calendar_js_2_1;
                  exports_29({
                      "getPhase": calendar_js_2_1["getPhase"],
                      "stageLabel": calendar_js_2_1["stageLabel"],
                      "stageWeek": calendar_js_2_1["stageWeek"],
                      "PRIMARY_WEEKS": calendar_js_2_1["PRIMARY_WEEKS"],
                      "GENERAL_WEEKS": calendar_js_2_1["GENERAL_WEEKS"],
                      "FILING_DEADLINE_WEEK": calendar_js_2_1["FILING_DEADLINE_WEEK"],
                      "CAMPAIGN_WEEKS_TOTAL": calendar_js_2_1["CAMPAIGN_WEEKS_TOTAL"]
                  });
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Minimal pure state factory and helpers
               * Foundation for the playable loop and balance harness.
               */
          }
      };
  });
  /**
   * CANDIDATE ZERO — Pure play execution
   * Affordability, phase legality, cost payment, resolve + run.
   * Now includes cardAttrMod synergy (root attributes affect odds).
   */
  System.register("engine/play", ["engine/resolve", "engine/state", "engine/calendar", "engine/feedback", "engine/reputation", "engine/debt", "engine/entities"], function (exports_30, context_30) {
      "use strict";
      var resolve_js_2, state_js_1, calendar_js_3, feedback_js_1, reputation_js_9, debt_js_4, entities_js_5;
      var __moduleName = context_30 && context_30.id;
      function canAfford(state, card) {
          var _a, _b, _c, _d, _e;
          const c = card.cost;
          const apCost = (_a = c.a) !== null && _a !== void 0 ? _a : 0;
          const apCovered = apCost <= state.ap || (apCost > 0 && !!card.field && state.fieldAp > 0);
          if (!apCovered)
              return false;
          // Phase 3: $ costs use availableCash (debt reserves a service cushion).
          // Never an odds tax — pure affordability gate (src/engine/debt.ts).
          if (!debt_js_4.canAffordCash(state, (_b = c.$) !== null && _b !== void 0 ? _b : 0))
              return false;
          if (((_c = c.vp) !== null && _c !== void 0 ? _c : 0) > state.volPool)
              return false;
          if (((_d = c.m) !== null && _d !== void 0 ? _d : 0) > state.momentum)
              return false;
          if (((_e = c.fav) !== null && _e !== void 0 ? _e : 0) > state.favors)
              return false;
          return true;
      }
      exports_30("canAfford", canAfford);
      function isPhaseLegal(state, card) {
          const phase = state_js_1.getPhase(state);
          return card.ph.includes(phase);
      }
      exports_30("isPhaseLegal", isPhaseLegal);
      function isVisible(state, card) {
          if (card.show && !card.show(state))
              return false;
          if (card.req && !card.req(state))
              return false;
          return true;
      }
      exports_30("isVisible", isVisible);
      /** Card is in phase, visible, and affordable. */
      function isPlayable(state, card) {
          return isPhaseLegal(state, card) && isVisible(state, card) && canAfford(state, card);
      }
      exports_30("isPlayable", isPlayable);
      function payCost(state, card) {
          const c = card.cost;
          if (c.a) {
              if (card.field && state.fieldAp > 0) {
                  state.fieldAp -= 1;
              }
              else {
                  state.ap -= c.a;
              }
          }
          if (c.$)
              state.money -= c.$;
          if (c.vp)
              state.volPool -= c.vp;
          if (c.m)
              state.momentum -= c.m;
          if (c.fav)
              state.favors -= c.fav;
      }
      exports_30("payCost", payCost);
      function pickDefaultGround(state) {
          var _a;
          return (_a = state.groundsArr.find(g => g.pool > 0)) !== null && _a !== void 0 ? _a : state.groundsArr[0];
      }
      exports_30("pickDefaultGround", pickDefaultGround);
      // === cardAttrMod: Root attributes now affect card power ===
      function amod(state, id) {
          var _a, _b;
          const val = (_b = (_a = state.attrs) === null || _a === void 0 ? void 0 : _a[id]) !== null && _b !== void 0 ? _b : 10;
          return (val - 10) / 40;
      }
      function cardAttrMod(state, card) {
          if (!card.attrs || card.attrs.length === 0)
              return 0;
          let sum = 0;
          for (const id of card.attrs) {
              sum += amod(state, id);
          }
          return sum / card.attrs.length;
      }
      exports_30("cardAttrMod", cardAttrMod);
      /**
       * Execute one play: pay costs, resolve RNG, run card effects.
       * Attributes now modify the base probability via cardAttrMod.
       */
      function executePlay(state, card, ground) {
          var _a;
          if (!isPhaseLegal(state, card)) {
              return { ok: false, reason: `Not legal in phase ${state_js_1.getPhase(state)}`, cardId: card.id, cardName: card.n };
          }
          if (!isVisible(state, card)) {
              return { ok: false, reason: 'Card not available (show/req)', cardId: card.id, cardName: card.n };
          }
          if (!canAfford(state, card)) {
              return { ok: false, reason: 'Cannot afford cost', cardId: card.id, cardName: card.n };
          }
          const g = ground !== null && ground !== void 0 ? ground : (card.field ? pickDefaultGround(state) : undefined);
          if (card.field && !g) {
              return { ok: false, reason: 'No ground selected', cardId: card.id, cardName: card.n };
          }
          // Ground diminishing returns (Phase 1): for a field play, look up how many
          // times this ground was already worked this week, derive the odds bump /
          // rapport multiplier, then tally this visit. groundRapMult is read by
          // rapGain() inside the card's run(); default 1 for non-field plays.
          state.groundRapMult = 1;
          let groundOddsBonus = 0;
          if (card.field && g) {
              if (!state.groundPlays)
                  state.groundPlays = {};
              const priorVisits = (_a = state.groundPlays[g.id]) !== null && _a !== void 0 ? _a : 0;
              const pen = calendar_js_3.getGroundPenalty(state, g, priorVisits);
              groundOddsBonus = pen.oddsBonus;
              state.groundRapMult = pen.rapMult;
              state.groundPlays[g.id] = priorVisits + 1;
              state.lastGround = g.id;
          }
          // Resistance tier escalates with the stakes (pre-ballot -> on-ballot -> general):
          // scrutiny/opposition organization grows as the race gets real. This widens
          // resolve()'s disaster band for STD/VOL plays and unlocks PL20 (show: tier>=1).
          state.tier = state_js_1.getPhase(state) - 1;
          payCost(state, card);
          // Snapshot for milestones (ballot / stage) before run mutates
          const before = {
              ballot: state.ballot,
              sigs: state.signatures,
              stage: state.stage
          };
          // Base odds from card definition
          let p = card.odds ? card.odds(state, g) : 0.5;
          // === ACTIVATE SYNERGY ===
          const attrMod = cardAttrMod(state, card);
          // Opposition presence on this ground taxes field odds (rivalRap teeth).
          const rivalPen = card.field ? calendar_js_3.rivalOddsPenalty(g) : 0;
          p = Math.max(0.02, Math.min(0.95, p + attrMod + groundOddsBonus - rivalPen));
          const roll = resolve_js_2.resolve(p, card.risk, state);
          // The Parliamentarian's save (PA_INK persona, T_NERD legacy trait): once
          // per campaign, a procedural DISASTER on the petition reads down to a
          // SETBACK instead. Archive-scoped to PL04 (the only procedural play
          // ported so far this applies to).
          if (roll.tier === 3 && state.parlSave && !state.parlUsed && card.id === 'PL04') {
              roll.tier = 2;
              state.parlUsed = true;
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: "The Parliamentarian's save: DISASTER read down to SETBACK on procedure."
              });
          }
          const text = card.run ? card.run(state, roll, g) : `${card.n} resolves.`;
          if (roll.tier === 3) {
              state.disasterLog.push(state.week);
          }
          // Dopamine annotation — pure, no pity, after yields applied
          const feedback = feedback_js_1.buildPlayFeedback(state, card, roll, before);
          state.log.push({
              week: state.week,
              kind: 'play',
              text,
              cardId: card.id,
              tier: roll.tier,
              beat: feedback.beat
          });
          state.log.push({
              week: state.week,
              kind: 'juice',
              text: feedback.juice,
              cardId: card.id,
              tier: roll.tier,
              beat: feedback.beat
          });
          // Threshold checks against this play's yields: reputation grants and
          // Shadow consequences on Faces (see src/engine/reputation.ts).
          reputation_js_9.shadowCheck(state);
          reputation_js_9.repCheck(state);
          // Starmap v0: open pilot movement when advancement conditions met.
          entities_js_5.syncMovementFlags(state);
          return {
              ok: true,
              cardId: card.id,
              cardName: card.n,
              tier: roll.tier,
              text,
              stamp: resolve_js_2.STAMPS[roll.tier],
              feedback,
              p: roll.p,
              roll: roll.roll
          };
      }
      exports_30("executePlay", executePlay);
      return {
          setters: [
              function (resolve_js_2_1) {
                  resolve_js_2 = resolve_js_2_1;
              },
              function (state_js_1_1) {
                  state_js_1 = state_js_1_1;
              },
              function (calendar_js_3_1) {
                  calendar_js_3 = calendar_js_3_1;
              },
              function (feedback_js_1_1) {
                  feedback_js_1 = feedback_js_1_1;
              },
              function (reputation_js_9_1) {
                  reputation_js_9 = reputation_js_9_1;
              },
              function (debt_js_4_1) {
                  debt_js_4 = debt_js_4_1;
              },
              function (entities_js_5_1) {
                  entities_js_5 = entities_js_5_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Pure play execution
               * Affordability, phase legality, cost payment, resolve + run.
               * Now includes cardAttrMod synergy (root attributes affect odds).
               */
          }
      };
  });
  /**
   * Waiting-season Special verbs — path-scoped interim kit.
   * Not Main Deck; residency special; only while stage==='waiting'.
   */
  System.register("data/waiting-plays", ["engine/waiting"], function (exports_31, context_31) {
      "use strict";
      var waiting_js_2, WA01_WorkTheList, WA02_IssueForum, WA03_CarryTheBag, WA04_MendFence, WA05_LunchLobby, WA06_Rolodex, WA07_QuietMoney, WA08_DraftBrief, WA09_TestWaters, WAIT_SCOPE, WA10_NightClass, WA11_WeeklyColumn, WA12_CharityRun, WAITING_PLAYS;
      var __moduleName = context_31 && context_31.id;
      function pathIs(s, ...ids) {
          return !!s.waitingPathId && ids.includes(s.waitingPathId);
      }
      function waitingShow(s, paths) {
          if (s.stage !== 'waiting')
              return false;
          if (!paths || !paths.length)
              return true;
          return pathIs(s, ...paths);
      }
      return {
          setters: [
              function (waiting_js_2_1) {
                  waiting_js_2 = waiting_js_2_1;
              }
          ],
          execute: function () {/**
               * Waiting-season Special verbs — path-scoped interim kit.
               * Not Main Deck; residency special; only while stage==='waiting'.
               */
              /** Universal — keep the list warm. */
              exports_31("WA01_WorkTheList", WA01_WorkTheList = {
                  id: 'WA01',
                  n: 'Work the List',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  kind: 'action',
                  residency: 'special',
                  control: 'player',
                  entityScope: ['LOOP_WAITING_PERENNIAL', 'LOOP_WAITING_ADVOCATE', 'LOOP_WAITING_HOME'],
                  attrs: ['CHA'],
                  d: 'Call the names that still pick up. The county forgets slower when you dial.',
                  show: s => waitingShow(s),
                  odds: () => 0.9,
                  run: (s, o) => {
                      const n = o.tier === 0 ? 35 : o.tier === 1 ? 22 : 10;
                      waiting_js_2.bankWaiting(s, { contacts: n });
                      return `List work. +${n} contacts banked for the next filing.`;
                  }
              });
              exports_31("WA02_IssueForum", WA02_IssueForum = {
                  id: 'WA02',
                  n: 'Host an Issue Forum',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  entityScope: ['LOOP_WAITING_ADVOCATE'],
                  attrs: ['CON', 'CHA'],
                  d: 'The candidate lost; the cause did not. Folding chairs and a sharp message.',
                  show: s => waitingShow(s, ['advocate']),
                  odds: () => 0.75,
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          waiting_js_2.bankWaiting(s, { contacts: 40, nameID: 3 });
                          s.messageSharp = true;
                          return 'Forum lands. +40 contacts, +3 name, message stays sharp.';
                      }
                      waiting_js_2.bankWaiting(s, { contacts: 12 });
                      return 'Small room, real believers. +12 contacts.';
                  }
              });
              exports_31("WA03_CarryTheBag", WA03_CarryTheBag = {
                  id: 'WA03',
                  n: 'Carry the Bag',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  entityScope: ['LOOP_WAITING_STAFFER'],
                  attrs: ['INK', 'CRA'],
                  d: 'Two years inside. Briefs, desks, and where the levers hide.',
                  show: s => waitingShow(s, ['staffer']),
                  odds: () => 0.88,
                  run: (s, o) => {
                      s.faces.P = Math.min(100, (s.faces.P || 0) + (o.tier <= 1 ? 4 : 2));
                      s.faces.O = Math.min(100, (s.faces.O || 0) + (o.tier === 0 ? 3 : 1));
                      waiting_js_2.bankWaiting(s, { favors: o.tier === 0 ? 1 : 0, nameID: 1 });
                      return 'Capitol days. Faces P/O up; the building teaches whether you listen.';
                  }
              });
              exports_31("WA04_MendFence", WA04_MendFence = {
                  id: 'WA04',
                  n: 'Mend the Fence',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  entityScope: ['LOOP_WAITING_HOME'],
                  attrs: ['CHA'],
                  d: 'Fix what broke. Coach the team. Let the mailers fade a little.',
                  show: s => waitingShow(s, ['home', 'perennial']),
                  odds: () => 0.92,
                  run: (s, o) => {
                      waiting_js_2.bankWaiting(s, { vol: o.tier <= 1 ? 2 : 1 });
                      s.exposure = Math.max(0, (s.exposure || 0) - 1);
                      s.hitPieces = Math.max(0, s.hitPieces - (o.tier === 0 ? 1 : 0));
                      return 'Hands dirty, head clearer. Volunteers banked; scars soften.';
                  }
              });
              exports_31("WA05_LunchLobby", WA05_LunchLobby = {
                  id: 'WA05',
                  n: 'Lunch the Lobby',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  entityScope: ['LOOP_WAITING_EXMEMBER', 'LOOP_ELECTED_HIGHER_SENATE'],
                  attrs: ['DIP', 'CRA'],
                  d: 'Title still warm. Doors still open. No vote — only lunch.',
                  show: s => waitingShow(s, ['exmember', 'senate', 'statewide']),
                  odds: () => 0.8,
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          waiting_js_2.bankWaiting(s, { favors: 1, money: 300, nameID: 2 });
                          s.capital = (s.capital || 0) + 1;
                          return 'Lunch buys a favor and a check. +favor, +$300, capital +1.';
                      }
                      waiting_js_2.bankWaiting(s, { nameID: 1 });
                      return 'Polite, noncommittal. Name still circulates.';
                  }
              });
              exports_31("WA06_Rolodex", WA06_Rolodex = {
                  id: 'WA06',
                  n: 'Keep the Rolodex Warm',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  attrs: ['DIP'],
                  d: 'Birthdays, funerals, fish fries you are not running. Yet.',
                  show: s => waitingShow(s),
                  odds: () => 0.9,
                  run: (s, o) => {
                      const n = o.tier <= 1 ? 4 : 2;
                      waiting_js_2.bankWaiting(s, { nameID: n, contacts: 15 });
                      return `Rolodex work. +${n} name ID, +15 contacts for next cycle.`;
                  }
              });
              exports_31("WA07_QuietMoney", WA07_QuietMoney = {
                  id: 'WA07',
                  n: 'Quiet Money',
                  cost: { a: 1 },
                  risk: 'STD',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  kind: 'bargain',
                  attrs: ['CRA'],
                  d: 'A retainer, a speech fee, a board. Not a campaign — not yet.',
                  show: s => waitingShow(s, ['perennial', 'exmember', 'senate', 'statewide']),
                  odds: () => 0.7,
                  run: (s, o) => {
                      if (o.tier <= 1) {
                          const m = o.tier === 0 ? 900 : 500;
                          waiting_js_2.bankWaiting(s, { money: m });
                          s.faces.L = Math.max(-50, (s.faces.L || 0) - 2);
                          return `Quiet money +$${m}. Loyalty face softens a hair.`;
                      }
                      return 'The check does not clear the conversation. Nothing banked.';
                  }
              });
              exports_31("WA08_DraftBrief", WA08_DraftBrief = {
                  id: 'WA08',
                  n: 'Draft the Brief',
                  cost: { a: 1 },
                  risk: 'SAFE',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  attrs: ['INK', 'CON'],
                  d: 'White paper, memo, bill draft that waits for a sponsor.',
                  show: s => waitingShow(s, ['advocate', 'staffer', 'senate', 'statewide']),
                  odds: () => 0.85,
                  run: (s, o) => {
                      s.faces.P = Math.min(100, (s.faces.P || 0) + 3);
                      s.messageSharp = true;
                      waiting_js_2.bankWaiting(s, { nameID: o.tier <= 1 ? 2 : 1 });
                      return 'The brief exists. Message sharp; Parliamentarian face +3.';
                  }
              });
              exports_31("WA09_TestWaters", WA09_TestWaters = {
                  id: 'WA09',
                  n: 'Test the Waters',
                  cost: { a: 1 },
                  risk: 'VOL',
                  ph: [1, 2, 3],
                  tag: 'waiting',
                  residency: 'special',
                  control: 'player',
                  attrs: ['DIP', 'CLO'],
                  d: 'Quiet calls about a larger map. Senate row or the statewide ballot.',
                  show: s => waitingShow(s, ['senate', 'statewide', 'exmember']),
                  odds: () => 0.55,
                  run: (s, o) => {
                      if (o.tier === 0) {
                          waiting_js_2.bankWaiting(s, { nameID: 6, favors: 1, contacts: 50 });
                          return 'The calls go well. Bigger rooms know your name. (+6 name, +favor, +50 contacts)';
                      }
                      if (o.tier === 1) {
                          waiting_js_2.bankWaiting(s, { nameID: 3, contacts: 25 });
                          return 'Polite interest. Not a draft — not a door slam.';
                      }
                      if (o.tier === 2)
                          return 'Everyone is "flattered you called." Nobody is free for lunch.';
                      s.hitPieces += 1;
                      return 'A leak: "EX-MEMBER EYES HIGHER OFFICE." Hit piece. The water was colder than you thought.';
                  }
              });
              // --- Wave: more interim verbs. Bank progress toward the next filing. ---
              WAIT_SCOPE = ['LOOP_WAITING_PERENNIAL', 'LOOP_WAITING_ADVOCATE', 'LOOP_WAITING_HOME'];
              exports_31("WA10_NightClass", WA10_NightClass = {
                  id: 'WA10', n: 'Teach a Night Class', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
                  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
                  entityScope: WAIT_SCOPE, attrs: ['CHA'],
                  d: 'Civics at the community college, two evenings a week. Thirty adults who now know your name and your handshake.',
                  show: s => waitingShow(s),
                  odds: () => 0.9,
                  run: (s, o) => {
                      const n = o.tier === 0 ? 28 : o.tier === 1 ? 18 : 9;
                      waiting_js_2.bankWaiting(s, { contacts: n });
                      return `Chalkboard and coffee. +${n} contacts banked for the next filing.`;
                  }
              });
              exports_31("WA11_WeeklyColumn", WA11_WeeklyColumn = {
                  id: 'WA11', n: 'Write the Weekly Column', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
                  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
                  entityScope: WAIT_SCOPE, attrs: ['INK'],
                  d: 'A standing byline in the county paper. Slow, unglamorous, and it keeps your name in print between the elections.',
                  show: s => waitingShow(s),
                  odds: () => 0.7,
                  run: (s, o) => {
                      const n = o.tier === 0 ? 4 : o.tier === 1 ? 2 : 1;
                      waiting_js_2.bankWaiting(s, { nameID: n });
                      return `A column that gets read. +${n} name ID banked for the next filing.`;
                  }
              });
              exports_31("WA12_CharityRun", WA12_CharityRun = {
                  id: 'WA12', n: 'Run the Charity 5K', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
                  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
                  entityScope: WAIT_SCOPE, attrs: ['CHA'],
                  d: 'A bib, a starting pistol, and a banner with your name over the finish line. Good works, well photographed.',
                  show: s => waitingShow(s),
                  odds: () => 0.9,
                  run: (s, o) => {
                      waiting_js_2.bankWaiting(s, { contacts: o.tier <= 1 ? 16 : 8, nameID: o.tier === 0 ? 2 : 1 });
                      return 'Sneakers and goodwill. Contacts and a little name ID banked for the next filing.';
                  }
              });
              exports_31("WAITING_PLAYS", WAITING_PLAYS = [
                  WA10_NightClass,
                  WA11_WeeklyColumn,
                  WA12_CharityRun,
                  WA01_WorkTheList,
                  WA02_IssueForum,
                  WA03_CarryTheBag,
                  WA04_MendFence,
                  WA05_LunchLobby,
                  WA06_Rolodex,
                  WA07_QuietMoney,
                  WA08_DraftBrief,
                  WA09_TestWaters
              ]);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Signature plays (persona-exclusive "special rare" cards)
   * ========================================================================
   * One per persona. Each is gated to its signature persona (`req`/`show`
   * check `s.persona`) AND is only ever injected into that persona's draw pile
   * (see createCampaign in loop.ts) — so no other persona can draw or play it.
   * One copy per run, so these read as a rare high point, not a staple; balance
   * risk is bounded (harness:matrix keeps win rates in band).
   *
   * Effects use the normal resolution engine (odds + tiered run), so signature
   * cards obey the same RNG covenants as every other play. They are non-field
   * (resolve immediately, no ground pick) to keep the special moment clean.
   *
   * Attrs / risk / cost / phase / flavor follow the uploaded card list; the IDs
   * are assigned here (SIG01–SIG24) rather than the list's PL57–PL77.
   * Hand-authored classics teacher / veteran / smallbiz are SIG22–24.
   */
  System.register("data/signature-plays", ["engine/rng"], function (exports_32, context_32) {
      "use strict";
      var rng_js_10, SIGNATURE_BY_PERSONA, O, SIGNATURE_PLAYS;
      var __moduleName = context_32 && context_32.id;
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      /** Nudge the strongest opponent ground down — a clean "contrast landed" hit. */
      function hitRival(s, amt) {
          const g = [...s.groundsArr].sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
          if (g)
              g.rivalRap = Math.max(0, (g.rivalRap || 0) - amt);
          s.hitPieces = (s.hitPieces || 0) + 1;
      }
      function mk(def) {
          SIGNATURE_BY_PERSONA[def.persona] = def.id;
          const gate = (s) => s.personaId === def.persona;
          return {
              id: def.id,
              n: def.n,
              cost: def.cost,
              risk: def.risk,
              ph: def.ph,
              tag: def.tag,
              d: def.d,
              attrs: def.attrs,
              kind: 'action',
              residency: 'main',
              control: 'player',
              req: gate,
              show: gate,
              odds: def.odds,
              run: def.run
          };
      }
      return {
          setters: [
              function (rng_js_10_1) {
                  rng_js_10 = rng_js_10_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Signature plays (persona-exclusive "special rare" cards)
               * ========================================================================
               * One per persona. Each is gated to its signature persona (`req`/`show`
               * check `s.persona`) AND is only ever injected into that persona's draw pile
               * (see createCampaign in loop.ts) — so no other persona can draw or play it.
               * One copy per run, so these read as a rare high point, not a staple; balance
               * risk is bounded (harness:matrix keeps win rates in band).
               *
               * Effects use the normal resolution engine (odds + tiered run), so signature
               * cards obey the same RNG covenants as every other play. They are non-field
               * (resolve immediately, no ground pick) to keep the special moment clean.
               *
               * Attrs / risk / cost / phase / flavor follow the uploaded card list; the IDs
               * are assigned here (SIG01–SIG24) rather than the list's PL57–PL77.
               * Hand-authored classics teacher / veteran / smallbiz are SIG22–24.
               */
              /** persona id → signature card id (used to inject into that persona's deck). */
              exports_32("SIGNATURE_BY_PERSONA", SIGNATURE_BY_PERSONA = {});
              // Signature odds run a touch above a comparable common card — this is the
              // persona's best move — but still bounded by risk band.
              O = (base) => (s) => clamp(base + (s.messageSharp ? 0.05 : 0), 0.05, 0.95);
              exports_32("SIGNATURE_PLAYS", SIGNATURE_PLAYS = [
                  // ---- Pure personas ----
                  mk({
                      id: 'SIG01', persona: 'PA_CLO', n: 'Fill the Square', attrs: ['CLO'], risk: 'VOL',
                      cost: { a: 2, vp: 3 }, ph: [2, 3], tag: 'signature — The Powerhouse',
                      d: 'You do not ask for the room. You fill it, and the turnout operation fills the rest.',
                      odds: O(0.58),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              const c = 60 + Math.floor(rng_js_10.random() * 30);
                              s.contacts += c;
                              s.nameID += 5;
                              s.momentum += 2;
                              s.groundsArr.forEach(g => (g.gotv += 0.06));
                              return `The square overflows. +${c} contacts, +5 name ID, momentum, and turnout banked everywhere.`;
                          }
                          if (o.tier === 1) {
                              s.contacts += 30;
                              s.nameID += 3;
                              s.momentum += 1;
                              return 'A real crowd. +30 contacts, +3 name ID, momentum.';
                          }
                          if (o.tier === 2) {
                              s.contacts += 8;
                              return 'Half the folding chairs stay empty. +8 contacts.';
                          }
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'Rain, and a rival counter-rally across the street. Momentum leaks.';
                      }
                  }),
                  mk({
                      id: 'SIG02', persona: 'PA_CON', n: 'The Unbending Line', attrs: ['CON'], risk: 'STD',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The True Believer',
                      d: 'The message arrives pre-sharpened and never wavers. You say the same true thing until it is the only thing.',
                      odds: O(0.62),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.messageSharp = true;
                              s.momentum += 2;
                              s.nameID += 2;
                              return 'The line holds and travels. Message sharp, +2 momentum, +2 name ID.';
                          }
                          if (o.tier === 2) {
                              s.messageSharp = true;
                              return 'Preaching to the choir, but the choir is real. Message sharp.';
                          }
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'Rigid reads as brittle tonight. A little momentum lost.';
                      }
                  }),
                  mk({
                      id: 'SIG03', persona: 'PA_CRA', n: 'Call In a Marker', attrs: ['CRA'], risk: 'STD',
                      cost: { a: 1, fav: 1 }, ph: [1, 2, 3], tag: 'signature — The Operator',
                      d: 'Someone owes you, and today is the day. The angle was always there.',
                      odds: O(0.68),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 3;
                              hitRival(s, 6);
                              return "A marker called: +3 endorsement points and the rival's best ground softens.";
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'The favor was smaller than remembered. +1 endorsement point.';
                          }
                          s.favors = Math.max(0, s.favors - 0);
                          return 'The debt is disputed. Nothing moves — and now they know you asked.';
                      }
                  }),
                  mk({
                      id: 'SIG04', persona: 'PA_INK', n: 'The Airtight Filing', attrs: ['INK'], risk: 'SAFE',
                      cost: { a: 1 }, ph: [1], tag: 'signature — The Parliamentarian',
                      d: 'Every box checked, every deadline beaten. The clerk finds nothing because there is nothing to find.',
                      odds: O(0.8),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.signatures += 40;
                              if (s.signatures >= s.sigNeed && !s.ballot) {
                                  s.ballot = true;
                                  return 'Filing airtight — the threshold clears itself. On the ballot.';
                              }
                              s.nameID += 1;
                              return `The paperwork does the walking. +40 toward the ballot (${s.signatures}/${s.sigNeed}).`;
                          }
                          s.signatures += 15;
                          return 'A tidy filing. +15 toward the ballot.';
                      }
                  }),
                  mk({
                      id: 'SIG05', persona: 'PA_DIP', n: 'Broker the Grand Bargain', attrs: ['DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Coalition-Builder',
                      d: 'You seat the rancher next to the union man and both leave thinking they won.',
                      odds: O(0.66),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 3;
                              s.favors += 1;
                              return 'A bargain everyone can sell at home. +3 endorsement points, +1 favor.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A handshake, provisional. +1 endorsement point.';
                          }
                          return 'The table walks. No deal, and a bruised ego to mend.';
                      }
                  }),
                  mk({
                      id: 'SIG06', persona: 'PA_CHA', n: 'Remember Every Name', attrs: ['CHA'], risk: 'VOL',
                      cost: { a: 1, vp: 1 }, ph: [1, 2, 3], tag: 'signature — The Natural',
                      d: 'The kid, the dog, the surgery last spring. You remember, and they never forget that you did.',
                      odds: O(0.6),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              const c = 40 + Math.floor(rng_js_10.random() * 20);
                              s.contacts += c;
                              s.nameID += 4;
                              s.momentum += 1;
                              return `Every name lands. +${c} contacts, +4 name ID, momentum.`;
                          }
                          if (o.tier === 1) {
                              s.contacts += 22;
                              s.nameID += 2;
                              return '+22 contacts and +2 name ID. They tell their neighbors.';
                          }
                          if (o.tier === 2) {
                              s.contacts += 6;
                              return 'An off night for faces. +6 contacts.';
                          }
                          return 'You blank on the mayor’s wife. It travels. Nothing gained.';
                      }
                  }),
                  // ---- Pair personas ----
                  mk({
                      id: 'SIG07', persona: 'PA_CLO_CON', n: 'March on the Capitol Steps', attrs: ['CLO', 'CON'], risk: 'VOL',
                      cost: { a: 2, vp: 2 }, ph: [2, 3], tag: 'signature — The Movement Champion',
                      d: 'Conviction with muscle behind it — a crowd that showed up angry and organized.',
                      odds: O(0.57),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.momentum += 3;
                              s.nameID += 4;
                              s.contacts += 25;
                              s.messageSharp = true;
                              return 'The steps fill and the cameras come. +3 momentum, +4 name ID, +25 contacts, message sharp.';
                          }
                          if (o.tier === 1) {
                              s.momentum += 1;
                              s.nameID += 2;
                              s.contacts += 12;
                              return 'A respectable showing. +1 momentum, +2 name ID, +12 contacts.';
                          }
                          if (o.tier === 2) {
                              s.contacts += 5;
                              return 'Smaller than promised. +5 contacts.';
                          }
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'A bad sign steals the photo. Momentum lost.';
                      }
                  }),
                  mk({
                      id: 'SIG08', persona: 'PA_CLO_CRA', n: 'The Elbow', attrs: ['CLO', 'CRA'], risk: 'VOL',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Bare-Knuckle Populist',
                      d: 'Loud out front, and an elbow the establishment never sees coming.',
                      odds: O(0.58),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              hitRival(s, 12);
                              s.momentum += 2;
                              s.nameID += 2;
                              return "The elbow lands clean. The rival's ground buckles, +2 momentum, +2 name ID.";
                          }
                          if (o.tier === 1) {
                              hitRival(s, 6);
                              s.momentum += 1;
                              return 'A solid shot. The opposition gives ground, +1 momentum.';
                          }
                          if (o.tier === 2) {
                              return 'A glancing blow. Nothing much moves.';
                          }
                          s.hitPieces += 1;
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'You swing and miss, and the miss is the story. Momentum lost.';
                      }
                  }),
                  mk({
                      id: 'SIG09', persona: 'PA_CLO_INK', n: 'Outwork the Field', attrs: ['CLO', 'INK'], risk: 'SAFE',
                      cost: { a: 2 }, ph: [1, 2, 3], tag: 'signature — The Workhorse',
                      d: 'Grind plus the rulebook. You are still knocking when the others go home.',
                      odds: O(0.82),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 34 + Math.floor(rng_js_10.random() * 14);
                              s.contacts += c;
                              s.volPool += 1;
                              s.nameID += 2;
                              if (s.stage !== 'general' && !s.ballot)
                                  s.signatures += 20;
                              return `Nobody outworks you. +${c} contacts, a volunteer, +2 name ID${s.stage !== 'general' && !s.ballot ? ', +20 toward the ballot' : ''}.`;
                          }
                          s.contacts += 14;
                          return 'A long, ordinary, productive day. +14 contacts.';
                      }
                  }),
                  mk({
                      id: 'SIG10', persona: 'PA_CLO_DIP', n: 'The Family Name Opens the Gate', attrs: ['CLO', 'DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Rural Patriarch',
                      d: 'Your name means something here. The chairs already wave you through.',
                      odds: O(0.66),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 3;
                              s.contacts += 14;
                              s.groundsArr.slice(0, 2).forEach(g => (g.rapport = (g.rapport || 0) + 4));
                              return 'The gate opens on the name. +3 endorsement points, +14 contacts, two grounds warm.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'Polite nods, little more. +1 endorsement point.';
                          }
                          return 'The name cuts both ways today. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG11', persona: 'PA_CLO_CHA', n: 'The Homecoming', attrs: ['CLO', 'CHA'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Local Legend',
                      d: 'Star quarterback, then feed-store owner, now this. The county has rooted for you for decades.',
                      odds: O(0.68),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 26 + Math.floor(rng_js_10.random() * 12);
                              s.contacts += c;
                              s.nameID += 4;
                              s.momentum += 1;
                              return `The whole town turns out. +${c} contacts, +4 name ID, momentum.`;
                          }
                          if (o.tier === 2) {
                              s.contacts += 8;
                              return 'A warm but small welcome. +8 contacts.';
                          }
                          return 'The legend feels dated tonight. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG12', persona: 'PA_CON_CRA', n: 'Burn It Down to Build It Up', attrs: ['CON', 'CRA'], risk: 'VOL',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Insurgent',
                      d: 'A disciplined message and a knife for the primary. You are exactly as angry as you choose to be.',
                      odds: O(0.56),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              hitRival(s, 8);
                              s.momentum += 3;
                              s.messageSharp = true;
                              return 'The insurgency catches fire. Rival ground burns, +3 momentum, message sharp.';
                          }
                          if (o.tier === 1) {
                              hitRival(s, 4);
                              s.momentum += 1;
                              return 'The base roars. +1 momentum and a dent in the opposition.';
                          }
                          if (o.tier === 2) {
                              s.momentum += 1;
                              return 'Heat without light. +1 momentum.';
                          }
                          s.momentum = Math.max(0, s.momentum - 2);
                          return 'The fire jumps the line and singes you. Momentum lost.';
                      }
                  }),
                  mk({
                      id: 'SIG13', persona: 'PA_CON_INK', n: 'File the Whistleblower Complaint', attrs: ['CON', 'INK'], risk: 'VOL',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Reform Crusader',
                      d: 'A cause and the rulebook to advance it. You file, and the file has teeth.',
                      odds: O(0.58),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              hitRival(s, 10);
                              s.nameID += 4;
                              s.messageSharp = true;
                              return 'The complaint sticks and leads the news. Rival ground caves, +4 name ID, message sharp.';
                          }
                          if (o.tier === 1) {
                              hitRival(s, 5);
                              s.nameID += 2;
                              return 'A credible filing. +2 name ID and the opposition on defense.';
                          }
                          if (o.tier === 2) {
                              s.nameID += 1;
                              return 'Filed and noted, quietly. +1 name ID.';
                          }
                          s.hitPieces += 1;
                          return 'It reads as a stunt. It rebounds. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG14', persona: 'PA_CON_DIP', n: 'Cross the Aisle', attrs: ['CON', 'DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Statesman',
                      d: 'Steady, principled, trusted across the aisle — the kind they call "serious."',
                      odds: O(0.65),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 2;
                              s.momentum += 1;
                              s.nameID += 2;
                              return 'A serious figure, seriously received. +2 endorsement points, +1 momentum, +2 name ID.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'Respect, if not yet a rush. +1 endorsement point.';
                          }
                          return 'The base grumbles about the reach-across. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG15', persona: 'preacher', n: 'Revival Weekend', attrs: ['CON', 'CHA'], risk: 'STD',
                      cost: { a: 2, vp: 1 }, ph: [2, 3], tag: 'signature — The Preacher',
                      d: 'A pulpit is a precinct and Sundays are turnout. You move people, and you mean it.',
                      odds: O(0.64),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 30 + Math.floor(rng_js_10.random() * 16);
                              s.contacts += c;
                              s.volPool += 2;
                              s.momentum += 2;
                              return `The tent fills three nights running. +${c} contacts, +2 volunteers, +2 momentum.`;
                          }
                          if (o.tier === 2) {
                              s.contacts += 10;
                              s.volPool += 1;
                              return 'A modest revival. +10 contacts, +1 volunteer.';
                          }
                          return 'Empty pews and a long drive home. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG16', persona: 'PA_CRA_INK', n: 'Work the System', attrs: ['CRA', 'INK'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Fixer',
                      d: 'You know the rules AND how to bend them. Dangerous in a committee, deadly near a deadline.',
                      odds: O(0.67),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.favors += 1;
                              s.endorsePts += 2;
                              hitRival(s, 4);
                              return 'The machinery turns your way. +1 favor, +2 endorsement points, and the rival slips.';
                          }
                          if (o.tier === 2) {
                              s.favors += 1;
                              return 'A small lever, quietly pulled. +1 favor.';
                          }
                          return 'You over-reach and someone notices. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG17', persona: 'PA_CRA_DIP', n: 'The Grand Trade', attrs: ['CRA', 'DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Wheeler-Dealer',
                      d: 'Two of everything and a price on each. You can trade your way out of almost anything.',
                      odds: O(0.66),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.favors += 2;
                              s.endorsePts += 2;
                              return 'Everything for something. +2 favors, +2 endorsement points.';
                          }
                          if (o.tier === 2) {
                              s.favors += 1;
                              return 'A modest swap. +1 favor.';
                          }
                          return 'The trade collapses and both sides blame you. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG18', persona: 'PA_CRA_CHA', n: 'Steal the Cycle', attrs: ['CRA', 'CHA'], risk: 'VOL',
                      cost: { a: 1, $: 400 }, ph: [2, 3], tag: 'signature — The Showman',
                      d: 'Timing and charm: you know the line AND the moment to land it. Made for the cameras.',
                      odds: O(0.59),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.nameID += 6;
                              s.momentum += 3;
                              return 'You own the news for a week. +6 name ID, +3 momentum.';
                          }
                          if (o.tier === 1) {
                              s.nameID += 3;
                              s.momentum += 1;
                              return 'A clip that travels. +3 name ID, +1 momentum.';
                          }
                          if (o.tier === 2) {
                              s.nameID += 1;
                              return 'A minor segment. +1 name ID.';
                          }
                          s.momentum = Math.max(0, s.momentum - 1);
                          return 'The bit falls flat on camera. Momentum lost.';
                      }
                  }),
                  mk({
                      id: 'SIG19', persona: 'PA_INK_DIP', n: "The Speaker's Ear", attrs: ['INK', 'DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Committee Chair-in-Waiting',
                      d: 'Process mastery and the relationships to use it. Leadership is watching this profile.',
                      odds: O(0.66),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 3;
                              s.favors += 1;
                              return 'Leadership takes the meeting. +3 endorsement points, +1 favor.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A brief audience. +1 endorsement point.';
                          }
                          return 'The ear is elsewhere today. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG20', persona: 'PA_INK_CHA', n: "Explain It Like It's Simple", attrs: ['INK', 'CHA'], risk: 'SAFE',
                      cost: { a: 2 }, ph: [1, 2, 3], tag: 'signature — The Homegrown Wonk',
                      d: 'You explain the water-district budget so plainly people thank you for it.',
                      odds: O(0.8),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 24 + Math.floor(rng_js_10.random() * 12);
                              s.contacts += c;
                              s.nameID += 3;
                              s.messageSharp = true;
                              return `Clarity is charisma here. +${c} contacts, +3 name ID, message sharp.`;
                          }
                          s.contacts += 10;
                          s.nameID += 1;
                          return 'A patient, useful hour. +10 contacts, +1 name ID.';
                      }
                  }),
                  mk({
                      id: 'SIG21', persona: 'PA_DIP_CHA', n: 'Call In the Family Rolodex', attrs: ['DIP', 'CHA'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2], tag: "signature — The Dealmaker's Heir",
                      d: 'A known name and a gift for people. Doors open on the family reputation; you keep them open on your own.',
                      odds: O(0.67),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 2;
                              s.contacts += 14;
                              s.favors += 1;
                              return 'The old Rolodex still dials out. +2 endorsement points, +14 contacts, +1 favor.';
                          }
                          if (o.tier === 2) {
                              s.contacts += 8;
                              return 'A few old friends answer. +8 contacts.';
                          }
                          return 'The name is spent capital tonight. Nothing gained.';
                      }
                  }),
                  // ---- Hand-authored classics (must not lack a signature vs PA_* roster) ----
                  mk({
                      id: 'SIG22', persona: 'teacher', n: 'Parent-Teacher Circuit', attrs: ['CHA', 'DIP'], risk: 'SAFE',
                      cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Teacher',
                      d: 'Twenty years of cafeteria nights. You work the rooms that already know your name.',
                      odds: O(0.78),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 28 + Math.floor(rng_js_10.random() * 14);
                              s.contacts += c;
                              s.nameID += 2;
                              s.volPool += 1;
                              return `The gym fills with familiar faces. +${c} contacts, +2 name ID, +1 volunteer.`;
                          }
                          s.contacts += 12;
                          return 'A solid night of handshakes. +12 contacts.';
                      }
                  }),
                  mk({
                      id: 'SIG23', persona: 'veteran', n: 'Halls of Honor', attrs: ['CON', 'CLO'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Veteran',
                      d: 'The VFW and Legion still stand when the cameras leave. Bio is armor; the halls are turnout.',
                      odds: O(0.66),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.endorsePts += 1;
                              s.volPool += 2;
                              s.nameID += 2;
                              s.contacts += 16;
                              const hall = s.groundsArr.find(g => g.id === 'GR06');
                              if (hall)
                                  hall.rapport = Math.min(100, (hall.rapport || 0) + 8);
                              return 'The halls turn out. +1 endorsement, +2 volunteers, +2 name ID, +16 contacts, Legion rapport.';
                          }
                          if (o.tier === 2) {
                              s.volPool += 1;
                              s.contacts += 8;
                              return 'A respectful room. +1 volunteer, +8 contacts.';
                          }
                          return 'Empty chairs and old coffee. Nothing gained.';
                      }
                  }),
                  mk({
                      id: 'SIG24', persona: 'smallbiz', n: 'Call In the Store Credit', attrs: ['CRA', 'DIP'], risk: 'STD',
                      cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Feed-Store Owner',
                      d: 'Everyone still owes you a favor or a bag of feed. You cash favors before cash.',
                      odds: O(0.68),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              s.money += 600;
                              s.favors += 1;
                              s.contacts += 12;
                              s.endorsePts += 1;
                              return 'The ledger of favors pays. +$600, +1 favor, +12 contacts, +1 endorsement.';
                          }
                          if (o.tier === 2) {
                              s.money += 250;
                              s.contacts += 6;
                              return 'A few tabs settled. +$250, +6 contacts.';
                          }
                          return 'They smile and change the subject. Nothing gained.';
                      }
                  })
              ]);
          }
      };
  });
  /**
   * CANDIDATE ZERO — Unlock paths (docs/PATHS.md)
   * =============================================
   * The balanced-expandability engine: cards you EARN by performing prerequisite
   * plays. A "path" names a combo of required card ids; playing each required
   * card the first time advances the path (a lore toast fires), and completing
   * the combo unlocks a reward card — injected into your draw pile with a lore
   * toast announcing it.
   *
   * This is pure data + a tiny reducer (engine/paths.ts). Reward cards live only
   * here (never in ALL_PLAYS/drafts), gated so they surface only once unlocked —
   * so the catalog grows through play without polluting the base deck.
   *
   * Adding a pathway = one PATH entry + one reward PlayCard. That is the whole
   * extensibility contract; see docs/PATHS.md.
   */
  System.register("data/paths", ["engine/rng"], function (exports_33, context_33) {
      "use strict";
      var rng_js_11, PATHS, PATH_REWARDS, REWARD_BY_PATH;
      var __moduleName = context_33 && context_33.id;
      // --------------------------- reward cards ---------------------------
      // Gated to only appear once their path is unlocked (belt) and only ever
      // injected on unlock (suspenders). Normal odds/tier resolution.
      function clamp(v, lo, hi) {
          return Math.max(lo, Math.min(hi, v));
      }
      function reward(def) {
          const gate = (s) => { var _a; return !!((_a = s.pathsUnlocked) === null || _a === void 0 ? void 0 : _a[def.pathId]); };
          return {
              id: def.id,
              n: def.n,
              cost: def.cost,
              risk: def.risk,
              ph: def.ph,
              tag: def.tag,
              d: def.d,
              attrs: def.attrs,
              kind: 'action',
              residency: 'main',
              control: 'player',
              req: gate,
              show: gate,
              odds: def.odds,
              run: def.run
          };
      }
      return {
          setters: [
              function (rng_js_11_1) {
                  rng_js_11 = rng_js_11_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Unlock paths (docs/PATHS.md)
               * =============================================
               * The balanced-expandability engine: cards you EARN by performing prerequisite
               * plays. A "path" names a combo of required card ids; playing each required
               * card the first time advances the path (a lore toast fires), and completing
               * the combo unlocks a reward card — injected into your draw pile with a lore
               * toast announcing it.
               *
               * This is pure data + a tiny reducer (engine/paths.ts). Reward cards live only
               * here (never in ALL_PLAYS/drafts), gated so they surface only once unlocked —
               * so the catalog grows through play without polluting the base deck.
               *
               * Adding a pathway = one PATH entry + one reward PlayCard. That is the whole
               * extensibility contract; see docs/PATHS.md.
               */
              /** The pathways. Trigger ids are verified to exist in the live catalog. */
              exports_33("PATHS", PATHS = [
                  {
                      id: 'P_CAMPUS',
                      name: 'The Campus Machine',
                      requires: ['PL01', 'PL02', 'PL06'], // Block Walk + Phone Bank + Town Hall
                      reward: 'RW_INTERNS',
                      stepToasts: [
                          'A grad student takes a flyer and asks how to actually help.',
                          'The campus chapter is passing your number around.',
                          'A professor offers her seminar for a voter drive.'
                      ],
                      unlockToast: 'The university chapter signs on — interns will carry your clipboards. New play unlocked: Outsource Petition Drive to University Interns.'
                  },
                  {
                      id: 'P_ROLODEX',
                      name: "The Bundler's Rolodex",
                      requires: ['PL05', 'PL13', 'PL03'], // Filing Fee + Fish Fry + Yard Signs
                      reward: 'RW_BUNDLER',
                      stepToasts: [
                          'A donor notices you can actually close. He mentions his list.',
                          'The fish-fry crowd has money and opinions about spending it.',
                          'A finance guy likes your signs. He likes his cut better.'
                      ],
                      unlockToast: "A bundler adopts your race — the checks come pre-sorted now. New play unlocked: Work the Bundler's List."
                  },
                  {
                      id: 'P_MACHINE',
                      name: 'The County Machine',
                      requires: ['PL08', 'PL14', 'PL11'], // Kitchen-Table + Court the Chairs + Straw Poll
                      reward: 'RW_PRECINCT',
                      stepToasts: [
                          'A precinct chair remembers your name at the coffee.',
                          'The county chairs stop testing you and start counting you.',
                          'The straw poll makes the machine take you seriously.'
                      ],
                      unlockToast: 'The precinct captains fall in line — the machine turns for you now. New play unlocked: Turn Out the Precinct Captains.'
                  },
                  {
                      id: 'P_PRESS',
                      name: 'The Press Machine',
                      requires: ['PL09', 'PL10', 'PL07'], // Earned Media + Press Release + Candidate Forum
                      reward: 'RW_ANCHOR',
                      stepToasts: [
                          'A reporter saves your number instead of losing it.',
                          'The assignment desk starts calling you for quotes.',
                          'You handle the forum well enough that the anchor notices.'
                      ],
                      unlockToast: 'The evening anchor takes your call now. New play unlocked: The Anchor Takes Your Call.'
                  },
                  {
                      id: 'P_FIELD',
                      name: 'The Field Army',
                      requires: ['PL01', 'PL16', 'PL21B'], // Block Walk + Recruit Volunteers + Canvass Captain
                      reward: 'RW_TURF',
                      stepToasts: [
                          'A block walk turns up three people who want to knock too.',
                          'The volunteer list is long enough to organize now.',
                          'A captain steps up to run a turf of their own.'
                      ],
                      unlockToast: 'Your volunteers become an operation with a spine. New play unlocked: Stand Up a Turf Operation.'
                  },
                  {
                      id: 'P_RETAIL',
                      name: 'The Retail Grind',
                      requires: ['PL01', 'PL06', 'PL80'], // Block Walk + Town Hall + Grocery-Store Handshakes
                      reward: 'RW_REGULAR',
                      stepToasts: [
                          'The same faces start showing up at your events.',
                          'A diner names a booth after your Tuesday visits.',
                          'The regulars decide you are one of them.'
                      ],
                      unlockToast: 'You are a fixture now, not a candidate. New play unlocked: Become a Fixture.'
                  },
                  {
                      id: 'P_LADDER',
                      name: 'Climb the Ladder',
                      requires: ['PL12', 'PL30', 'PL14'], // Club Speech + Prayer Breakfast + Court the Chairs
                      reward: 'RW_KINGMAKER',
                      stepToasts: [
                          'A club president takes your call the first time now.',
                          'The corridor of pastors and chairs opens a little wider.',
                          'The people who pick winners start picking you.'
                      ],
                      unlockToast: 'The kingmakers decide it is your turn. New play unlocked: Cash the Kingmaker’s Chit.'
                  }
              ]);
              exports_33("PATH_REWARDS", PATH_REWARDS = [
                  reward({
                      id: 'RW_INTERNS',
                      pathId: 'P_CAMPUS',
                      n: 'Outsource Petition Drive to University Interns',
                      attrs: ['INK', 'CLO'],
                      risk: 'STD',
                      cost: { a: 1 },
                      ph: [1],
                      tag: 'the intern army',
                      d: 'A hundred students, one afternoon, clipboards everywhere. Signatures at scale — the labor door, staffed by the young.',
                      odds: (s) => clamp(0.66 + s.volPool * 0.02, 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              const g = 70 + Math.floor(rng_js_11.random() * 30);
                              s.signatures += g;
                              if (s.signatures >= s.sigNeed && !s.ballot) {
                                  s.ballot = true;
                                  return `The interns swarm campus — the threshold clears in a day. On the ballot.`;
                              }
                              return `The interns swarm campus. +${g} signatures (${s.signatures}/${s.sigNeed}).`;
                          }
                          if (o.tier === 1) {
                              s.signatures += 40;
                              return `Steady sheets from the quad. +40 signatures (${s.signatures}/${s.sigNeed}).`;
                          }
                          if (o.tier === 2) {
                              s.signatures += 15;
                              return 'Half the interns overslept. +15 signatures.';
                          }
                          const lost = 20 + Math.floor(rng_js_11.random() * 20);
                          s.signatures = Math.max(0, s.signatures - lost);
                          return `An intern forged names to hit quota — the chair strikes ${lost} sheets.`;
                      }
                  }),
                  reward({
                      id: 'RW_BUNDLER',
                      pathId: 'P_ROLODEX',
                      n: "Work the Bundler's List",
                      attrs: ['CRA', 'DIP'],
                      risk: 'STD',
                      cost: { a: 1 },
                      ph: [1, 2, 3],
                      tag: 'pre-sorted checks',
                      d: "Someone else's rolodex, dialing for you. The money arrives bundled, with strings you can mostly ignore.",
                      odds: (s) => clamp(0.64 + (s.assets.length ? 0.05 : 0), 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              const m = 1400 + Math.floor(rng_js_11.random() * 700);
                              s.money += m;
                              return `The bundler delivers. +$${m.toLocaleString()} in one packet.`;
                          }
                          if (o.tier === 1) {
                              const m = 700 + Math.floor(rng_js_11.random() * 300);
                              s.money += m;
                              return `A solid haul. +$${m.toLocaleString()}.`;
                          }
                          if (o.tier === 2) {
                              s.money += 250;
                              return 'A thin week for the list. +$250.';
                          }
                          s.exposure = (s.exposure || 0) + 1;
                          return 'A bundled check bounces back tainted. The story is the strings, not the sum.';
                      }
                  }),
                  reward({
                      id: 'RW_PRECINCT',
                      pathId: 'P_MACHINE',
                      n: 'Turn Out the Precinct Captains',
                      attrs: ['DIP', 'CLO'],
                      risk: 'STD',
                      cost: { a: 1, vp: 1 },
                      ph: [2, 3],
                      tag: 'the machine turns',
                      d: 'Every captain a small turnout operation. When they move together, the count moves with them.',
                      odds: (s) => clamp(0.66 + s.endorsePts * 0.01, 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.endorsePts += 3;
                              s.groundsArr.forEach(g => (g.gotv += 0.08));
                              return 'The captains march in lockstep. +3 endorsement points and turnout banked across every ground.';
                          }
                          if (o.tier === 1) {
                              s.endorsePts += 2;
                              s.groundsArr.slice(0, 2).forEach(g => (g.gotv += 0.06));
                              return '+2 endorsement points and turnout up where it counts.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A few captains hang back. +1 endorsement point.';
                          }
                          return 'A captain plays both sides. Nothing moves this week.';
                      }
                  }),
                  reward({
                      id: 'RW_ANCHOR', pathId: 'P_PRESS', n: 'The Anchor Takes Your Call',
                      attrs: ['CHA', 'CRA'], risk: 'STD', cost: { a: 1 }, ph: [2, 3], tag: 'the evening desk',
                      d: 'A friendly anchor and a standing invitation. When you have something to say, the county hears it that night.',
                      odds: (s) => clamp(0.66 + (s.messageSharp ? 0.08 : 0), 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.nameID += 7;
                              s.momentum += 2;
                              return 'Lead story, your framing. +7 name ID, +2 momentum.';
                          }
                          if (o.tier === 1) {
                              s.nameID += 4;
                              s.momentum += 1;
                              return 'A fair, favorable segment. +4 name ID, +1 momentum.';
                          }
                          if (o.tier === 2) {
                              s.nameID += 1;
                              return 'A brief mention at the bottom of the hour. +1 name ID.';
                          }
                          return 'A rival feeds the desk a better story. You get bumped.';
                      }
                  }),
                  reward({
                      id: 'RW_TURF', pathId: 'P_FIELD', n: 'Stand Up a Turf Operation',
                      attrs: ['CLO', 'DIP'], risk: 'SAFE', cost: { a: 1, vp: 1 }, ph: [1, 2, 3], tag: 'boots with a plan',
                      d: 'Captains, turfs, cut lists. The volunteers you recruited become a machine that runs without you.',
                      odds: (s) => clamp(0.72 + s.volPool * 0.02, 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 30 + Math.floor(rng_js_11.random() * 16);
                              s.contacts += c;
                              s.volPool += 1;
                              if (s.stage === 'general')
                                  s.groundsArr.slice(0, 3).forEach(g => (g.gotv += 0.06));
                              return `The operation hums. +${c} contacts, a volunteer${s.stage === 'general' ? ', turnout banked' : ''}.`;
                          }
                          s.contacts += 12;
                          return 'A steady day from the turfs. +12 contacts.';
                      }
                  }),
                  reward({
                      id: 'RW_REGULAR', pathId: 'P_RETAIL', n: 'Become a Fixture',
                      attrs: ['CHA'], risk: 'SAFE', cost: { a: 1 }, ph: [1, 2, 3], tag: 'one of us',
                      d: 'You are not campaigning anymore; you are just around, the way the weather is around. People vote for the weather they know.',
                      odds: () => 0.85,
                      run: (s, o) => {
                          if (o.tier <= 1) {
                              const c = 22 + Math.floor(rng_js_11.random() * 12);
                              s.contacts += c;
                              s.nameID += 3;
                              s.momentum += 1;
                              return `Familiarity does the work. +${c} contacts, +3 name ID, momentum.`;
                          }
                          s.contacts += 10;
                          return 'A quiet, friendly day among the regulars. +10 contacts.';
                      }
                  }),
                  reward({
                      id: 'RW_KINGMAKER', pathId: 'P_LADDER', n: "Cash the Kingmaker's Chit",
                      attrs: ['DIP'], risk: 'STD', cost: { a: 1 }, ph: [2, 3], tag: 'your turn',
                      d: 'The people who decide have decided it is your turn. One call, and the slate rearranges itself around you.',
                      odds: (s) => clamp(0.64 + s.endorsePts * 0.01, 0.05, 0.95),
                      run: (s, o) => {
                          if (o.tier === 0) {
                              s.endorsePts += 4;
                              s.favors += 1;
                              s.momentum += 1;
                              return 'The slate falls in behind you. +4 endorsement points, +1 favor, momentum.';
                          }
                          if (o.tier === 1) {
                              s.endorsePts += 2;
                              return 'A firm word from on high. +2 endorsement points.';
                          }
                          if (o.tier === 2) {
                              s.endorsePts += 1;
                              return 'A hedged blessing. +1 endorsement point.';
                          }
                          return 'A rival calls in an older chit. The kingmakers wait and see.';
                      }
                  })
              ]);
              /** path id → reward card id (engine/paths.ts consults this on unlock). */
              exports_33("REWARD_BY_PATH", REWARD_BY_PATH = Object.fromEntries(PATHS.map(p => [p.id, p.reward])));
          }
      };
  });
  /**
   * CANDIDATE ZERO — Unlock-path reducer
   * ====================================
   * Called after every successful play (playFromHand). Records the played card,
   * advances any path it is a required step of (firing a lore toast the first
   * time each step is met), and when a path's full combo is complete, unlocks it
   * — injecting the reward card into the draw pile and firing a lore toast.
   *
   * Pure and deterministic: only reads/writes GameState + DeckState and pushes
   * log entries. No RNG, no rule math.
   */
  System.register("engine/paths", ["data/paths", "engine/deck"], function (exports_34, context_34) {
      "use strict";
      var paths_js_1, deck_js_1;
      var __moduleName = context_34 && context_34.id;
      function toast(state, text) {
          state.log.push({ week: state.week, kind: 'note', text });
      }
      /**
       * @param cardId the card that was just successfully played.
       * @param deck   draw pile to inject a reward into (omit in contexts without a
       *               physical deck; the reward is still marked owned on state.deck).
       */
      function advancePaths(state, cardId, deck) {
          var _a, _b;
          if (!state.playedCardIds)
              state.playedCardIds = {};
          if (!state.pathProgress)
              state.pathProgress = {};
          if (!state.pathsUnlocked)
              state.pathsUnlocked = {};
          const prevCount = (_a = state.playedCardIds[cardId]) !== null && _a !== void 0 ? _a : 0;
          state.playedCardIds[cardId] = prevCount + 1;
          const firstTimePlayed = prevCount === 0;
          if (!firstTimePlayed)
              return; // paths only care about the FIRST play of a card
          for (const path of paths_js_1.PATHS) {
              if (state.pathsUnlocked[path.id])
                  continue;
              const stepIndex = path.requires.indexOf(cardId);
              if (stepIndex < 0)
                  continue; // this card isn't a step of this path
              const met = path.requires.filter(id => state.playedCardIds[id]).length;
              state.pathProgress[path.id] = met;
              if (met === path.requires.length) {
                  // Complete → unlock + grant the reward.
                  state.pathsUnlocked[path.id] = true;
                  const rewardId = paths_js_1.REWARD_BY_PATH[path.id];
                  if (rewardId) {
                      if (!state.deck)
                          state.deck = [];
                      if (deck)
                          deck_js_1.injectIntoDrawPile(deck, state, [rewardId]);
                      else if (!state.deck.includes(rewardId))
                          state.deck.push(rewardId);
                  }
                  toast(state, path.unlockToast);
              }
              else {
                  // Progress step → the flavor toast for this step.
                  toast(state, (_b = path.stepToasts[stepIndex]) !== null && _b !== void 0 ? _b : `${path.name}: progress.`);
              }
          }
      }
      exports_34("advancePaths", advancePaths);
      return {
          setters: [
              function (paths_js_1_1) {
                  paths_js_1 = paths_js_1_1;
              },
              function (deck_js_1_1) {
                  deck_js_1 = deck_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Unlock-path reducer
               * ====================================
               * Called after every successful play (playFromHand). Records the played card,
               * advances any path it is a required step of (firing a lore toast the first
               * time each step is met), and when a path's full combo is complete, unlocks it
               * — injecting the reward card into the draw pile and firing a lore toast.
               *
               * Pure and deterministic: only reads/writes GameState + DeckState and pushes
               * log entries. No RNG, no rule math.
               */
          }
      };
  });
  /**
   * CANDIDATE ZERO — Intro / setup content
   * Persona, issue, district, region. Choices bind.
   */
  System.register("data/setup", ["engine/rng", "engine/reputation"], function (exports_35, context_35) {
      "use strict";
      var rng_js_12, reputation_js_10, PERSONAS, ISSUES, DISTRICTS, REGIONS, HARNESS_DEFAULT_SETUP;
      var __moduleName = context_35 && context_35.id;
      function bumpAttrs(s, boost) {
          var _a;
          if (!s.attrs) {
              s.attrs = { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
          }
          for (const [k, v] of Object.entries(boost)) {
              if (typeof v === 'number') {
                  const id = k;
                  s.attrs[id] = ((_a = s.attrs[id]) !== null && _a !== void 0 ? _a : 10) + v;
              }
          }
      }
      function getPersona(id) { return PERSONAS.find(p => p.id === id); }
      exports_35("getPersona", getPersona);
      function getIssue(id) { return ISSUES.find(i => i.id === id); }
      exports_35("getIssue", getIssue);
      function getDistrict(id) { return DISTRICTS.find(d => d.id === id); }
      exports_35("getDistrict", getDistrict);
      function getRegion(id) { return REGIONS.find(r => r.id === id); }
      exports_35("getRegion", getRegion);
      function applySetup(state, sel) {
          const persona = getPersona(sel.personaId);
          const issue = getIssue(sel.issueId);
          const district = getDistrict(sel.districtId);
          const region = getRegion(sel.regionId);
          if (!persona || !issue || !district || !region) {
              throw new Error(`Invalid setup: ${JSON.stringify(sel)}`);
          }
          persona.apply(state);
          bumpAttrs(state, persona.attrs);
          state.persona = persona.n;
          state.personaId = sel.personaId;
          state.issue = issue.n;
          state.assets.push('ISSUE_' + issue.tag);
          const field = district.field(rng_js_12.random);
          state.district = {
              id: district.id,
              name: district.n,
              align: district.align,
              incumbent: district.incumbent,
              field,
              trap: district.trap
          };
          state.rivals = Array.from({ length: field }, (_, i) => ({
              id: 'RIV' + (i + 1),
              n: 'Rival ' + (i + 1)
          }));
          state.regionHook = region.hook;
          for (const [k, v] of Object.entries(region.boost)) {
              const key = k;
              if (typeof v === 'number')
                  state.faces[key] = (state.faces[key] || 0) + v;
          }
          // Region also nudges attrs lightly (geography as temperament)
          if (region.hook === 'metro')
              bumpAttrs(state, { CRA: 1, CHA: 1 });
          if (region.hook === 'gulf')
              bumpAttrs(state, { CLO: 1, DIP: 1 });
          if (region.hook === 'east' || region.hook === 'panhandle')
              bumpAttrs(state, { CON: 1, CHA: 1 });
          if (region.hook === 'permian')
              bumpAttrs(state, { CRA: 1, CLO: 1 });
          if (region.hook === 'valley')
              bumpAttrs(state, { DIP: 1, CLO: 1 });
          if (region.hook === 'hill')
              bumpAttrs(state, { INK: 1, CON: 1 });
          state.assets.push('REGION_' + region.id.toUpperCase());
          state.sigNeed = Math.max(200, 450 + region.petitionMod);
          const attrSummary = Object.entries(state.attrs)
              .map(([k, v]) => `${k}${v}`)
              .join(' ');
          state.log.push({
              week: 1,
              kind: 'note',
              text: `Identity: ${persona.n} · ${issue.n} · ${district.n} · ${region.n}. ` +
                  `Sigs need ${state.sigNeed}. Attrs [${attrSummary}]. Choices bind.`
          });
          return state;
      }
      exports_35("applySetup", applySetup);
      /** Parse setup ids from CLI flags; falls back to harness default per field. */
      function setupFromPartial(partial) {
          var _a, _b, _c, _d;
          return {
              personaId: (_a = partial.personaId) !== null && _a !== void 0 ? _a : HARNESS_DEFAULT_SETUP.personaId,
              issueId: (_b = partial.issueId) !== null && _b !== void 0 ? _b : HARNESS_DEFAULT_SETUP.issueId,
              districtId: (_c = partial.districtId) !== null && _c !== void 0 ? _c : HARNESS_DEFAULT_SETUP.districtId,
              regionId: (_d = partial.regionId) !== null && _d !== void 0 ? _d : HARNESS_DEFAULT_SETUP.regionId
          };
      }
      exports_35("setupFromPartial", setupFromPartial);
      return {
          setters: [
              function (rng_js_12_1) {
                  rng_js_12 = rng_js_12_1;
              },
              function (reputation_js_10_1) {
                  reputation_js_10 = reputation_js_10_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Intro / setup content
               * Persona, issue, district, region. Choices bind.
               */
              // Note: `apply` only sets persona-specific starting resources/flavor. Root
              // attr bumps come from `attrs` alone (applied once, centrally, in
              // applySetup) so the UI's pre-game blurb and the actual campaign grant can
              // never drift apart the way two hand-copied literals could.
              exports_35("PERSONAS", PERSONAS = [
                  {
                      id: 'veteran', n: 'The Veteran', tag: 'bio armor',
                      d: 'Two tours and a flag on the porch. Bio is armor.',
                      attrs: { CON: 3, CLO: 2, CHA: 1 },
                      apply: s => { s.nameID += 3; s.faces.T += 8; s.assets.push('BIO_VETERAN'); }
                  },
                  {
                      id: 'teacher', n: 'The Teacher', tag: 'the rooms',
                      d: 'Twenty years of parent-teacher nights. You know the rooms.',
                      attrs: { CHA: 3, DIP: 2, CON: 1 },
                      apply: s => { s.contacts += 25; s.faces.G += 8; s.assets.push('BIO_TEACHER'); }
                  },
                  {
                      id: 'preacher', n: 'The Preacher', tag: 'pulpit precinct',
                      d: 'A pulpit is a precinct. Sundays are turnout.',
                      attrs: { CHA: 3, CLO: 2, DIP: 1 },
                      // archive PA_CON_CHA (line 357) pushed B02 Sunday Congregation — same intent
                      apply: s => {
                          s.volPool += 2;
                          s.faces.F += 8;
                          s.faces.T += 6;
                          s.assets.push('BIO_PREACHER');
                          if (!s.backers.includes('B02'))
                              s.backers.push('B02');
                      }
                  },
                  {
                      id: 'smallbiz', n: 'The Feed-Store Owner', tag: 'credit and favors',
                      d: 'Everyone owes you credit or a favor.',
                      attrs: { CRA: 3, DIP: 2, CLO: 1 },
                      apply: s => { s.money += 1500; s.faces.O += 8; s.assets.push('BIO_FEEDSTORE'); }
                  },
                  // Ported from archive/prototype-single-file.html's 21-persona archetype
                  // roster (2026-07-17) — see docs/SRD-NOTES.md. PA_CON_CHA ("The Preacher")
                  // skipped: name collision with the hand-authored 'preacher' persona above.
                  {
                      id: 'PA_CLO', n: 'The Powerhouse', tag: 'fills the room',
                      d: 'A presence that fills a room and a turnout operation to match. You win by showing up bigger than anyone.',
                      attrs: { CLO: 5 },
                      apply: s => { s.faces.G += 20; s.volPool += 1; }
                  },
                  {
                      id: 'PA_CON', n: 'The True Believer', tag: 'message discipline',
                      d: 'The message arrives pre-sharpened and never wavers. Discipline is your whole discipline.',
                      attrs: { CON: 5 },
                      apply: s => { s.faces.T += 24; s.messageSharp = true; s.estabPenalty = true; }
                  },
                  {
                      id: 'PA_CRA', n: 'The Operator', tag: 'knows an angle',
                      d: 'You know whose cousin owes whom, and when to move. The angle is always there if you look.',
                      attrs: { CRA: 5 },
                      apply: s => { s.faces.O += 24; s.favors = 1; reputation_js_10.addAlly(s, 'AL11', 3); }
                  },
                  {
                      id: 'PA_INK', n: 'The Parliamentarian', tag: 'reads the rules twice',
                      d: 'You read the rules twice. Process is a weapon that never jams.',
                      attrs: { INK: 5 },
                      apply: s => { s.faces.P += 24; s.parlSave = true; }
                  },
                  {
                      id: 'PA_DIP', n: 'The Coalition-Builder', tag: 'rooms open for you',
                      d: 'You can seat the rancher next to the union man and make them both feel heard. Rooms open for you.',
                      attrs: { DIP: 5 },
                      apply: s => { s.faces.O += 12; reputation_js_10.addAlly(s, 'AL01', 2); }
                  },
                  {
                      id: 'PA_CHA', n: 'The Natural', tag: 'doors open wider',
                      d: 'Every door opens a little wider. People just take to you, and you know exactly what to do with that.',
                      attrs: { CHA: 5 },
                      apply: s => { s.faces.F += 18; s.nameID += 4; }
                  },
                  {
                      id: 'PA_CLO_CON', n: 'The Movement Champion', tag: 'crowd and discipline',
                      d: 'Conviction with muscle behind it. You bring the crowd and you keep them in line.',
                      attrs: { CLO: 3, CON: 3 },
                      apply: s => { s.faces.T += 14; s.faces.F += 8; s.momentum += 2; }
                  },
                  {
                      id: 'PA_CLO_CRA', n: 'The Bare-Knuckle Populist', tag: 'fights dirty when it must',
                      d: 'You go out loud and you fight dirty when you must. The establishment never sees the elbow coming.',
                      attrs: { CLO: 3, CRA: 3 },
                      apply: s => { s.faces.F += 14; s.faces.O -= 4; s.nameID += 3; }
                  },
                  {
                      id: 'PA_CLO_INK', n: 'The Workhorse', tag: 'grind plus rules',
                      d: 'You outwork everyone and you know the process cold. Grind plus rules is a hard thing to beat.',
                      attrs: { CLO: 3, INK: 3 },
                      apply: s => { s.faces.P += 10; s.faces.G += 10; }
                  },
                  {
                      id: 'PA_CLO_DIP', n: 'The Rural Patriarch', tag: 'two grounds start warm',
                      d: 'Your name means something here, and the chairs already wave. Two grounds start warm.',
                      attrs: { CLO: 3, DIP: 3 },
                      apply: s => {
                          s.faces.G += 18;
                          const g1 = s.groundsArr.find(g => g.id === 'GR02');
                          if (g1)
                              g1.rapport = 20;
                          const g2 = s.groundsArr.find(g => g.id === 'GR06');
                          if (g2)
                              g2.rapport = 20;
                      }
                  },
                  {
                      id: 'PA_CLO_CHA', n: 'The Local Legend', tag: "the county's been rooting for you",
                      d: 'Star quarterback, then feed-store owner, now this. The county has been rooting for you for decades.',
                      attrs: { CLO: 3, CHA: 3 },
                      apply: s => { s.faces.G += 10; s.faces.F += 8; s.nameID += 8; }
                  },
                  {
                      id: 'PA_CON_CRA', n: 'The Insurgent', tag: 'a knife for the primary',
                      d: 'A disciplined message and a knife for the primary. You are exactly as angry as you choose to be.',
                      attrs: { CON: 3, CRA: 3 },
                      apply: s => { s.faces.T += 12; s.faces.O -= 6; s.messageSharp = true; }
                  },
                  {
                      id: 'PA_CON_INK', n: 'The Reform Crusader', tag: 'straight shooter, week one',
                      d: 'A cause and the rulebook to advance it. Straight Shooter before week one.',
                      attrs: { CON: 3, INK: 3 },
                      apply: s => { s.faces.P += 12; s.faces.F += 8; reputation_js_10.addRep(s, 'R02'); }
                  },
                  {
                      id: 'PA_CON_DIP', n: 'The Statesman', tag: 'trusted across the aisle',
                      d: 'Steady, principled, trusted across the aisle. The kind they call "serious."',
                      attrs: { CON: 3, DIP: 3 },
                      apply: s => { s.faces.P += 8; s.faces.G += 8; s.endorsePts += 1; }
                  },
                  {
                      id: 'PA_CRA_INK', n: 'The Fixer', tag: 'bends the rules cleanly',
                      d: 'You know the rules AND how to bend them. Dangerous in a committee, deadly near a deadline.',
                      attrs: { CRA: 3, INK: 3 },
                      apply: s => { s.faces.O += 10; s.faces.P += 8; s.favors = 1; }
                  },
                  {
                      id: 'PA_CRA_DIP', n: 'The Wheeler-Dealer', tag: 'a price on everything',
                      d: 'Two of everything and a price on each. You can trade your way out of almost anything.',
                      attrs: { CRA: 3, DIP: 3 },
                      apply: s => { s.faces.O += 12; s.faces.L += 8; s.money += 1500; s.favors = 1; }
                  },
                  {
                      id: 'PA_CRA_CHA', n: 'The Showman', tag: 'made for the cameras',
                      d: 'Timing and charm: you know the line AND the moment to land it. Made for the cameras.',
                      attrs: { CRA: 3, CHA: 3 },
                      apply: s => { s.faces.F += 16; s.backers.push('B07'); s.mediaBonus = 0.15; }
                  },
                  {
                      id: 'PA_INK_DIP', n: 'The Committee Chair-in-Waiting', tag: 'leadership is watching this profile',
                      d: 'Process mastery and the relationships to use it. Leadership is watching this profile.',
                      attrs: { INK: 3, DIP: 3 },
                      apply: s => { s.faces.O += 8; s.faces.P += 8; reputation_js_10.addAlly(s, 'AL01', 2); }
                  },
                  {
                      id: 'PA_INK_CHA', n: 'The Homegrown Wonk', tag: 'smart and likeable is rare',
                      d: 'You explain the water district budget so plainly people thank you for it. Smart and likeable is rare.',
                      attrs: { INK: 3, CHA: 3 },
                      apply: s => { s.faces.P += 10; s.assets.push('A02'); }
                  },
                  {
                      id: 'PA_DIP_CHA', n: "The Dealmaker's Heir", tag: 'the family reputation opens doors',
                      d: "A known name and a gift for people. Doors open on the family reputation; you keep them open on your own.",
                      attrs: { DIP: 3, CHA: 3 },
                      apply: s => { s.faces.G += 10; s.faces.L += 6; s.money += 2500; s.nameID += 6; }
                  }
              ]);
              exports_35("ISSUES", ISSUES = [
                  { id: 'taxes', n: 'Property taxes', tag: 'taxes', d: 'Appraisal districts, school M&O, the levy that never sleeps.' },
                  { id: 'water', n: 'Water rights', tag: 'water', d: 'Groundwater districts, river authorities, and drought maps.' },
                  { id: 'schools', n: 'School finance', tag: 'schools', d: 'Formulas, facilities, and Friday nights.' },
                  { id: 'border', n: 'The border', tag: 'border', d: 'Federal failure, local consequence. Easy to shout; hard to govern.' },
                  { id: 'hospitals', n: 'Rural hospitals', tag: 'hospitals', d: 'OB deserts, ambulance miles, and the last ER light.' },
                  { id: 'land', n: 'Eminent domain', tag: 'land', d: 'Pipelines, corridors, and ranch gates.' },
                  // Ported from archive/prototype-single-file.html (2026-07-17) — see docs/SRD-NOTES.md.
                  { id: 'tolls', n: 'Highway tolls', tag: 'tolls', d: 'They promised the tolls would come off when the road was paid. The road is paid.' },
                  { id: 'teacherpay', n: 'Teacher pay', tag: 'teacherpay', d: 'Twenty years in a classroom and a second job at the feed store. The room already agrees; make it vote.' },
                  { id: 'ag-subsidies', n: 'Ag subsidies & crop insurance', tag: 'ag-subsidies', d: 'One hailstorm from foreclosure, every single year. The FM roads know the arithmetic.' },
                  { id: 'corruption', n: 'Courthouse corruption', tag: 'corruption', d: "The commissioners' court has been a family business for forty years. Naming it takes nerve." },
                  { id: 'broadband', n: 'Rural broadband', tag: 'broadband', d: 'Kids do homework in the church parking lot for the wifi. The future has a dead zone.' },
                  { id: 'bail-reform', n: 'Prison & bail reform', tag: 'bail-reform', d: "The unit is the county's biggest employer and its heaviest silence. Careful, serious ground." },
                  { id: 'mental-health', n: 'Mental health funding', tag: 'mental-health', d: 'The sheriff runs the largest psychiatric facility in three counties: his jail. Even he says so.' },
                  { id: 'veterans', n: "Veterans' services", tag: 'veterans', d: 'The Legion hall knows every name on the waiting list. Show up and listen first.' },
                  { id: 'grid', n: 'Rural grid reliability', tag: 'grid', d: 'Everyone remembers the freeze. Every generator in every barn is a campaign memorial.' },
                  { id: 'payday-lending', n: 'Payday lending', tag: 'payday-lending', d: 'Four storefronts by the plant gate, 400% APR. The math preys on shift workers by design.' },
                  { id: 'vouchers', n: 'Public school vouchers', tag: 'vouchers', d: 'The church wants them; the small towns fear them — the district IS the school. A knife-edge issue.' },
                  { id: 'election-integrity', n: 'Election integrity', tag: 'election-integrity', d: 'The county clerk is tired, honest, and yelled at from both directions. Order-flavored, radioactive, real.' }
              ]);
              exports_35("DISTRICTS", DISTRICTS = [
                  { id: 'open', n: 'Open seat, safe district', d: 'Incumbent retired. Crowded field.', align: 'safe', incumbent: false, field: rng => 3 + Math.floor(rng() * 3) },
                  { id: 'incumb', n: 'Safe district, entrenched incumbent', d: 'Twelve years and a war chest.', align: 'safe', incumbent: true, field: () => 1 },
                  { id: 'comp', n: 'Competitive district, open primary', d: 'Primary then general. Two fights.', align: 'competitive', incumbent: false, field: () => 2 },
                  { id: 'wrong', n: 'Wrong-party district', d: 'Bravery is not arithmetic.', align: 'wrong', incumbent: false, trap: true, field: () => 0 }
              ]);
              exports_35("REGIONS", REGIONS = [
                  { id: 'east', n: 'East Texas pine belt', d: 'Church calendars run the week.', hook: 'east', flavor: ['pine pollen'], places: ['VFW'], boost: { G: 4, T: 2 }, petitionMod: 0 },
                  { id: 'valley', n: 'Rio Grande Valley', d: 'Colonias, citrus, late turnout machines.', hook: 'valley', flavor: ['resaca at dusk'], places: ['parish hall'], boost: { O: 4, F: 2 }, petitionMod: 50 },
                  { id: 'hill', n: 'Hill Country', d: 'Property taxes and water wars.', hook: 'hill', flavor: ['limestone dust'], places: ['co-op board'], boost: { P: 3, T: 3 }, petitionMod: 0 },
                  { id: 'panhandle', n: 'Panhandle / High Plains', d: 'Wind, feedlots, long miles.', hook: 'panhandle', flavor: ['dust devil'], places: ['grain elevator'], boost: { G: 5, T: 2 }, petitionMod: -50 },
                  { id: 'metro', n: 'Metro suburban ring', d: 'HOAs, new money, endless mail.', hook: 'metro', flavor: ['school board blood sport'], places: ['HOA clubhouse'], boost: { F: 3, L: 2, O: 2 }, petitionMod: 100 },
                  { id: 'gulf', n: 'Gulf Coast', d: 'Refineries, ports, unions.', hook: 'gulf', flavor: ['plant flare'], places: ['union hall'], boost: { O: 3, L: 3, F: 2 }, petitionMod: 0 },
                  { id: 'west', n: 'West Texas oil & ranch', d: 'Permian money and nameless gates.', hook: 'permian', flavor: ['pumpjack'], places: ['ranch gate'], boost: { L: 3, G: 3, O: 2 }, petitionMod: -80 }
              ]);
              exports_35("HARNESS_DEFAULT_SETUP", HARNESS_DEFAULT_SETUP = {
                  personaId: 'teacher',
                  issueId: 'taxes',
                  districtId: 'open',
                  regionId: 'east'
              });
          }
      };
  });
  /**
   * CANDIDATE ZERO — Minimal playable campaign loop
   * Hand → choose play → resolve → (repeat while AP) → advance week.
   * Pure engine surface for harnesses and eventual UI/Swift ports.
   */
  System.register("engine/loop", ["data/plays", "data/session-plays", "engine/deck", "engine/play", "engine/state", "engine/calendar", "engine/feedback", "engine/reputation", "engine/legacy", "engine/debt", "engine/entities", "data/waiting-plays", "data/signature-plays", "data/paths", "engine/paths", "data/setup"], function (exports_36, context_36) {
      "use strict";
      var plays_js_2, session_plays_js_1, deck_js_2, play_js_1, state_js_2, calendar_js_4, feedback_js_2, reputation_js_11, legacy_js_2, debt_js_5, entities_js_6, waiting_plays_js_1, signature_plays_js_1, paths_js_2, paths_js_3, setup_js_1, CAMP_PETITION, CAMP_FILING_FEE, CAMP_SHOP_BASE, CAMP_SESSION_BASE, CAMP_WAITING_BASE, CAMP_STARMAP_BASE, CAMP_STARMAP_MV01;
      var __moduleName = context_36 && context_36.id;
      function snapshot(state) {
          return {
              week: state.week,
              ap: state.ap,
              apMax: state.apMax,
              fieldAp: state.fieldAp,
              money: state.money,
              availableCash: debt_js_5.availableCash(state),
              debt: state.debt || 0,
              contacts: state.contacts,
              nameID: state.nameID,
              volPool: state.volPool,
              signatures: state.signatures,
              ballot: state.ballot,
              momentum: state.momentum,
              endorsePts: state.endorsePts,
              hitPieces: state.hitPieces,
              walkCount: state.walkCount,
              alliesWarm: state.allies.filter(a => a.warm > 0).length,
              assetsOwned: state.assets.filter(a => /^A\d+/.test(a)).length,
              oblsCount: state.obls.length
          };
      }
      exports_36("snapshot", snapshot);
      /** Full runtime catalog: deck plays + shop BUY* + session SS* actions. */
      function buildCatalog(plays = plays_js_2.ALL_PLAYS) {
          const map = new Map(plays.map(p => [p.id, p]));
          // Shop is always registered (archive assetPlays always available in menu).
          for (const p of plays_js_2.SHOP_PLAYS)
              map.set(p.id, p);
          // Phase 4: session pipeline + survival plays
          for (const p of session_plays_js_1.SESSION_PLAYS)
              map.set(p.id, p);
          for (const p of waiting_plays_js_1.WAITING_PLAYS)
              map.set(p.id, p);
          // Persona-exclusive signature cards (gated by req/show + deck injection).
          for (const p of signature_plays_js_1.SIGNATURE_PLAYS)
              map.set(p.id, p);
          // Path-unlock reward cards (gated; injected on unlock — see engine/paths.ts).
          for (const p of paths_js_2.PATH_REWARDS)
              map.set(p.id, p);
          return map;
      }
      exports_36("buildCatalog", buildCatalog);
      function createCampaign(overrides = {}) {
          const { setup: setupIn, autoDraft: _autoDraft, ...stateOverrides } = overrides;
          // Seed first so deck shuffle and weekly draws share the stream.
          const state = state_js_2.createNewState({
              money: 200,
              volPool: 1,
              ...stateOverrides
          });
          const setup = {
              ...setup_js_1.HARNESS_DEFAULT_SETUP,
              ...(setupIn !== null && setupIn !== void 0 ? setupIn : {})
          };
          setup_js_1.applySetup(state, setup);
          state.lastPhase = state_js_2.getPhase(state);
          // Seed starter deck inventory (ownership) from the same list that seeds the
          // physical draw pile (createDeckState's default), so the two can't drift.
          state.deck = [...new Set(deck_js_2.STARTER_DECK_IDS)];
          const deckState = deck_js_2.createDeckState();
          // Deal this persona their one signature card — exclusive (no other persona's
          // deck ever contains it) and reachable (shuffled into the draw pile).
          const sigId = signature_plays_js_1.SIGNATURE_BY_PERSONA[setup.personaId];
          if (sigId)
              deck_js_2.injectIntoDrawPile(deckState, state, [sigId]);
          // Persist seed on state for multi-cycle deterministic re-file.
          if (stateOverrides.seed !== undefined) {
              state.seed = Number(stateOverrides.seed) >>> 0 || 1;
          }
          return {
              state,
              deck: deckState,
              catalog: buildCatalog(),
              handSize: deck_js_2.DEFAULT_HAND_SIZE,
              filingDeadline: calendar_js_4.PRIMARY_WEEKS,
              setup
          };
      }
      exports_36("createCampaign", createCampaign);
      /**
       * Deterministic next-cycle seed (LCG step). Prefer this over Date.now() so
       * multi-run careers stay reproducible when a seed is carried on state.
       */
      function nextCycleSeed(prevSeed) {
          const s = (Number(prevSeed) >>> 0) || 1;
          return ((s * 1103515245 + 12345) >>> 0) || 1;
      }
      exports_36("nextCycleSeed", nextCycleSeed);
      /**
       * After waiting season: re-file as the same persona/issue/district/region.
       * Applies legacy carry (waiting banks, traits, debt). Does not open setup.
       */
      function continueAfterWaiting(prev, legacy, seed) {
          var _a;
          const prevSeed = (_a = prev.state.seed) !== null && _a !== void 0 ? _a : 1;
          const nextSeed = seed !== null && seed !== void 0 ? seed : nextCycleSeed(prevSeed);
          const next = createCampaign({ seed: nextSeed, setup: prev.setup });
          legacy_js_2.applyLegacy(next.state, legacy);
          return next;
      }
      exports_36("continueAfterWaiting", continueAfterWaiting);
      /**
       * "Stand for Reelection" — ported from the archive's startIncumbentRun().
       * A won_general terminal doesn't have to end the ballad: the wheel turns
       * straight into the next filing period with the same persona/issue/region,
       * carrying a discounted share of what the last term built (archive's
       * exact carry-forward formulas below) rather than resetting to zero.
       *
       * Phase 3: win-branch debt retirement runs on the *old* state first
       * (retireDebtOnWin) — self-loan clears cheap; PAC bridge leaves OB1 +
       * sessionFlags.pac_lender_claim on the carried sessionFlags/reps path.
       * Loss-path debt is applied via applyLegacy → applyLegacyDebt, not here.
       */
      function createIncumbentCampaign(old, legacy) {
          // Settle the last race's notes before the wheel turns (win branch).
          const retirement = debt_js_5.retireDebtOnWin(old.state);
          const next = createCampaign({ setup: old.setup });
          const s = next.state;
          const o = old.state;
          s.contacts = Math.max(400, Math.round((o.contacts || 0) * 0.6));
          s.nameID = Math.max(45, Math.round((o.nameID || 0) * 0.8) + 30);
          s.money = Math.max(4000, 2500 + Math.round(Math.max(0, o.money) * 0.4));
          s.endorsePts = Math.max(4, o.endorsePts || 0);
          s.ballot = true; // incumbents don't petition
          s.volPool = Math.max(4, Math.round((o.volPool || 0) * 0.6));
          s.termNumber = (o.termNumber || 1) + 1;
          s.reps = [...o.reps];
          s.incumbentRun = true;
          s.tier = 1;
          // Win path: books cleared (debt 0). PAC Session claim may persist.
          s.debt = 0;
          s.pacBridgeDebt = 0;
          s.selfLoanTaken = false;
          s.sessionFlags = { ...(o.sessionFlags || {}) };
          if (retirement.sessionClaim) {
              s.sessionFlags.pac_lender_claim = true;
              // Carry OB1 only (Session leash) — not the full free-text/obls dump.
              if (!s.obls.includes('OB1'))
                  s.obls.push('OB1');
          }
          // Incumbency reads as a favorable seat (few serious primary challengers,
          // a friendlier general) rather than modular's `district.incumbent` flag,
          // which models the OPPOSING side being the entrenched one — setting it
          // true here would incorrectly double-penalize the player's own race.
          if (s.district) {
              s.district = { ...s.district, align: 'safe', incumbent: false, field: 1 };
              s.rivals = [{ id: 'RIV1', n: 'Rival 1' }];
          }
          // Ownership carries forward (ground game already built); physical draw
          // pile rebuilt to include it.
          s.deck = [...new Set([...(o.deck || []), ...(s.deck || [])])];
          next.deck = deck_js_2.createDeckState(s.deck);
          legacy_js_2.applyLegacy(s, legacy);
          s.log.push({
              week: s.week,
              kind: 'note',
              text: 'THE WHEEL TURNS — filing opens again, and this time the name on the ' +
                  'incumbent line is yours. You skip the petition table and begin KNOWN: ' +
                  'name recognition, a donor list, a record. That record is also a target.'
          });
          if (retirement.sessionClaim) {
              s.log.push({
                  week: s.week,
                  kind: 'note',
                  text: 'THE THIRD HOUSE REMEMBERS — notes retired, but OB1 (PAC String) ' +
                      'rides into Session. Committee assignment and a future vote are not free.'
              });
          }
          else if (retirement.selfRetired > 0) {
              s.log.push({
                  week: s.week,
                  kind: 'note',
                  text: `SELF-LOAN CLEARED — paid $${retirement.feePaid} to close the bank note. No Session leash.`
              });
          }
          next.state.lastPhase = state_js_2.getPhase(next.state);
          return next;
      }
      exports_36("createIncumbentCampaign", createIncumbentCampaign);
      /**
       * If phase increased (ballot → 2, general → 3), open a 3-card draft.
       * Strategies/harnesses pass auto=true to pick option 0 immediately.
       */
      function maybeOfferPhaseDraft(campaign, auto = true) {
          var _a;
          const phase = state_js_2.getPhase(campaign.state);
          const prev = (_a = campaign.state.lastPhase) !== null && _a !== void 0 ? _a : phase;
          if (phase <= prev) {
              campaign.state.lastPhase = phase;
              return null;
          }
          const draft = deck_js_2.buildPhaseDraft(campaign.state, 3);
          draft.phase = phase;
          campaign.state.lastPhase = phase;
          if (!draft.options.length)
              return null;
          campaign.state.pendingDraft = draft;
          campaign.state.log.push({
              week: campaign.state.week,
              kind: 'note',
              text: `Phase ${phase} turn — draft ${draft.options.join(' / ')} (pick one for the pool).`
          });
          if (auto) {
              return deck_js_2.autoResolvePhaseDraft(campaign.state, campaign.deck);
          }
          return null;
      }
      exports_36("maybeOfferPhaseDraft", maybeOfferPhaseDraft);
      function pickPhaseDraft(campaign, index) {
          return deck_js_2.resolvePhaseDraft(campaign.state, index, campaign.deck);
      }
      exports_36("pickPhaseDraft", pickPhaseDraft);
      /**
       * General kit gravity — make Act II play different from Act I.
       * Inject GOTV spine into physical deck + pull key tools into hand when possible.
       */
      function ensureGeneralTools(campaign) {
          var _a;
          if (campaign.state.stage !== 'general')
              return;
          const { deck, state } = campaign;
          const inPlay = (id) => deck.draw.includes(id) || deck.hand.includes(id) || deck.discard.includes(id);
          /** Prefer hand so the lever is usable this week, not buried in a 20-card pile. */
          const ensureInDeckAndPreferHand = (id) => {
              if (!inPlay(id)) {
                  deck_js_2.injectIntoDrawPile(deck, state, [id]);
              }
              // Pull from draw/discard into hand if room (or always if missing from hand)
              if (deck.hand.includes(id))
                  return;
              const di = deck.draw.indexOf(id);
              if (di >= 0) {
                  deck.draw.splice(di, 1);
                  deck.hand.push(id);
                  return;
              }
              const ci = deck.discard.indexOf(id);
              if (ci >= 0) {
                  deck.discard.splice(ci, 1);
                  deck.hand.push(id);
              }
          };
          const hadGotv = inPlay('PL19');
          ensureInDeckAndPreferHand('PL19');
          if (!hadGotv) {
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'GENERAL KIT — GOTV Weekend is in your hand. Block walks and phone banks now bank turnout. Kitchen-table club math is closed for November.'
              });
          }
          // Volunteer spine for GOTV cost (vp:1)
          if (((_a = state.volPool) !== null && _a !== void 0 ? _a : 0) < 2 && !inPlay('PL16')) {
              deck_js_2.injectIntoDrawPile(deck, state, ['PL16']);
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'Volunteer starve-out: Recruit Volunteers enters the deck. GOTV costs bodies.'
              });
          }
          // Flatbed doctrine — archive Rides to the Polls when A06 owned
          if (state.assets.includes('A06') && !inPlay('PL23')) {
              ensureInDeckAndPreferHand('PL23');
              state.log.push({
                  week: state.week,
                  kind: 'note',
                  text: 'The Flatbed is gassed: Rides to the Polls available. Low-turnout turf converts hardest.'
              });
          }
      }
      exports_36("ensureGeneralTools", ensureGeneralTools);
      function listPlayableHand(campaign) {
          const out = [];
          const inHandIds = new Set();
          // Phase 4: session uses always-available SS* plays, not campaign hand/shop.
          if (campaign.state.stage === 'session') {
              let i = 0;
              for (const card of session_plays_js_1.SESSION_PLAYS) {
                  if (play_js_1.isPlayable(campaign.state, card)) {
                      out.push({ index: CAMP_SESSION_BASE - i, card });
                      i++;
                  }
              }
              return out;
          }
          // Waiting season: path-scoped WA* Special kit only
          if (campaign.state.stage === 'waiting') {
              let i = 0;
              for (const card of waiting_plays_js_1.WAITING_PLAYS) {
                  if (play_js_1.isPlayable(campaign.state, card)) {
                      out.push({ index: CAMP_WAITING_BASE - i, card });
                      i++;
                  }
              }
              return out;
          }
          campaign.deck.hand.forEach((id, index) => {
              const card = campaign.catalog.get(id);
              if (card && play_js_1.isPlayable(campaign.state, card)) {
                  out.push({ index, card });
                  inHandIds.add(id);
              }
          });
          if (!campaign.state.ballot) {
              // Only offer the camp-action fallback when the real card isn't already
              // sitting in hand — otherwise Petition Drive / Filing Fee show up twice
              // in the same menu (harmless but confusing: two entries, two mechanics
              // for discarding the physical copy vs. leaving it inert).
              const petition = campaign.catalog.get('PL04');
              const fee = campaign.catalog.get('PL05');
              if (petition && !inHandIds.has('PL04') && play_js_1.isPlayable(campaign.state, petition)) {
                  out.push({ index: CAMP_PETITION, card: petition });
              }
              if (fee && !inHandIds.has('PL05') && play_js_1.isPlayable(campaign.state, fee)) {
                  out.push({ index: CAMP_FILING_FEE, card: fee });
              }
          }
          // Phase 2: asset shop — always-available BUY* plays (archive assetPlays).
          // 0 AP; paid with $ or volunteers. Not drawn into hand.
          let shopI = 0;
          for (const [id, card] of campaign.catalog) {
              if (!id.startsWith('BUY'))
                  continue;
              if (play_js_1.isPlayable(campaign.state, card)) {
                  out.push({ index: CAMP_SHOP_BASE - shopI, card });
                  shopI++;
              }
          }
          // Starmap pilots: all open Special movement verbs as camp actions.
          const openVerbs = entities_js_6.listAvailableMovementVerbIds(campaign.state);
          let mvI = 0;
          for (const verbId of openVerbs) {
              const mv = campaign.catalog.get(verbId);
              if (mv && play_js_1.isPlayable(campaign.state, mv)) {
                  out.push({ index: CAMP_STARMAP_BASE - mvI, card: mv });
                  mvI++;
              }
          }
          return out;
      }
      exports_36("listPlayableHand", listPlayableHand);
      /** Resolve a camp / shop / session synthetic index to a catalog card id, or null. */
      function campIndexToCardId(campaign, handIndex) {
          var _a, _b, _c, _d, _e, _f;
          if (handIndex === CAMP_PETITION)
              return 'PL04';
          if (handIndex === CAMP_FILING_FEE)
              return 'PL05';
          // Index bands: waiting ≤-500 · starmap ≤-401 · session ≤-300 · shop ≤-200
          if (handIndex <= CAMP_WAITING_BASE) {
              const waitingCards = waiting_plays_js_1.WAITING_PLAYS.filter(c => play_js_1.isPlayable(campaign.state, c));
              const i = CAMP_WAITING_BASE - handIndex;
              return (_b = (_a = waitingCards[i]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
          }
          if (handIndex <= CAMP_STARMAP_BASE) {
              const openVerbs = entities_js_6.listAvailableMovementVerbIds(campaign.state).filter(id => {
                  const card = campaign.catalog.get(id);
                  return card && play_js_1.isPlayable(campaign.state, card);
              });
              const i = CAMP_STARMAP_BASE - handIndex;
              return (_c = openVerbs[i]) !== null && _c !== void 0 ? _c : null;
          }
          if (handIndex <= CAMP_SESSION_BASE) {
              const sessionCards = session_plays_js_1.SESSION_PLAYS.filter(c => play_js_1.isPlayable(campaign.state, c));
              const i = CAMP_SESSION_BASE - handIndex;
              return (_e = (_d = sessionCards[i]) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : null;
          }
          if (handIndex <= CAMP_SHOP_BASE) {
              const shopCards = [...campaign.catalog.entries()]
                  .filter(([id, card]) => id.startsWith('BUY') && play_js_1.isPlayable(campaign.state, card))
                  .map(([id]) => id);
              const i = CAMP_SHOP_BASE - handIndex;
              return (_f = shopCards[i]) !== null && _f !== void 0 ? _f : null;
          }
          return null;
      }
      exports_36("campIndexToCardId", campIndexToCardId);
      function ensureBallotAccessInHand(campaign) {
          if (campaign.state.ballot)
              return null;
          const hand = campaign.deck.hand;
          if (hand.includes('PL04') || hand.includes('PL05'))
              return null;
          const pull = (id) => {
              const di = campaign.deck.draw.indexOf(id);
              if (di >= 0) {
                  campaign.deck.draw.splice(di, 1);
                  hand.push(id);
                  return true;
              }
              const ci = campaign.deck.discard.indexOf(id);
              if (ci >= 0) {
                  campaign.deck.discard.splice(ci, 1);
                  hand.push(id);
                  return true;
              }
              return false;
          };
          if (pull('PL04'))
              return 'PL04';
          if (pull('PL05'))
              return 'PL05';
          return null;
      }
      exports_36("ensureBallotAccessInHand", ensureBallotAccessInHand);
      function startWeek(campaign) {
          if (campaign.state.stage === 'general') {
              ensureGeneralTools(campaign);
          }
          feedback_js_2.markWeekStart(campaign.state);
          // Session / waiting: no campaign deck growth (different kits)
          if (campaign.state.stage === 'session') {
              campaign.state.log.push({
                  week: campaign.state.week,
                  kind: 'week',
                  text: `Session week ${campaign.state.week} — the building moves at the building's pace.`
              });
              return [];
          }
          if (campaign.state.stage === 'waiting') {
              campaign.state.log.push({
                  week: campaign.state.week,
                  kind: 'week',
                  text: `Waiting week ${campaign.state.week} — interim orbit. No campaign draw.`
              });
              return [];
          }
          // Mandatory weekly growth: own new cards AND put them in the draw pile
          const newCards = deck_js_2.enforceWeeklyDraw(campaign.state);
          if (newCards.length > 0) {
              // enforceWeeklyDraw already pushed ownership; inject physical copies
              // (ownership may already include them — push to draw only)
              for (const id of newCards) {
                  campaign.deck.draw.push(id);
              }
              campaign.state.log.push({
                  week: campaign.state.week,
                  kind: 'draw',
                  text: `New card${newCards.length > 1 ? 's' : ''} this week: ${newCards.join(', ')}`
              });
          }
          const need = Math.max(0, campaign.handSize - campaign.deck.hand.length);
          const drawn = deck_js_2.drawCards(campaign.deck, need);
          const injected = ensureBallotAccessInHand(campaign);
          const note = injected ? ` [ballot access: ${injected}]` : '';
          campaign.state.log.push({
              week: campaign.state.week,
              kind: 'draw',
              text: `Drew ${drawn.length}: ${drawn.join(', ') || '(empty)'}${note}`
          });
          return [...newCards, ...drawn];
      }
      exports_36("startWeek", startWeek);
      function playFromHand(campaign, handIndex, ground) {
          const campId = campIndexToCardId(campaign, handIndex);
          if (campId) {
              const card = campaign.catalog.get(campId);
              if (!card)
                  return { ok: false, reason: `Unknown camp card ${campId}` };
              if ((campId === 'PL04' || campId === 'PL05') && campaign.state.ballot) {
                  return { ok: false, reason: 'Already on ballot', cardId: campId, cardName: card.n };
              }
              if (!play_js_1.isPlayable(campaign.state, card)) {
                  return { ok: false, reason: 'Not playable', cardId: card.id, cardName: card.n };
              }
              // Shop / camp actions are not physical hand cards — no discard.
              const campOutcome = play_js_1.executePlay(campaign.state, card, ground);
              if (campOutcome.ok)
                  paths_js_3.advancePaths(campaign.state, card.id, campaign.deck);
              return campOutcome;
          }
          const id = campaign.deck.hand[handIndex];
          if (id === undefined)
              return { ok: false, reason: 'Invalid hand index' };
          const card = campaign.catalog.get(id);
          if (!card) {
              deck_js_2.takeFromHand(campaign.deck, handIndex);
              deck_js_2.discardCard(campaign.deck, id);
              return { ok: false, reason: `Unknown card ${id}` };
          }
          if (!play_js_1.isPlayable(campaign.state, card)) {
              return { ok: false, reason: 'Not playable', cardId: card.id, cardName: card.n };
          }
          deck_js_2.takeFromHand(campaign.deck, handIndex);
          const outcome = play_js_1.executePlay(campaign.state, card, ground);
          if (outcome.ok)
              paths_js_3.advancePaths(campaign.state, card.id, campaign.deck);
          deck_js_2.discardCard(campaign.deck, id);
          return outcome;
      }
      exports_36("playFromHand", playFromHand);
      function endWeekInPlace(campaign) {
          deck_js_2.discardHand(campaign.deck);
          const transition = calendar_js_4.advanceCampaignWeek(campaign.state);
          // Catches week-gated reputation thresholds (e.g. R02) even on a week
          // with no plays; play-triggered thresholds are already checked in
          // executePlay. See src/engine/reputation.ts.
          reputation_js_11.repCheck(campaign.state);
          entities_js_6.syncMovementFlags(campaign.state);
          return transition;
      }
      exports_36("endWeekInPlace", endWeekInPlace);
      /** Close the week feedback summary (call before calendar advance). */
      function summarizeWeek(campaign, plays) {
          const summary = feedback_js_2.buildWeekSummary(campaign.state, plays.filter(p => p.ok));
          campaign.state.log.push({
              week: campaign.state.week,
              kind: 'summary',
              text: summary.juice
          });
          return summary;
      }
      exports_36("summarizeWeek", summarizeWeek);
      function runWeek(campaign, choose) {
          const weekAtStart = campaign.state.week;
          const phaseAtStart = state_js_2.getPhase(campaign.state);
          const stageAtStart = campaign.state.stage;
          const drawn = startWeek(campaign);
          const plays = [];
          let guard = campaign.state.apMax * 4 + 4;
          while (campaign.state.ap > 0 && !campaign.state.over && guard-- > 0) {
              // Resolve any pending draft before plays (auto for harness path)
              if (campaign.state.pendingDraft) {
                  deck_js_2.autoResolvePhaseDraft(campaign.state, campaign.deck);
              }
              const playable = listPlayableHand(campaign);
              if (playable.length === 0)
                  break;
              const handIndex = choose(playable, campaign.state);
              if (handIndex === null || handIndex === undefined)
                  break;
              const wasBallot = campaign.state.ballot;
              const outcome = playFromHand(campaign, handIndex);
              plays.push(outcome);
              if (!wasBallot && campaign.state.ballot) {
                  maybeOfferPhaseDraft(campaign, true);
              }
              if (!outcome.ok)
                  break;
          }
          const summary = summarizeWeek(campaign, plays);
          const transition = endWeekInPlace(campaign);
          if (transition.kind === 'enter_general') {
              ensureGeneralTools(campaign);
              maybeOfferPhaseDraft(campaign, true);
          }
          return {
              week: weekAtStart,
              phase: phaseAtStart,
              stage: stageAtStart,
              drawn,
              plays,
              endLedger: snapshot(campaign.state),
              transition: transition.kind === 'none' ? undefined : transition,
              summary
          };
      }
      exports_36("runWeek", runWeek);
      function runWeeks(campaign, throughWeek, choose) {
          const reports = [];
          while (campaign.state.week <= throughWeek && !campaign.state.over) {
              reports.push(runWeek(campaign, choose));
          }
          return reports;
      }
      exports_36("runWeeks", runWeeks);
      /** Run primary + general until the campaign ends or calendar exhausts. */
      function runFullCampaign(campaign, choose) {
          const reports = [];
          let guard = 40;
          while (!campaign.state.over && guard-- > 0) {
              reports.push(runWeek(campaign, choose));
          }
          return reports;
      }
      exports_36("runFullCampaign", runFullCampaign);
      return {
          setters: [
              function (plays_js_2_1) {
                  plays_js_2 = plays_js_2_1;
              },
              function (session_plays_js_1_1) {
                  session_plays_js_1 = session_plays_js_1_1;
              },
              function (deck_js_2_1) {
                  deck_js_2 = deck_js_2_1;
              },
              function (play_js_1_1) {
                  play_js_1 = play_js_1_1;
              },
              function (state_js_2_1) {
                  state_js_2 = state_js_2_1;
              },
              function (calendar_js_4_1) {
                  calendar_js_4 = calendar_js_4_1;
              },
              function (feedback_js_2_1) {
                  feedback_js_2 = feedback_js_2_1;
              },
              function (reputation_js_11_1) {
                  reputation_js_11 = reputation_js_11_1;
              },
              function (legacy_js_2_1) {
                  legacy_js_2 = legacy_js_2_1;
              },
              function (debt_js_5_1) {
                  debt_js_5 = debt_js_5_1;
              },
              function (entities_js_6_1) {
                  entities_js_6 = entities_js_6_1;
              },
              function (waiting_plays_js_1_1) {
                  waiting_plays_js_1 = waiting_plays_js_1_1;
              },
              function (signature_plays_js_1_1) {
                  signature_plays_js_1 = signature_plays_js_1_1;
              },
              function (paths_js_2_1) {
                  paths_js_2 = paths_js_2_1;
              },
              function (paths_js_3_1) {
                  paths_js_3 = paths_js_3_1;
              },
              function (setup_js_1_1) {
                  setup_js_1 = setup_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Minimal playable campaign loop
               * Hand → choose play → resolve → (repeat while AP) → advance week.
               * Pure engine surface for harnesses and eventual UI/Swift ports.
               */
              exports_36("CAMP_PETITION", CAMP_PETITION = -101);
              exports_36("CAMP_FILING_FEE", CAMP_FILING_FEE = -105);
              /** Camp-style shop index base: -200 - i for the i-th available BUY* play. */
              exports_36("CAMP_SHOP_BASE", CAMP_SHOP_BASE = -200);
              /** Session play synthetic index base: -300 - i. */
              exports_36("CAMP_SESSION_BASE", CAMP_SESSION_BASE = -300);
              /** Waiting-season play synthetic index base: -500 - i. */
              exports_36("CAMP_WAITING_BASE", CAMP_WAITING_BASE = -500);
              /**
               * Starmap movement verb camp indices: -401, -402, … (one per open MV##).
               * Legacy alias CAMP_STARMAP_MV01 = first slot.
               */
              exports_36("CAMP_STARMAP_BASE", CAMP_STARMAP_BASE = -401);
              /** @deprecated use CAMP_STARMAP_BASE — kept for any external refs */
              exports_36("CAMP_STARMAP_MV01", CAMP_STARMAP_MV01 = CAMP_STARMAP_BASE);
          }
      };
  });
  /**
   * Goal strip — frozen GoalStripInput + GOAL_COPY matrices (DESIGN rev 3).
   * Leaf: no main/session imports. Presentation only.
   */
  System.register("ui/goal-strip", ["engine/state", "engine/loop", "engine/waiting"], function (exports_37, context_37) {
      "use strict";
      var state_js_3, loop_js_1, waiting_js_3, GOAL_COPY;
      var __moduleName = context_37 && context_37.id;
      function totalGotv(state) {
          return state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
      }
      exports_37("totalGotv", totalGotv);
      function billStageLabelUi(bill) {
          var _a;
          const labels = [
              'Unfiled',
              'Filed',
              'Referred',
              'Heard',
              'Voted Out',
              'Calendar',
              'Passed House',
              'Through Senate',
              'SIGNED'
          ];
          if (bill.pipelineStage < 0)
              return 'Dead';
          return (_a = labels[Math.min(8, bill.pipelineStage)]) !== null && _a !== void 0 ? _a : bill.status;
      }
      exports_37("billStageLabelUi", billStageLabelUi);
      function buildGoalStripInput(state, opts) {
          var _a, _b, _c, _d, _e, _f, _g, _h;
          const bank = state.sessionFlags || {};
          return {
              stage: state.stage,
              over: !!state.over,
              outcome: state.outcome,
              pendingDraft: !!((_b = (_a = state.pendingDraft) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.length),
              week: state.week,
              weeksTotal: state.weeksTotal,
              stageWeek: state_js_3.stageWeek(state),
              ap: state.ap,
              fieldAp: state.fieldAp,
              ballot: state.ballot,
              signatures: state.signatures,
              sigNeed: state.sigNeed,
              contacts: state.contacts,
              nameID: state.nameID,
              totalGotv: totalGotv(state),
              billPipelineStage: state.bill ? state.bill.pipelineStage : null,
              billStatus: (_d = (_c = state.bill) === null || _c === void 0 ? void 0 : _c.status) !== null && _d !== void 0 ? _d : null,
              billHeat: (_f = (_e = state.bill) === null || _e === void 0 ? void 0 : _e.heat) !== null && _f !== void 0 ? _f : 0,
              speakerFreeze: Number(((_g = state.sessionFlags) === null || _g === void 0 ? void 0 : _g.speakerFreeze) || 0),
              districtStanding: state.districtStanding,
              waitingPathId: (_h = state.waitingPathId) !== null && _h !== void 0 ? _h : null,
              bankContacts: Number(bank.waitBankContacts || 0),
              bankName: Number(bank.waitBankName || 0),
              waitingWeeks: waiting_js_3.WAITING_WEEKS,
              money: state.money,
              availableCash: loop_js_1.snapshot(state).availableCash,
              ...opts
          };
      }
      exports_37("buildGoalStripInput", buildGoalStripInput);
      function apExhausted(input) {
          return input.ap <= 0 && input.fieldAp <= 0;
      }
      function billLabel(input) {
          if (input.billPipelineStage === null || !input.billStatus)
              return 'No bill';
          return billStageLabelUi({
              pipelineStage: input.billPipelineStage,
              status: input.billStatus
          });
      }
      function selectGoalKey(input) {
          if (input.over)
              return 'over';
          if (input.pendingDraft)
              return 'draft';
          if (input.stage === 'waiting')
              return 'waiting';
          if (input.stage === 'session') {
              if (apExhausted(input))
                  return 'session_ap0';
              const stage = input.billPipelineStage;
              const needsFloor = stage !== null && stage >= 5;
              if (input.speakerFreeze > 0 && needsFloor)
                  return 'session_freeze';
              if (stage === null || stage === 0)
                  return 'session_unfiled';
              if (stage >= 5)
                  return 'session_calendar';
              return 'session_pipeline';
          }
          if (input.stage === 'general') {
              return apExhausted(input) ? 'general_ap0' : 'general';
          }
          // primary
          if (!input.ballot) {
              return apExhausted(input) ? 'primary_pre_ballot_ap0' : 'primary_pre_ballot';
          }
          return apExhausted(input) ? 'primary_on_ballot_ap0' : 'primary_on_ballot';
      }
      exports_37("selectGoalKey", selectGoalKey);
      function fill(template, vars) {
          return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : '');
      }
      function formatGoalStrip(input) {
          var _a, _b;
          const key = selectGoalKey(input);
          const row = GOAL_COPY[key];
          const vars = {
              outcome: (_a = input.outcome) !== null && _a !== void 0 ? _a : 'ended',
              signatures: input.signatures,
              sigNeed: input.sigNeed,
              stageWeek: input.stageWeek,
              contacts: input.contacts,
              nameID: input.nameID,
              totalGotv: input.totalGotv,
              week: input.week,
              weeksTotal: input.weeksTotal,
              billHeat: input.billHeat,
              billLabel: billLabel(input),
              speakerFreeze: input.speakerFreeze,
              path: (_b = input.waitingPathId) !== null && _b !== void 0 ? _b : 'orbit',
              bankContacts: input.bankContacts,
              bankName: input.bankName,
              waitingWeeks: input.waitingWeeks
          };
          return {
              key,
              primary: fill(row.primary, vars) || '\u00a0',
              progress: fill(row.progress, vars) || '\u00a0',
              next: fill(row.next, vars) || '\u00a0'
          };
      }
      exports_37("formatGoalStrip", formatGoalStrip);
      /** Paint `#goal-strip` three-line contract. Safe if node missing (pre-HTML). */
      function renderGoalStrip(input) {
          const root = document.getElementById('goal-strip');
          if (!root)
              return;
          const { primary, progress, next, key } = formatGoalStrip(input);
          root.dataset.goalKey = key;
          // Support either bare text children or labeled rows (.goal-primary-text, etc.)
          const setLine = (sel, text) => {
              const el = root.querySelector(sel);
              if (el)
                  el.textContent = text;
          };
          setLine('.goal-primary-text', primary);
          setLine('.goal-progress-text', progress);
          setLine('.goal-next-text', next);
          // Fallback: legacy three bare divs
          if (!root.querySelector('.goal-primary-text')) {
              const p = root.querySelector('.goal-primary');
              const g = root.querySelector('.goal-progress');
              const n = root.querySelector('.goal-next');
              if (p)
                  p.textContent = primary;
              if (g)
                  g.textContent = progress;
              if (n)
                  n.textContent = next;
          }
      }
      exports_37("renderGoalStrip", renderGoalStrip);
      return {
          setters: [
              function (state_js_3_1) {
                  state_js_3 = state_js_3_1;
              },
              function (loop_js_1_1) {
                  loop_js_1 = loop_js_1_1;
              },
              function (waiting_js_3_1) {
                  waiting_js_3 = waiting_js_3_1;
              }
          ],
          execute: function () {/**
               * Goal strip — frozen GoalStripInput + GOAL_COPY matrices (DESIGN rev 3).
               * Leaf: no main/session imports. Presentation only.
               */
              /** Frozen copy table — keys select rows; live numbers interpolate. */
              exports_37("GOAL_COPY", GOAL_COPY = {
                  over: {
                      primary: 'Campaign over',
                      progress: '{outcome}',
                      next: 'Start a new run from the masthead'
                  },
                  draft: {
                      primary: 'Phase draft',
                      progress: 'Pick one card for your pool',
                      next: 'Resolve draft before End Week'
                  },
                  primary_pre_ballot: {
                      primary: 'Make the ballot by end of week 8',
                      progress: '{signatures}/{sigNeed} sigs · W{stageWeek}/8',
                      next: 'Petition · Filing Fee · or raise cash for the fee'
                  },
                  primary_pre_ballot_ap0: {
                      primary: 'Make the ballot by end of week 8',
                      progress: '{signatures}/{sigNeed} sigs · W{stageWeek}/8',
                      next: 'Shop (0 AP) still open · or End Week'
                  },
                  primary_on_ballot: {
                      primary: 'Survive the primary',
                      progress: 'Contacts {contacts} · Name {nameID} · W{stageWeek}/8',
                      next: 'Field · chairs · force · shop'
                  },
                  primary_on_ballot_ap0: {
                      primary: 'Survive the primary',
                      progress: 'Contacts {contacts} · Name {nameID} · W{stageWeek}/8',
                      next: 'Shop (0 AP) still open · or End Week'
                  },
                  general: {
                      primary: 'Win November — bank GOTV',
                      progress: 'GOTV {totalGotv} · W{stageWeek}/6 · cal W{week}/{weeksTotal}',
                      next: 'Field → turnout · GOTV Weekend · contrast'
                  },
                  general_ap0: {
                      primary: 'Win November — bank GOTV',
                      progress: 'GOTV {totalGotv} · W{stageWeek}/6',
                      next: 'Shop if open · or End Week'
                  },
                  session_unfiled: {
                      primary: 'File your signature bill',
                      progress: 'Bill unfiled · W{week}/{weeksTotal} sine die',
                      next: 'File the Bill (pipeline) · casework holds the seat'
                  },
                  session_pipeline: {
                      primary: 'Advance the bill · hold the seat',
                      progress: '{billLabel} · heat {billHeat} · W{week}/{weeksTotal}',
                      next: 'One pipeline motion this week · or casework'
                  },
                  session_calendar: {
                      primary: 'Get to the floor before sine die',
                      progress: '{billLabel} · heat {billHeat}',
                      next: 'Calendar / floor motions · watch Speaker freeze'
                  },
                  session_freeze: {
                      primary: 'Leadership freeze is biting',
                      progress: 'Freeze {speakerFreeze} · {billLabel}',
                      next: 'Errands / favor · casework · wait out freeze'
                  },
                  session_ap0: {
                      primary: 'End the legislative week',
                      progress: '{billLabel}',
                      next: 'End Week — free motions only if any remain'
                  },
                  waiting: {
                      primary: 'Bank for the next filing',
                      progress: 'Path {path} · +{bankContacts} contacts · +{bankName} name · W{week}/{waitingWeeks}',
                      next: 'One AP · WA kit · then re-file same persona'
                  }
              });
          }
      };
  });
  /**
   * CANDIDATE ZERO — Frozen host API (engine binding boundary)
   * =============================================================
   * This is the ONE surface a presentation host (Unity/C#, iOS, a web UI,
   * a bot) binds to. The rules — resolve/odds/yields/RNG — live only in the
   * TypeScript engine behind this boundary; a host NEVER reimplements them.
   * That is the ship-path covenant (docs/ROADMAP.md Phase 8, docs/ENGINE-API.md).
   *
   * Determinism / seed contract
   * ---------------------------
   * The RNG is mulberry32 — its entire internal state is a single uint32
   * counter. So a game is fully, exactly reproducible from plain data:
   *
   *     snapshot = { seed, rng-counter, setup, GameState, DeckState }
   *
   * Everything in a snapshot is JSON-serializable (the card catalog is the
   * only non-data part of a Campaign, and it is rebuilt from static card
   * data on hydrate — never serialized). Two guarantees follow, both proven
   * by src/harness/api.ts:
   *   1. Same seed + same ordered command list  ->  identical final state.
   *   2. serialize() -> deserialize() mid-game   ->  identical state, and
   *      play continues identically (save/load is exact, not approximate).
   *
   * A host therefore needs to persist only a snapshot (or seed + command
   * log) to save a game; it does not need to understand any rule.
   */
  System.register("engine/api", ["engine/loop", "engine/outside", "engine/deck", "engine/calendar", "engine/state", "engine/rng", "data/setup", "ui/goal-strip"], function (exports_38, context_38) {
      "use strict";
      var loop_js_2, outside_js_3, deck_js_3, calendar_js_5, state_js_4, rng_js_13, setup_js_2, goal_strip_js_1, ENGINE_API_VERSION;
      var __moduleName = context_38 && context_38.id;
      // ---- internal: rebuild a live Campaign from a snapshot (no rule re-run) ----
      function hydrate(snap) {
          // Restore the exact RNG position. mulberry32 state is only the counter,
          // so seeding then setting the counter reproduces the stream precisely.
          rng_js_13.useRng(rng_js_13.createRng(snap.seed));
          rng_js_13.getRng().setSeed(snap.rng);
          return {
              state: snap.state,
              deck: snap.deck,
              catalog: loop_js_2.buildCatalog(), // derived from static card data — never serialized
              handSize: deck_js_3.DEFAULT_HAND_SIZE,
              filingDeadline: calendar_js_5.PRIMARY_WEEKS,
              setup: snap.setup
          };
      }
      function capture(seed, setup, campaign) {
          return {
              v: ENGINE_API_VERSION,
              seed,
              rng: rng_js_13.getRng().getSeed(),
              setup,
              state: campaign.state,
              deck: campaign.deck
          };
      }
      function costLabel(card) {
          const c = card.cost;
          const parts = [];
          if (c.a)
              parts.push(`${c.a} AP`);
          if (c.$)
              parts.push(`$${c.$}`);
          if (c.vp)
              parts.push(`${c.vp} vol`);
          if (c.m)
              parts.push(`${c.m} mom`);
          if (c.fav)
              parts.push(`${c.fav} fav`);
          return parts.join(' · ') || 'free';
      }
      function effectiveOdds(state, card) {
          var _a;
          if (!card.odds)
              return null;
          const g = (_a = state.groundsArr.find(x => x.pool > 0)) !== null && _a !== void 0 ? _a : state.groundsArr[0];
          const base = card.odds(state, g);
          return Math.max(0.02, Math.min(0.95, base));
      }
      // ---- public API ----
      /** The choices a host presents on the setup screen. */
      function setupOptions() {
          const strip = (arr) => arr.map(x => { var _a; return ({ id: x.id, n: x.n, d: (_a = x.d) !== null && _a !== void 0 ? _a : '' }); });
          return {
              personas: strip(setup_js_2.PERSONAS),
              issues: strip(setup_js_2.ISSUES),
              districts: strip(setup_js_2.DISTRICTS),
              regions: strip(setup_js_2.REGIONS),
              default: setup_js_2.HARNESS_DEFAULT_SETUP
          };
      }
      exports_38("setupOptions", setupOptions);
      /** Start a new campaign. Deterministic in (seed, setup). */
      function newGame(opts) {
          var _a;
          const seed = opts.seed >>> 0 || 1;
          const setup = { ...setup_js_2.HARNESS_DEFAULT_SETUP, ...((_a = opts.setup) !== null && _a !== void 0 ? _a : {}) };
          const campaign = loop_js_2.createCampaign({ seed, setup });
          loop_js_2.startWeek(campaign);
          return capture(seed, setup, campaign);
      }
      exports_38("newGame", newGame);
      /** Available actions for the current snapshot (drives a host's action UI). */
      function legalActions(snap) {
          const campaign = hydrate(snap);
          return loop_js_2.listPlayableHand(campaign).map(({ index, card }) => {
              var _a, _b, _c;
              return ({
                  handIndex: index,
                  cardId: card.id,
                  name: card.n,
                  desc: (_a = card.d) !== null && _a !== void 0 ? _a : '',
                  tag: (_b = card.tag) !== null && _b !== void 0 ? _b : '',
                  kind: (_c = card.kind) !== null && _c !== void 0 ? _c : 'action',
                  risk: card.risk,
                  camp: index < 0,
                  field: !!card.field,
                  costLabel: costLabel(card),
                  approxOdds: effectiveOdds(campaign.state, card)
              });
          });
      }
      exports_38("legalActions", legalActions);
      /** Full render model + actions for the current snapshot. */
      function view(snap) {
          var _a, _b, _c;
          const campaign = hydrate(snap);
          const s = campaign.state;
          const base = loop_js_2.snapshot(s);
          const pd = s.pendingDraft;
          const actions = legalActions(snap);
          const goalInput = goal_strip_js_1.buildGoalStripInput(s, {
              shopAvailable: actions.some(a => a.cardId.startsWith('BUY')),
              campPetitionVisible: actions.some(a => a.handIndex === loop_js_2.CAMP_PETITION),
              campFeeVisible: actions.some(a => a.handIndex === loop_js_2.CAMP_FILING_FEE)
          });
          return {
              v: ENGINE_API_VERSION,
              over: s.over,
              outcome: (_a = s.outcome) !== null && _a !== void 0 ? _a : 'ongoing',
              stage: s.stage,
              phase: state_js_4.getPhase(s),
              stageLabel: state_js_4.stageLabel(s),
              stageWeek: state_js_4.stageWeek(s),
              calendarWeek: s.week,
              weeksTotal: s.weeksTotal,
              identity: { persona: s.persona, issue: s.issue, district: (_c = (_b = s.district) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null },
              ledger: {
                  ...base,
                  momentum: s.momentum,
                  favors: s.favors,
                  debt: s.debt,
                  endorsePts: s.endorsePts,
                  ballot: s.ballot,
                  signatures: s.signatures,
                  sigNeed: s.sigNeed
              },
              grounds: s.groundsArr.map(g => ({
                  id: g.id,
                  n: g.n,
                  pool: g.pool,
                  rapport: Math.round(g.rapport || 0),
                  rivalRap: Math.round(g.rivalRap || 0),
                  gotv: g.gotv || 0
              })),
              actions,
              goal: goal_strip_js_1.formatGoalStrip(goalInput),
              pendingDraft: (pd === null || pd === void 0 ? void 0 : pd.options.length)
                  ? {
                      phase: pd.phase,
                      options: pd.options.map(id => {
                          var _a, _b;
                          const c = campaign.catalog.get(id);
                          return { cardId: id, name: (_a = c === null || c === void 0 ? void 0 : c.n) !== null && _a !== void 0 ? _a : id, risk: (_b = c === null || c === void 0 ? void 0 : c.risk) !== null && _b !== void 0 ? _b : '' };
                      })
                  }
                  : null,
              pendingOutside: s.pendingOutside
                  ? { id: s.pendingOutside.id, n: s.pendingOutside.n, text: s.pendingOutside.text }
                  : null,
              canEndWeek: !s.over && !(pd === null || pd === void 0 ? void 0 : pd.options.length),
              log: s.log.slice(-40).map(e => ({ week: e.week, kind: e.kind, text: e.text, tier: e.tier }))
          };
      }
      exports_38("view", view);
      /** Apply one command, returning the next snapshot + the log it produced. */
      function apply(snap, command) {
          var _a, _b, _c;
          const campaign = hydrate(snap);
          const s = campaign.state;
          const logBefore = s.log.length;
          let ok = true;
          let reason;
          if (s.over) {
              return { snapshot: snap, ok: false, reason: 'campaign is over', events: [] };
          }
          switch (command.type) {
              case 'play': {
                  if ((_a = s.pendingDraft) === null || _a === void 0 ? void 0 : _a.options.length) {
                      ok = false;
                      reason = 'resolve the phase draft first';
                      break;
                  }
                  const ground = command.groundId
                      ? s.groundsArr.find(g => g.id === command.groundId)
                      : undefined;
                  const wasBallot = s.ballot;
                  const outcome = loop_js_2.playFromHand(campaign, command.handIndex, ground);
                  ok = outcome.ok;
                  reason = outcome.reason;
                  // Mirror the UI: reaching the ballot opens a phase draft.
                  if (ok && !wasBallot && s.ballot)
                      loop_js_2.maybeOfferPhaseDraft(campaign, false);
                  break;
              }
              case 'draft': {
                  const r = loop_js_2.pickPhaseDraft(campaign, command.option);
                  ok = r.ok;
                  reason = r.reason;
                  break;
              }
              case 'dismissOutside': {
                  outside_js_3.clearPendingOutside(s);
                  ok = true;
                  break;
              }
              case 'endWeek': {
                  if ((_b = s.pendingDraft) === null || _b === void 0 ? void 0 : _b.options.length) {
                      ok = false;
                      reason = 'resolve the phase draft first';
                      break;
                  }
                  const t = loop_js_2.endWeekInPlace(campaign);
                  if (t.kind === 'enter_general')
                      loop_js_2.maybeOfferPhaseDraft(campaign, false);
                  if (!s.over && !((_c = s.pendingDraft) === null || _c === void 0 ? void 0 : _c.options.length))
                      loop_js_2.startWeek(campaign);
                  break;
              }
              default: {
                  ok = false;
                  reason = `unknown command`;
              }
          }
          const events = campaign.state.log.slice(logBefore).map(e => ({
              week: e.week,
              kind: e.kind,
              text: e.text,
              tier: e.tier
          }));
          return { snapshot: capture(snap.seed, snap.setup, campaign), ok, reason, events };
      }
      exports_38("apply", apply);
      /** Persist a game to a string (host storage / save file). */
      function serialize(snap) {
          return JSON.stringify(snap);
      }
      exports_38("serialize", serialize);
      /** Restore a game from serialize(). Throws on a version it cannot read. */
      function deserialize(text) {
          const snap = JSON.parse(text);
          if (!snap || typeof snap.rng !== 'number' || !snap.state) {
              throw new Error('candidate-zero: not a valid engine snapshot');
          }
          return snap;
      }
      exports_38("deserialize", deserialize);
      /** Resolve a camp/hand index to its card id (host convenience). */
      function cardIdForIndex(snap, handIndex) {
          var _a;
          if (handIndex >= 0)
              return (_a = snap.deck.hand[handIndex]) !== null && _a !== void 0 ? _a : null;
          return loop_js_2.campIndexToCardId(hydrate(snap), handIndex);
      }
      exports_38("cardIdForIndex", cardIdForIndex);
      return {
          setters: [
              function (loop_js_2_1) {
                  loop_js_2 = loop_js_2_1;
              },
              function (outside_js_3_1) {
                  outside_js_3 = outside_js_3_1;
              },
              function (deck_js_3_1) {
                  deck_js_3 = deck_js_3_1;
              },
              function (calendar_js_5_1) {
                  calendar_js_5 = calendar_js_5_1;
              },
              function (state_js_4_1) {
                  state_js_4 = state_js_4_1;
              },
              function (rng_js_13_1) {
                  rng_js_13 = rng_js_13_1;
              },
              function (setup_js_2_1) {
                  setup_js_2 = setup_js_2_1;
              },
              function (goal_strip_js_1_1) {
                  goal_strip_js_1 = goal_strip_js_1_1;
              }
          ],
          execute: function () {/**
               * CANDIDATE ZERO — Frozen host API (engine binding boundary)
               * =============================================================
               * This is the ONE surface a presentation host (Unity/C#, iOS, a web UI,
               * a bot) binds to. The rules — resolve/odds/yields/RNG — live only in the
               * TypeScript engine behind this boundary; a host NEVER reimplements them.
               * That is the ship-path covenant (docs/ROADMAP.md Phase 8, docs/ENGINE-API.md).
               *
               * Determinism / seed contract
               * ---------------------------
               * The RNG is mulberry32 — its entire internal state is a single uint32
               * counter. So a game is fully, exactly reproducible from plain data:
               *
               *     snapshot = { seed, rng-counter, setup, GameState, DeckState }
               *
               * Everything in a snapshot is JSON-serializable (the card catalog is the
               * only non-data part of a Campaign, and it is rebuilt from static card
               * data on hydrate — never serialized). Two guarantees follow, both proven
               * by src/harness/api.ts:
               *   1. Same seed + same ordered command list  ->  identical final state.
               *   2. serialize() -> deserialize() mid-game   ->  identical state, and
               *      play continues identically (save/load is exact, not approximate).
               *
               * A host therefore needs to persist only a snapshot (or seed + command
               * log) to save a game; it does not need to understand any rule.
               */
              exports_38("ENGINE_API_VERSION", ENGINE_API_VERSION = '1.0.0');
          }
      };
  });
  

  var __entry = __require("engine/api");
  var out = {};
  for (var k in __entry) if (Object.prototype.hasOwnProperty.call(__entry, k)) out[k] = __entry[k];
  return out;
})();
