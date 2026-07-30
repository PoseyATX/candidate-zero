/**
 * HUD + dossier ledger + goal strip hook — leaf (no session/main imports).
 */

import {
  snapshot,
  listPlayableHand,
  CAMP_FILING_FEE,
  CAMP_PETITION,
  type Campaign
} from '../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../engine/state.js';
import { WAITING_WEEKS } from '../engine/waiting.js';
import { ACT_SHELLS, actFromStage, applyStageChrome } from './act-shell.js';
import {
  billStageLabelUi,
  buildGoalStripInput,
  renderGoalStrip
} from './goal-strip.js';
import { TURF_AP } from '../engine/state.js';
import { heatOf, MAX_HEAT } from '../engine/heat.js';
import { discardsLeft, MAX_DISCARDS } from '../engine/flow.js';
import { rosterForDisplay, getMachine, tierOf, tierLabel, memberName } from '../engine/machine.js';
import { doorCardId, closedDoors, MACHINE_DOOR_PLAYS } from '../data/machine-doors.js';
import { getRival, rivalRecord, archetypeTitle, MAX_RIVAL_STRENGTH } from '../engine/rival.js';
import {
  rivalIsHuman,
  rivalAsOfWeek,
  publicFacts,
  HIDDEN_FROM_OPPONENT
} from '../engine/rival-profile.js';
import type { LegacyState } from '../engine/types.js';
import { reducedMotion } from './motion.js';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

const ATTR_SHORT: Record<string, string> = {
  CLO: 'Close',
  CON: 'Conviction',
  CRA: 'Craft',
  INK: 'Ink',
  DIP: 'Diplomacy',
  CHA: 'Charm'
};

function attrChipsHtml(attrs: Record<string, number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => {
      const label = ATTR_SHORT[k] ?? k;
      return `<span class="attr-chip" title="${label}"><span class="attr-k">${k}</span><span class="attr-v">${v}</span></span>`;
    })
    .join('');
}

/**
 * Compact persistent HUD — mobile deckbuilder convention.
 */
/**
 * Last painted values, so the HUD can animate the *change* rather than the
 * state. renderHud rebuilds its innerHTML every paint, which throws away any
 * running animation — so the diff has to be computed here and baked into the
 * new markup as a one-shot class.
 */
let prevHud: { ap: number; fieldAp: number; heat: number; cuts: number } | null = null;

