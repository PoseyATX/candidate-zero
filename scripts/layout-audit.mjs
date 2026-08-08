/**
 * CANDIDATE ZERO — layout & touch audit (the a11y floor axe cannot check)
 *
 * axe-core is clean on this app at every impact level, and it was still
 * possible for EVERY screen to scroll horizontally at 320px — a WCAG 1.4.10
 * (Reflow, AA) failure — because axe does not evaluate reflow, and it does not
 * evaluate target size either. The bottom navigation, the most-tapped control
 * in the game, was a 34px target for months.
 *
 * So this is the complement to `npm run a11y`, not a duplicate of it:
 *
 *   1. REFLOW (WCAG 1.4.10, AA) — no horizontal scrolling at 320 CSS px.
 *      Hard fail. This is the one that was silently broken.
 *   2. TARGET SIZE (WCAG 2.5.8, AA) — every interactive control ≥ 24x24.
 *      Hard fail.
 *   3. TARGET SIZE (WCAG 2.5.5, AAA) — reports anything under 44x44 as a
 *      warning. Not a fail: an inline text link at 24px is legitimate, and
 *      forcing 44 on one would look wrong.
 *   4. TYPE FLOOR — reports rendered text under 12px. WCAG sets no minimum
 *      size, but 8px Cinzel on a phone is not readable and the alpha feedback
 *      said as much. Warning, not a fail.
 *
 * Run: npm run a11y:layout
 * Exit code: non-zero on a reflow or <24px target failure.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.LAYOUT_PORT ?? 4197);
const BASE = `http://localhost:${PORT}/candidate-zero/`;
/** Narrowest viewport WCAG 1.4.10 requires reflow at. */
const REFLOW_WIDTH = 320;
const AA_TARGET = 24;
const AAA_TARGET = 44;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

/** Runs in the page. Only measures what is actually visible on THIS screen. */
const PROBE = ({ AA, AAA }) => {
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    // Ignore anything inside a hidden screen — the app keeps them in the DOM.
    for (let p = el; p; p = p.parentElement) {
      if (p.classList && p.classList.contains('hidden')) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const out = { tiny: [], small: [], text: [], overflow: [], pageScrollsX: false };
  const seen = new Set();
  const sel = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const label = (el.textContent || el.getAttribute('aria-label') || el.id || el.tagName).trim().slice(0, 34);
    const key = `${label}|${Math.round(r.width)}x${Math.round(r.height)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rec = { label, w: Math.round(r.width), h: Math.round(r.height), id: el.id || null };
    if (r.height < AA || r.width < AA) out.tiny.push(rec);
    else if (r.height < AAA) out.small.push(rec);
  }

  const tseen = new Set();
  for (const el of document.querySelectorAll('*')) {
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText || !visible(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px >= 12) continue;
    const k = `${el.className}|${px}`;
    if (tseen.has(k)) continue;
    tseen.add(k);
    out.text.push({ px: +px.toFixed(1), cls: el.className.toString().slice(0, 40), sample: el.textContent.trim().slice(0, 24) });
  }

  const docW = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.right > docW + 1) {
      out.overflow.push({ cls: (el.id || el.className).toString().slice(0, 40), right: Math.round(r.right), docW });
    }
  }
  out.overflow = out.overflow.slice(0, 6);
  out.pageScrollsX = document.documentElement.scrollWidth > docW + 1;
  return out;
};

async function main() {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('dist missing — building…');
    if (spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
      throw new Error('build failed');
    }
  }
  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  const failures = [];
  const warnings = [];
  let browser;
  try {
    if (!(await waitForServer(BASE))) throw new Error(`preview server never ready at ${BASE}`);
    browser = await chromium.launch();

    console.log('=== CANDIDATE ZERO — layout & touch audit ===');
    for (const width of [390, REFLOW_WIDTH]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });
      console.log(`\n--- viewport ${width}px ---`);

      const check = async (state) => {
        const r = await page.evaluate(PROBE, { AA: AA_TARGET, AAA: AAA_TARGET });
        const bits = [];
        if (width === REFLOW_WIDTH && (r.pageScrollsX || r.overflow.length)) {
          failures.push(`REFLOW ${state}@${width}: page scrolls horizontally ${JSON.stringify(r.overflow)}`);
          bits.push('REFLOW FAIL');
        }
        if (r.tiny.length) {
          failures.push(`TARGET ${state}@${width}: below ${AA_TARGET}px ${JSON.stringify(r.tiny)}`);
          bits.push(`${r.tiny.length} target(s) <${AA_TARGET}px`);
        }
        if (r.small.length) {
          warnings.push(`${state}@${width}: under ${AAA_TARGET}px — ${r.small.map(t => `${t.label} ${t.w}x${t.h}`).join('; ')}`);
        }
        if (r.text.length) {
          warnings.push(`${state}@${width}: text under 12px — ${r.text.map(t => `${t.cls || '(inline)'} ${t.px}px`).join('; ')}`);
        }
        console.log(`  ${state.padEnd(14)} ${bits.length ? '✗ ' + bits.join(', ') : '✓'}`);
      };

      await check('title');
      await page.locator('#btn-title-start').click();
      await page.waitForTimeout(200);
      await check('setup');
      const pick = async (kind, id) => {
        const c = page.locator(`.id-card[data-kind="${kind}"][data-id="${id}"]`);
        await c.waitFor({ state: 'visible', timeout: 10_000 });
        await c.click();
        await page.waitForTimeout(60);
      };
      await pick('persona', 'blockwalker');
      // Origin: the trade, the first room, the skeleton (data/origin.ts).
      await pick('origin', 'route');
      await pick('origin', 'angry');
      await pick('origin', 'bankruptcy');
      await pick('issue', 'taxes');
      await pick('district', 'open');
      await pick('region', 'east');
      await page.locator('#seed-input').fill('4242');
      await page.locator('#btn-start').click();
      await page.waitForSelector('#game:not(.hidden)', { timeout: 10_000 });
      for (let i = 0; i < 4; i++) {
        const s = page.locator('#act-splash');
        if ((await s.count()) && (await s.isVisible())) {
          await page.locator('#act-splash-ok').click();
          await page.waitForTimeout(150);
        }
      }
      await check('game');
      await page.locator('#playables .play-card').first().click();
      await page.waitForTimeout(300);
      await check('card-detail');
      await page.locator('#btn-detail-back').click();
      await page.waitForTimeout(200);
      await page.locator('[data-gototab="dossier"]').click();
      await page.waitForTimeout(250);
      await check('dossier');
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  if (warnings.length) {
    console.log(`\n=== Warnings (${warnings.length}) — not gating ===`);
    for (const w of warnings) console.log('  · ' + w);
  }
  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} layout/target violation(s)`);
    for (const f of failures) console.error('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log(`\nPASS: reflow clean at ${REFLOW_WIDTH}px; every target ≥ ${AA_TARGET}x${AA_TARGET} (WCAG 1.4.10 + 2.5.8).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
