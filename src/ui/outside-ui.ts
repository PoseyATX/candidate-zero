/**
 * Outside weather modal — leaf (no session/main imports).
 * PR-5: weather z>splash; never leave splash visible underneath; focus on dismiss.
 */

import { recoverPlayFocus } from './tabs.js';

export interface OutsideNotice {
  id: string;
  n: string;
  text: string;
}

type WeatherEl = HTMLElement & { __pendingSplash?: () => void };

/**
 * Outside weather surface — world pressure the player does not play.
 * Fixed modal (not hand, not toast). Hides any open act-splash while open.
 */
export function openOutsideWeather(
  notice: OutsideNotice,
  onClear: () => void,
  onDone?: () => void
): void {
  // Never stack splash under weather
  document.getElementById('act-splash')?.classList.add('hidden');

  let root = document.getElementById('outside-weather') as WeatherEl | null;
  if (!root) {
    root = document.createElement('div') as WeatherEl;
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
  let bodyText = notice.text;
  const dash = bodyText.indexOf('—');
  if (/^OUTSIDE/i.test(bodyText) && dash >= 0) {
    bodyText = bodyText.slice(dash + 1).trim();
  }
  if (body) body.textContent = bodyText;
  const dismiss = (): void => {
    root!.classList.add('hidden');
    onClear();
    const pending = root!.__pendingSplash;
    delete root!.__pendingSplash;
    // Session afterWeather may open act splash (transition path)
    onDone?.();
    const splash = document.getElementById('act-splash');
    const splashOpen = !!(splash && !splash.classList.contains('hidden'));
    // Flush deferred openActSplash only if onDone did not already open one
    if (pending && !splashOpen) pending();
    const splash2 = document.getElementById('act-splash');
    if (!splash2 || splash2.classList.contains('hidden')) {
      recoverPlayFocus();
    }
  };
  if (ok) {
    ok.replaceWith(ok.cloneNode(true));
    const fresh = root.querySelector('#outside-weather-ok') as HTMLButtonElement;
    fresh.addEventListener('click', dismiss);
    try {
      fresh.focus({ preventScroll: true });
    } catch {
      fresh.focus();
    }
  }
}
