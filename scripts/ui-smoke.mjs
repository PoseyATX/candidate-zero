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

  // Spawn vite directly so Windows does not need npx.cmd on PATH via shell.
  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
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
    // hasTouch, because this is a phone-first game and touch is not a synonym
    // for mouse. The result's click-through bug (tapping Continue opened the
    // card behind it) reproduced ONLY under touch — a desktop click never
    // triggered it, so the gate was green while the bug was live in players'
    // hands.
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
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

    // 2. Complete the 3-step nameplate draft (Teacher · taxes · open · east) + seed.
    // Identity draft replaced the old form; seed + Begin primary live on step 3.
    async function pickId(kind, id) {
      const card = page.locator(`.id-card[data-kind="${kind}"][data-id="${id}"]`);
      await card.waitFor({ state: 'visible', timeout: 10_000 });
      await card.click();
      await page.waitForTimeout(40);
    }
    await pickId('persona', 'blockwalker');
    await pickId('issue', 'taxes');
    await pickId('district', 'open');
    await pickId('region', 'east');
    await page.locator('#seed-input').fill('4242');
    assert(await page.locator('#btn-start').isVisible(), 'Begin primary on nameplate step 3');
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
      /Blockwalker/i.test(hudText) && !/^The\b/m.test(hudText.split('\n')[0] || ''),
      `HUD shows persona (Blockwalker), not bare article "The" (got: ${JSON.stringify(hudText.slice(0, 80))})`
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

    // --- A FIELD play (ground picker) must raise a result too ---
    // Block Walk, Phone Bank, Fish Fry and GOTV are all field plays; if only
    // the non-field path were covered, the most-played cards in the game could
    // silently show nothing.
    {
      let fieldPlayed = false;
      const hand2 = page.locator('#playables .play-card');
      for (let i = 0; i < (await hand2.count()) && !fieldPlayed; i++) {
        await hand2.nth(i).click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(140);
        const pd = page.locator('#btn-play-detail');
        if (!(await pd.isVisible().catch(() => false))) {
          await page.locator('#detail-close').click().catch(() => {});
          await page.waitForTimeout(50);
          continue;
        }
        const label = await pd.innerText().catch(() => '');
        if (!/ground/i.test(label)) {
          await page.locator('#detail-close').click().catch(() => {});
          await page.waitForTimeout(50);
          continue;
        }
        await pd.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(200);
        const g = page.locator('#ground-picker button[data-ground]:not(.gp-locked)').first();
        if (await g.count()) {
          await g.click({ timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(320);
          fieldPlayed = true;
        }
      }
      if (fieldPlayed) {
        assert(
          (await page.locator('#result-host:not(.hidden)').count()) > 0,
          'a FIELD play (through the ground picker) also raises the full-screen result'
        );
        await page.locator('#result-host').click({ position: { x: 6, y: 6 } }).catch(() => {});
        await page.waitForSelector('#result-host.hidden', { timeout: 2000 }).catch(() => {});
      } else {
        assert(true, 'no field card reachable this hand — field result check skipped');
      }
    }

    // --- The result waits to be acknowledged, and does not cover the hand ---
    // Both halves are alpha notes: results used to sit on top of the last cards
    // and the End Week bar, and fade themselves after 2.8s.
    {
      await page.waitForTimeout(60);
      const hand = page.locator('#playables .play-card');
      let played = false;
      for (let i = 0; i < (await hand.count()) && !played; i++) {
        await hand.nth(i).click();
        await page.waitForTimeout(150);
        const pd = page.locator('#btn-play-detail');
        if (await pd.isVisible().catch(() => false)) {
          await pd.click();
          await page.waitForTimeout(250);
          const gp = page.locator('#ground-picker');
          if ((await gp.count()) && (await gp.isVisible().catch(() => false))) {
            // MUST be a ground button. `button` first-match is #gp-cancel, which
            // cancels the play — a verification script of mine did exactly that
            // and reported 8 of 12 plays raising no result at all. The bug was
            // the instrument, but the gate had the same hole.
            await gp
              .locator('button[data-ground]:not(.gp-locked)')
              .first()
              .click({ timeout: 4000 })
              .catch(() => {});
            await page.waitForTimeout(250);
          }
          played = true;
        } else {
          await page.locator('#detail-close').click().catch(() => {});
          await page.waitForTimeout(60);
        }
      }
      assert(played, 'a card resolved for the result-toast check');
      if (played) {
        await page.waitForTimeout(120);
        assert(
          (await page.locator('#result-host:not(.hidden)').count()) > 0,
          'playing a card raises the full-screen result'
        );
        // Full screen means full screen: it must actually cover the viewport,
        // and it must carry the stamp and a Continue affordance.
        const geo = await page.evaluate(() => {
          const h = document.getElementById('result-host');
          if (!h || h.classList.contains('hidden')) return null;
          const r = h.getBoundingClientRect();
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            vw: window.innerWidth,
            vh: window.innerHeight,
            stamp: (h.querySelector('.result-stamp')?.textContent ?? '').trim(),
            hasGo: !!h.querySelector('.result-go')
          };
        });
        assert(!!geo, 'the result host is live');
        assert(
          !!geo && geo.w >= geo.vw && geo.h >= geo.vh,
          `the result fills the screen (${geo?.w}x${geo?.h} vs ${geo?.vw}x${geo?.vh})`
        );
        assert(
          !!geo && /BREAKTHROUGH|GAIN|SETBACK|DISASTER/.test(geo.stamp),
          `the stamp is the headline (${geo?.stamp})`
        );
        assert(!!geo && geo.hasGo, 'and it offers an explicit Continue');
        // Must NOT self-dismiss: it is an acknowledgement.
        await page.waitForTimeout(3400);
        assert(
          (await page.locator('#result-host:not(.hidden)').count()) > 0,
          'the result is still there after 3.4s — it waits for the player'
        );
        // CLICK-THROUGH. Dismissal runs on pointerdown, so the following click
        // used to land on whatever was underneath — tapping Continue opened a
        // card behind the result. This must click DIRECTLY OVER A CARD and over
        // the Continue button; the old check tapped the empty (6,6) corner and
        // passed while the bug was live.
        const goBox = await page.locator('#result-go').boundingBox().catch(() => null);
        if (goBox) {
          // TAP the Continue button, the way a player does. Dismissal runs on
          // pointerdown, so the browser still delivers the click afterwards —
          // it used to land on the card underneath and open its dossier.
          await page.touchscreen.tap(goBox.x + goBox.width / 2, goBox.y + goBox.height / 2);
        } else {
          await page.locator('#result-host').click({ position: { x: 6, y: 6 } });
        }
        await page.waitForTimeout(450);
        assert(
          (await page.locator('#result-host:not(.hidden)').count()) === 0,
          'one click clears the result'
        );
        assert(
          !(await page.locator('#card-detail:not(.hidden)').isVisible().catch(() => false)),
          'tapping Continue does NOT click through to the card underneath'
        );
        assert(
          !(await page.locator('#card-detail').isVisible().catch(() => false)),
          'and that click did not fall through and open a card'
        );
      }
    }
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
    /**
     * A play result now WAITS for the player instead of fading itself — it is
     * an acknowledgement, not a notification (alpha note: results were covering
     * the cards and auto-vanishing before you read them). A transparent catcher
     * makes the next click count as "read", so the driver has to click out of
     * it exactly as a player does. Without this every play after the first one
     * times out on the catcher.
     */
    let resultsAcknowledged = 0;
    const clearResult = async () => {
      const host = page.locator('#result-host:not(.hidden)');
      if (await host.count()) {
        await host.click({ position: { x: 6, y: 6 } }).catch(() => {});
        // Wait for it to actually be gone, not just for the click to land — the
        // exit animation takes 200ms and this used to race it.
        await page
          .waitForSelector('#result-host.hidden', { timeout: 2_000 })
          .catch(() => {});
        resultsAcknowledged++;
        return true;
      }
      return false;
    };
    const closeOverlays = async () => {
      await clearResult();
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
      await clearResult();
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
        // Locked grounds (Ground.gated) render but are deliberately not
        // selectable, so only cycle the open ones — clicking a locked card
        // hangs the driver.
        const grounds = await page.$$('.gp-ground:not(.gp-locked)');
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

    // Five systems shipped (AP economy, rival, contested ground, upgrades,
    // heat/press, cuts) and the tutorial learned about none of them until a
    // playtest pass caught it. One assertion per system, so the onboarding
    // cannot silently rot behind the engine again.
    const TUTORIAL_SYSTEMS = [
      ['hand cuts', /\bcuts?\b/i],
      ['heat', /\bheat\b/i],
      ['pressing the wager', /press/i],
      ['no-pity honesty', /never rigged|no pity|losing never/i],
      ['card upgrades', /practise|practised/i],
      ['session casework', /casework/i],
      ['turf budget', /turf/i]
    ];
    for (const [label, re] of TUTORIAL_SYSTEMS) {
      assert(re.test(tut), `tutorial teaches ${label}`);
    }
    await page.locator('#btn-tut-back').click();

    // 3b. THE SPONSOR CARD MUST BE VISIBLE TO A HUMAN.
    //
    // PR01 is paid sponsor art. It shipped invisible: the base art rules
    // absolutely position the plate and raster (they used to fill a fixed 2:3
    // portrait box), the text-first row rewrite removed that box, and a
    // full-bleed card has no text of its own to give the row height. Both the
    // plate and the image were out of flow, so the button collapsed to
    // **366 x 7px**. The image loaded correctly the whole time and was painted
    // into a zero-height container.
    //
    // `check:card-art` was green throughout, because it asks whether the file
    // exists and is under 500KB — never whether anyone could see it. This
    // asserts the rendered box, which is the only thing the sponsor is buying.
    {
      await page.goto(`${BASE}?promo=PR01`, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE}?promo=PR01`, { waitUntil: 'networkidle' });
      await page.locator('#btn-title-start').click();
      await pickId('persona', 'blockwalker');
      await pickId('issue', 'taxes');
      await pickId('district', 'open');
      await pickId('region', 'east');
      await page.locator('#seed-input').fill('4242');
      await page.locator('#btn-start').click();
      await page.waitForSelector('#game:not(.hidden)', { timeout: 10_000 });
      if ((await page.locator('#act-splash').count()) && (await page.locator('#act-splash').isVisible())) {
        await page.locator('#act-splash-ok').click();
        await page.waitForTimeout(60);
      }

      const promo = page.locator('#playables .play-card.kind-promo');
      assert((await promo.count()) > 0, '?promo=PR01 forces the sponsor card into hand');
      if (await promo.count()) {
        const shape = await promo.first().evaluate((el) => {
          const r = el.getBoundingClientRect();
          const img = el.querySelector('img');
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            imgLoaded: img ? img.naturalWidth > 0 : false,
            imgH: img ? Math.round(img.getBoundingClientRect().height) : 0
          };
        });
        assert(
          shape.imgLoaded,
          `sponsor art actually loads (naturalWidth > 0) — ${JSON.stringify(shape)}`
        );
        // The old broken render was 7px tall. Anything in that neighbourhood is
        // the collapse coming back, whatever the CSS looks like.
        assert(
          shape.h >= 200,
          `the sponsor card occupies real space — got ${shape.h}px tall (was 7px when it shipped broken)`
        );
        assert(
          shape.imgH >= 200,
          `and the art itself is drawn at size, not into a collapsed box (${shape.imgH}px)`
        );
      }
    }

    // 3c. THE PRESS WAGER IS NOT OFFERED ON A CARD YOU CANNOT PLAY (A7).
    //
    // A locked card renders with a DISABLED Play button. A live press control
    // beside it invites the player to arm a wager on a play that can never
    // resolve. `harness:heat` asserts the `pressOffered` table; this proves that
    // predicate is the one actually wired to #btn-press, so neither test can
    // pass while the other rots.
    //
    // Zero kit: early heat is scarce (you earn it). Construction uses the
    // `?smoke=1` seam (session.wireSmokeSeam) — not a player path — so the
    // wiring assert does not depend on lucky streak banking under thin deck.
    {
      let sawPressOnPlayable = false;
      let sawNoPressOnLocked = false;
      let sawNoPressAtZeroHeat = false;

      async function pressVisibleFor(locator) {
        // force: a locked face carries aria-disabled="true" (advisory) but not
        // the disabled attribute, so a real tap DOES open its dossier — the UI
        // renders it as "On file — not playable yet" on purpose. Playwright's
        // actionability check treats aria-disabled as unclickable, which would
        // make this untestable for the wrong reason.
        await locator.click({ force: true });
        await page.waitForTimeout(60);
        if (!(await page.locator('#card-detail').isVisible())) return null;
        const btn = page.locator('#btn-press');
        const visible = (await btn.count()) > 0 && !(await btn.first().isHidden());
        await page.locator('#detail-close').click().catch(() => {});
        await page.waitForTimeout(40);
        return visible;
      }

      await page.goto(`${BASE}?smoke=1`, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE}?smoke=1`, { waitUntil: 'networkidle' });
      await page.locator('#btn-title-start').click();
      await pickId('persona', 'blockwalker');
      await pickId('issue', 'taxes');
      await pickId('district', 'open');
      await pickId('region', 'east');
      await page.locator('#seed-input').fill('4242');
      await page.locator('#btn-start').click();
      await page.waitForSelector('#game:not(.hidden)', { timeout: 10_000 });
      if ((await page.locator('#act-splash').count()) && (await page.locator('#act-splash').isVisible())) {
        await page.locator('#act-splash-ok').click();
        await page.waitForTimeout(60);
      }

      // Heat still 0: no card may offer the wager.
      if ((await page.locator('#hud .chip-heat').count()) === 0) {
        const anyCard = page.locator('#playables .play-card:not(.locked)');
        if (await anyCard.count()) {
          sawNoPressAtZeroHeat = (await pressVisibleFor(anyCard.first())) === false;
        }
      } else {
        sawNoPressAtZeroHeat = true;
      }

      const forced = await page.evaluate(() => {
        const api = window.__czSmoke;
        return api && typeof api.forceHeatLock === 'function' ? api.forceHeatLock(2) : false;
      });
      assert(forced, 'smoke seam forceHeatLock available under ?smoke=1');

      let built =
        (await page.locator('#hud .chip-heat').count()) > 0 &&
        (await page.locator('#playables .play-card.locked').count()) > 0;

      // Fallback: natural drive if the seam is missing (should not happen in CI).
      for (let step = 0; step < 40 && !built; step++) {
        await closeOverlays();
        const hasHeat = (await page.locator('#hud .chip-heat').count()) > 0;
        const lockedCount = await page.locator('#playables .play-card.locked').count();
        if (hasHeat && lockedCount > 0) {
          built = true;
          break;
        }
        const unlocked = page.locator(
          '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
        );
        if (await unlocked.count()) {
          await unlocked.first().click();
          await page.waitForTimeout(60);
          const play = page.locator('#btn-play-detail');
          if ((await play.count()) && (await play.isEnabled())) {
            await play.click();
            await page.waitForTimeout(140);
            await closeOverlays();
          } else {
            await page.locator('#detail-close').click().catch(() => {});
          }
          await page.waitForTimeout(50);
          continue;
        }
        const endBtn = page.locator('#btn-end');
        if (await endBtn.isVisible()) {
          await endBtn.click();
          await page.waitForTimeout(120);
          await closeOverlays();
        } else {
          break;
        }
      }

      if (built) {
        const unlocked = page.locator(
          '#playables .play-section:not([data-section="shop"]) .play-card:not(.locked)'
        );
        if (await unlocked.count()) {
          sawPressOnPlayable = (await pressVisibleFor(unlocked.first())) === true;
        }
        const locked = page.locator('#playables .play-card.locked');
        if (await locked.count()) {
          sawNoPressOnLocked = (await pressVisibleFor(locked.first())) === false;
        }
      }

      assert(
        sawNoPressAtZeroHeat,
        'with no heat banked, no card offers the press wager'
      );
      assert(built, 'constructed the A7 case: heat banked AND a locked card on screen');
      assert(
        sawNoPressOnLocked,
        'the press wager is absent on a LOCKED card — pressOffered() is really wired to #btn-press'
      );
      if (sawPressOnPlayable) {
        log(true, 'control: the same state DOES offer the wager on a playable card');
      }
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
