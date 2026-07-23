/**
 * One-handed tabs (Play / Dossier / Log) — presentation only.
 * PR-1 behavior-identical extract from main.ts.
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

/** Wire bottom-nav buttons; default to Play. */
export function wireTabs(): void {
  document.querySelectorAll<HTMLElement>('.mnav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.gototab || 'play'))
  );
  switchTab('play');
}
