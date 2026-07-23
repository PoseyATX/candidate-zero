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
export function renderHud(campaign: Campaign): void {
  const s = campaign.state;
  const snap = snapshot(s);
  const pips = Array.from({ length: s.apMax }, (_, i) =>
    `<i class="pip ${i < snap.ap ? 'on' : ''}"></i>`
  ).join('');
  const fieldChip = snap.fieldAp ? `<span class="chip chip-field">+${snap.fieldAp} field</span>` : '';
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
    ${spendNote}
    <span class="hud-item" title="Week ${snap.week} of ${s.weeksTotal}"><span class="hud-week">W${snap.week}/${s.weeksTotal}</span>
      <span class="hud-meter hud-meter-week"><i style="width:${weekPct}%"></i></span>
    </span>
    <span class="hud-item">${ballotHud}</span>
  `;
}

/**
 * Dossier ledger — Phase 6 hierarchy (docs/UI-IA.md).
 */
export function renderLedger(campaign: Campaign): void {
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
      return `${a.id}${g}`;
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
        <div class="ledger-band-label">Machine</div>
        <div class="ledger-wide"><span class="k">Allies</span> ${allyBits || '—'}</div>
        <div class="ledger-wide"><span class="k">Assets</span> ${assetBits || '—'}</div>
        <div class="ledger-wide"><span class="k">Obligations</span> ${oblBits || '—'}</div>
        ${s.over && s.outcome ? `<div class="ledger-wide"><span class="k">Outcome</span> ${s.outcome}</div>` : ''}
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
