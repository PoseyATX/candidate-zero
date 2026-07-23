/**
 * CANDIDATE ZERO — Minimal web shell over pure engine
 * Presentation only. All rules live in src/engine.
 */

import {
  createCampaign,
  createIncumbentCampaign,
  listPlayableHand,
  playFromHand,
  startWeek,
  endWeekInPlace,
  snapshot,
  pickPhaseDraft,
  maybeOfferPhaseDraft,
  summarizeWeek,
  CAMP_PETITION,
  CAMP_FILING_FEE,
  campIndexToCardId,
  type Campaign
} from '../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../engine/state.js';
import { STAMPS } from '../engine/resolve.js';
import { pickDefaultGround, cardAttrMod, isPhaseLegal, isVisible, canAfford } from '../engine/play.js';
import type { PlayFeedback } from '../engine/feedback.js';
import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import {
  loadLegacy,
  saveLegacy,
  applyLegacy,
  buildPaths,
  buildEpithet,
  buildGrowthLine,
  computeShare,
  recordRun,
  setInterimPath,
  addTrait,
  romanRun,
  TRAITS,
  type InterimPath
} from '../engine/legacy.js';
import { enterWaiting, finishWaiting, WAITING_WEEKS } from '../engine/waiting.js';
import type { CampaignOutcome, Ground, LegacyState, PlayCard, PlayOutcome, TraitId } from '../engine/types.js';
import { emblemFor, emblem, kindMark, KIND_META } from './card-art.js';
import './styles.css';

let campaign: Campaign | null = null;
let weekPlays: PlayOutcome[] = [];

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
let legacy: LegacyState = loadLegacy();
let terminalKind: CampaignOutcome | null = null;
let terminalShare = 0;

/** Ceremony shell — which act of the run the player is in. */
type ActId = 'primary' | 'general' | 'session' | 'waiting';

interface ActShellDef {
  id: ActId;
  actNum: string;
  title: string;
  /** Short line on persistent banner */
  bannerSub: string;
  /** Static splash body (detail line appended when engine provides text) */
  splashBody: string;
  splashHint: string;
  cta: string;
  endWeekLabel: string;
  actionsTitle: string;
  logTitle: string;
  tag: string;
  /** Hand / motions section label inside playables */
  kitLabel: string;
}

/**
 * Presentation-only act shells. Rules stay in the engine; this is the
 * unmistakable stage boundary the player asked for (not a soft re-skin).
 */
const ACT_SHELLS: Record<ActId, ActShellDef> = {
  primary: {
    id: 'primary',
    actNum: 'Act I',
    title: 'The Primary',
    bannerSub: 'Ballot · doors · force',
    splashBody:
      'Eight weeks. Make the ballot or the primary goes on without you. ' +
      'Petition labor or filing fee — pick a door. Field work needs a ground.',
    splashHint:
      'Main Deck campaign verbs. Shop is 0 AP. Once: Self-Fund · Once: PAC Check (Session will collect).',
    cta: 'File the papers',
    endWeekLabel: 'End campaign week',
    actionsTitle: 'Campaign hand',
    logTitle: 'Campaign log',
    tag: 'Primary',
    kitLabel: 'Campaign plays'
  },
  general: {
    id: 'general',
    actNum: 'Act II',
    title: 'The General',
    bannerSub: 'GOTV · turnout · November',
    splashBody:
      'You survived the primary. Same run — new clock. Six weeks to November. ' +
      'Primary rapport seeds GOTV on the grounds that know you. Block walks and phones now bank turnout, not just introductions. Kitchen-table club math is closed.',
    splashHint:
      'GOTV Weekend is in your hand. Field work converts to conversion %. Flatbed (A06) unlocks Rides to the Polls. November is arithmetic — contacts alone will not save you.',
    cta: 'Take the field',
    endWeekLabel: 'End general week',
    actionsTitle: 'General field',
    logTitle: 'Campaign log',
    tag: 'General',
    kitLabel: 'Turnout kit · GOTV is the lever'
  },
  session: {
    id: 'session',
    actNum: 'Act III',
    title: 'You are sworn in',
    bannerSub: 'Bill pipeline · sine die',
    splashBody:
      'The general is won. You are a member now — still THIS run, not a new campaign. ' +
      'Campaign cards leave the table. Legislative motions (Special kit) only.',
    splashHint:
      'File your bill. One pipeline motion per week. Casework keeps the seat. Clock ends at sine die — then reelection is a NEW cycle.',
    cta: 'Enter the chamber',
    endWeekLabel: 'End legislative week',
    actionsTitle: 'Legislative motions',
    logTitle: 'Chamber log',
    tag: 'Session',
    kitLabel: 'Session Special kit · not Main Deck'
  },
  waiting: {
    id: 'waiting',
    actNum: 'Act IV',
    title: 'The Waiting Season',
    bannerSub: 'Interim orbit · next filing',
    splashBody:
      'The race ended. The climb did not. Four compressed weeks — one action each. ' +
      'What you bank rides into the next campaign. No true game over; only redirection.',
    splashHint: 'Special waiting verbs only (WA*). Path-scoped kit. Then setup for the next filing.',
    cta: 'Begin the interim',
    endWeekLabel: 'End interim week',
    actionsTitle: 'Interim orbit',
    logTitle: 'Waiting log',
    tag: 'Waiting',
    kitLabel: 'Waiting Special kit · bank for next cycle'
  }
};

