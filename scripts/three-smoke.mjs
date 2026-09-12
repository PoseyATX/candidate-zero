/**
 * CANDIDATE ZERO — 3D client smoke test (regression guardrail)
 *
 * Drives the real built WebGL app through a full slice of a run: the filing,
 * a hand dealt onto the table, a card picked out of the fan by raycast, a play
 * committed and resolved by the engine, a week turned, and the record written.
 *
 * Why raycast-driven and not DOM-driven: the hand only exists in the scene
 * graph, so "is the hand clickable" is not a question the DOM can answer. This
 * test found the bug it now guards — hovering a card lifted it out from under
 * the pointer, so every click landed on empty felt and cleared the selection.
 *
 * Run: npm run smoke:three
 * CI:  after `npm run build` + `npx playwright install chromium`.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE3D_PORT ?? 4207);
const BASE = `http://localhost:${PORT}/candidate-zero/`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (ok, msg) => console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`);

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
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('dist missing — building…');
    const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (b.status !== 0) throw new Error('build failed');
  }

  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' }
  );

  const failures = [];
  const assert = (cond, msg) => {
    log(!!cond, msg);
    if (!cond) failures.push(msg);
  };

  let browser;
  try {
    if (!(await waitForServer(BASE))) throw new Error(`preview never ready at ${BASE}`);

    // SwiftShader: CI runners have no GPU, and a WebGL app that only works on
    // a GPU is not a shippable web game.
    browser = await chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      const t = m.text();
      if (m.type() === 'error' && !t.includes('ERR_CONNECTION') && !t.includes('favicon')) {
        errors.push(`console.error: ${t}`);
      }
    });
    await page.addInitScript(() => {
      window.__rejections = [];
      addEventListener('unhandledrejection', (e) =>
        window.__rejections.push(String((e.reason && e.reason.stack) || e.reason))
      );
    });

    // Pinned seed: the run is then the same every time, so a weather event
    // landing in week 1 is a fact about this gate rather than a coin flip.
    const RUN = `${BASE}?seed=20260912`;
    await page.goto(RUN, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1200);

    // 1. WebGL actually came up.
    const glOk = await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      return !!c && c.width > 0 && c.height > 0;
    });
    assert(glOk, 'WebGL canvas renders at a real size');

    // 2. The filing is a sequence of real choices, not a form.
    let sheets = 0;
    const drain = async (max = 14) => {
      for (let i = 0; i < max; i++) {
        let open = false;
        for (let w = 0; w < 8; w++) {
          if (await page.locator('#modal:not(.hidden)').count()) {
            open = true;
            break;
          }
          await sleep(200);
        }
        if (!open) return;
        sheets++;
        await page.locator('.opt').first().click();
        await sleep(400);
      }
    };
    await drain();
    assert(sheets >= 7, `filing asks for who / origins / issue / region / seat (${sheets} sheets)`);

    // The table is live once the HUD names a week. Anything the world puts up
    // on the way there (weather, an opening draft) is drained, not raced.
    const settled = await (async () => {
      for (let i = 0; i < 25; i++) {
        const week = await page.evaluate(
          () => document.querySelector('#hud-week')?.textContent ?? ''
        );
        if (/Week \d+/.test(week)) return true;
        if (await page.locator('#modal:not(.hidden)').count()) await drain(4);
        await sleep(400);
      }
      return false;
    })();
    assert(settled, 'the table settles into a live week after the filing');

    // 3. The campaign booted and the paperwork is live.
    const header = await page.evaluate(() => ({
      week: document.querySelector('#hud-week')?.textContent ?? '',
      stage: document.querySelector('#hud-stage')?.textContent ?? '',
      ledger: document.querySelector('#hud-ledger')?.innerText ?? '',
      goal: document.querySelector('#hud-goal')?.innerText ?? ''
    }));
    assert(/Week \d+/.test(header.week), `week header reads a real week (${header.week})`);
    assert(/AP/.test(header.ledger) && /CASH/.test(header.ledger), 'ledger renders engine state');
    assert(header.goal.trim().length > 10, 'goal strip tells the player what to do');

    // 4. The hand is pickable in the scene — sweep the fan until a card
    //    answers the raycast.
    const box = await page.locator('#stage canvas').boundingBox();
    const findCard = async () => {
      for (const fy of [0.8, 0.75, 0.85]) {
        for (let i = 0; i <= 26; i++) {
          const x = box.x + box.width * (0.16 + (0.68 * i) / 26);
          const y = box.y + box.height * fy;
          await page.mouse.move(x, y);
          await sleep(90);
          const name = await page.evaluate(() => {
            const el = document.querySelector('#inspector');
            return el && !el.classList.contains('hidden')
              ? el.querySelector('h4')?.textContent ?? null
              : null;
          });
          if (name) return { name, x, y };
        }
      }
      return null;
    };

    const hovered = await findCard();
    assert(!!hovered, `a card in the fan answers the pointer (${hovered?.name ?? 'none'})`);

    // 5. Selecting it does not lose it — the regression this test exists for.
    if (hovered) {
      await page.mouse.click(hovered.x, hovered.y);
      await sleep(500);
      const stillThere = await page.evaluate(() => {
        const el = document.querySelector('#inspector');
        return el && !el.classList.contains('hidden')
          ? el.querySelector('h4')?.textContent ?? null
          : null;
      });
      assert(!!stillThere, 'clicking a hovered card selects it instead of losing it');

      // 6. It can actually be committed, and the engine resolves it.
      const before = await page.evaluate(
        () => document.querySelector('#hud-ledger').innerText
      );
      const commit = page.locator('#inspector .btn-play, #inspector .btn-row .btn').first();
      assert(await commit.count(), 'the held card offers a commit control');
      if (await commit.count()) {
        await commit.click();
        await sleep(2000);
        await drain();
        await sleep(600);
        const after = await page.evaluate(
          () => document.querySelector('#hud-ledger').innerText
        );
        assert(before !== after, 'playing a card moves the ledger');
      }
    }

    // 7. The week turns and the record grows. Clear anything the world put up
    //    after the play first — a click into a modal backdrop is not a click on
    //    the End week button.
    await drain(4);
    const logBefore = await page.locator('#log-list li').count();
    await page.locator('#btn-week').click();
    let logAfter = logBefore;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (await page.locator('#modal:not(.hidden)').count()) await drain(4);
      logAfter = await page.locator('#log-list li').count();
      if (logAfter > logBefore) break;
    }
    assert(logAfter > logBefore, `the week turns and writes the record (${logBefore} → ${logAfter})`);

    // 8. A save survives a reload — the run is not lost on refresh.
    const savedWeek = await page.locator('#hud-week').textContent();
    await page.reload({ waitUntil: 'networkidle' });
    let resumeOffered = false;
    for (let i = 0; i < 25; i++) {
      await sleep(400);
      resumeOffered = await page.evaluate(() =>
        [...document.querySelectorAll('.opt .n')].some((n) => /resume/i.test(n.textContent ?? ''))
      );
      if (resumeOffered) break;
    }
    assert(resumeOffered, 'a run in progress is offered back after a reload');
    if (resumeOffered) {
      await page.locator('.opt').first().click();
      let resumedWeek = '';
      for (let i = 0; i < 25; i++) {
        await sleep(400);
        if (await page.locator('#modal:not(.hidden)').count()) await drain(4);
        resumedWeek = (await page.locator('#hud-week').textContent()) ?? '';
        if (/Week \d+/.test(resumedWeek)) break;
      }
      assert(resumedWeek === savedWeek, `resume restores the same week (${savedWeek} → ${resumedWeek})`);
    }

    // 9. Nothing threw along the way.
    const rejections = await page.evaluate(() => window.__rejections ?? []);
    assert(errors.length === 0, `no console/page errors (${errors.slice(0, 3).join(' | ') || 'clean'})`);
    assert(rejections.length === 0, `no unhandled rejections (${rejections.slice(0, 2).join(' | ') || 'clean'})`);
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('');
  if (failures.length) {
    console.log(`3D smoke FAILED (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('3D client smoke green — the table deals, picks, plays and remembers.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
