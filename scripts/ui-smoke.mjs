/**
 * CANDIDATE ZERO — end-to-end UI smoke test (regression guardrail)
 *
 * The engine has 24 harnesses; the UI had zero automated coverage, which is
 * exactly where regressions have slipped through historically (a dead
 * "End Week" button, a field card hidden behind a stale "No AP left"). This
 * drives the real built app through the critical path in a headless browser
 * and fails on any broken transition or console/page error.
 *
 * Run: npm run smoke:ui   (builds if needed, serves dist, drives it)
 * CI:  after `npm run build` + `npx playwright install chromium`.
 *
 * Deliberately asserts on STABLE invariants (screen transitions happen, a
 * card resolves, the week advances, zero console errors) rather than pixel
 * details, so UI iteration doesn't make it flaky.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT ?? 4199);
const BASE = `http://localhost:${PORT}/candidate-zero/`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`);
}

async function waitForServer(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function main() {
  // Ensure a production build exists (CI builds first; local convenience).
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('dist missing — building…');
    const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (b.status !== 0) throw new Error('build failed');
  }

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  const failures = [];
  const assert = (cond, msg) => {
    log(!!cond, msg);
    if (!cond) failures.push(msg);
  };

  let browser;
  try {
    if (!(await waitForServer(BASE))) throw new Error(`preview server never became ready at ${BASE}`);

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION') && !m.text().includes('favicon')) {
        consoleErrors.push(`console.error: ${m.text()}`);
      }
    });

    // 1. Title screen loads and its buttons are wired.
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    assert(await page.locator('.screen-title.active').isVisible(), 'title screen renders on load');

    await page.locator('[data-act="goSetup"]').click();
    assert(await page.locator('.screen-setup.active').isVisible(), 'Begin → setup screen');
    assert(await page.locator('#sel-persona').isVisible(), 'persona select present on setup');

    // 2. Start a run.
    await page.locator('#btn-file').click();
    await page.waitForSelector('.screen-game.active', { timeout: 10_000 });
    assert(true, 'File the Papers → game screen');
    assert((await page.locator('.card[data-act="tap-card"]').count()) > 0, 'hand renders playable cards');

    // 3. Play through several weeks: tap a card → detail sheet → Play; field
    //    plays resolve via the ground sheet; drafts auto-first; end weeks.
    let playsResolved = 0;
    let groundPicks = 0;
    let endWeeks = 0;
    let maxWeek = 1;
    let reachedTerminal = false;
    let actSplashesDismissed = 0;
    let handPtr = 0;

    // Week ("W 3/14") from the sticky header vitals — proves End Week
    // actually advances state, not just that the button was clickable.
    const readWeek = async () => {
      const txt = await page.locator('.header-vitals').innerText().catch(() => '');
      const m = txt.match(/(\d+)\s*\/\s*\d+/);
      if (m) maxWeek = Math.max(maxWeek, Number(m[1]));
    };
    const visible = async (sel) => {
      const l = page.locator(sel);
      return (await l.count()) > 0 && (await l.first().isVisible());
    };

    for (let iter = 0; iter < 400; iter++) {
      if (await visible('.over-screen.active')) { reachedTerminal = true; break; }

      // Act ceremony splash (primary/general/session hand-off) gates play.
      if (await visible('.splash-screen.active')) {
        await page.locator('[data-act="dismiss-splash"]').click();
        actSplashesDismissed++;
        await page.waitForTimeout(60);
        continue;
      }
      // Outside "world weather" event — must be acknowledged to continue.
      if (await visible('.weather-screen.active')) {
        await page.locator('[data-act="dismiss-weather"]').click();
        await page.waitForTimeout(60);
        continue;
      }
      // Phase draft (ground modal styling, pick-draft action) — take one.
      if (await visible('[data-act="pick-draft"]')) {
        await page.locator('[data-act="pick-draft"]').first().click();
        await page.waitForTimeout(40);
        continue;
      }
      // Ground sheet for a field play.
      if (await visible('[data-act="pick-ground"]')) {
        const grounds = await page.$$('[data-act="pick-ground"]');
        await grounds[groundPicks % grounds.length].click();
        groundPicks++;
        playsResolved++;
        await page.waitForTimeout(60);
        continue;
      }
      // Card detail sheet open → Play it.
      if (await visible('.card-detail.active')) {
        await page.locator('[data-act="play-detail"]').click();
        await page.waitForTimeout(60);
        // Field plays now show the ground sheet; non-field resolved directly.
        if (!(await visible('[data-act="pick-ground"]'))) {
          if (!(await visible('.card-detail.active'))) playsResolved++;
          else await page.locator('[data-act="close-detail"]').click(); // unplayable → skip
        }
        continue;
      }
      // Open a hand card's detail sheet (rotate so we don't stick on one).
      const cards = await page.$$('.card[data-act="tap-card"]');
      if (cards.length) {
        await cards[handPtr % cards.length].click();
        handPtr++;
        await page.waitForTimeout(50);
        continue;
      }
      // Nothing left to play → end the week.
      if (await visible('#btn-endweek')) {
        await readWeek();
        await page.locator('#btn-endweek').click();
        endWeeks++;
        await page.waitForTimeout(60);
        await readWeek();
        if (endWeeks > 30) break;
      } else {
        break;
      }
    }

    assert(playsResolved > 0, `cards actually resolve when played (${playsResolved} plays)`);
    assert(groundPicks > 0, `ground sheet opens and resolves for field plays (${groundPicks} picks)`);
    assert(maxWeek > 1, `End Week advances the calendar (reached week ${maxWeek}, ${endWeeks} end-week clicks)`);
    assert(actSplashesDismissed > 0, `act ceremony splash appears and dismisses (${actSplashesDismissed})`);
    assert(reachedTerminal, 'a full campaign reaches a terminal screen');

    if (reachedTerminal) {
      const choices = await page.$$('.over-screen.active [data-act="restart"]');
      assert(choices.length > 0, 'terminal offers a forward choice (New Run)');
    }

    // 4. Zero console/page errors across the whole run.
    if (consoleErrors.length) {
      for (const e of consoleErrors.slice(0, 10)) console.log('   ', e);
    }
    assert(consoleErrors.length === 0, `no console/page errors during full run (${consoleErrors.length})`);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGKILL');
  }

  console.log('');
  if (failures.length) {
    console.error(`UI smoke FAILED — ${failures.length} assertion(s):`);
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }
  console.log('UI smoke test green.');
}

main().catch((e) => {
  console.error('UI smoke crashed:', e.message);
  process.exit(1);
});