function actFromStage(stage: string | undefined): ActId {
  if (stage === 'waiting') return 'waiting';
  if (stage === 'session') return 'session';
  if (stage === 'general') return 'general';
  return 'primary';
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function fillSelects(): void {
  const fill = (id: string, items: { id: string; n: string }[]) => {
    const sel = $(id) as HTMLSelectElement;
    sel.innerHTML = items.map(i => `<option value="${i.id}">${i.n}</option>`).join('');
  };
  fill('sel-persona', PERSONAS);
  fill('sel-issue', ISSUES);
  fill('sel-district', DISTRICTS);
  fill('sel-region', REGIONS);
  (document.getElementById('sel-persona') as HTMLSelectElement).value = 'teacher';
  (document.getElementById('sel-issue') as HTMLSelectElement).value = 'taxes';
  (document.getElementById('sel-district') as HTMLSelectElement).value = 'open';
  (document.getElementById('sel-region') as HTMLSelectElement).value = 'east';
  updateBlurb();
}

function currentSetup(): SetupSelection {
  return {
    personaId: (document.getElementById('sel-persona') as HTMLSelectElement).value,
    issueId: (document.getElementById('sel-issue') as HTMLSelectElement).value,
    districtId: (document.getElementById('sel-district') as HTMLSelectElement).value,
    regionId: (document.getElementById('sel-region') as HTMLSelectElement).value
  };
}

function updateBlurb(): void {
  const setup = currentSetup();
  const p = PERSONAS.find(x => x.id === setup.personaId);
  const r = REGIONS.find(x => x.id === setup.regionId);
  const d = DISTRICTS.find(x => x.id === setup.districtId);
  const attr = p ? Object.entries(p.attrs).map(([k, v]) => `${k}+${v}`).join(' ') : '';
  $('setup-blurb').textContent = [
    p?.d ?? '',
    d?.d ?? '',
    r ? `${r.n}: petition mod ${r.petitionMod >= 0 ? '+' : ''}${r.petitionMod}.` : '',
    attr ? `Attr tilt: ${attr}` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Compact persistent HUD — mobile deckbuilder convention (the vitals never
 * scroll away). Hidden on wide screens where the full ledger is visible
 * anyway; sticky at the top of #game on phones.
 */
function renderHud(): void {
  if (!campaign) return;
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
  const who = (s.persona ?? '—').split(' ')[0] ?? '—';
  $('hud').innerHTML = `
    <span class="hud-item">${actChip}</span>
    <span class="hud-item"><span class="pips" title="Action points">${pips}</span>${fieldChip}</span>
    <span class="hud-item hud-cash" title="Cash on hand">$${snap.money}${debtChip}${oblChip}</span>
    ${spendNote}
    <span class="hud-item" title="Week ${snap.week} of ${s.weeksTotal}"><span class="hud-week">W${snap.week}/${s.weeksTotal}</span>
      <span class="hud-meter hud-meter-week"><i style="width:${weekPct}%"></i></span>
    </span>
    <span class="hud-item">${ballotHud}</span>
    <span class="hud-item hud-who" title="${s.persona ?? ''} · ${s.issue ?? ''}">${who}</span>
  `;
}

/**
 * Dossier ledger — Phase 6 hierarchy (docs/UI-IA.md):
 * Identity band → force/session → vitals (desktop) → machine.
 */
function renderLedger(): void {
  if (!campaign) return;
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

  // Desktop vitals (mobile reads these from sticky HUD)
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
  applyStageChrome();
  const hint = $('week-hint');
  if (s.over) {
    hint.textContent = `Campaign over: ${s.outcome ?? 'ended'}.`;
  } else if (s.stage === 'waiting') {
    const bank = s.sessionFlags || {};
    hint.textContent =
      `ACT IV · WAITING W${s.week}/${WAITING_WEEKS} (${s.waitingPathId ?? 'orbit'}) — ` +
      `banked +${Number(bank.waitBankContacts || 0)} contacts · +${Number(bank.waitBankName || 0)} name. One AP/week.`;
  } else if (s.stage === 'session') {
    const bill = s.bill
      ? `Bill: ${billStageLabelUi(s.bill)} (heat ${s.bill.heat}).`
      : 'No bill.';
    hint.textContent =
      `ACT III · SESSION W${s.week}/${s.weeksTotal} — ${bill} Special kit only. One pipeline motion/week.`;
  } else if (s.stage === 'general') {
    hint.textContent =
      'ACT II · GENERAL — GOTV and contrast. Six weeks to November. Same run.';
  } else if (s.ballot) {
    hint.textContent =
      'ACT I · PRIMARY — On the ballot. Build force before week 8. Shop is 0 AP.';
  } else {
    hint.textContent =
      'ACT I · PRIMARY — Not on ballot. Petition / Fee / Shop available. Deadline: end of week 8.';
  }
}

function billStageLabelUi(bill: { pipelineStage: number; status: string }): string {
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
  if (bill.pipelineStage < 0) return 'Dead';
  return labels[Math.min(8, bill.pipelineStage)] ?? bill.status;
}

function renderDraft(): void {
  const box = $('draft');
  if (!campaign?.state.pendingDraft?.options.length) {
    box.innerHTML = '';
    return;
  }
  const draft = campaign.state.pendingDraft;
  box.innerHTML =
    `<p class="hint">Phase ${draft.phase} draft — pick one for your pool</p>` +
    draft.options
      .map((id, i) => {
        const card = campaign!.catalog.get(id);
        if (!card) return '';
        return `
        <button type="button" class="${cardClasses(card)} draft-card" data-draft="${i}">
          ${cardInner(card)}
        </button>`;
      })
      .join('');
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      pickPhaseDraft(campaign!, Number(btn.dataset.draft));
      paint();
    });
  });
}

/** Primary cost for the seal + any secondary costs for the sub-stamp row. */
function costParts(card: PlayCard): { seal: string; subs: string[] } {
  const c = card.cost;
  const all: string[] = [];
  if (c.a) all.push(`${c.a} AP`);
  if (c.$) all.push(`$${c.$}`);
  if (c.vp) all.push(`${c.vp} vol`);
  if (c.m) all.push(`${c.m} mom`);
  if (c.fav) all.push(`${c.fav} fav`);
  if (!all.length) return { seal: 'free', subs: [] };
  return { seal: all[0]!, subs: all.slice(1) };
}

