/**
 * CANDIDATE ZERO — the 3D client.
 *
 * Binds the frozen engine API (src/engine/api.ts) to the table. This file may
 * read the engine and send it commands; it may never decide an outcome. Every
 * number on screen came out of `view()`, every consequence out of `apply()`.
 * That is the same covenant the Unity host binds under — this is simply
 * another host, and the first one that looks like a game.
 */

import * as THREE from 'three';
import {
  apply,
  legalActions,
  newGame,
  setupOptions,
  view,
  type ActionOption,
  type Command,
  type EngineSnapshot,
  type RenderView
} from '../engine/api.js';
import { ORIGIN_QUESTIONS } from '../data/origin.js';
import { CARD_HEIGHT, CARD_WIDTH, createCard, dealIn, type CardHandle } from './cards.js';
import { createGround, groundPosition, type GroundHandle } from './grounds.js';
import { createHud, type Hud } from './hud.js';
import { discardPose, draftPose, handPose, playPose } from './hand.js';
import { createStage, pick, updatePointer, type Stage } from './stage.js';
import { RISK_COLOR } from './paint.js';
import { easeOutCubic, tween, wait } from './tween.js';

const SAVE_KEY = 'candidate-zero:snapshot';

/**
 * `?seed=12345` pins the run.
 *
 * The engine is exactly reproducible from (seed, command list) and proves it
 * in src/harness/api.ts, but no host ever exposed that. It makes a run
 * shareable — "play the seed I played" — and it makes the browser gate
 * deterministic instead of hostage to whichever week the weather rolls in.
 */
function requestedSeed(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n >>> 0 : null;
  } catch {
    return null;
  }
}

/** Shared, invisible hit geometry for hand slots. Slightly proud of the card
 *  so the edges of a fanned hand stay reachable. */
const PROXY_GEOMETRY = new THREE.PlaneGeometry(CARD_WIDTH * 1.06, CARD_HEIGHT * 1.06);
const PROXY_MATERIAL = new THREE.MeshBasicMaterial({
  visible: false,
  side: THREE.DoubleSide
});

interface HandEntry {
  key: string;
  handIndex: number;
  card: CardHandle;
  /**
   * An invisible quad parked at the card's RESTING pose, and the only thing in
   * the hand the raycaster ever sees.
   *
   * Without it the hand is unclickable in practice: hovering lifts a card
   * toward the camera, which slides it out from under the pointer, so the
   * click that follows hits nothing and clears the selection. Separating the
   * hit target from the animated object fixes hover flicker and the
   * click-through in one move.
   */
  proxy: THREE.Mesh;
}

export class Client {
  private stage: Stage;
  private hud: Hud;
  private snap: EngineSnapshot | null = null;
  private cachedView: RenderView | null = null;
  private hand: HandEntry[] = [];
  private grounds = new Map<string, GroundHandle>();
  private hovered: string | null = null;
  private selected: number | null = null;
  private pressArmed = false;
  private busy = false;
  /** Set while waiting for a precinct click for a field play. */
  private awaitingGround: ActionOption | null = null;
  private draftCards: CardHandle[] = [];

  constructor(stageHost: HTMLElement, hudHost: HTMLElement) {
    this.stage = createStage(stageHost);
    this.hud = createHud(hudHost, {
      endWeek: () => void this.endWeek(),
      cycle: index => void this.cycle(index),
      togglePress: () => {
        this.pressArmed = !this.pressArmed;
        this.repaintHud();
        this.refreshInspector();
      },
      newRun: () => void this.title(),
      play: (handIndex, groundId) => {
        const action = this.actions().find(a => a.handIndex === handIndex);
        if (!action) return;
        this.disarmGrounds();
        void this.playAction(action, groundId);
      }
    });

    const canvas = this.stage.renderer.domElement;
    canvas.addEventListener('pointermove', ev => this.onPointerMove(ev));
    canvas.addEventListener('pointerdown', ev => this.onPointerDown(ev));
    // Not while a play is resolving: a hover change mid-animation used to
    // fight the card that was already in flight.
    canvas.addEventListener('pointerleave', () => {
      if (!this.busy) this.setHover(null);
    });
    window.addEventListener('keydown', ev => this.onKey(ev));
  }

