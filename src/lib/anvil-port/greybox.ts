/**
 * Deterministic greybox colors + SVG plates for missing art.
 * Adapted from Anvil AssetServer.colorFromPath / greybox (MIT).
 * @see https://github.com/7etsuo/anvil — packages/core/src/assets/AssetServer.ts
 */

/** Hash path → muted RGB (Anvil colorFromPath). */
export function colorFromPath(p: string): string {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
  const r = (h & 0xff0000) >> 16;
  const g = (h & 0x00ff00) >> 8;
  const b = h & 0x0000ff;
  return `rgb(${(r % 128) + 64},${(g % 128) + 64},${(b % 128) + 64})`;
}

export function labelFromPath(p: string): string {
  return p.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') ?? p;
}

/**
 * Inline SVG greybox plate (no external file). Safe for card faces until
 * real art lands under public/assets/cards/.
 */
export function greyboxSvg(pathKey: string, opts?: { w?: number; h?: number }): string {
  const w = opts?.w ?? 120;
  const h = opts?.h ?? 90;
  const fill = colorFromPath(pathKey);
  const label = escapeXml(labelFromPath(pathKey).slice(0, 14));
  return (
    `<svg class="art-greybox" viewBox="0 0 ${w} ${h}" width="100%" height="100%" ` +
    `xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">` +
    `<rect width="${w}" height="${h}" fill="${fill}" opacity="0.85"/>` +
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" ` +
    `stroke="rgba(232,224,212,0.35)" stroke-width="1.5"/>` +
    `<text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" ` +
    `fill="rgba(232,224,212,0.55)" font-size="9" font-family="system-ui,sans-serif">${label}</text>` +
    `</svg>`
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