/**
 * Shared card body — the one card anatomy every surface uses (hand, camp
 * actions, phase drafts). Name banner, deco divider, engraved emblem with
 * a cost seal stamped over it, tagline, body text, ticket-stub footer.
 */
function cardInner(
  card: PlayCard,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean; lockReason?: string } = {}
): string {
  const state = campaign!.state;
  const g = pickDefaultGround(state);
  const base = card.odds?.(state, g);
  const mod = cardAttrMod(state, card);
  const p = base !== undefined ? Math.max(0.02, Math.min(0.95, base + mod)) : undefined;
  const odds = p !== undefined ? `p≈${(p * 100).toFixed(0)}%` : '';
  const meter =
    p !== undefined
      ? `<span class="odds-meter"><i style="width:${Math.round(p * 100)}%"></i></span>`
      : '';
  const attr = card.attrs?.length ? card.attrs.join(' · ') : '';
  const { seal, subs } = costParts(card);
  const stamp = opts.shop
    ? '<span class="stamp stamp-shop">Shop</span>'
    : opts.camp
      ? '<span class="stamp stamp-camp">Camp</span>'
      : '';
  // Kind seal (top-left, mirroring the cost seal): a subtle corner glyph
  // marking the card's family. No verdict text — the category name lives
  // in title/aria only. `action` cards carry no mark (unmarked default).
  const kind = card.kind ?? 'action';
  const mark = kindMark(kind);
  const meta = KIND_META[kind];
  const kindSeal = mark
    ? `<span class="kind-seal" role="img" title="${meta?.label ?? ''} — ${meta?.blurb ?? ''}" aria-label="${meta?.label ?? ''}">${mark}</span>`
    : '';
  return `
    ${kindSeal}
    <span class="name">${card.n}</span>
    <span class="orn"><i></i>&#10022;<i></i></span>
    <span class="card-art">${emblemFor(card.id)}${stamp}</span>
    <span class="cost-seal">${seal}</span>
    ${subs.length ? `<span class="cost-subs">${subs.map(s => `<span>${s}</span>`).join('')}</span>` : ''}
    <span class="tagline">${card.tag}</span>
    ${opts.locked && opts.lockReason ? `<span class="locked-reason">${opts.lockReason}</span>` : ''}
    <span class="card-footer">
      <span class="risk-tag">${card.risk}</span>
      ${odds ? `<span class="odds">${odds}</span>` : ''}
    </span>
    ${meter}
    ${attr ? `<span class="attrs">${attr}</span>` : ''}
  `;
}

