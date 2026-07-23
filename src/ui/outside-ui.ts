/**
 * Outside weather modal — leaf (no session/main imports).
 * Clears pending via callback so the orchestrator owns campaign state.
 */

export interface OutsideNotice {
  id: string;
  n: string;
  text: string;
}

/**
 * Outside weather surface — world pressure the player does not play.
 * Fixed modal (not hand, not toast). Dismiss clears pendingOutside via onClear.
 */
export function openOutsideWeather(
  notice: OutsideNotice,
  onClear: () => void,
  onDone?: () => void
): void {
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
  let bodyText = notice.text;
  const dash = bodyText.indexOf('—');
  if (/^OUTSIDE/i.test(bodyText) && dash >= 0) {
    bodyText = bodyText.slice(dash + 1).trim();
  }
  if (body) body.textContent = bodyText;
  const dismiss = (): void => {
    root!.classList.add('hidden');
    onClear();
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
