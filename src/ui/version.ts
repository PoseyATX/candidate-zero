/**
 * The one place the build's version becomes words on screen.
 *
 * COVENANT 8 — honest versioning, no marketing labels without evidence.
 *
 * The title screen read "Alpha · v0.1" from the day it was created, and the
 * build tag under it read "Alpha · v0.1.0". Neither was ever true:
 * `docs/ROADMAP.md` places "honest v0.1" at Phases 6–7, and `README.md` said in
 * its own status heading "v0.0.x — not v0.1". Three hand-typed mirrors, all
 * disagreeing, one of them shipping a claim the project's own documents
 * contradicted. Exactly the drift `scripts/gen-unity-models.ts` was written to
 * end on the C# side, still alive on this one.
 *
 * So: `package.json` is the source, Vite injects it (`__APP_VERSION__`), and
 * nothing in markup states a version. `scripts/check-version.mjs` fails the
 * build if a version string reappears in HTML.
 *
 * THE RULE, so the number is derived rather than felt:
 *
 *   0.0.<highest completed phase>   — see docs/ROADMAP.md
 *
 * Phases 0–5 are done, so this is **0.0.5**. Phase 6 (mobile polish) earns
 * 0.0.6. **v0.1 is earned at Phase 7 and is not claimed before it.** A version
 * you award yourself is a marketing label; one you can point at a roadmap row
 * for is evidence.
 */

declare const __APP_VERSION__: string;

/** Raw semver from package.json, injected at build time. */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

/**
 * Pre-release label. Anything under 1.0 is an alpha and says so; we do not get
 * to call it a beta because it feels further along.
 */
export function versionLabel(): string {
  const major = Number(APP_VERSION.split('.')[0] ?? 0);
  const minor = Number(APP_VERSION.split('.')[1] ?? 0);
  if (major > 0) return `v${APP_VERSION}`;
  return `${minor > 0 ? 'Beta' : 'Alpha'} · v${APP_VERSION}`;
}

/** Short form for the masthead, where space is tight. */
export function versionShort(): string {
  return `Alpha · v${APP_VERSION}`;
}

/** Paint every version slot. Safe to call before those nodes exist. */
export function renderVersion(): void {
  const mast = document.getElementById('masthead-version');
  if (mast) mast.textContent = versionShort();
  const title = document.getElementById('title-version');
  if (title) title.textContent = versionLabel();
}
