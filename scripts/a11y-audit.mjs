/**
 * CANDIDATE ZERO — accessibility audit (WCAG 2.0/2.1 A + AA)
 *
 * Runs axe-core (the engine behind Lighthouse/most a11y tooling) against the
 * real built app in each screen state: title, tutorial, setup, in-game (with
 * cards + HUD), ground picker, terminal. Reports violations grouped by state
 * and impact, with a sample offending selector for each.
 *
 * Run: npm run a11y   (builds if needed, serves dist, audits)
 *
 * Scope + honesty: axe catches roughly a third to a half of WCAG issues —
 * the machine-checkable ones (contrast, names/roles, landmarks, labels). It
 * does NOT judge keyboard-operability flow, focus order, or whether copy
 * makes sense to a screen-reader user; those need manual review and are
 * tracked separately. This is the automated floor, not the whole ceiling.
 *
 * Exit code: non-zero if any CRITICAL or SERIOUS violation remains, so it
 * can become a CI gate once the floor is clean. Moderate/minor are reported
 * but don't fail the run.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AXE = join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const PORT = Number(process.env.A11Y_PORT ?? 4198);
const BASE = `http://localhost:${PORT}/candidate-zero/`;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click a handle/locator, swallowing detached-node races (re-render churn). */
async function safeClick(target) {
  try {
    await target.click({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

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

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function main() {
  return (async () => {
    if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
      console.log('dist missing — building…');
      if (spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' }).status !== 0)
        throw new Error('build failed');
    }
    const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT,
      stdio: 'ignore'
    });

    /** state name → axe results */
    const byState = {};
    let browser;
    try {
      if (!(await waitForServer(BASE))) throw new Error(`preview never ready at ${BASE}`);
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });

      // --- Title ---
      byState['title'] = await runAxe(page);

      // --- Tutorial ---
      await page.locator('#btn-title-howto').click();
      await page.waitForSelector('#tutorial:not(.hidden)');
      byState['tutorial'] = await runAxe(page);
      await page.locator('#btn-tut-back').click();

      // --- Setup ---
      await page.locator('#btn-title-start').click();
      await page.waitForSelector('#setup:not(.hidden)');
      byState['setup'] = await runAxe(page);

      // --- In-game (start a seeded run, clear the act splash) ---
      await page.locator('#seed-input').fill('4242');
      await page.locator('#btn-start').click();
      await page.waitForSelector('#game:not(.hidden)');
      for (let i = 0; i < 4; i++) {
        const splash = page.locator('#act-splash');
        if ((await splash.count()) && (await splash.isVisible())) {
          await page.locator('#act-splash-ok').click();
          await page.waitForTimeout(80);
        } else break;
      }
      await page.waitForSelector('#playables .play-card');
      byState['game'] = await runAxe(page);

      // --- Card detail sheet (tap-to-inspect) ---
      const firstCard = page.locator('#playables .play-card').first();
      await safeClick(firstCard);
      await page.waitForTimeout(80);
      if (await page.locator('#card-detail:not(.hidden)').isVisible().catch(() => false)) {
        byState['card-detail'] = await runAxe(page);
        await safeClick(page.locator('#detail-close'));
        await page.waitForTimeout(40);
      }

      // --- Ground picker (field → detail PLAY → ground) ---
      const cards = await page.$$(
        '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
      );
      for (const c of cards) {
        await safeClick(c);
        await page.waitForTimeout(60);
        const det = page.locator('#card-detail:not(.hidden)');
        if (await det.isVisible().catch(() => false)) {
          const lab = await page.locator('#btn-play-detail').innerText().catch(() => '');
          if (/ground/i.test(lab)) {
            await safeClick(page.locator('#btn-play-detail'));
            await page.waitForTimeout(80);
            if (await page.locator('#ground-picker').isVisible()) break;
          } else {
            await safeClick(page.locator('#detail-close'));
            await page.waitForTimeout(30);
          }
        }
        if (await page.locator('#ground-picker').isVisible()) break;
      }
      if (await page.locator('#ground-picker').isVisible()) {
        byState['ground-picker'] = await runAxe(page);
        await page.locator('#gp-cancel').click();
      }

      // --- Terminal (inspect→PLAY; never spam 0-AP shop) ---
      for (let iter = 0; iter < 500; iter++) {
        if (await page.locator('#terminal').isVisible()) break;
        for (const id of ['#act-splash', '#outside-weather']) {
          const m = page.locator(id);
          if ((await m.count()) && (await m.isVisible())) {
            await safeClick(page.locator(`${id}-ok`));
            await page.waitForTimeout(50);
          }
        }
        const detOpen = await page.locator('#card-detail:not(.hidden)').isVisible().catch(() => false);
        if (detOpen) {
          const playBtn = page.locator('#btn-play-detail');
          if (await playBtn.isEnabled().catch(() => false)) await safeClick(playBtn);
          else await safeClick(page.locator('#detail-close'));
          await page.waitForTimeout(40);
          continue;
        }
        if (await page.locator('#ground-picker').isVisible()) {
          const gs = await page.$$('.gp-ground');
          if (gs.length) await safeClick(gs[0]);
          else await safeClick(page.locator('#gp-cancel'));
          await page.waitForTimeout(40);
          continue;
        }
        const drafts = await page.$$('#draft .play-card');
        if (drafts.length) { await safeClick(drafts[0]); await page.waitForTimeout(30); continue; }
        const play = await page.$$(
          '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
        );
        if (play.length) { await safeClick(play[0]); await page.waitForTimeout(30); continue; }
        const end = page.locator('#btn-end');
        if (await end.isVisible()) { await safeClick(end); await page.waitForTimeout(30); }
        else break;
      }
      if (await page.locator('#terminal').isVisible()) {
        byState['terminal'] = await runAxe(page);
      }
    } finally {
      if (browser) await browser.close();
      server.kill('SIGKILL');
    }

    // --- Report ---
    const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    const seenRules = new Map(); // ruleId → {impact, help, states:Set, nodes}
    console.log('=== CANDIDATE ZERO — a11y audit (axe-core WCAG 2 A/AA) ===\n');
    for (const [state, res] of Object.entries(byState)) {
      const v = res?.violations ?? [];
      const count = v.reduce((n, x) => n + x.nodes.length, 0);
      console.log(`● ${state}: ${v.length} rule(s), ${count} node(s)`);
      for (const rule of v.slice().sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9))) {
        totals[rule.impact] = (totals[rule.impact] ?? 0) + rule.nodes.length;
        const sample = rule.nodes[0]?.target?.join(' ') ?? '';
        console.log(`   [${(rule.impact || '?').toUpperCase()}] ${rule.id} — ${rule.help} (${rule.nodes.length}×)`);
        console.log(`        e.g. ${sample}`);
        const r = seenRules.get(rule.id) ?? { impact: rule.impact, help: rule.help, states: new Set(), nodes: 0 };
        r.states.add(state);
        r.nodes += rule.nodes.length;
        seenRules.set(rule.id, r);
      }
      if (!v.length) console.log('   ✓ clean');
      console.log('');
    }

    console.log('=== Summary by impact ===');
    for (const k of ['critical', 'serious', 'moderate', 'minor']) console.log(`  ${k}: ${totals[k] ?? 0}`);
    console.log('\n=== Distinct rules ===');
    for (const [id, r] of [...seenRules.entries()].sort((a, b) => (IMPACT_ORDER[a[1].impact] ?? 9) - (IMPACT_ORDER[b[1].impact] ?? 9))) {
      console.log(`  [${(r.impact || '?').toUpperCase()}] ${id} — ${r.nodes} node(s) across: ${[...r.states].join(', ')}`);
    }

    const blocking = (totals.critical ?? 0) + (totals.serious ?? 0);
    console.log(`\n${blocking === 0 ? 'PASS' : 'FAIL'}: ${blocking} critical/serious violation(s).`);
    process.exit(blocking === 0 ? 0 : 1);
  })();
}

main().catch((e) => {
  console.error('a11y audit crashed:', e.message);
  process.exit(2);
});