  // ---- boot --------------------------------------------------------------

  async title(): Promise<void> {
    const saved = this.loadSaved();
    const options = [
      { id: 'new', name: 'File for office', desc: 'Pick who you are, what you are for, and where.' }
    ];
    if (saved) {
      options.unshift({
        id: 'resume',
        name: 'Resume the run',
        desc: 'The campaign you left on the table.'
      });
    }
    const choice = await this.hud.modal({
      eyebrow: 'A Texas Political Epic',
      title: 'Candidate Zero',
      lede:
        'You are nobody. No list, no machine, no legacy. A Texas primary will take ' +
        'everything you build — and then take you.',
      body: 'Start at zero. Keep the deck. Keep going.',
      options
    });

    if (choice === 'resume' && saved) {
      this.snap = saved;
      await this.syncScene({ deal: true });
      return;
    }
    await this.filing();
  }

  /**
   * Character creation. Six questions, and the three origin ones are the
   * reason two Blockwalkers are different people — they move root attributes,
   * which the engine turns into real percentage points on every card tagged
   * with them. The biography IS the build (see data/origin.ts).
   */
  private async filing(): Promise<void> {
    const opts = setupOptions();

    const personaId = await this.hud.modal({
      eyebrow: 'The filing · who',
      title: 'Who is running?',
      body: 'Your name goes on the ballot either way. This is what is behind it.',
      options: opts.personas.map(p => ({ id: p.id, name: p.n, desc: p.d }))
    });

    const originIds: string[] = [];
    for (const [index, question] of ORIGIN_QUESTIONS.entries()) {
      const answer = await this.hud.modal({
        eyebrow: `The filing · ${index + 1} of ${ORIGIN_QUESTIONS.length}`,
        title: question.q,
        body: question.hint,
        options: question.answers.map(a => ({
          id: a.id,
          name: a.said ?? a.n,
          desc: a.d
        }))
      });
      originIds.push(answer);
    }

    const issueId = await this.hud.modal({
      eyebrow: 'The filing · what',
      title: 'What are you for?',
      body: 'One thing you will be asked about in every room you enter this year.',
      options: opts.issues.map(i => ({ id: i.id, name: i.n, desc: i.d }))
    });

    const regionId = await this.hud.modal({
      eyebrow: 'The filing · where',
      title: 'Which part of the state?',
      body: 'The country decides who your neighbours are, and what it costs to reach them.',
      options: opts.regions.map(r => ({ id: r.id, name: r.n, desc: r.d }))
    });

    const districtId = await this.hud.modal({
      eyebrow: 'The filing · the seat',
      title: 'Which seat?',
      body: 'The district decides who you have to convince, and how many of them.',
      options: opts.districts.map(d => ({ id: d.id, name: d.n, desc: d.d }))
    });

    const seed = requestedSeed() ?? ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.snap = newGame({
      seed,
      setup: { ...opts.default, personaId, issueId, regionId, districtId, originIds }
    });
    this.hud.toast('Filed. The clock starts now.', 3);
    await this.syncScene({ deal: true });
  }

  // ---- state sync --------------------------------------------------------

  private currentView(): RenderView {
    if (!this.snap) throw new Error('no campaign');
    if (!this.cachedView) this.cachedView = view(this.snap);
    return this.cachedView;
  }

  private actions(): ActionOption[] {
    return this.snap ? legalActions(this.snap) : [];
  }

  private invalidate(): void {
    this.cachedView = null;
  }

  /** Rebuild the table from the current snapshot. */
  private async syncScene(opts: { deal?: boolean } = {}): Promise<void> {
    if (!this.snap) return;
    this.invalidate();
    const v = this.currentView();
    this.save();

    if (v.over) {
      await this.gameOver(v);
      return;
    }

    if (v.pendingOutside) {
      await this.showOutside(v);
      return;
    }

    if (v.pendingDraft) {
      await this.showDraft(v);
      return;
    }

    this.syncGrounds(v);
    await this.syncHand(v, opts.deal ?? false);
    this.repaintHud();
  }