export function renderHud(campaign: Campaign): void {
  const s = campaign.state;
  const snap = snapshot(s);
  // Two budgets, both shown as pips that empty.
  //
  // Turf AP used to render as a "+N field" chip, which read as a bonus rather
  // than a counter — so a 3-AP field card would take 2 from turf and 1 from
  // campaign, the main pips would drop by ONE, and the player would reasonably
  // report that the AP counter does not count down. Every point a play spends
  // must now be visible leaving somewhere.
  const turfMax = Math.max(snap.fieldAp, TURF_AP);
  // A pip between the old count and the new one is a pip that just drained;
  // flag it so CSS can play the spend once. Without this the counter simply
  // teleports and the spend is invisible — the same complaint as the numbers.
  const spent = (i: number, now: number, before: number | undefined): string =>
    before !== undefined && !reducedMotion() && i >= now && i < before ? ' pip-spent' : '';
  const pips = Array.from({ length: s.apMax }, (_, i) =>
    `<i class="pip ${i < snap.ap ? 'on' : ''}${spent(i, snap.ap, prevHud?.ap)}"></i>`
  ).join('');
  const turfPips = Array.from({ length: turfMax }, (_, i) =>
    `<i class="pip pip-turf ${i < snap.fieldAp ? 'on' : ''}${spent(i, snap.fieldAp, prevHud?.fieldAp)}"></i>`
  ).join('');
  const fieldChip = turfMax
    ? `<span class="pips pips-turf" title="Turf action points — field plays spend these first, then your campaign AP">${turfPips}</span>`
    : '';
  const debtChip =
    snap.debt > 0
      ? `<span class="chip chip-debt" title="Debt does not tax odds — win/loss branch only">−$${snap.debt}</span>`
      : '';
  const oblChip =
    snap.oblsCount > 0
      ? `<span class="chip chip-debt" title="Obligations drag weekly (e.g. PAC String)">OB×${snap.oblsCount}</span>`
      : '';
  const weekPct = Math.round((snap.week / s.weeksTotal) * 100);
  const ballotBit = snap.ballot
    ? '<span class="chip chip-on">BALLOT ON</span>'
    : `<span class="hud-meter" title="${snap.signatures}/${s.sigNeed} signatures">
         <i style="width:${Math.min(100, Math.round((snap.signatures / s.sigNeed) * 100))}%"></i>
       </span><span class="hud-meter-label">${snap.signatures}/${s.sigNeed}</span>`;
  const spendNote =
    snap.debt > 0 && snap.availableCash < snap.money
      ? `<span class="hud-item" title="Service reserve — elevated debt tightens spend, not odds">$${snap.availableCash}<span class="hud-sub">spend</span></span>`
      : '';
  // Heat has to be visible before the player opens a card, or the decision to
  // keep a streak alive never enters their head — it is only a decision if you
  // can see it accumulating. Hidden at zero so it never reads as an empty duty.
  const heat = heatOf(s);
  // Losing a streak is the moment heat matters most, but the chip is hidden at
  // zero — so there would be nothing on screen to react. Keep it for the one
  // paint after a wipe, empty and marked, then let it disappear.
  const justWiped = !!prevHud && heat === 0 && prevHud.heat > 0 && !reducedMotion();
  const heatChip = (heat || justWiped)
    ? `<span class="chip chip-heat${justWiped ? ' chip-wiped' : ''}" title="Banked streak — spend it on one play for better odds and a wider disaster band. A failed play wipes it.">` +
      Array.from({ length: MAX_HEAT }, (_, i) =>
        // A streak building is the one moment heat is meant to feel like
        // something, so the newly-lit pip gets the beat rather than the meter.
        `<i class="heat-pip ${i < heat ? 'on' : ''}` +
        `${prevHud && !reducedMotion() && i >= (prevHud.heat ?? 0) && i < heat ? ' heat-pip-lit' : ''}"></i>`
      ).join('') +
      `<span class="chip-heat-label">heat</span></span>`
    : '';
  // Cuts are a use-it-or-lose-it weekly budget, so they have to be visible
  // without opening a card — otherwise players discover them by accident.
  const cuts = discardsLeft(s);
  const cutsChip = s.stage === 'session' || s.stage === 'waiting'
    ? ''
    : `<span class="chip chip-cuts" title="Hand cuts left this week — pitch a card you cannot use and draw a replacement. They do not carry over.">` +
      Array.from({ length: MAX_DISCARDS }, (_, i) =>
        `<i class="cut-pip ${i < cuts ? 'on' : ''}` +
        `${spent(i, cuts, prevHud?.cuts)}"></i>`
      ).join('') +
      `<span class="chip-cuts-label">cuts</span></span>`;
  const act = ACT_SHELLS[actFromStage(s.stage)];
  const actChip = `<span class="chip chip-act chip-act-${act.id}" title="${act.actNum}: ${act.title}">${act.tag}</span>`;
  const ballotHud =
    s.stage === 'session'
      ? `<span class="chip chip-on" title="Sworn member">SEAT</span>`
      : s.stage === 'waiting'
        ? `<span class="chip chip-act chip-act-waiting" title="Waiting season">WAIT</span>`
        : ballotBit;
  // "The Teacher" → show "Teacher" (not the article "The"); full string in title
  const personaFull = s.persona ?? '—';
  const who = personaFull.replace(/^The\s+/i, '').trim() || personaFull;
  const issueBit = s.issue ? ` · ${s.issue}` : '';
  $('hud').innerHTML = `
    <span class="hud-item hud-who" title="${personaFull}${issueBit}">
      <span class="hud-who-name">${who}</span>
      ${s.issue ? `<span class="hud-who-issue">${s.issue}</span>` : ''}
    </span>
    <span class="hud-item">${actChip}</span>
    <span class="hud-item"><span class="pips" title="Action points">${pips}</span>${fieldChip}</span>
    <span class="hud-item hud-cash" title="Cash on hand">$${snap.money}${debtChip}${oblChip}</span>
    ${heatChip ? `<span class="hud-item">${heatChip}</span>` : ''}
    ${cutsChip ? `<span class="hud-item">${cutsChip}</span>` : ''}
    ${spendNote}
    <span class="hud-item" title="Week ${snap.week} of ${s.weeksTotal}"><span class="hud-week">W${snap.week}/${s.weeksTotal}</span>
      <span class="hud-meter hud-meter-week"><i style="width:${weekPct}%"></i></span>
    </span>
    <span class="hud-item">${ballotHud}</span>
  `;

  prevHud = { ap: snap.ap, fieldAp: snap.fieldAp, heat, cuts };
}

/** New run — forget the previous HUD so week 1 does not animate from nothing. */
export function resetHudMotion(): void {
  prevHud = null;
}

