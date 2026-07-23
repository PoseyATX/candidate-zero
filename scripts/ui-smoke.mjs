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
    // Playtest #9: How to Play on setup (persona selection), not only title
    assert(await page.locator('#btn-setup-howto').isVisible(), 'setup has How to Play button');
    await page.locator('#btn-setup-howto').click();
    assert(await page.locator('#tutorial').isVisible(), 'setup How to Play → tutorial');
    await page.locator('#btn-tut-back').click();
    assert(await page.locator('#setup').isVisible(), 'tutorial back → setup');

    // 2. Start a seeded run.
    await page.locator('#seed-input').fill('4242');
    await page.locator('#btn-start').click();
    await page.waitForSelector('#game:not(.hidden)', { timeout: 10_000 });
    assert(true, 'Begin primary → game screen');
    // dismiss Act I splash so play surface is free
    let actSplashesDismissed = 0;
    if ((await page.locator('#act-splash').count()) && (await page.locator('#act-splash').isVisible())) {
      await page.locator('#act-splash-ok').click();
      actSplashesDismissed++;
      await page.waitForTimeout(40);
    }
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
    assert(
      /Teacher/i.test(hudText) && !/^The\b/m.test(hudText.split('\n')[0] || ''),
      `HUD shows persona (Teacher), not bare article "The" (got: ${JSON.stringify(hudText.slice(0, 80))})`
    );
    assert(/\$|W\d+/i.test(hudText), 'HUD shows $ / week without Dossier');
    const goalText2 = await page.locator('#goal-strip').innerText().catch(() => '');
    assert(
      /Goal/i.test(goalText2) && /Next/i.test(goalText2) && /ballot|sig|Petition|Fee/i.test(goalText2),
      `goal strip labeled Goal/Now/Next with ballot copy (got: ${JSON.stringify(goalText2.slice(0, 140))})`
    );
    assert(
      (await page.locator('#goal-strip').isVisible()) &&
        !(await page.locator('#tab-dossier').evaluate((el) => el.classList.contains('active'))),
      'goal strip readable on Play tab without opening Dossier'
    );
    // Card detail sheet on first tap
    const firstCard = page.locator('#playables .play-card').first();
    await firstCard.click();
    await page.waitForTimeout(40);
    assert(
      (await page.locator('#card-detail').isVisible()) &&
        !(await page.locator('#card-detail').evaluate(el => el.classList.contains('hidden'))),
      'first card tap opens detail sheet'
    );
    assert(await page.locator('#detail-desc').innerText().then(t => t.length > 10), 'detail shows description text');
    assert(await page.locator('#btn-play-detail').isVisible(), 'detail has PLAY button');
    await page.locator('#detail-close').click();
    await page.waitForTimeout(40);
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

    let outsideDismissed = 0;
    let ceremonyQueueOk = true;
    let weatherThenSplash = 0;
    let pickerOppTruthChecked = false;
    const detailOpen = async () => {
      const d = page.locator('#card-detail:not(.hidden)');
      return (await d.count()) > 0 && (await d.isVisible().catch(() => false));
    };
    const closeOverlays = async () => {
      if (await detailOpen()) {
        await page.locator('#detail-close').click().catch(() => {});
        await page.waitForTimeout(30);
      }
      if (await page.locator('#ground-picker').isVisible().catch(() => false)) {
        await page.locator('#gp-cancel').click().catch(() => {});
        await page.waitForTimeout(30);
      }
    };
    for (let iter = 0; iter < 500; iter++) {
      if (await page.locator('#terminal').isVisible()) {
        reachedTerminal = true;
        break;
      }
      // Act ceremony splash (primary/general/session hand-off) gates play —
      // dismiss it the way a player taps "Continue".
      const splash = page.locator('#act-splash');
      if ((await splash.count()) && (await splash.isVisible())) {
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
      const weather = page.locator('#outside-weather');
      if ((await weather.count()) && (await weather.isVisible())) {
        const splashVis =
          (await splash.count()) > 0 && (await splash.isVisible().catch(() => false));
        if (splashVis) {
          ceremonyQueueOk = false;
          failures.push('outside-weather open but act-splash still visible');
        }
        await page.locator('#outside-weather-ok').click();
        outsideDismissed++;
        await page.waitForTimeout(80);
        if ((await splash.count()) && (await splash.isVisible().catch(() => false))) {
          weatherThenSplash++;
        }
        continue;
      }
      // Card detail: PLAY commits (field → ground picker next)
      if (await detailOpen()) {
        const playDet = page.locator('#btn-play-detail');
        if (await playDet.isEnabled().catch(() => false)) {
          await playDet.click();
          await page.waitForTimeout(70);
          if (!(await page.locator('#ground-picker').isVisible().catch(() => false))) {
            playsResolved++;
          }
        } else {
          await page.locator('#detail-close').click().catch(() => {});
          await page.waitForTimeout(40);
        }
        continue;
      }
      if (await page.locator('#ground-picker').isVisible()) {
        if (!pickerOppTruthChecked) {
          const rivalTitle = await page
            .locator('.gp-mlabel')
            .filter({ hasText: /rival/i })
            .first()
            .evaluate(el => el.closest('.gp-meter')?.getAttribute('title') || '')
            .catch(() => '');
          const sub = await page.locator('#gp-sub').innerText().catch(() => '');
          const truth =
            /rival|lower field|harder|odds/i.test(rivalTitle || '') ||
            /Rival|rival|harder|odds/i.test(sub || '');
          const stale = /does not affect odds yet/i.test(`${rivalTitle}${sub}`);
          assert(truth && !stale, `ground picker rival copy clear (title=${JSON.stringify(rivalTitle)})`);
          pickerOppTruthChecked = true;
        }
        const grounds = await page.$$('.gp-ground');
        if (!grounds.length) {
          failures.push('ground picker open but no grounds listed');
          await page.locator('#gp-cancel').click();
        } else {
          await grounds[groundPicks % grounds.length].click();
          groundPicks++;
          playsResolved++;
          await page.waitForTimeout(60);
        }
        continue;
      }
      const drafts = await page.$$('#draft .play-card');
      if (drafts.length) {
        await drafts[0].click();
        await page.waitForTimeout(40);
        continue;
      }
      // Non-shop unlocks first (shop is 0 AP — never grind infinite buys)
      let cards = await page.$$(
        '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
      );
      // Once per run, prefer a field card so ground picker is exercised
      if (!groundPicks && cards.length) {
        for (const c of cards) {
          const name = (await c.innerText().catch(() => '')).slice(0, 40);
          await c.click();
          await page.waitForTimeout(50);
          if (!(await detailOpen())) continue;
          const lab = await page.locator('#btn-play-detail').innerText().catch(() => '');
          if (/ground/i.test(lab) || /Block Walk|Phone Bank|Yard Sign|Fish Fry/i.test(name)) {
            await page.locator('#btn-play-detail').click();
            await page.waitForTimeout(80);
            break;
          }
          await page.locator('#detail-close').click().catch(() => {});
          await page.waitForTimeout(30);
        }
        if (await page.locator('#ground-picker').isVisible().catch(() => false)) continue;
        if (await detailOpen()) continue;
        cards = await page.$$(
          '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
        );
      }
      if (cards.length) {
        await cards[0].click();
        await page.waitForTimeout(50);
        continue;
      }
      // No campaign plays left (shop may remain) → end the week
      await page.locator('.mnav-btn[data-gototab="play"]').click().catch(() => {});
      await closeOverlays();
      const endBtn = page.locator('#btn-end');
      if (await endBtn.isVisible()) {
        await readWeek();
        await endBtn.click();
        endWeeks++;
        await page.waitForTimeout(60);
        await readWeek();
        if (endWeeks > 40) break;
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

    // PR-6: tutorial names four acts including Waiting (close any sheets first)
    await closeOverlays();
    await page.locator('#btn-howto').click({ force: true });
    await page.waitForSelector('#tutorial:not(.hidden)', { timeout: 5_000 });
    const tut = await page.locator('#tutorial').innerText();
    assert(/Act IV|Waiting/i.test(tut), 'tutorial includes Act IV / Waiting');
    assert(/goal strip/i.test(tut), 'tutorial mentions goal strip');
    assert(/tax|harder|opposition/i.test(tut) && /field/i.test(tut), 'tutorial teaches contested ground / field odds');
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
