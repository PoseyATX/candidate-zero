/**
 * Screen routing — leaf (no session/main imports).
 */

export const SCREENS = ['title', 'tutorial', 'setup', 'game', 'terminal'] as const;
export type ScreenId = (typeof SCREENS)[number];

let currentScreen: ScreenId = 'title';
let tutorialReturn: ScreenId = 'title';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export function getCurrentScreen(): ScreenId {
  return currentScreen;
}

export function showScreen(id: ScreenId): void {
  currentScreen = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  // Masthead + footer hide on title (nameplate lives on the title screen).
  $('topbar').classList.toggle('hidden', id === 'title');
  $('foot').classList.toggle('hidden', id === 'title');
  window.scrollTo({ top: 0 });
}

export function showTitle(): void {
  showScreen('title');
}

export function showTutorial(): void {
  if (currentScreen !== 'tutorial') tutorialReturn = currentScreen;
  showScreen('tutorial');
}

export function showGame(): void {
  showScreen('game');
}

export function showSetup(): void {
  showScreen('setup');
}

export function showTerminal(): void {
  showScreen('terminal');
}

export function backFromTutorial(): void {
  showScreen(tutorialReturn);
}
