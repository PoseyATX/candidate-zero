/**
 * CANDIDATE ZERO — the paperwork layer.
 *
 * DOM over the canvas, deliberately: a ledger, a docket and a record are text,
 * and text belongs in text. What this layer must never do is hold rules. It
 * renders a RenderView and emits intent; the engine decides everything else.
 */

import type { ActionOption, GroundView, RenderView } from '../engine/api.js';
import { RISK_LABEL } from './paint.js';

export interface HudCallbacks {
  endWeek(): void;
  cycle(handIndex: number): void;
  togglePress(): void;
  newRun(): void;
  /** Commit the held card. `groundId` only for field plays. */
  play(handIndex: number, groundId?: string): void;
}

export interface Hud {
  root: HTMLElement;
  render(view: RenderView, pressArmed: boolean): void;
  showInspector(action: ActionOption | null, pressArmed: boolean, grounds?: GroundView[]): void;
  toast(text: string, tier?: number): void;
  modal(spec: ModalSpec): Promise<string>;
  closeModal(): void;
  setBusy(busy: boolean): void;
}

export interface ModalSpec {
  eyebrow?: string;
  title: string;
  body?: string;
  lede?: string;
  options: { id: string; name: string; desc?: string }[];
  /** When set, the modal can be dismissed with this option id (Esc / backdrop). */
  dismissId?: string;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function chip(key: string, value: string, mood?: 'warn' | 'good'): HTMLElement {
  const box = el('div', `chip${mood ? ` ${mood}` : ''}`);
  box.append(el('span', 'k', key), el('span', 'v', value));
  return box;
}

export function createHud(host: HTMLElement, cb: HudCallbacks): Hud {
  host.innerHTML = `
    <div class="rail">
      <div class="stamp panel">
        <p class="eyebrow" id="hud-stage">FILING</p>
        <h2 id="hud-week">Week —</h2>
        <p class="sub" id="hud-identity"></p>
      </div>
      <div class="ledger" id="hud-ledger"></div>
    </div>
    <div class="goal panel" id="hud-goal">
      <span class="primary"></span><span class="progress"></span><span class="next"></span>
    </div>
    <div class="spacer"></div>
    <aside class="side">
      <section class="panel" id="hud-docket-box">
        <h3>The Docket</h3>
        <div id="hud-docket"></div>
      </section>
      <section class="panel">
        <h3>The Record</h3>
        <ul id="log-list"></ul>
      </section>
    </aside>
    <div id="inspector" class="panel hidden"></div>
    <div class="bottom">
      <div class="counters" id="hud-counters"></div>
      <div class="btn-row">
        <button type="button" class="btn" id="btn-press">Bank heat</button>
        <button type="button" class="btn btn-gold" id="btn-week">End week</button>
      </div>
    </div>
    <div id="toast"></div>
  `;

  const $ = (id: string): HTMLElement => {
    const node = host.querySelector<HTMLElement>(`#${id}`);
    if (!node) throw new Error(`hud #${id} missing`);
    return node;
  };

  const stageEl = $('hud-stage');
  const weekEl = $('hud-week');
  const identityEl = $('hud-identity');
  const ledgerEl = $('hud-ledger');
  const goalEl = $('hud-goal');
  const docketEl = $('hud-docket');
  const docketBox = $('hud-docket-box');
  const logEl = $('log-list');
  const inspectorEl = $('inspector');
  const countersEl = $('hud-counters');
  const toastEl = $('toast');
  const weekBtn = $('btn-week') as HTMLButtonElement;
  const pressBtn = $('btn-press') as HTMLButtonElement;

  weekBtn.addEventListener('click', () => cb.endWeek());
  pressBtn.addEventListener('click', () => cb.togglePress());

  // ---- modal ------------------------------------------------------------
  const modalHost = el('div', 'hidden');
  modalHost.id = 'modal';
  document.body.appendChild(modalHost);
  let resolveModal: ((id: string) => void) | null = null;
  let dismissWith: string | null = null;

  function closeModal(): void {
    modalHost.classList.add('hidden');
    modalHost.innerHTML = '';
    resolveModal = null;
    dismissWith = null;
  }

  modalHost.addEventListener('click', ev => {
    if (ev.target === modalHost && dismissWith && resolveModal) {
      const done = resolveModal;
      const id = dismissWith;
      closeModal();
      done(id);
    }
  });

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && dismissWith && resolveModal) {
      const done = resolveModal;
      const id = dismissWith;
      closeModal();
      done(id);
    }
  });

  function modal(spec: ModalSpec): Promise<string> {
    closeModal();
    const sheet = el('div', 'sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (spec.eyebrow) sheet.append(el('p', 'eyebrow', spec.eyebrow));
    const heading = el('h2', undefined, spec.title);
    heading.id = 'modal-title';
    sheet.setAttribute('aria-labelledby', 'modal-title');
    sheet.append(heading);
    if (spec.lede) sheet.append(el('p', 'lede', spec.lede));
    if (spec.body) sheet.append(el('p', undefined, spec.body));

    const opts = el('div', 'opts');
    for (const option of spec.options) {
      const button = el('button', 'opt');
      button.type = 'button';
      button.append(el('span', 'n', option.name));
      if (option.desc) button.append(el('span', 'd', option.desc));
      button.addEventListener('click', () => {
        const done = resolveModal;
        closeModal();
        done?.(option.id);
      });
      opts.append(button);
    }
    sheet.append(opts);
    modalHost.append(sheet);
    modalHost.classList.remove('hidden');
    dismissWith = spec.dismissId ?? null;
    queueMicrotask(() => sheet.querySelector<HTMLButtonElement>('.opt')?.focus());
    return new Promise(resolve => {
      resolveModal = resolve;
    });
  }

  // ---- toast ------------------------------------------------------------
  function toast(text: string, tier?: number): void {
    const item = el('div', `toast-item${tier !== undefined ? ` t${tier}` : ''}`, text);
    toastEl.append(item);
    window.setTimeout(() => {
      item.style.transition = 'opacity .3s ease';
      item.style.opacity = '0';
      window.setTimeout(() => item.remove(), 320);
    }, 2600);
    while (toastEl.childElementCount > 4) toastEl.firstElementChild?.remove();
  }

  // ---- render -----------------------------------------------------------
  let lastLogLength = 0;

  function render(view: RenderView, pressArmed: boolean): void {
    stageEl.textContent = view.stageLabel.toUpperCase();
    // stageWeek counts within the stage; weeksTotal is the whole 14-week
    // calendar. Showing "week 1 of 14" during an 8-week primary mixes the two
    // scales and reads as a much longer clock than the player actually has.
    weekEl.textContent = `Week ${view.stageWeek}`;
    const ident = [view.identity.persona, view.identity.issue, view.identity.district]
      .filter(Boolean)
      .join(' · ');
    identityEl.textContent = ident
      ? `${ident} — week ${view.calendarWeek} of ${view.weeksTotal} overall`
      : `Week ${view.calendarWeek} of ${view.weeksTotal} overall`;

    const led = view.ledger;
    ledgerEl.replaceChildren(
      chip('AP', `${led.ap}/${led.apMax}`, led.ap === 0 ? 'warn' : undefined),
      chip('Field', `${led.fieldAp}`),
      chip('Cash', `$${led.availableCash}`),
      chip('Debt', `$${led.debt}`, led.debt > 0 ? 'warn' : undefined),
      chip('Name ID', `${led.nameID}`),
      chip('Contacts', `${led.contacts}`),
      chip('Vols', `${led.volPool}`),
      chip(
        'Sigs',
        led.ballot ? 'FILED' : `${led.signatures}/${led.sigNeed}`,
        led.ballot ? 'good' : undefined
      ),
      chip('Mo', `${led.momentum}`, led.momentum < 0 ? 'warn' : undefined)
    );

    goalEl.querySelector('.primary')!.textContent = view.goal.primary;
    goalEl.querySelector('.progress')!.textContent = view.goal.progress;
    goalEl.querySelector('.next')!.textContent = view.goal.next;

    // docket
    const rows = view.docket.openings;
    docketBox.classList.toggle('hidden', rows.length === 0 && view.docket.provisions.length === 0);
    docketEl.replaceChildren(
      ...rows.slice(0, 4).map(open => {
        const row = el('div', `docket-row${open.blocked ? ' blocked' : ''}`);
        row.append(el('strong', undefined, open.name));
        row.append(
          el(
            'div',
            'w',
            open.blocked
              ? open.blocked
              : `${open.weeksLeft} week${open.weeksLeft === 1 ? '' : 's'} left · weight ${open.weight}`
          )
        );
        return row;
      }),
      ...(view.docket.provisions.length
        ? [
            el(
              'div',
              'docket-row',
              `Your bill: ${view.docket.provisions.length} provision${
                view.docket.provisions.length === 1 ? '' : 's'
              } · swing ${view.docket.swing > 0 ? '+' : ''}${view.docket.swing}`
            )
          ]
        : [])
    );

    // record — newest first, and only repaint when it actually grew
    if (view.log.length !== lastLogLength) {
      lastLogLength = view.log.length;
      logEl.replaceChildren(
        ...view.log
          .slice(-24)
          .reverse()
          .map(entry => {
            const li = el('li', entry.tier !== undefined ? `t${entry.tier}` : undefined);
            li.append(el('b', undefined, `W${entry.week} `), document.createTextNode(entry.text));
            return li;
          })
      );
    }

    countersEl.replaceChildren(
      chip('Cuts', `${view.discards.left}/${view.discards.max}`),
      chip('Heat', `${view.press.heat}/${view.press.max}`, pressArmed ? 'warn' : undefined)
    );

    // Never disabled. Ending a week with plays still in hand is a legitimate
    // decision, and a player whose only remaining cards are unplayable must
    // not be locked out of the one control that advances the game. If the
    // engine refuses, it says why and that surfaces as a toast.
    weekBtn.disabled = false;
    weekBtn.textContent = view.actions.length === 0 ? 'End week ▸' : 'End week';
    pressBtn.disabled = !view.press.canPress;
    pressBtn.textContent = pressArmed ? 'Heat armed ●' : 'Bank heat';
    pressBtn.setAttribute('aria-pressed', String(pressArmed));
  }

  /**
   * Signature of what the inspector is currently showing.
   *
   * Rebuilding this panel on every pointer move destroyed the commit button
   * between mousedown and mouseup — moving the mouse toward "Play it" fires a
   * hover change on the canvas underneath, the panel re-rendered, and the
   * click event never landed because press and release had different targets.
   * The panel is now rebuilt only when its contents actually differ.
   */
  let inspectorKey = '';

  function showInspector(
    action: ActionOption | null,
    pressArmed: boolean,
    grounds: GroundView[] = []
  ): void {
    if (!action) {
      if (inspectorKey === '') return;
      inspectorKey = '';
      inspectorEl.classList.add('hidden');
      inspectorEl.replaceChildren();
      return;
    }

    const key = [
      action.handIndex,
      action.cardId,
      action.approxOdds,
      action.fatigueNote,
      action.cycleBlocked,
      pressArmed,
      grounds.filter(g => !g.locked).map(g => g.id).join(',')
    ].join('|');
    if (key === inspectorKey) return;
    inspectorKey = key;

    inspectorEl.classList.remove('hidden');
    const meta = [RISK_LABEL[action.risk] ?? action.risk, action.kind, action.costLabel]
      .filter(Boolean)
      .join(' · ');

    const nodes: HTMLElement[] = [
      el('h4', undefined, action.name),
      el('p', 'meta', meta)
    ];
    if (action.desc) nodes.push(el('p', 'desc', action.desc));
    if (action.fatigueNote) nodes.push(el('p', 'note', action.fatigueNote));
    if (action.cycleCaution) nodes.push(el('p', 'note', action.cycleCaution));

    if (action.approxOdds !== null) {
      const odds = el('div', 'odds');
      const shown =
        pressArmed && action.pressOdds > 0 ? action.approxOdds + action.pressOdds : action.approxOdds;
      odds.append(document.createTextNode(`${Math.round(Math.min(1, shown) * 100)}%`));
      odds.append(
        el(
          'small',
          undefined,
          pressArmed && action.pressOdds > 0
            ? ` with heat · band +${action.pressBand}`
            : action.pressOdds > 0
              ? ` · heat would add +${Math.round(action.pressOdds * 100)}%`
              : ' to land'
        )
      );
      nodes.push(odds);
    }

    // The commit affordance. A card lifts and shifts when you reach for it, so
    // "click it again" is a moving target — especially on a phone. This button
    // never moves, takes a keyboard, and is big enough to hit.
    if (action.field) {
      const open = grounds.filter(g => !g.locked);
      nodes.push(el('p', 'meta', open.length ? 'Send it where?' : 'No precinct is open to you.'));
      const row = el('div', 'btn-row');
      for (const ground of open) {
        const button = el('button', 'btn');
        button.type = 'button';
        button.textContent = ground.n;
        button.addEventListener('click', () => cb.play(action.handIndex, ground.id));
        row.append(button);
      }
      nodes.push(row);
    } else {
      const play = el('button', 'btn btn-gold btn-play');
      play.type = 'button';
      play.textContent = action.branches.length ? 'Play it — you choose how' : 'Play it';
      play.addEventListener('click', () => cb.play(action.handIndex));
      nodes.push(play);
    }

    if (!action.cycleBlocked) {
      const cut = el('button', 'btn btn-cut');
      cut.type = 'button';
      cut.textContent = 'Pitch for a fresh draw';
      cut.addEventListener('click', () => cb.cycle(action.handIndex));
      nodes.push(cut);
    }
    inspectorEl.replaceChildren(...nodes);
  }

  function setBusy(busy: boolean): void {
    host.style.cursor = busy ? 'progress' : '';
    weekBtn.disabled = busy || weekBtn.disabled;
  }

  return { root: host, render, showInspector, toast, modal, closeModal, setBusy };
}
