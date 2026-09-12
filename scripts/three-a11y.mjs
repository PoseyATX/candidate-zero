/**
 * CANDIDATE ZERO — accessibility audit for the 3D client (WCAG 2 A/AA)
 *
 * axe-core against the surface players actually use: the title sheet, a filing
 * sheet, and the in-run chrome (ledger, goal strip, docket, record, inspector,
 * week controls). The table itself is a canvas and axe has nothing to say about
 * it — which is exactly why the paperwork around it has to carry the semantics,
 * and why this gate exists.
 *
 * Fails on any critical or serious violation. Moderate/minor are reported.
 *
 * Run: npm run a11y:three
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AXE = join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const PORT = Number(process.env.A11Y3D_PORT ?? 4212);
const BASE = `http://localhost:${PORT}/candidate-zero/`;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up */
    }
    await sleep(250);
  }
  return false;
}

async function runAxe(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(
    (tags) =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations']
      }),
    WCAG_TAGS
  );
}

async function main() {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('dist missing — building…');
    if (spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
      throw new Error('build failed');
    }
  }
  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' }
  );

  const byState = {};
  let reflow = null;
  let browser;
  try {
    if (!(await waitForServer(BASE))) throw new Error(`preview never ready at ${BASE}`);
    browser = await chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
    });
    // Phone first: this is where target size and reflow actually bite.
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1200);

    byState.title = await runAxe(page);

    // First filing sheet — the pattern every other sheet reuses.
    await page.locator('.opt').first().click();
    await sleep(500);
    byState.filing = await runAxe(page);

    // Walk the rest of the filing into a live run.
    for (let i = 0; i < 14; i++) {
      let open = false;
      for (let w = 0; w < 8; w++) {
        if (await page.locator('#modal:not(.hidden)').count()) {
          open = true;
          break;
        }
        await sleep(200);
      }
      if (!open) break;
      await page.locator('.opt').first().click();
      await sleep(400);
    }
    await sleep(1800);
    byState.run = await runAxe(page);

    // The inspector: the panel that carries a card's odds, cost and commit
    // controls. It is the densest interactive region in the whole client.
    const box = await page.locator('#stage canvas').boundingBox();
    let opened = false;
    for (const fy of [0.8, 0.74, 0.86]) {
      for (let i = 0; i <= 24 && !opened; i++) {
        await page.mouse.move(
          box.x + box.width * (0.12 + (0.76 * i) / 24),
          box.y + box.height * fy
        );
        await sleep(90);
        opened = await page.evaluate(
          () => !document.querySelector('#inspector')?.classList.contains('hidden')
        );
      }
      if (opened) break;
    }
    if (opened) {
      byState.inspector = await runAxe(page);
    } else {
      console.log('  · inspector not reached (no card answered the pointer)');
    }

    // --- Reflow + target size at 320px (WCAG 1.4.10, 2.5.8) ---------------
    // axe checks neither. The chrome has to survive the narrowest phone
    // without a horizontal scrollbar, and every control has to stay tappable.
    await page.setViewportSize({ width: 320, height: 720 });
    await sleep(700);
    reflow = await page.evaluate(() => {
      const scrollsSideways = document.documentElement.scrollWidth > window.innerWidth + 1;
      const small = [];
      for (const el of document.querySelectorAll('#hud button, #modal button')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.width < 24 || r.height < 24) {
          small.push(`${el.textContent?.trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return { scrollsSideways, small, scrollWidth: document.documentElement.scrollWidth };
    });
  } finally {
    await browser?.close();
    server.kill();
  }

  let blocking = 0;
  const seen = new Map();
  for (const [state, res] of Object.entries(byState)) {
    const v = res?.violations ?? [];
    console.log(`\n=== ${state} — ${v.length} violation type(s) ===`);
    for (const rule of v.slice().sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9))) {
      const sample = rule.nodes?.[0]?.target?.join(' ') ?? '';
      console.log(`  [${rule.impact}] ${rule.id} — ${rule.help} (${rule.nodes.length}) ${sample}`);
      if (rule.impact === 'critical' || rule.impact === 'serious') blocking += rule.nodes.length;
      if (!seen.has(rule.id)) seen.set(rule.id, rule);
    }
    if (!v.length) console.log('  clean');
  }

  if (reflow) {
    console.log('\n=== reflow @320px ===');
    console.log(`  horizontal scroll: ${reflow.scrollsSideways ? `YES (${reflow.scrollWidth}px)` : 'none'}`);
    console.log(`  targets under 24x24: ${reflow.small.length ? reflow.small.join('; ') : 'none'}`);
    if (reflow.scrollsSideways) blocking += 1;
    blocking += reflow.small.length;
  }

  console.log('');
  if (blocking > 0) {
    console.log(`3D a11y FAILED — ${blocking} critical/serious node(s).`);
    process.exit(1);
  }
  console.log(`3D a11y green — ${Object.keys(byState).length} state(s) audited, no critical/serious.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