function cardClasses(
  card: PlayCard,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean } = {}
): string {
  const kind = card.kind ?? 'action';
  return [
    'play-card',
    `risk-${card.risk.toLowerCase()}`,
    kind !== 'action' ? `kind-${kind}` : '',
    opts.shop ? 'shop' : '',
    opts.camp && !opts.shop ? 'camp' : '',
    opts.locked ? 'locked' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

/** Escape a string for safe use inside a double-quoted HTML attribute. */
function attrEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cardHtml(
  card: PlayCard,
  index: number,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean; lockReason?: string }
): string {
  // Description is data revealed on demand — not drawn on the card face.
  // It lives in the button's accessible name (screen readers) and title
  // (hover tooltip), so the face stays name + art + cost + kind tint.
  const desc = attrEscape(card.d);
  const label = `${attrEscape(card.n)} — ${desc}`;
  return `
    <button type="button" class="${cardClasses(card, opts)}" data-idx="${index}"
      title="${desc}" aria-label="${label}"
      ${opts.locked ? 'disabled aria-disabled="true"' : ''}>
      ${cardInner(card, opts)}
    </button>
  `;
}

function lockReason(card: PlayCard): string {
  const state = campaign!.state;
  if (!isPhaseLegal(state, card)) return `Phase ${card.ph.join('/')} only`;
  if (!canAfford(state, card)) {
    const c = card.cost;
    if ((c.a ?? 0) > state.ap && !(card.field && state.fieldAp > 0)) return 'No AP left';
    // Phase 3: $ costs check availableCash (debt service reserve), not raw money
    const spend = snapshot(state).availableCash;
    if ((c.$ ?? 0) > spend) {
      return (state.debt || 0) > 0 && spend < state.money
        ? 'Cash reserved for the note'
        : 'Not enough money';
    }
    if ((c.vp ?? 0) > state.volPool) return 'Not enough volunteers';
    if ((c.m ?? 0) > state.momentum) return 'Not enough momentum';
    if ((c.fav ?? 0) > state.favors) return 'No favors owed';
    return "Can't afford";
  }
  return 'Unavailable';
}

function renderPlayables(): void {
  if (!campaign) return;
  const grid = $('playables');
  if (campaign.state.pendingDraft?.options.length) {
    grid.innerHTML = `<p class="hint">Resolve the phase draft first.</p>`;
    return;
  }
  if (campaign.state.over) {
    grid.innerHTML = `<p class="hint">Run over (${campaign.state.outcome}). Start a new run.</p>`;
    return;
  }

  const state = campaign.state;
  const playable = listPlayableHand(campaign);
  const playableIdx = new Set(playable.map(p => p.index));
  const apExhausted = state.ap <= 0 && state.fieldAp <= 0;

  // The whole hand stays on the table, deckbuilder-style: cards you can't
  // play right now render dimmed with the reason, instead of vanishing.
  // Cards failing show/req stay hidden — those are undiscovered content,
  // not locked options.
  const handCards = campaign.deck.hand
    .map((id, index) => ({ index, card: campaign!.catalog.get(id) }))
    .filter((e): e is { index: number; card: PlayCard } => !!e.card && isVisible(state, e.card));
  // Phase 4: session is all synthetic SS* plays (no hand / shop)
  if (state.stage === 'session') {
    const sessionCards = playable;
    const kit = ACT_SHELLS.session.kitLabel;
    const hintLine = apExhausted
      ? `<p class="hint">Out of actions — end the legislative week (or play free motions if any).</p>`
      : !sessionCards.length
        ? `<p class="hint">Nothing legal this week — end week (pipeline already used, or wait for calendar).</p>`
        : `<p class="hint session-hint kit-label">${kit} · one pipeline motion per week</p>`;
    grid.innerHTML =
      hintLine +
      sessionCards
        .map(({ index, card }) => {
          const free = (card.cost.a ?? 0) === 0;
          const locked = !free && apExhausted;
          return cardHtml(card, index, {
            camp: true,
            locked,
            lockReason: locked ? 'No AP left' : undefined
          });
        })
        .join('');
    grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (Number.isNaN(idx)) return;
        commitPlay(idx);
      });
    });
    return;
  }

  // Waiting season: WA* path kit
  if (state.stage === 'waiting') {
    const kit = ACT_SHELLS.waiting.kitLabel;
    const hintLine = apExhausted
      ? `<p class="hint">Out of actions — end the interim week.</p>`
      : !playable.length
        ? `<p class="hint">Nothing legal — end week.</p>`
        : `<p class="hint kit-label">${kit} · path: ${state.waitingPathId ?? '—'}</p>`;
    grid.innerHTML =
      hintLine +
      playable
        .map(({ index, card }) => {
          const locked = apExhausted && (card.cost.a ?? 0) > 0;
          return cardHtml(card, index, {
            camp: true,
            locked,
            lockReason: locked ? 'No AP left' : undefined
          });
        })
        .join('');
    grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (Number.isNaN(idx)) return;
        commitPlay(idx);
      });
    });
    return;
  }

  const campCards = playable.filter(p => p.index < 0 && !p.card.id.startsWith('BUY'));
  const shopCards = playable.filter(p => p.card.id.startsWith('BUY'));
  const act = ACT_SHELLS[actFromStage(state.stage)];

  // Shop is 0-AP — still available when AP is gone (spend-now lever visibility).
  const hintLine = apExhausted
    ? `<p class="hint">Out of actions — shop buys (0 AP) still work, or end the week.</p>`
    : !playable.length && !handCards.length
      ? `<p class="hint">Nothing playable. End week.</p>`
      : `<p class="hint kit-label">${act.kitLabel}</p>`;

  grid.innerHTML =
    hintLine +
    handCards
      .map(({ index, card }) => {
        const locked = apExhausted || !playableIdx.has(index);
        return cardHtml(card, index, {
          locked,
          lockReason: locked ? (apExhausted ? 'No AP left' : lockReason(card)) : undefined
        });
      })
      .join('') +
    campCards.map(({ index, card }) => cardHtml(card, index, { camp: true })).join('') +
    (shopCards.length
      ? `<p class="hint shop-hint">Campaign shop — 0 AP · money or volunteers · Main unlocks</p>` +
        shopCards
          .map(({ index, card }) => {
            const locked = !playableIdx.has(index);
            return cardHtml(card, index, {
              shop: true,
              locked,
              lockReason: locked ? lockReason(card) : undefined
            });
          })
          .join('')
      : '');

  grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const index = Number(btn.dataset.idx);
      const card = cardForIndex(index);
      // Field plays open the ground picker; everything else resolves now.
      if (card?.field) {
        openGroundPicker(index, card);
      } else {
        commitPlay(index);
      }
    });
  });
}

/** Resolve the card at a hand/camp index (from `data-idx`) into a PlayCard. */
function cardForIndex(index: number): PlayCard | undefined {
  if (!campaign) return undefined;
  const campId = campIndexToCardId(campaign, index);
  if (campId) return campaign.catalog.get(campId);
  const id = campaign.deck.hand[index];
  return id ? campaign.catalog.get(id) : undefined;
}

/** Execute a play (optionally at a chosen ground) and fold in the result. */
function commitPlay(index: number, ground?: Ground): void {
  if (!campaign) return;
  const wasBallot = campaign.state.ballot;
  const outcome = playFromHand(campaign, index, ground);
  if (!outcome.ok) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: outcome.reason ?? 'Play failed'
    });
  } else {
    weekPlays.push(outcome);
    if (outcome.feedback) showJuice(outcome.feedback);
  }
  if (!wasBallot && campaign.state.ballot) {
    maybeOfferPhaseDraft(campaign, false);
  }
  paint();
}

let pendingGroundIndex: number | null = null;

function openGroundPicker(index: number, card: PlayCard): void {
  if (!campaign) return;
  pendingGroundIndex = index;
  $('gp-title').textContent = `${card.n} — where do you work it?`;
  renderGroundPicker();
  $('ground-picker').classList.remove('hidden');
}

function closeGroundPicker(): void {
  pendingGroundIndex = null;
  $('ground-picker').classList.add('hidden');
}