  private syncGrounds(v: RenderView): void {
    const seen = new Set<string>();
    v.grounds.forEach((g, index) => {
      seen.add(g.id);
      let handle = this.grounds.get(g.id);
      const data = {
        name: g.n,
        pool: g.pool,
        rapport: g.rapport,
        rivalRap: g.rivalRap,
        gotv: g.gotv,
        locked: g.locked,
        lockReason: g.lockReason
      };
      if (!handle) {
        handle = createGround(g.id, data);
        this.grounds.set(g.id, handle);
        this.stage.scene.add(handle.group);
        this.stage.pickables.push(handle.group);
      } else {
        handle.setData(data);
      }
      const target = groundPosition(index, v.grounds.length);
      handle.group.position.x = target.x;
      handle.group.position.z = target.z;
    });

    for (const [id, handle] of [...this.grounds]) {
      if (seen.has(id)) continue;
      this.removePickable(handle.group);
      handle.dispose();
      this.grounds.delete(id);
    }
  }

  private async syncHand(v: RenderView, deal: boolean): Promise<void> {
    const actionByIndex = new Map(v.actions.map(a => [a.handIndex, a]));
    const wanted = v.hand.map(card => ({
      key: `${card.handIndex}:${card.cardId}`,
      handIndex: card.handIndex,
      card
    }));

    // Cards that left the hand fly to the discard on their own clock. The
    // engine has already resolved them, so nothing about the game's state may
    // wait on this animation — on a software renderer it takes seconds.
    for (const entry of this.hand) {
      if (wanted.some(w => w.key === entry.key)) continue;
      this.removePickable(entry.proxy);
      entry.proxy.removeFromParent();
      const leaving = entry.card;
      const gone = discardPose();
      void leaving.moveTo(gone.pos, gone.rot, { dur: 0.4, arc: 1.4 }).then(() => leaving.dispose());
    }

    const next: HandEntry[] = [];
    const waits: Promise<void>[] = [];

    wanted.forEach((w, index) => {
      const action = actionByIndex.get(w.handIndex);
      const face = {
        name: w.card.name,
        risk: w.card.risk,
        kind: action?.kind ?? 'action',
        tag: action?.tag ?? '',
        costLabel: w.card.costLabel,
        odds: action?.approxOdds ?? null,
        playable: w.card.playable,
        lockNote: w.card.playable ? undefined : 'held'
      };
      const rest = handPose(index, wanted.length, false);

      let entry = this.hand.find(h => h.key === w.key);
      if (!entry) {
        const card = createCard(`hand:${w.handIndex}`, face);
        this.stage.scene.add(card.group);
        const proxy = new THREE.Mesh(PROXY_GEOMETRY, PROXY_MATERIAL);
        proxy.userData.pickId = `hand:${w.handIndex}`;
        this.stage.scene.add(proxy);
        this.stage.pickables.push(proxy);
        entry = { key: w.key, handIndex: w.handIndex, card, proxy };
        waits.push(dealIn(entry.card, rest.pos, rest.rot, deal ? index * 0.07 : 0));
      } else {
        entry.card.setFace(face);
        entry.handIndex = w.handIndex;
        entry.card.group.userData.pickId = `hand:${w.handIndex}`;
        entry.proxy.userData.pickId = `hand:${w.handIndex}`;
        waits.push(entry.card.moveTo(rest.pos, rest.rot, { dur: 0.3 }));
      }

      // the hit target never animates — that is the whole point of it
      entry.proxy.position.copy(rest.pos);
      entry.proxy.rotation.copy(rest.rot);
      next.push(entry);
    });

    this.hand = next;
    await Promise.all(waits);
  }

  private removePickable(obj: THREE.Object3D): void {
    const at = this.stage.pickables.indexOf(obj);
    if (at >= 0) this.stage.pickables.splice(at, 1);
  }

  private repaintHud(): void {
    if (!this.snap) return;
    this.hud.render(this.currentView(), this.pressArmed);
  }

  // ---- pointer -----------------------------------------------------------

  private onPointerMove(ev: PointerEvent): void {
    if (this.busy) return;
    updatePointer(this.stage, ev);
    const hit = pick(this.stage);
    this.setHover(hit ? String(hit.userData.pickId) : null);
  }

