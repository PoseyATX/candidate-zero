/**
 * Candidate Zero — UI boot (orchestrator only).
 * Imports CSS; card geometry locked in card-lock.css (2:3 hard rule).
 */

import { initApp } from './session.js';
import { closeCardDetail } from './paint-play.js';
import { emptyDraft, renderNameplateDraft, type NameplateDraftState } from './nameplate-draft.js';
import './styles.css';
import './card-lock.css';
import './nameplate.css';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

// Re-export hooks other modules may rely on via main (boot surface)
export { closeCardDetail };
export type { NameplateDraftState };

initApp({
  emptyDraft,
  renderNameplateDraft
});