function renderGroundPicker(): void {
  if (!campaign) return;
  const s = campaign.state;
  const last = s.lastGround;
  $('gp-list').innerHTML = s.groundsArr
    .map(g => {
      const rap = Math.round(g.rapport || 0);
      const rival = Math.round(g.rivalRap || 0);
      const workedThisWeek = (s.groundPlays?.[g.id] ?? 0) > 0;
      return `
        <button type="button" class="gp-ground${g.id === last ? ' gp-last' : ''}" data-ground="${g.id}">
          <span class="gp-name">${g.n}${g.id === last ? ' <span class="gp-tag">last</span>' : ''}</span>
          <span class="gp-meters">
            <span class="gp-meter" title="Your rapport">
              <span class="gp-mlabel">you</span>
              <span class="gp-bar"><i class="gp-you" style="width:${Math.min(100, rap)}%"></i></span>
              <span class="gp-num">${rap}</span>
            </span>
            <span class="gp-meter" title="Opposition presence (does not affect odds yet)">
              <span class="gp-mlabel">opp</span>
              <span class="gp-bar"><i class="gp-opp" style="width:${Math.min(100, rival)}%"></i></span>
              <span class="gp-num">${rival}</span>
            </span>
          </span>
          <span class="gp-foot">
            <span>pool ${g.pool}</span>
            ${workedThisWeek ? '<span class="gp-worked">worked · ½ rapport</span>' : ''}
          </span>
        </button>`;
    })
    .join('');
  $('gp-list')
    .querySelectorAll<HTMLButtonElement>('.gp-ground')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        if (!campaign || pendingGroundIndex === null) return;
        const ground = campaign.state.groundsArr.find(g => g.id === btn.dataset.ground);
        const index = pendingGroundIndex;
        closeGroundPicker();
        commitPlay(index, ground);
      });
    });
}

/**
 * Fixed overlay toasts — never reflow the card grid (Phase 6 / UI-IA).
 * Replaces the old in-flow #juice banner above playables.
 */
function showJuice(fb: PlayFeedback): void {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const streak =
    fb.streak && fb.streak.count >= 2
      ? fb.streak.kind === 'hot'
        ? ` · hot ×${fb.streak.count}`
        : ` · cold ×${fb.streak.count}`
      : '';
  const t = document.createElement('div');
  t.className = `toast toast-${fb.beat}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<div class="toast-stamp">${fb.stamp}${streak}</div><div class="toast-body">${escapeHtml(fb.juice)}</div>`;
  host.appendChild(t);
  // Cap stack so spam doesn't cover the board
  while (host.children.length > 3) {
    host.firstElementChild?.remove();
  }
  window.setTimeout(() => {
    t.classList.add('toast-out');
    window.setTimeout(() => t.remove(), 280);
  }, 2800);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLog(): void {
  if (!campaign) return;
  const box = $('log');
  box.innerHTML = campaign.state.log
    .slice(-60)
    .map(e => {
      const stamp = e.tier !== undefined && e.kind === 'play' ? `[${STAMPS[e.tier as 0 | 1 | 2 | 3] ?? '?'}] ` : '';
      const cls = [
        'log-line',
        e.kind === 'juice' ? 'juice' : '',
        e.kind === 'summary' ? 'summary' : '',
        e.tier !== undefined ? `tier-${e.tier}` : ''
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}"><span class="w">W${e.week}</span> ${stamp}${e.text}</div>`;
    })
    .join('');
  box.scrollTop = box.scrollHeight;
}

function paint(): void {
  renderHud();
  renderLedger();
  renderDraft();
  renderPlayables();
  renderLog();
}

const SCREENS = ['title', 'tutorial', 'setup', 'game', 'terminal'] as const;
type ScreenId = (typeof SCREENS)[number];
let currentScreen: ScreenId = 'title';
let tutorialReturn: ScreenId = 'title';

function showScreen(id: ScreenId): void {
  currentScreen = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  // The masthead top bar and footer duplicate the title screen's nameplate
  // and tag line — hide both there; everywhere else the bar carries
  // How to Play / New run.
  $('topbar').classList.toggle('hidden', id === 'title');
  $('foot').classList.toggle('hidden', id === 'title');
  window.scrollTo({ top: 0 });
}

function showTitle(): void {
  showScreen('title');
}

function showTutorial(): void {
  if (currentScreen !== 'tutorial') tutorialReturn = currentScreen;
  showScreen('tutorial');
}

function showGame(): void {
  showScreen('game');
}

function showSetup(): void {
  showScreen('setup');
  renderChronicle();
}

function showTerminal(): void {
  showScreen('terminal');
}

/**
 * Persona (and the rest of setup) is a one-time, run-defining choice —
 * it never changes mid-campaign at the engine level (applySetup runs
 * exactly once, inside createCampaign). "New run" abandons the current
 * campaign entirely rather than mutating it, so guard against doing that
 * by accident mid-run.
 */
function requestNewRun(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Start a new run? This abandons the current campaign — persona, ' +
        'district, and everything else were locked in at the start and ' +
        'cannot be changed on an in-progress run.'
    );
    if (!ok) return;
  }
  showSetup();
}

function startRun(): void {
  const seed =
    Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
    Date.now() % 1_000_000;
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  if (input) input.value = String(seed);
  campaign = createCampaign({ seed, setup: currentSetup() });
  applyLegacy(campaign.state, legacy);
  weekPlays = [];
  startWeek(campaign);
  showGame();
  applyStageChrome();
  paint();
  // Act I ceremony — unmistakable start of the climb
  openActSplash('primary');
}

/**
 * The Chronicle — ported from the archive's LEGACY/terminal system. A run
 * ending is not a reset: record the epithet, show what this run grew even
 * on a loss, then offer a real next move (an interim path + trait on a
 * loss, or a direct "Stand for Reelection" continuation on a win) instead
 * of a dead-end screen.
 */
function enterTerminal(c: Campaign): void {
  const kind = (c.state.outcome ?? 'ongoing') as CampaignOutcome;
  terminalKind = kind;
  terminalShare = computeShare(c.state, kind);
  recordRun(legacy, c.state, kind, terminalShare);
  saveLegacy(legacy);
  renderTerminalOutcome();
  showTerminal();
}

