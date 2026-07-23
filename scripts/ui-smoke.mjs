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
    assert(await page.locator('#title').isVisible(), 'title screen renders on load');

    await page.locator('#btn-title-start').click();
    assert(await page.locator('#setup').isVisible(), 'Begin the Climb → setup screen');
    assert(await page.locator('#seed-input').isVisible(), 'seed input present on setup');

    // 2. Start a seeded run.
    await page.locator('#seed-input').fill('4242');
    await page.locator('#btn-start').click();
    await page.waitForSelector('#game:not(.hidden)', { timeout: 10_000 });
    assert(true, 'Begin primary → game screen');
    assert((await page.locator('#playables .play-card').count()) > 0, 'hand renders playable cards');

    // PR-2: goal strip live after seed 4242 week 1
    const goalExists = (await page.locator('#goal-strip').count()) > 0;
    assert(goalExists, '#goal-strip exists');
    const goalText = goalExists
      ? await page.locator('#goal-strip').innerText().catch(() => '')
      : '';
    assert(
      /ballot|sig|Petition|Fee/i.test(goalText),
      `goal strip week1 matches ballot/sig/Petition/Fee (got: ${JSON.stringify(goalText.slice(0, 120))})`
    );
    const live = await page.locator('#goal-strip').getAttribute('aria-live');
    assert(live === 'polite', '#goal-strip aria-live=polite');

    // PR-3: Camp section DOM before Hand; shop sectioned when present
    const campIdx = await page
      .locator('#playables .play-section[data-section="camp"]')
      .evaluate((el) => {
        const sections = [...el.parentElement.querySelectorAll('.play-section')];
        return sections.indexOf(el);
      })
      .catch(() => -1);
    const handIdx = await page
      .locator('#playables .play-section[data-section="hand"]')
      .evaluate((el) => {
        const sections = [...el.parentElement.querySelectorAll('.play-section')];
        return sections.indexOf(el);
      })
      .catch(() => -1);
    assert(
      campIdx >= 0 && handIdx >= 0 && campIdx < handIdx,
      `Camp section before Hand (camp@${campIdx}, hand@${handIdx})`
    );
    assert(
      (await page.locator('#playables .play-section[data-section="camp"] .play-section-label').count()) >
        0,
      'camp section has a label'
    );

    // Human playtest checklist (automated slice) — phone 390×844 default
    const hudText = await page.locator('#hud').innerText().catch(() => '');
    assert(/Teacher|teacher|\$|W\d+/i.test(hudText), 'HUD shows persona cue / $ / week without Dossier');
    assert(
      (await page.locator('#goal-strip').isVisible()) &&
        !(await page.locator('#tab-dossier').evaluate((el) => el.classList.contains('active'))),
      'goal strip readable on Play tab without opening Dossier'
    );
    assert(
      (await page.locator('.mbottom-nav').isVisible()) &&
        (await page.locator('.mnav-btn').count()) >= 3,
      'bottom nav tabs present (tabs-for-all-widths on phone)'
    );
    // Wide viewport still tabs, not dual Play+Dossier columns
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(80);
    assert(
      (await page.locator('.mbottom-nav').isVisible()) &&
        (await page.locator('#tab-play').isVisible()),
      'wide viewport: bottom nav + Play tab still the IA (no dual layout)'
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(40);

    // 3. Play through several weeks: resolve field plays via the ground
    //    picker, everything else directly; drafts auto-first; end weeks.
    let playsResolved = 0;
    let groundPicks = 0;
    let endWeeks = 0;
    let maxWeek = 1;
    let reachedTerminal = false;

    // Calendar week ("W3/14") from the ledger — proves End Week actually
    // advances state, not just that the button was clickable.
    const readWeek = async () => {
      const txt = await page.locator('#hud').innerText().catch(() => '');
      const m = txt.match(/\bW(\d+)\s*\/\s*\d+/);
      if (m) maxWeek = Math.max(maxWeek, Number(m[1]));
    };

    let actSplashesDismissed = 0;
    let outsideDismissed = 0;
    let ceremonyQueueOk = true;
    let weatherThenSplash = 0;
    let pickerOppTruthChecked = false;
    for (let iter = 0; iter < 400; iter++) {
      if (await page.locator('#terminal').isVisible()) {
        reachedTerminal = true;
        break;
      }
      // Act ceremony splash (primary/general/session hand-off) gates play —
      // dismiss it the way a player taps "Continue".
      const splash = page.locator('#act-splash');
      if ((await splash.count()) && (await splash.isVisible())) {
        // PR-5: splash must not stack under open weather
        const weatherOpen =
          (await page.locator('#outside-weather').count()) > 0 &&
          (await page.locator('#outside-weather').isVisible());
        if (weatherOpen) {
          ceremonyQueueOk = false;
          failures.push('act-splash visible while outside-weather is open');
        }
        await page.locator('#act-splash-ok').click();
        actSplashesDismissed++;
        await page.waitForTimeout(60);
        continue;
      }
      // Outside "world weather" event — you answer it or weather it; the
      // modal must be acknowledged before play continues.
      const weather = page.locator('#outside-weather');
      if ((await weather.count()) && (await weather.isVisible())) {
        // PR-5: weather open ⇒ splash hidden
        const splashVis =
          (await splash.count()) > 0 && (await splash.isVisible().catch(() => false));
        if (splashVis) {
          ceremonyQueueOk = false;
          failures.push('outside-weather open but act-splash still visible');
        }
        await page.locator('#outside-weather-ok').click();
        outsideDismissed++;
        await page.waitForTimeout(80);
        // After weather dismiss on a transition week, splash may appear
        if ((await splash.count()) && (await splash.isVisible().catch(() => false))) {
          weatherThenSplash++;
        }
        continue;
      }
      if (await page.locator('#ground-picker').isVisible()) {
        // PR-5: opposition copy is truthful (taxes field odds)
        if (!pickerOppTruthChecked) {
          const oppTitle = await page
            .locator('.gp-meter[title*="Opposition"]')
            .first()
            .getAttribute('title')
            .catch(() => '');
          const sub = await page.locator('#gp-sub').innerText().catch(() => '');
          const truth =
            /tax/i.test(oppTitle || '') ||
            /tax|contested/i.test(sub || '');
          const stale = /does not affect odds yet/i.test(oppTitle || '') ||
            /does not affect odds yet/i.test(sub || '');
          assert(truth && !stale, `ground picker opposition copy truthful (title=${JSON.stringify(oppTitle)})`);
          pickerOppTruthChecked = true;
        }
        const grounds = await page.$$('.gp-ground');
        if (!grounds.length) {
          failures.push('ground picker open but no grounds listed');
          await page.locator('#gp-cancel').click();
        } else {
          const logBefore = (await page.locator('#log').innerText().catch(() => '')).length;
          await grounds[groundPicks % grounds.length].click();
          groundPicks++;
          await page.waitForTimeout(60);
          const logAfter = (await page.locator('#log').innerText().catch(() => '')).length;
          if (logAfter > logBefore) playsResolved++;
        }
        continue;
      }
      const drafts = await page.$$('#draft .play-card');
      if (drafts.length) {
        await drafts[0].click();
        await page.waitForTimeout(40);
        continue;
      }
      const cards = await page.$$('#playables .play-card:not(.locked)');
      if (cards.length) {
        const logBefore = (await page.locator('#log').innerText().catch(() => '')).length;
        await cards[0].click();
        await page.waitForTimeout(60);
        // A non-field play resolves immediately (log grows); a field play
        // opens the picker (handled next iteration).
        if (!(await page.locator('#ground-picker').isVisible())) {
          const logAfter = (await page.locator('#log').innerText().catch(() => '')).length;
          if (logAfter > logBefore) playsResolved++;
        }
        continue;
      }
      // Nothing playable → end the week.
      const endBtn = page.locator('#btn-end');
      if (await endBtn.isVisible()) {
        await readWeek();
        await endBtn.click();
        endWeeks++;
        await page.waitForTimeout(60);
        await readWeek();
        // A healthy campaign resolves in ~14 weeks + drafts; if we've ended
        // far more "weeks" than that without a terminal, End Week is broken —
        // fail fast instead of grinding the guard to 400.
        if (endWeeks > 30) break;
      } else {
        break;
      }
    }

    assert(playsResolved > 0, `cards actually resolve when played (${playsResolved} plays)`);
    assert(groundPicks > 0, `ground picker opens and resolves for field plays (${groundPicks} picks)`);
    assert(maxWeek > 1, `End Week advances the calendar (reached week W${maxWeek}, ${endWeeks} end-week clicks)`);
    assert(actSplashesDismissed > 0, `act ceremony splash appears and dismisses (${actSplashesDismissed})`);
    assert(ceremonyQueueOk, 'ceremony queue: weather never stacks under/over open splash incorrectly');
    if (outsideDismissed > 0) {
      log(true, `outside weather dismissed ${outsideDismissed}× (weather→splash seen ${weatherThenSplash})`);
    }
    assert(pickerOppTruthChecked, 'ground picker opened and opposition copy was checked');
    assert(reachedTerminal, 'a full campaign reaches a terminal screen');

    if (reachedTerminal) {
      const choices = await page.$$('#terminal-choices .play-card, #terminal-choices button');
      assert(choices.length > 0, 'terminal offers forward choices (no dead end)');
      // PR-6: terminal hints Act IV / waiting or reelect path
      const termText = await page.locator('#terminal').innerText().catch(() => '');
      assert(
        /path|Waiting|Reelect|reelection|interim|two years|Sine die/i.test(termText),
        'terminal copy points at waiting path or reelect'
      );
    }

    // PR-6: tutorial names four acts including Waiting
    await page.locator('#btn-howto').click();
    await page.waitForSelector('#tutorial:not(.hidden)', { timeout: 5_000 });
    const tut = await page.locator('#tutorial').innerText();
    assert(/Act IV|Waiting/i.test(tut), 'tutorial includes Act IV / Waiting');
    assert(/goal strip/i.test(tut), 'tutorial mentions goal strip');
    assert(/tax/i.test(tut) && /field/i.test(tut), 'tutorial teaches contested ground taxes field odds');
    await page.locator('#btn-tut-back').click();

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