  private setHover(id: string | null): void {
    if (this.hovered === id) return;
    this.hovered = id;

    const v = this.snap ? this.currentView() : null;
    const count = this.hand.length;
    this.hand.forEach((entry, index) => {
      const isHot = id === `hand:${entry.handIndex}`;
      const isSelected = this.selected === entry.handIndex;
      entry.card.setHighlight(isHot);
      // only the visible card moves; entry.proxy stays at the resting pose
      const pose = handPose(index, count, isHot || isSelected);
      void entry.card.moveTo(pose.pos, pose.rot, { dur: 0.2 });
    });

    for (const [gid, handle] of this.grounds) {
      handle.setHighlight(id === `ground:${gid}`);
    }

    this.stage.renderer.domElement.style.cursor = id ? 'pointer' : '';

    // inspector follows the hover, falling back to the held card
    if (v) {
      const focus = id?.startsWith('hand:')
        ? Number(id.slice(5))
        : this.selected ?? this.awaitingGround?.handIndex ?? null;
      const action = focus === null ? null : this.actions().find(a => a.handIndex === focus) ?? null;
      this.hud.showInspector(action, this.pressArmed, v.grounds);
    }
  }

  private refreshInspector(): void {
    const focus = this.selected ?? this.awaitingGround?.handIndex ?? null;
    const action = focus === null ? null : this.actions().find(a => a.handIndex === focus) ?? null;
    this.hud.showInspector(action, this.pressArmed, this.snap ? this.currentView().grounds : []);
  }