function renderTerminalOutcome(): void {
  if (!campaign || terminalKind === null) return;
  const state = campaign.state;
  const titles: Record<CampaignOutcome, string> = {
    ongoing: '',
    missed_filing: 'Never Made the Ballot',
    lost_primary: 'Primary Lost',
    won_general: 'The Seat Is Won',
    lost_general: 'The General’s Wall',
    session_law: 'Sine Die — Law',
    session_survived: 'Sine Die — Seat Holds',
    session_primaried: 'Sine Die — Primaried Out'
  };
  const epithet = buildEpithet(state, terminalKind, terminalShare);
  const growth = buildGrowthLine(state);
  // Phase 3: debt is a win/loss branch split, not an odds tax.
  let debtNote = '';
  if (terminalKind === 'won_general' && (state.debt || state.pacBridgeDebt || state.obls.includes('OB1'))) {
    debtNote =
      state.pacBridgeDebt || state.obls.includes('OB1')
        ? `<p class="debt-note">Notes retire cheap on a win — but the PAC still holds a Session claim (OB1). Committee work will not be free.</p>`
        : `<p class="debt-note">Self-loan retires cheap at the swearing-in (token fee). Homestead risk is paid; no Session leash.</p>`;
  } else if (terminalKind !== 'won_general' && (state.debt || state.obls.length)) {
    const crisis =
      (state.debt || 0) >= 5000
        ? ' Crisis territory: keep running with worse economics, or go home — the PAC Check is the structured relief valve next cycle.'
        : '';
    debtNote = `<p class="debt-note">The bank still wants its money ($${state.debt || 0}). Losing does not cancel the note — it compounds into the next cycle.${crisis}</p>`;
  }
  const sessionWin =
    terminalKind === 'session_law' || terminalKind === 'session_survived';
  const billLine =
    state.bill
      ? `<p class="bill-epitaph"><b>Signature bill:</b> ${state.bill.title} — ${state.bill.status} (stage ${state.bill.pipelineStage}).</p>`
      : '';
  const nextHint = sessionWin
    ? 'Sine die. You finished Session on this run. Reelection starts a NEW election cycle (incumbent primary) — not a Session skip.'
    : terminalKind === 'session_primaried'
      ? 'The gavel fell and the seat broke. Two years until you can file again.'
      : terminalKind === 'won_general'
        ? 'Bug: general win should enter Session in-engine. Report if you see this screen without Session.'
        : 'Two years until the next filing deadline. How do you spend them?';

  $('terminal-head').innerHTML = `
    <h2>${titles[terminalKind]}</h2>
    <p class="epithet">${epithet}</p>
    ${billLine}
    ${debtNote}
    ${growth ? `<p class="growth">${growth}</p>` : ''}
    <p class="hint">${nextHint}</p>
  `;

  // won_general should never terminal (engine enters Session). If it does, force setup.
  if (sessionWin) {
    renderTerminalWinChoices();
  } else if (terminalKind === 'won_general') {
    // Safety: never offer "new campaign" as if Session was skipped without notice
    renderTerminalWinChoices();
  } else {
    renderTerminalPaths();
  }
}

function renderTerminalWinChoices(): void {
  const grid = $('terminal-choices');
  grid.innerHTML = `
    <button type="button" class="play-card choice-card" data-choice="reelect">
      <span class="name">Stand for Reelection</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('star')}</span>
      <span class="desc">Next election cycle as incumbent — new primary (you skip petition). Session already finished.</span>
    </button>
    <button type="button" class="play-card choice-card" data-choice="rest">
      <span class="name">Close the book on this term</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('cup')}</span>
      <span class="desc">Back to setup. Chronicle keeps this ballad entry. Not a soft-reset mid-Session.</span>
    </button>
  `;
  grid.querySelector('[data-choice="reelect"]')?.addEventListener('click', () => {
    if (!campaign) return;
    campaign = createIncumbentCampaign(campaign, legacy);
    weekPlays = [];
    startWeek(campaign);
    showGame();
    applyStageChrome();
    paint();
    // New cycle as incumbent — still Act I primary shell, not Session
    openActSplash(
      'primary',
      'Incumbent cycle. You skip petition — but the primary still wants a fight. Session is behind you until you win November again.'
    );
  });
  grid.querySelector('[data-choice="rest"]')?.addEventListener('click', () => {
    showSetup();
  });
}

function renderTerminalPaths(): void {
  if (!campaign) return;
  const paths = buildPaths(campaign.state, terminalShare);
  const pathEmblems: Record<string, string> = {
    perennial: 'pennant',
    advocate: 'megaphone',
    staffer: 'clipboard',
    home: 'cup'
  };
  const grid = $('terminal-choices');
  grid.innerHTML = paths
    .map(
      p => `
    <button type="button" class="play-card choice-card" data-path="${p.id}">
      <span class="name">${p.n}</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem(pathEmblems[p.id] ?? 'star')}</span>
      <span class="desc">${p.d}</span>
    </button>
  `
    )
    .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = paths.find(p => p.id === btn.dataset.path);
      if (path) renderTerminalTraits(path);
    });
  });
}

function renderTerminalTraits(path: InterimPath): void {
  const grid = $('terminal-choices');
  grid.innerHTML =
    `<p class="hint" style="grid-column:1/-1">The two years pass. What did they leave you? ` +
    `(Choose one — it persists across every run to come.)</p>` +
    path.traits
      .map(
        t => `
    <button type="button" class="play-card choice-card" data-trait="${t}">
      <span class="name">${TRAITS[t].n}</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('quill')}</span>
      <span class="desc">${TRAITS[t].d}</span>
    </button>
  `
      )
      .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-trait]').forEach(btn => {
    btn.addEventListener('click', () => {
      const traitId = btn.dataset.trait as TraitId;
      addTrait(legacy, traitId);
      // Chronicle → starmap waiting loop + playable interim season
      setInterimPath(legacy, path.id, path.interim);
      saveLegacy(legacy);
      beginWaitingSeason(path.id);
    });
  });
}

