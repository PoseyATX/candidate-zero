/**
 * CANDIDATE ZERO — canvas painters for 3D surfaces.
 *
 * Every texture in the scene is drawn here, at load, into an offscreen canvas
 * and handed to three as a CanvasTexture. No image assets to ship, no atlas to
 * keep in sync with the catalog: a card's face is a function of its data, so a
 * new card in src/data draws itself the first time it is dealt.
 *
 * Card stock is 2:3 — the same hard ratio the DOM build locked in card-lock.css.
 */

export const CARD_W = 512;
export const CARD_H = 768;

/** Risk class → the band across the top of the card and its edge stitching. */
export const RISK_COLOR: Record<string, string> = {
  SAFE: '#4a5c3e',
  STD: '#8a6a2f',
  VOL: '#8c3a24',
  CHOICE: '#3f5566'
};

export const RISK_LABEL: Record<string, string> = {
  SAFE: 'SAFE',
  STD: 'STANDARD',
  VOL: 'VOLATILE',
  CHOICE: 'CHOICE'
};

const INK = '#241c12';
const INK_SOFT = '#5b4c39';
const STOCK = '#e8dcc4';
const STOCK_DEEP = '#d8c8a8';

function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('2d context unavailable');
  return c;
}

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Paper tooth. Deterministic per call size so cards don't shimmer alike. */
function grain(c: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  c.putImageData(img, 0, 0);
}

function fitText(
  c: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  startPx: number,
  font: string,
  minPx = 18
): number {
  let px = startPx;
  do {
    c.font = `${px}px ${font}`;
    if (c.measureText(text).width <= maxW) return px;
    px -= 2;
  } while (px > minPx);
  return px;
}