  private onPointerDown(ev: PointerEvent): void {
    if (this.busy || !this.snap) return;
    updatePointer(this.stage, ev);
    const hit = pick(this.stage);
    if (!hit) {
      this.clearSelection();
      return;
    }
    const id = String(hit.userData.pickId);

    if (id.startsWith('ground:') && this.awaitingGround) {
      const groundId = id.slice(7);
      const ground = this.currentView().grounds.find(g => g.id === groundId);
      if (!ground || ground.locked) {
        this.hud.toast(ground?.lockReason || 'That precinct is closed to you.', 0);
        return;
      }
      const action = this.awaitingGround;
      this.disarmGrounds();
      void this.playAction(action, groundId);
      return;
    }

    if (id.startsWith('hand:')) {
      const handIndex = Number(id.slice(5));
      void this.tapCard(handIndex);
    }
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.busy || !this.snap) return;
    if (ev.key === 'Enter' && !ev.metaKey) {
      const v = this.currentView();
      if (v.canEndWeek || v.actions.length === 0) void this.endWeek();
      return;
    }
    if (ev.key >= '1' && ev.key <= '9') {
      const slot = Number(ev.key) - 1;
      const entry = this.hand[slot];
      if (entry) void this.tapCard(entry.handIndex);
    }
  }

  // ---- playing -----------------------------------------------------------

  private clearSelection(): void {
    this.selected = null;
    this.disarmGrounds();
    for (const entry of this.hand) entry.card.setSelected(false);
    this.hud.showInspector(null, this.pressArmed, []);
  }

  private disarmGrounds(): void {
    this.awaitingGround = null;
    for (const handle of this.grounds.values()) handle.setArmed(false);
  }

  private async tapCard(handIndex: number): Promise<void> {
    const action = this.actions().find(a => a.handIndex === handIndex);
    if (!action) {
      const held = this.currentView().hand.find(c => c.handIndex === handIndex);
      this.hud.toast(
        held ? `${held.name} — you cannot play that right now.` : 'Not playable.',
        0
      );
      return;
    }

    // first tap selects and explains; second tap commits
    if (this.selected !== handIndex) {
      this.selected = handIndex;
      for (const entry of this.hand) entry.card.setSelected(entry.handIndex === handIndex);
      this.hud.showInspector(action, this.pressArmed, this.currentView().grounds);
      if (action.field) {
        this.armGrounds(action);
        this.hud.toast('Pick a precinct on the table.');
      }
      return;
    }

    if (action.field) {
      this.armGrounds(action);
      this.hud.toast('Pick a precinct on the table.');
      return;
    }

    await this.playAction(action);
  }

  private armGrounds(action: ActionOption): void {
    this.awaitingGround = action;
    const v = this.currentView();
    for (const [id, handle] of this.grounds) {
      const ground = v.grounds.find(g => g.id === id);
      handle.setArmed(!!ground && !ground.locked);
    }
  }

  private async playAction(action: ActionOption, groundId?: string): Promise<void> {
    if (!this.snap) return;

    let branch: string | undefined;
    if (action.branches.length) {
      this.busy = true;
      branch = await this.hud.modal({
        eyebrow: 'You decide',
        title: action.name,
        lede: action.desc,
        options: action.branches.map(b => ({ id: b.id, name: b.name, desc: b.desc }))
      });
      this.busy = false;
      if (!branch) return;
    }

    this.busy = true;
    this.hud.setBusy(true);
    this.clearSelection();

    const entry = this.hand.find(h => h.handIndex === action.handIndex);
    const command: Command = {
      type: 'play',
      handIndex: action.handIndex,
      ...(groundId ? { groundId } : {}),
      ...(branch ? { branch } : {}),
      ...(this.pressArmed ? { press: true } : {})
    };

    // throw it into the light before the engine is asked
    if (entry) {
      const pose = playPose();
      await entry.card.moveTo(pose.pos, pose.rot, { dur: 0.34, arc: 2.2 });
    }

    const result = apply(this.snap, command);
    if (!result.ok) {
      this.hud.toast(result.reason ?? 'The engine refused that play.', 0);
      this.busy = false;
      this.hud.setBusy(false);
      this.pressArmed = false;
      await this.syncScene();
      return;
    }

    this.snap = result.snapshot;
    this.pressArmed = false;

    // The ledger is truthful the instant the engine has ruled. It does not
    // wait for a card to finish flying off the table.
    this.invalidate();
    this.repaintHud();

    const tiered = [...result.events].reverse().find(e => e.tier !== undefined);
    const tier = tiered?.tier;
    if (entry) {
      entry.card.flash(
        tier === undefined
          ? RISK_COLOR[action.risk] ?? '#c9a227'
          : tier >= 3
            ? '#6f8a5a'
            : tier === 0
              ? '#c25a3c'
              : '#c9a227'
      );
    }

    for (const event of result.events.slice(-3)) {
      this.hud.toast(event.text, event.tier);
    }

    // Let the flash read, then rebuild. syncHand sends the spent card away.
    await wait(0.3);

    this.busy = false;
    this.hud.setBusy(false);
    await this.syncScene();
  }

  private async cycle(handIndex: number): Promise<void> {
    if (!this.snap || this.busy) return;
    this.busy = true;
    const entry = this.hand.find(h => h.handIndex === handIndex);
    const result = apply(this.snap, { type: 'cycle', handIndex });
    if (!result.ok) {
      this.hud.toast(result.reason ?? 'That card cannot be cut.', 0);
      this.busy = false;
      return;
    }
    this.snap = result.snapshot;
    if (entry) {
      const gone = discardPose();
      await entry.card.moveTo(gone.pos, gone.rot, { dur: 0.32, arc: 1.2 });
    }
    this.clearSelection();
    this.busy = false;
    await this.syncScene();
  }

  private async endWeek(): Promise<void> {
    if (!this.snap || this.busy) return;
    this.busy = true;
    this.hud.setBusy(true);
    this.clearSelection();

    // sweep the hand off the table — cosmetic, so the week does not wait on it
    this.hand.forEach((entry, index) => {
      const gone = discardPose();
      void entry.card.moveTo(gone.pos, gone.rot, { dur: 0.34, delay: index * 0.04, arc: 1.2 });
    });

    const result = apply(this.snap, { type: 'endWeek' });
    if (!result.ok) {
      this.hud.toast(result.reason ?? 'The week will not turn yet.', 0);
      this.busy = false;
      this.hud.setBusy(false);
      await this.syncScene();
      return;
    }
    this.snap = result.snapshot;
    for (const event of result.events.slice(-4)) this.hud.toast(event.text, event.tier);

    // clear the table objects so the new hand deals in clean
    for (const entry of this.hand) {
      this.removePickable(entry.proxy);
      entry.proxy.removeFromParent();
      entry.card.dispose();
    }
    this.hand = [];

    this.busy = false;
    this.hud.setBusy(false);
    await this.syncScene({ deal: true });
  }

  // ---- interruptions -----------------------------------------------------

  private async showOutside(v: RenderView): Promise<void> {
    const out = v.pendingOutside;
    if (!out || !this.snap) return;
    this.busy = true;
    await this.hud.modal({
      eyebrow: 'Out in the state',
      title: out.n,
      lede: out.text,
      options: [{ id: 'ok', name: 'Read it and move' }],
      dismissId: 'ok'
    });
    const result = apply(this.snap, { type: 'dismissOutside' });
    if (result.ok) this.snap = result.snapshot;
    this.busy = false;
    await this.syncScene();
  }

  /** The draft is the roguelike beat, so it happens on the table, not in a list. */
  private async showDraft(v: RenderView): Promise<void> {
    const draft = v.pendingDraft;
    if (!draft || !this.snap) return;
    this.busy = true;

    for (const card of this.draftCards) {
      this.removePickable(card.group);
      card.dispose();
    }
    this.draftCards = [];

    draft.options.forEach((option, index) => {
      const card = createCard(`draft:${index}`, {
        name: option.name,
        risk: option.risk,
        kind: option.kind,
        tag: option.kind === 'upgrade' ? 'SHARPEN' : option.kind === 'shed' ? 'SHED' : '',
        costLabel: option.kind === 'shed' ? 'Taken off you' : 'Into the deck',
        odds: null,
        playable: true
      });
      this.stage.scene.add(card.group);
      const pose = draftPose(index, draft.options.length);
      card.group.position.set(pose.pos.x, -2, pose.pos.z);
      card.group.rotation.copy(pose.rot);
      void card.moveTo(pose.pos, pose.rot, { dur: 0.5, delay: index * 0.1 });
      this.draftCards.push(card);
    });

    const choice = await this.hud.modal({
      eyebrow: `Phase ${draft.phase} · what you carry forward`,
      title: 'Take one',
      body: 'A deck is the only thing that survives a campaign. Choose what is in it.',
      options: draft.options.map((option, index) => ({
        id: String(index),
        name: option.name,
        desc:
          option.kind === 'upgrade'
            ? 'Sharpen something you already run.'
            : option.kind === 'shed'
              ? 'Somebody takes this weight off you.'
              : `${option.risk} · into the deck`
      }))
    });

    for (const card of this.draftCards) {
      void card.moveTo(
        new THREE.Vector3(card.group.position.x, -3, card.group.position.z),
        card.group.rotation,
        { dur: 0.3 }
      );
    }
    window.setTimeout(() => {
      for (const card of this.draftCards) card.dispose();
      this.draftCards = [];
    }, 400);

    const result = apply(this.snap, { type: 'draft', option: Number(choice) });
    if (result.ok) {
      this.snap = result.snapshot;
      for (const event of result.events.slice(-2)) this.hud.toast(event.text, event.tier);
    } else {
      this.hud.toast(result.reason ?? 'That pick was refused.', 0);
    }
    this.busy = false;
    await this.syncScene();
  }

  private async gameOver(v: RenderView): Promise<void> {
    this.busy = true;
    this.clearSelection();
    window.localStorage.removeItem(SAVE_KEY);

    const won = /win|won|seat|elected|passed/i.test(v.outcome);
    await this.hud.modal({
      eyebrow: won ? 'Sine die' : 'The count is in',
      title: v.outcome || 'The run is over',
      lede: v.goal.primary,
      body: v.goal.progress,
      options: [{ id: 'again', name: 'File again', desc: 'A new seed, a new district, the same state.' }]
    });

    for (const entry of this.hand) {
      this.removePickable(entry.proxy);
      entry.proxy.removeFromParent();
      entry.card.dispose();
    }
    this.hand = [];
    for (const [, handle] of this.grounds) {
      this.removePickable(handle.group);
      handle.dispose();
    }
    this.grounds.clear();
    this.snap = null;
    this.invalidate();
    this.busy = false;
    await this.filing();
  }

  // ---- persistence -------------------------------------------------------

  private save(): void {
    if (!this.snap) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.snap));
    } catch {
      /* private browsing, quota — a lost save is not worth breaking the run */
    }
  }

  private loadSaved(): EngineSnapshot | null {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as EngineSnapshot;
      // prove it hydrates before offering it
      view(parsed);
      return parsed;
    } catch {
      return null;
    }
  }
}