/** After path+trait: enter playable waiting season (Act IV), not straight to setup. */
function beginWaitingSeason(pathId: string): void {
  if (!campaign) {
    showSetup();
    return;
  }
  // Revive the campaign object for interim play (outcome already recorded)
  const { text } = enterWaiting(campaign.state, pathId);
  weekPlays = [];
  showGame();
  applyStageChrome();
  paint();
  openActSplash('waiting', text);
}

function renderChronicle(): void {
  const el = $('chronicle');
  if (!legacy.runs.length) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="ct">Your ballad so far</span>
    ${legacy.runs
      .map(
        (r, i) =>
          `<p><b>Run ${romanRun(i)}.</b> ${r.epithet} ${r.interim ? `<i>${r.interim}</i>` : ''}</p>`
      )
      .join('')}
    ${
      legacy.traits.length
        ? `<p><b>What the years taught:</b> ${legacy.traits.map(t => TRAITS[t].n).join(' · ')}</p>`
        : ''
    }
    <p class="burn-row"><button type="button" class="btn" id="btn-burn-chronicle">Burn the ballad (start anew)</button></p>
  `;
  const burnBtn = document.getElementById('btn-burn-chronicle') as HTMLButtonElement | null;
  if (burnBtn) {
    burnBtn.addEventListener('click', () => {
      if (burnBtn.dataset.armed) {
        legacy = { runs: [], traits: [], carry: {} };
        saveLegacy(legacy);
        renderChronicle();
        return;
      }
      burnBtn.dataset.armed = '1';
      burnBtn.textContent = 'Tap again to burn it all — every run, every trait';
      setTimeout(() => {
        if (burnBtn.dataset) {
          delete burnBtn.dataset.armed;
          burnBtn.textContent = 'Burn the ballad (start anew)';
        }
      }, 4000);
    });
  }
}

function endWeek(): void {
  if (!campaign || campaign.state.over) {
    paint();
    return;
  }
  if (campaign.state.pendingDraft?.options.length) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: 'Resolve the phase draft before ending the week.'
    });
    paint();
    return;
  }
  const summary = summarizeWeek(campaign, weekPlays);
  showJuice({
    stamp: summary.bestStamp ?? 'GAIN',
    beat: summary.bestStamp === 'DISASTER' ? 'crash' : summary.bestStamp === 'BREAKTHROUGH' ? 'spark' : 'hit',
    intensity: 0.7,
    margin: 0,
    juice: summary.juice
  });
  weekPlays = [];
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    maybeOfferPhaseDraft(campaign, false);
  }
  if (transition.kind === 'waiting_complete') {
    const fin = finishWaiting(campaign.state, legacy);
    saveLegacy(legacy);
    // Persistent run: the wheel turns to the next filing as the SAME person.
    // You chose your identity once — you do not become a different candidate by
    // filing again. Re-file directly into the next primary with the locked
    // persona/issue/district/region (createCampaign reuses campaign.setup), the
    // waiting banks carried via applyLegacy. The identity/"File the Nameplate"
    // screen is only for a fresh start or a deliberate start-over (New Run).
    const prevSetup = campaign.setup;
    const seed = (Date.now() % 1_000_000) || 1;
    campaign = createCampaign({ seed, setup: prevSetup });
    applyLegacy(campaign.state, legacy);
    weekPlays = [];
    startWeek(campaign);
    showGame();
    applyStageChrome();
    paint();
    campaign.state.log.push({ week: campaign.state.week, kind: 'note', text: fin.text });
    // Next cycle, same name on the ballot — Act I ceremony carries the news.
    openActSplash('primary', fin.text);
    return;
  }
  if (campaign.state.over) {
    enterTerminal(campaign);
    return;
  }
  if (!campaign.state.pendingDraft) {
    startWeek(campaign);
  }
  applyStageChrome();
  paint();
  // Weather first, then act handoffs — Outside never stacks under a missed splash
  const afterWeather = (): void => {
    if (transition.kind === 'enter_general') {
      openActSplash('general', transition.text);
    } else if (transition.kind === 'enter_session') {
      openActSplash('session', transition.text);
    }
  };
  if (campaign.state.pendingOutside) {
    openOutsideWeather(campaign.state.pendingOutside, afterWeather);
  } else {
    afterWeather();
  }
}

/**
 * Outside weather surface — world pressure the player does not play.
 * Fixed modal (not hand, not toast). Dismiss clears pendingOutside.
 */
function openOutsideWeather(
  notice: { id: string; n: string; text: string },
  onDone?: () => void
): void {
  if (!campaign) {
    onDone?.();
    return;
  }
  let root = document.getElementById('outside-weather');
  if (!root) {
    root = document.createElement('div');
    root.id = 'outside-weather';
    root.className = 'outside-weather';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'outside-weather-title');
    root.innerHTML = `
      <div class="outside-weather-panel">
        <p class="eyebrow outside-weather-tag">Outside · a world event</p>
        <h2 id="outside-weather-title" class="outside-weather-title"></h2>
        <p class="outside-weather-body"></p>
        <p class="hint outside-weather-hint">An event card — you cannot play it. You answer it, or you ride it out.</p>
        <button type="button" class="btn btn-gold" id="outside-weather-ok">Understood</button>
      </div>`;
    document.getElementById('game')?.appendChild(root);
  }
  root.classList.remove('hidden');
  const title = root.querySelector('.outside-weather-title');
  const body = root.querySelector('.outside-weather-body');
  const ok = root.querySelector('#outside-weather-ok') as HTMLButtonElement | null;
  if (title) title.textContent = notice.n;
  // Strip leading "OUTSIDE — …" stamp if present for cleaner body (log keeps full line)
  let bodyText = notice.text;
  const dash = bodyText.indexOf('—');
  if (/^OUTSIDE/i.test(bodyText) && dash >= 0) {
    bodyText = bodyText.slice(dash + 1).trim();
  }
  if (body) body.textContent = bodyText;
  const dismiss = (): void => {
    root!.classList.add('hidden');
    if (campaign) campaign.state.pendingOutside = null;
    ok?.removeEventListener('click', dismiss);
    onDone?.();
  };
  if (ok) {
    ok.replaceWith(ok.cloneNode(true));
    const fresh = root.querySelector('#outside-weather-ok') as HTMLButtonElement;
    fresh.addEventListener('click', dismiss);
    fresh.focus();
  }
}

/**
 * Full-screen act handoff. Primary / General / Session all use this shell
 * so stage changes cannot be missed or mistaken for a soft reset.
 */
function openActSplash(actId: ActId, engineDetail?: string): void {
  const act = ACT_SHELLS[actId];
  let root = document.getElementById('act-splash');
  if (!root) {
    root = document.createElement('div');
    root.id = 'act-splash';
    root.className = 'act-splash';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
      <div class="act-splash-panel">
        <p class="eyebrow act-splash-num"></p>
        <h2 class="act-splash-title"></h2>
        <p class="act-splash-body"></p>
        <p class="hint act-splash-hint"></p>
        <button type="button" class="btn btn-gold" id="act-splash-ok">Continue</button>
      </div>`;
    document.getElementById('game')?.appendChild(root);
  }
  root.dataset.act = actId;
  root.className = `act-splash act-splash-${actId}`;
  const num = root.querySelector('.act-splash-num');
  const title = root.querySelector('.act-splash-title');
  const body = root.querySelector('.act-splash-body');
  const hint = root.querySelector('.act-splash-hint');
  const ok = root.querySelector('#act-splash-ok') as HTMLButtonElement | null;
  if (num) num.textContent = act.actNum;
  if (title) title.textContent = act.title;
  if (body) {
    body.textContent = engineDetail?.trim()
      ? `${engineDetail.trim()}\n\n${act.splashBody}`
      : act.splashBody;
  }
  if (hint) hint.textContent = act.splashHint;
  if (ok) ok.textContent = act.cta;
  root.classList.remove('hidden');
  if (ok) {
    ok.onclick = () => {
      root!.classList.add('hidden');
      paint();
    };
  }
}