function wrapLines(
  c: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (c.measureText(attempt).width > maxW && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = attempt;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    let last = lines[maxLines - 1];
    while (c.measureText(`${last}…`).width > maxW && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

export interface CardFaceData {
  name: string;
  risk: string;
  kind: string;
  tag: string;
  costLabel: string;
  /** 0..1, or null when the play has no roll. */
  odds: number | null;
  /** Rendered dim with a stamp when the card is in hand but unplayable. */
  playable: boolean;
  /** Short reason drawn where odds would be, when unplayable. */
  lockNote?: string;
}

/**
 * A play card. Letterpress layout: risk band, rule, name, an emblem panel,
 * then the cost/odds footer. Description is deliberately NOT on the face —
 * the engine's own convention (ActionOption.desc is "revealed on inspect").
 */
export function paintCardFace(data: CardFaceData): HTMLCanvasElement {
  const c = ctx2d(CARD_W, CARD_H);
  const accent = RISK_COLOR[data.risk] ?? RISK_COLOR.STD;

  // stock
  const grad = c.createLinearGradient(0, 0, CARD_W * 0.6, CARD_H);
  grad.addColorStop(0, STOCK);
  grad.addColorStop(1, STOCK_DEEP);
  c.fillStyle = grad;
  c.fillRect(0, 0, CARD_W, CARD_H);
  grain(c, CARD_W, CARD_H, 14);

  // plate border
  c.strokeStyle = 'rgba(36,28,18,0.45)';
  c.lineWidth = 3;
  roundRect(c, 18, 18, CARD_W - 36, CARD_H - 36, 16);
  c.stroke();

  // risk band
  c.fillStyle = accent;
  roundRect(c, 18, 18, CARD_W - 36, 92, 16);
  c.fill();
  c.fillRect(18, 86, CARD_W - 36, 24);

  c.fillStyle = 'rgba(232,220,196,0.92)';
  c.font = '600 30px Cinzel, Georgia, serif';
  c.textBaseline = 'middle';
  c.fillText(RISK_LABEL[data.risk] ?? data.risk, 42, 66);

  if (data.tag) {
    // The risk word is already on this band. Give the tag only the room that
    // is actually left, or the two collide into an unreadable smear.
    c.font = '600 30px Cinzel, Georgia, serif';
    const riskWidth = c.measureText(RISK_LABEL[data.risk] ?? data.risk).width;
    const room = CARD_W - 84 - riskWidth - 24;
    let tag = data.tag.toUpperCase();
    const px = fitText(c, tag, room, 24, 'Inter, system-ui, sans-serif', 14);
    c.font = `600 ${px}px Inter, system-ui, sans-serif`;
    while (tag.length > 1 && c.measureText(tag).width > room) tag = tag.slice(0, -1);
    if (tag !== data.tag.toUpperCase() && tag.length > 1) tag = `${tag.slice(0, -1)}…`;
    if (c.measureText(tag).width <= room) {
      c.textAlign = 'right';
      c.fillStyle = 'rgba(232,220,196,0.72)';
      c.fillText(tag, CARD_W - 42, 66);
      c.textAlign = 'left';
    }
  }

  // name
  c.fillStyle = INK;
  const namePx = fitText(c, data.name, CARD_W - 96, 46, 'Cinzel, Georgia, serif', 24);
  c.font = `700 ${namePx}px Cinzel, Georgia, serif`;
  const nameLines = wrapLines(c, data.name, CARD_W - 96, 3);
  let ny = 170;
  for (const line of nameLines) {
    c.fillText(line, 48, ny);
    ny += namePx * 1.18;
  }

  // hairline under the name
  c.strokeStyle = 'rgba(36,28,18,0.28)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(48, ny + 4);
  c.lineTo(CARD_W - 48, ny + 4);
  c.stroke();

  // emblem panel — a seal, not art. Kind is spelled out under it.
  const panelY = ny + 40;
  const panelH = CARD_H - panelY - 150;
  c.fillStyle = 'rgba(36,28,18,0.05)';
  roundRect(c, 48, panelY, CARD_W - 96, panelH, 10);
  c.fill();

  const cx = CARD_W / 2;
  const cy = panelY + panelH / 2 - 14;
  c.strokeStyle = accent;
  c.lineWidth = 5;
  c.beginPath();
  c.arc(cx, cy, 62, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, 74, 0, Math.PI * 2);
  c.stroke();

  // star — the one piece of Texas iconography the face carries
  c.fillStyle = accent;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 38 : 16;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();

  c.textAlign = 'center';
  c.fillStyle = INK_SOFT;
  c.font = '600 24px Inter, system-ui, sans-serif';
  c.fillText((data.kind || 'action').toUpperCase(), cx, panelY + panelH - 26);
  c.textAlign = 'left';

  // footer: cost left, odds right
  const footY = CARD_H - 92;
  c.strokeStyle = 'rgba(36,28,18,0.28)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(48, footY - 26);
  c.lineTo(CARD_W - 48, footY - 26);
  c.stroke();

  c.fillStyle = INK;
  const costPx = fitText(c, data.costLabel || '—', 250, 34, 'Inter, system-ui, sans-serif', 18);
  c.font = `700 ${costPx}px Inter, system-ui, sans-serif`;
  c.fillText(data.costLabel || '—', 48, footY + 8);

  c.textAlign = 'right';
  if (!data.playable && data.lockNote) {
    c.fillStyle = '#8c3a24';
    c.font = '700 26px Inter, system-ui, sans-serif';
    c.fillText(data.lockNote.toUpperCase(), CARD_W - 48, footY + 8);
  } else if (data.odds !== null) {
    c.fillStyle = accent;
    c.font = '800 40px Inter, system-ui, sans-serif';
    c.fillText(`${Math.round(data.odds * 100)}%`, CARD_W - 48, footY + 8);
  } else {
    c.fillStyle = INK_SOFT;
    c.font = '700 26px Inter, system-ui, sans-serif';
    c.fillText('CERTAIN', CARD_W - 48, footY + 8);
  }
  c.textAlign = 'left';

  if (!data.playable) {
    c.fillStyle = 'rgba(60,48,32,0.34)';
    c.fillRect(0, 0, CARD_W, CARD_H);
  }

  return c.canvas;
}

/** The back of every card: the filing seal. */
export function paintCardBack(): HTMLCanvasElement {
  const c = ctx2d(CARD_W, CARD_H);
  const grad = c.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, '#3a2f22');
  grad.addColorStop(1, '#241c12');
  c.fillStyle = grad;
  c.fillRect(0, 0, CARD_W, CARD_H);
  grain(c, CARD_W, CARD_H, 10);

  c.strokeStyle = 'rgba(190,158,92,0.5)';
  c.lineWidth = 4;
  roundRect(c, 34, 34, CARD_W - 68, CARD_H - 68, 14);
  c.stroke();
  c.lineWidth = 1.5;
  roundRect(c, 50, 50, CARD_W - 100, CARD_H - 100, 10);
  c.stroke();

  const cx = CARD_W / 2;
  const cy = CARD_H / 2;
  c.fillStyle = 'rgba(190,158,92,0.85)';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 96 : 40;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();

  c.textAlign = 'center';
  c.fillStyle = 'rgba(190,158,92,0.8)';
  c.font = '700 34px Cinzel, Georgia, serif';
  c.fillText('CANDIDATE', cx, cy + 172);
  c.fillText('ZERO', cx, cy + 214);
  return c.canvas;
}

export interface GroundPlaqueData {
  name: string;
  pool: number;
  rapport: number;
  rivalRap: number;
  gotv: number;
  locked: boolean;
  lockReason: string;
}

/**
 * A precinct plaque that lies flat on the table. Reads at a glancing camera
 * angle, so: big name, one bar, numbers large enough to survive perspective.
 */
export function paintGroundPlaque(data: GroundPlaqueData): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const c = ctx2d(W, H);

  c.fillStyle = data.locked ? '#2a2118' : '#efe3c8';
  roundRect(c, 0, 0, W, H, 18);
  c.fill();
  grain(c, W, H, 10);

  c.strokeStyle = data.locked ? 'rgba(190,158,92,0.35)' : 'rgba(36,28,18,0.5)';
  c.lineWidth = 4;
  roundRect(c, 8, 8, W - 16, H - 16, 14);
  c.stroke();

  const ink = data.locked ? 'rgba(190,158,92,0.75)' : INK;
  c.fillStyle = ink;
  c.textBaseline = 'middle';
  const px = fitText(c, data.name, W - 56, 44, 'Cinzel, Georgia, serif', 22);
  c.font = `700 ${px}px Cinzel, Georgia, serif`;
  c.fillText(data.name, 28, 50);

  if (data.locked) {
    c.font = '600 24px Inter, system-ui, sans-serif';
    c.fillStyle = 'rgba(190,158,92,0.62)';
    for (const [i, line] of wrapLines(c, data.lockReason || 'Closed to you.', W - 56, 3).entries()) {
      c.fillText(line, 28, 116 + i * 32);
    }
    return c.canvas;
  }

  // rapport vs rival — one bar, two claims on it
  const barY = 104;
  const barW = W - 56;
  c.fillStyle = 'rgba(36,28,18,0.14)';
  roundRect(c, 28, barY, barW, 26, 13);
  c.fill();

  const total = Math.max(1, data.rapport + data.rivalRap);
  const mine = Math.max(0, Math.min(1, data.rapport / total));
  c.fillStyle = '#4a5c3e';
  roundRect(c, 28, barY, Math.max(6, barW * mine), 26, 13);
  c.fill();

  c.font = '700 26px Inter, system-ui, sans-serif';
  c.fillStyle = INK_SOFT;
  c.fillText(`RAPPORT ${data.rapport}`, 28, barY + 62);
  c.textAlign = 'right';
  c.fillText(`RIVAL ${data.rivalRap}`, W - 28, barY + 62);
  c.textAlign = 'left';

  c.font = '800 30px Inter, system-ui, sans-serif';
  c.fillStyle = INK;
  c.fillText(`POOL ${data.pool}`, 28, barY + 112);
  c.textAlign = 'right';
  c.fillStyle = '#8a6a2f';
  c.fillText(`GOTV ${data.gotv}`, W - 28, barY + 112);
  c.textAlign = 'left';

  return c.canvas;
}

/** Felt for the table surface — woven, not flat. */
export function paintFelt(): HTMLCanvasElement {
  const S = 1024;
  const c = ctx2d(S, S);
  c.fillStyle = '#2f3a2c';
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const a = Math.random() * 0.16;
    c.fillStyle = Math.random() > 0.5 ? `rgba(80,98,72,${a})` : `rgba(18,24,16,${a})`;
    c.fillRect(x, y, 2, 2);
  }
  return c.canvas;
}

/** Table wood, for the rail around the felt. */
export function paintWood(): HTMLCanvasElement {
  const S = 1024;
  const c = ctx2d(S, S);
  const grad = c.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#4a3524');
  grad.addColorStop(0.5, '#3a2819');
  grad.addColorStop(1, '#52412c');
  c.fillStyle = grad;
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 240; i++) {
    const y = Math.random() * S;
    c.strokeStyle = `rgba(20,12,6,${0.04 + Math.random() * 0.1})`;
    c.lineWidth = 1 + Math.random() * 3;
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= S; x += 64) {
      c.lineTo(x, y + Math.sin((x / S) * Math.PI * 2 + i) * 6);
    }
    c.stroke();
  }
  return c.canvas;
}
