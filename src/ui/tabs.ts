/**
 * One-handed tabs (Play / Dossier / Log) — presentation only.
 * PR-5: recoverPlayFocus after ceremony dismiss.
 */

/** Switch in-game tab panel. */
export function switchTab(name: string): void {
  const game = document.getElementById('game');
  if (game) {
    game.className = game.className.replace(/\btab-\w+\b/g, '').trim() + ` tab-${name}`;
  }
  document.querySelectorAll<HTMLElement>('.mtab-panel').forEach(p =>
    p.classList.toggle('active', p.dataset.tab === name)
  );
  document.querySelectorAll<HTMLElement>('.mnav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.gototab === name)
  );
}

/**
 * After weather/splash dismiss: Play tab + focus first unlocked card or End Week.
 */
export function recoverPlayFocus(): void {
  switchTab('play');
  const card = document.querySelector<HTMLButtonElement>(
    '#playables .play-card:not(.locked):not([disabled])'
  );
  const end = document.getElementById('btn-end') as HTMLButtonElement | null;
  const target = card ?? end;
  try {
    target?.focus({ preventScroll: true });
  } catch {
    target?.focus();
  }
}

/** Wire bottom-nav buttons; default to Play. */
export function wireTabs(): void {
  document.querySelectorAll<HTMLElement>('.mnav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.gototab || 'play'))
  );
  switchTab('play');
}
