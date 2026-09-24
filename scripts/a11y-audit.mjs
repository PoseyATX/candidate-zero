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
// The 3D client is the site root now and is audited by scripts/three-a11y.mjs.
// The DOM build still ships at legacy.html, and this keeps guarding it.
const BASE = `http://localhost:${PORT}/candidate-zero/legacy.html`;
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
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
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

      // --- The filing (a scene at the clerk's counter, one beat at a time) ---
      // Same walk as smoke:ui. Each beat renders different controls — a text
      // field, then answer lines, then two lists at once, then the signature —
      // so each one gets its own axe pass rather than only the first.
      async function pickId(kind, id) {
        const line = page.locator(`.say[data-kind="${kind}"][data-id="${id}"]`);
        await line.waitFor({ state: 'visible', timeout: 10_000 });
        await line.click();
        await page.waitForTimeout(40);
      }
      await page.fill('#candidate-name', 'Ruth Ann Vela');
      await pickId('beat', 'name');
      byState['filing:persona'] = await runAxe(page);
      await pickId('persona', 'blockwalker');
      byState['filing:origin'] = await runAxe(page);
      await pickId('origin', 'route');
      await pickId('origin', 'angry');
      await pickId('origin', 'bankruptcy');
      byState['filing:issue'] = await runAxe(page);
      await pickId('issue', 'taxes');
      byState['filing:place'] = await runAxe(page);
      await pickId('district', 'open');
      await pickId('region', 'east');
      await page.locator('#btn-start').waitFor({ state: 'visible', timeout: 10_000 });
      byState['filing:sign'] = await runAxe(page);
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

      // --- Dossier tab ---
      // A whole tab that had never been audited: it carries the ledger, the
      // Machine and Opposition bands, and now a textarea and two buttons for
      // the head-to-head exchange. Form controls with no coverage is exactly
      // how a missing label ships.
      {
        const tab = page.locator('[data-gototab="dossier"]');
        if (await tab.count()) {
          await safeClick(tab);
          await page.waitForTimeout(200);
          byState.dossier = await runAxe(page);
          await safeClick(page.locator('[data-gototab="play"]'));
          await page.waitForTimeout(150);
        }
      }

      // --- Full-screen play result (engine beat -> whole-screen dialog) ---
      // It is a role=dialog aria-modal takeover with generated content, so it
      // needs the same scrutiny as every other overlay. Nothing checked it when
      // it was first built, which is exactly how the old toast shipped with its
      // ledger figures at 1.02:1 contrast.
      {
        const hand = await page.$$('#playables .play-card:not(.locked)');
        for (const c of hand) {
          await safeClick(c);
          await page.waitForTimeout(70);
          const pd = page.locator('#btn-play-detail');
          if (await pd.isVisible().catch(() => false)) {
            await safeClick(pd);
            await page.waitForTimeout(140);
            const gp = page.locator('#ground-picker');
            if (await gp.isVisible().catch(() => false)) {
              await safeClick(gp.locator('button').first());
              await page.waitForTimeout(160);
            }
          } else {
            await safeClick(page.locator('#detail-close'));
            await page.waitForTimeout(30);
          }
          if (await page.locator('#result-host:not(.hidden)').count()) break;
        }
        if (await page.locator('#result-host:not(.hidden)').count()) {
          await page.waitForTimeout(700); // let the count-up settle
          byState['play-result'] = await runAxe(page);
          await safeClick(page.locator('#result-go'));
          await page.waitForSelector('#result-host.hidden', { timeout: 2_000 }).catch(() => {});
        }
      }

      // --- Terminal: play the run out to its end screen ---
      // Same driver discipline as smoke:ui, which learned each of these the
      // hard way. Without them this loop used to spin its 500 iterations
      // against an overlay it could not see past:
      //   · the play result WAITS for acknowledgement behind a transparent
      //     catcher — every click after the first card landed on it;
      //   · a forked CHOICE card keeps Play disabled until an arm is chosen;
      //   · locked precincts render in the picker but cannot be picked.
      const visible = async (sel) =>
        (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible().catch(() => false));
      const clearResult = async () => {
        if (!(await page.locator('#result-host:not(.hidden)').count())) return false;
        await page.locator('#result-host').click({ position: { x: 6, y: 6 } }).catch(() => {});
        await page.waitForSelector('#result-host.hidden', { timeout: 2_000 }).catch(() => {});
        return true;
      };
      let endWeeks = 0;
      for (let iter = 0; iter < 800; iter++) {
        await clearResult();
        if (await visible('#terminal')) break;
        if (await visible('#act-splash')) {
          await safeClick(page.locator('#act-splash-ok'));
          await page.waitForTimeout(60);
          continue;
        }
        if (await visible('#outside-weather')) {
          await safeClick(page.locator('#outside-weather-ok'));
          await page.waitForTimeout(60);
          continue;
        }
        if (await visible('#card-detail:not(.hidden)')) {
          const fork = page.locator('#detail-fork .fork-option').first();
          if (await visible('#detail-fork') && (await fork.count())) await safeClick(fork);
          const playBtn = page.locator('#btn-play-detail');
          if (await playBtn.isEnabled().catch(() => false)) await safeClick(playBtn);
          else await safeClick(page.locator('#detail-close'));
          await page.waitForTimeout(50);
          continue;
        }
        if (await visible('#ground-picker')) {
          const open = await page.$$('.gp-ground:not(.gp-locked)');
          if (open.length) await open[iter % open.length].click().catch(() => {});
          else await safeClick(page.locator('#gp-cancel'));
          await page.waitForTimeout(50);
          continue;
        }
        const drafts = await page.$$('#draft .play-card');
        if (drafts.length) {
          await drafts[0].click().catch(() => {});
          await page.waitForTimeout(40);
          continue;
        }
        const play = await page.$$(
          '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
        );
        if (play.length) {
          await play[0].click().catch(() => {});
          await page.waitForTimeout(40);
          continue;
        }
        await safeClick(page.locator('.mnav-btn[data-gototab="play"]'));
        if (await visible('#btn-end')) {
          await safeClick(page.locator('#btn-end'));
          endWeeks++;
          await page.waitForTimeout(60);
          if (endWeeks > 60) break;
        } else break;
      }
      if (!(await visible('#terminal'))) {
        throw new Error(`run never reached the terminal screen (${endWeeks} weeks ended)`);
      }
      byState['terminal'] = await runAxe(page);
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