/** Persistent stage chrome: banner, tint, verbs, panel titles, masthead tag. */
function applyStageChrome(): void {
  if (!campaign) return;
  const s = campaign.state;
  const act = ACT_SHELLS[actFromStage(s.stage)];
  const game = document.getElementById('game');
  if (game) {
    game.classList.remove('stage-primary', 'stage-general', 'stage-session');
    game.classList.add(`stage-${act.id}`);
  }

  const endBtn = document.getElementById('btn-end');
  if (endBtn) endBtn.textContent = act.endWeekLabel;

  const actionsH = document.getElementById('actions-heading');
  if (actionsH) actionsH.textContent = act.actionsTitle;
  const logH = document.getElementById('log-heading');
  if (logH) logH.textContent = act.logTitle;

  // Persistent act banner
  const banner = document.getElementById('act-banner');
  if (banner) {
    banner.hidden = false;
    banner.dataset.act = act.id;
    banner.className = `act-banner act-banner-${act.id}`;
    const num = banner.querySelector('.act-banner-num');
    const title = banner.querySelector('.act-banner-title');
    const sub = banner.querySelector('.act-banner-sub');
    if (num) num.textContent = act.actNum;
    if (title) title.textContent = act.tag;
    if (sub) {
      const weekBit =
        s.stage === 'session'
          ? ` · W${s.week}/${s.weeksTotal} sine die`
          : ` · W${stageWeek(s)} · cal ${s.week}/${s.weeksTotal}`;
      sub.textContent = `${act.bannerSub}${weekBit}`;
    }
  }

  // Masthead stage tag (single, always current)
  const h1 = document.querySelector('#topbar h1');
  if (h1) {
    document.querySelector('#topbar .stage-tag')?.remove();
    // legacy session-tag cleanup
    document.querySelector('#topbar .session-tag')?.remove();
    const tag = document.createElement('span');
    tag.className = `alpha-tag stage-tag stage-tag-${act.id}`;
    tag.textContent = act.tag;
    h1.appendChild(document.createTextNode(' '));
    h1.appendChild(tag);
  }
}

/** One-handed mobile tabs (Play / Dossier / Log). Presentation only — the
    engine render targets live inside the panels and are untouched. */
function switchTab(name: string): void {
  const game = document.getElementById('game');
  if (game) game.className = game.className.replace(/\btab-\w+\b/g, '').trim() + ` tab-${name}`;
  document.querySelectorAll<HTMLElement>('.mtab-panel').forEach(p =>
    p.classList.toggle('active', p.dataset.tab === name)
  );
  document.querySelectorAll<HTMLElement>('.mnav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.gototab === name)
  );
}

function wireTabs(): void {
  document.querySelectorAll<HTMLElement>('.mnav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.gototab || 'play'))
  );
  switchTab('play');
}

function boot(): void {
  fillSelects();
  wireTabs();
  ['sel-persona', 'sel-issue', 'sel-district', 'sel-region'].forEach(id => {
    $(id).addEventListener('change', updateBlurb);
  });
  $('title-emblem').innerHTML = emblem('star');
  $('btn-title-start').addEventListener('click', () => showSetup());
  $('btn-title-howto').addEventListener('click', () => showTutorial());
  $('btn-howto').addEventListener('click', () => showTutorial());
  $('btn-tut-back').addEventListener('click', () => showScreen(tutorialReturn));
  $('btn-start').addEventListener('click', () => startRun());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  $('gp-cancel').addEventListener('click', () => closeGroundPicker());
  showTitle();
}

boot();