/**
 * Dossier ledger — Phase 6 hierarchy (docs/UI-IA.md).
 */
export function renderLedger(campaign: Campaign, legacy?: LegacyState): void {
  const s = campaign.state;
  const snap = snapshot(s);
  const allyBits = s.allies
    .filter(a => a.warm > 0)
    .map(a => {
      const g =
        a.grounds && a.grounds.length
          ? ` @ ${a.grounds
              .map(id => s.groundsArr.find(x => x.id === id)?.n ?? id)
              .join(', ')}`
          : '';
      return `${memberName(a.id)}${g}`;
    })
    .join(' · ');
  const assetBits = s.assets.filter(a => /^A\d+/.test(a)).join(' · ');
  const oblBits = s.obls.join(' · ');

  const debtBits =
    snap.debt > 0
      ? `<div class="ledger-cell"><span class="k">Debt</span> $${snap.debt}${
          s.pacBridgeDebt ? ` · PAC $${s.pacBridgeDebt}` : ''
        } <span class="muted">no odds tax</span></div>
        <div class="ledger-cell"><span class="k">Spendable</span> $${snap.availableCash}</div>`
      : '';

  let forceBand = '';
  if (s.stage === 'session') {
    forceBand = `
      <div class="ledger-band ledger-force">
        <div class="ledger-band-label">Chamber</div>
        <div class="ledger-grid">
          <div class="ledger-cell"><span class="k">Capital</span> ${s.capital}</div>
          <div class="ledger-cell"><span class="k">Favor</span> ${Math.round(s.favor)}</div>
          <div class="ledger-cell"><span class="k">District</span> ${Math.round(s.districtStanding)}</div>
          <div class="ledger-wide"><span class="k">Committee</span> ${s.committee?.n ?? '—'}</div>
          <div class="ledger-wide bill-status"><span class="k">Bill</span> ${
            s.bill
              ? `${s.bill.title} · <b>${s.bill.status}</b> (${billStageLabelUi(s.bill)}) · heat ${s.bill.heat}${
                  s.bill.tally.aye || s.bill.tally.nay
                    ? ` · tally ${s.bill.tally.aye}–${s.bill.tally.nay}`
                    : ''
                }`
              : '—'
          }</div>
          ${
            s.sessionFlags?.pac_lender_claim || s.obls.includes('OB1')
              ? '<div class="ledger-wide muted">PAC claim rides — referral will collect.</div>'
              : ''
          }
        </div>
      </div>`;
  } else if (s.stage === 'waiting') {
    const bank = s.sessionFlags || {};
    forceBand = `
      <div class="ledger-band ledger-force">
        <div class="ledger-band-label">Waiting bank</div>
        <div class="ledger-grid">
          <div class="ledger-cell"><span class="k">Path</span> ${s.waitingPathId ?? 'orbit'}</div>
          <div class="ledger-cell"><span class="k">Banked contacts</span> +${Number(bank.waitBankContacts || 0)}</div>
          <div class="ledger-cell"><span class="k">Banked name</span> +${Number(bank.waitBankName || 0)}</div>
          <div class="ledger-cell"><span class="k">Week</span> ${s.week}/${WAITING_WEEKS}</div>
        </div>
      </div>`;
  } else {
    const ballotCell = !snap.ballot
      ? `<div class="ledger-cell ledger-gate"><span class="k">Signatures</span> ${snap.signatures}/${s.sigNeed}</div>`
      : '';
    forceBand = `
      <div class="ledger-band ledger-force">
        <div class="ledger-band-label">Force</div>
        <div class="ledger-grid">
          <div class="ledger-cell"><span class="k">Contacts</span> ${snap.contacts}</div>
          <div class="ledger-cell"><span class="k">Name ID</span> ${snap.nameID}</div>
          <div class="ledger-cell"><span class="k">Vols</span> ${snap.volPool}</div>
          <div class="ledger-cell ledger-secondary"><span class="k">Momentum</span> ${snap.momentum}</div>
          <div class="ledger-cell ledger-secondary"><span class="k">Endorse</span> ${snap.endorsePts}</div>
          ${ballotCell}
        </div>
      </div>`;
  }

  const vitalsBand = `
    <div class="ledger-band ledger-vitals">
      <div class="ledger-band-label">Vitals</div>
      <div class="ledger-grid">
        <div class="ledger-cell ledger-cash" title="Cash on hand">$${snap.money}</div>
        <div class="ledger-cell"><span class="k">AP</span> ${snap.ap}/${s.apMax}${
          snap.fieldAp ? ` +${snap.fieldAp} field` : ''
        }</div>
        <div class="ledger-cell"><span class="k">Week</span> ${stageWeek(s)} · W${snap.week}/${s.weeksTotal}</div>
        <div class="ledger-cell muted">${stageLabel(s)} · Ph ${getPhase(s)}</div>
        ${debtBits}
      </div>
    </div>`;

  // The persistent roster — the thing a player is actually building. Shown
  // in-run rather than only on a menu, because a relationship you cannot see is
  // one you will not protect.
  let machineBand = '';
  if (legacy) {
    const roster = rosterForDisplay(legacy);
    const gone = getMachine(legacy).departed;
    if (roster.length || gone.length) {
      const rows = roster
        .map(m => {
          const t = tierOf(m);
          const cycles = m.runs === 1 ? '1 cycle' : `${m.runs} cycles`;
          // Naming the card is the whole trick: "County Chairwoman, cooling"
          // is a bar. "County Chairwoman — The Chairwoman's List, cooling" is
          // a card you are about to stop being able to draw.
          const doorId = doorCardId(m.id);
          const door = doorId ? MACHINE_DOOR_PLAYS.find(c => c.id === doorId) : undefined;
          // A cooling member who holds a door is the sharpest warning the
          // dossier can give: the bar going down is abstract, "this card is
          // one bad cycle from gone" is not.
          const atRisk = door && (t === 'cooling' || t === 'owes');
          const doorBit = door
            ? `<span class="mach-door${atRisk ? ' mach-door-risk' : ''}">${door.n}${
                t === 'cooling' ? ' — one cycle from gone' : ''
              }</span>`
            : '';
          return `<div class="mach-row mach-${t}">
            <span class="mach-name">${memberName(m.id)}${doorBit}</span>
            <span class="mach-tier">${tierLabel(t)}</span>
            <span class="mach-meta">${cycles}</span>
            <span class="mach-bar"><i style="width:${Math.max(3, Math.min(100, m.standing))}%"></i></span>
          </div>`;
        })
        .join('');
      // Two lists, not one. Someone who drifted away is a loss; someone the
      // other campaign picked up is a standing threat, and the dossier should
      // not flatten the difference.
      const left = gone.filter(d => !d.toRival);
      const taken = gone.filter(d => d.toRival);
      const goneRow =
        (left.length
          ? `<div class="ledger-wide mach-gonelist"><span class="k">Gone</span> ${left
              .map(d => memberName(d.id))
              .join(' · ')}</div>`
          : '') +
        (taken.length
          ? `<div class="ledger-wide mach-rivallist"><span class="k">With him</span> ${taken
              .map(d => memberName(d.id))
              .join(' · ')}</div>`
          : '');
      // What you can no longer do. Named as cards, because that is the form
      // the player understands a loss in.
      const shut = closedDoors(gone.map(d => d.id));
      const shutRow = shut.length
        // Cards only. The Gone / With him rows directly above already name the
        // people, and most doors are named for their holder — "The Old Bull
        // Makes a Call — The Old Bull is gone" says it twice.
        ? `<div class="ledger-wide mach-shutlist"><span class="k">Shut</span> ${shut
            .map(x => x.card)
            .join(' · ')}</div>`
        : '';
      machineBand = `
        <div class="ledger-band ledger-themachine">
          <div class="ledger-band-label">The Machine</div>
          <p class="mach-hint">The people who take your call. Built across cycles — and lost the same way.</p>
          ${rows || '<div class="ledger-wide">Nobody yet. Work with someone and they may stay.</div>'}
          ${goneRow}
          ${shutRow}
        </div>`;
    }
  }

  // The other side of the same ledger. The Machine band shows what you built;
  // this shows who is building against you, with the record between you. A
  // rival you cannot see accumulating is indistinguishable from no rival.
  let rivalBand = '';
  // A HUMAN opponent is a different information problem to the synthetic one.
  // You are looking at a snapshot they published, possibly weeks ago, and the
  // player has to understand both what they can see and where the fog is — or
  // they will assume the opponent is idle when they are simply ahead of you.
  const seated = s.rivalProfile;
  if (seated && rivalIsHuman(s)) {
    const asOf = rivalAsOfWeek(s);
    const stale = asOf > 0 && asOf < s.week;
    const facts = publicFacts(seated)
      .map(f => `<div class="riv-fact"><span class="k">${f.k}</span><span>${f.v}</span></div>`)
      .join('');
    const rec = seated.record;
    const recLine = rec.cycles
      ? `${rec.cycles} ${rec.cycles === 1 ? 'cycle' : 'cycles'} against you` +
        (rec.beatYou ? ` · beat you ${rec.beatYou}` : '') +
        (rec.youBeatThem ? ` · you beat them ${rec.youBeatThem}` : '')
      : 'First time against you.';
    rivalBand = `
      <div class="ledger-band ledger-therival riv-human">
        <div class="ledger-band-label">The Opposition · a real opponent</div>
        <div class="riv-row">
          <span class="riv-name">${seated.name}</span>
          <span class="riv-title">${archetypeTitle(seated.archetype)}</span>
        </div>
        <div class="riv-record">${recLine}</div>
        <div class="riv-asof${stale ? ' riv-stale' : ''}">${
          asOf > 0
            ? stale
              ? `You are seeing them as they stood in their week ${asOf}. You are on week ${s.week} — they have not published since.`
              : `Current as of their week ${asOf}.`
            : 'No published week yet.'
        }</div>
        <div class="riv-facts">${facts}</div>
        <div class="riv-fog"><span class="k">You cannot see</span> ${HIDDEN_FROM_OPPONENT.join(' · ')}</div>
      </div>`;
  } else if (legacy) {
    const r = getRival(legacy);
    const pct = Math.max(3, Math.min(100, Math.round((r.strength / MAX_RIVAL_STRENGTH) * 100)));
    const took = r.past?.length
      ? `<div class="ledger-wide riv-past"><span class="k">Beaten</span> ${r.past
          .map(p => p.name)
          .join(' · ')}</div>`
      : '';
    rivalBand = `
      <div class="ledger-band ledger-therival">
        <div class="ledger-band-label">The Opposition</div>
        <div class="riv-row">
          <span class="riv-name">${r.name}</span>
          <span class="riv-title">${archetypeTitle(r.archetype)}</span>
        </div>
        <div class="riv-record">${rivalRecord(r)}</div>
        <span class="riv-bar" title="How much they bring to the next filing"><i style="width:${pct}%"></i></span>
        ${took}
      </div>`;
  }

  $('ledger').innerHTML = `
    <div class="ledger-dossier">
      <div class="ledger-band ledger-identity">
        <div class="ledger-who">${s.persona ?? '—'}</div>
        <div class="ledger-issue">${s.issue ?? '—'}</div>
        <div class="attr-chips" aria-label="Attributes">${attrChipsHtml(s.attrs)}</div>
      </div>
      ${forceBand}
      ${vitalsBand}
      <div class="ledger-band ledger-machine">
        <div class="ledger-band-label">This cycle</div>
        <div class="ledger-wide"><span class="k">Working with</span> ${allyBits || '—'}</div>
        <div class="ledger-wide"><span class="k">Assets</span> ${assetBits || '—'}</div>
        <div class="ledger-wide"><span class="k">Obligations</span> ${oblBits || '—'}</div>
        ${s.over && s.outcome ? `<div class="ledger-wide"><span class="k">Outcome</span> ${s.outcome}</div>` : ''}
      </div>
      ${machineBand}
      ${rivalBand}
      <div class="ledger-band ledger-h2h">
        <div class="ledger-band-label">Head to head</div>
        <p class="h2h-hint">Play a real person. Copy your campaign and send it to them; paste
          theirs to make them your opposition. Only public facts travel — never your hand,
          your deck or your money.</p>
        <div class="h2h-actions">
          <button type="button" class="btn" data-h2h="export">Copy my campaign</button>
          <button type="button" class="btn" data-h2h="import">Paste an opponent</button>
        </div>
        <textarea id="h2h-box" class="h2h-box" rows="4" spellcheck="false"
          aria-label="Head-to-head campaign exchange"
          placeholder="Your campaign appears here to copy — or paste an opponent's here."></textarea>
        <div id="h2h-note" class="h2h-note" aria-live="polite"></div>
      </div>
    </div>
  `;
  applyStageChrome(s);
  paintGoalFromCampaign(campaign);
}

/** Build goal-strip input from live state + playable cues. */
export function paintGoalFromCampaign(campaign: Campaign): void {
  const playable = listPlayableHand(campaign);
  const shopAvailable = playable.some(p => p.card.id.startsWith('BUY'));
  const campPetitionVisible = playable.some(p => p.index === CAMP_PETITION);
  const campFeeVisible = playable.some(p => p.index === CAMP_FILING_FEE);
  renderGoalStrip(
    buildGoalStripInput(campaign.state, {
      shopAvailable,
      campPetitionVisible,
      campFeeVisible
    })
  );
}
